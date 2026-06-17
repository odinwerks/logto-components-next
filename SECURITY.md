# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.
Do **not** open a public GitHub issue for security problems.

Contact the maintainers privately with details of the vulnerability, steps to reproduce,
and potential impact. We aim to acknowledge reports within 48 hours and provide a fix
within 30 days of confirmed impact.

---

## Future Webhook Hardening Requirements

The codebase does not currently implement a Logto webhook handler route
(`app/api/webhooks/logto/route.ts`). If this route is added in the future,
it **MUST** implement all of the following security controls:

### 1. HMAC-SHA256 Signature Verification

All incoming Logto webhook requests must be verified using the shared signing secret.
Logto signs webhook payloads with HMAC-SHA256 using the `LOGTO_WEBHOOK_SIGNING_SECRET`
environment variable.

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

function verifyLogtoWebhookSignature(
  body: Buffer,
  signatureHeader: string,
  secret: string,
): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex');
  const actual = signatureHeader.replace('sha256=', '');
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(actual, 'hex'));
  } catch {
    return false;
  }
}
```

Any request with a missing or invalid signature **MUST** be rejected with HTTP 401.
Never process a webhook payload before verifying the signature.

### 2. Fail-Closed JSON Parsing

If the request body cannot be parsed as valid JSON, the handler **MUST** return
HTTP 400 (Bad Request) and log a warning — do **not** fall through with a
partial or empty object. Fail closed, not fail open.

```typescript
let payload: unknown;
try {
  payload = await request.json();
} catch {
  return Response.json({ error: 'INVALID_PAYLOAD' }, { status: 400 });
}
```

### 3. HTTPS Enforcement

The webhook endpoint URL registered in Logto Console **MUST** use HTTPS.
Local development with HTTP is acceptable only when `NODE_ENV !== 'production'`.
Add a startup assertion that rejects `http://` webhook URLs in production.

### 4. No Stub Routes Without Verification

Do **not** create a stub `POST /api/webhooks/logto` route that accepts requests
without signature verification. An unverified stub is a new attack surface that
allows arbitrary event injection. If the feature is not yet implemented, the
route should respond with HTTP 405 (Method Not Allowed) for all methods.

### 5. Idempotency

Logto may retry webhook deliveries. The handler should be idempotent — processing
the same event twice should produce the same result as processing it once.
Use the event `id` field as an idempotency key.

---

## Known Security Characteristics

### Geo-Consent Forgeability (Accepted Risk)

The geo-consent flag (`sessionStorage.getItem('geo-consent')`) is stored in the
user's browser sessionStorage. It can be forged by code with JavaScript execution
in the user's browser context (e.g., via browser DevTools or a browser extension).

**Why this is acceptable:** The only consequence of forging consent is that the
user's browser makes an HTTP request to `ipapi.co` to resolve a session IP address.
This is a network request **from the user's own browser**, not a server-side data
leak. There is no server-side data accessible or modifiable via this consent flag.

**For government deployments requiring strict consent tracking**, consider:
1. Disabling the geo-lookup feature entirely (remove the 'sessions' tab map button), or
2. Persisting consent to `customData` via a dedicated server-side consent action
   (requires designing a new server action and UI flow).

### Cloud Metadata IP Blocklist

The `fetchGeo()` function in `geo-cache.ts` blocks lookups for well-known cloud
metadata IPs to prevent users from triggering requests to infrastructure endpoints:
- `169.254.169.254` — AWS/GCP/Azure IMDS
- `100.100.100.200` — Alibaba Cloud IMDS
- `192.0.0.192` — RFC 7526 NAT64

These are blocked before any request is made to `ipapi.co`.

---

## Redis Hardening

### requirepass (Authentication)

Redis **MUST** run with `requirepass` enabled. An unauthenticated Redis instance
allows any process on the host (or network) to read rate-limit state, distributed
locks, and cached M2M tokens — or to flush/tamper with them.

- `REDIS_PASSWORD` must be generated with `openssl rand -base64 32`.
- Store it only in `.env` (or a secrets manager). **Never commit it to source control.**
- The `REDIS_URL` must embed the password: `redis://:${REDIS_PASSWORD}@localhost:2998`
- If `REDIS_PASSWORD` is missing or wrong, Redis rejects all connections.
  This is the desired "fail closed" behavior — do **not** suppress auth errors.

### Loopback-only port binding

In `docker-compose.yml` the Redis port is bound to the loopback interface only:

```yaml
ports:
  - "127.0.0.1:2998:6379"
```

This ensures Redis is unreachable from other hosts on the same network.
Never use `0.0.0.0:2998:6379` (or the shorthand `2998:2998`) in production.

### Additional hardening for government / production deployments

For high-assurance or government deployments:

1. **Host firewall** — Enforce a host-level `iptables`/`nftables` rule that drops
   connections to port 2998 from all sources except the application process (defense
   in depth beyond loopback binding).
2. **TLS** — Configure Redis with `tls-port` and a self-signed or CA-signed certificate
   so traffic on the loopback is encrypted. Update `REDIS_URL` to use `rediss://`.
3. **Redis ACL** — Replace the single `requirepass` with Redis 6+ ACL rules that grant
   the application user only the commands it actually uses (`EVAL`, `GET`, `SET`, `DEL`,
   `EXPIRE`, `PING`). This limits blast radius if the application is compromised.
4. **Disable dangerous commands** — In `redis.conf`, add:
   ```
   rename-command CONFIG ""
   rename-command DEBUG ""
   rename-command FLUSHALL ""
   rename-command FLUSHDB ""
   ```
5. **Separate Redis instance** — Use a dedicated Redis instance for this application,
   not one shared with other workloads.

### Auth failure behavior in the application

`app/lib/distributed-state.ts` logs a warning when Redis is unavailable and falls
back to per-instance in-memory rate limiting (degraded mode, not fail-closed).
An authentication failure (`WRONGPASS` / `NOAUTH`) will also trigger this fallback.

For government or security-critical deployments where the in-memory fallback is
unacceptable (e.g., you require distributed rate limiting), patch `initRedisBackend`
to re-throw auth errors rather than falling back. The error message will contain
`WRONGPASS` or `NOAUTH` to help operators diagnose misconfiguration quickly.

---

## Authentication Boundary

### Proxy Choke-Point (Outer Boundary)

`proxy.ts` (Next.js middleware) is the **network-level security boundary**. It enforces authentication before requests reach page handlers or API routes.

**Public paths** (no authentication required):
- `/` — redirects to documentation page (`/getting-started/pre-requisites`)
- `/docs` and `/docs/*` — official documentation pages
- `/demo` and `/demo/*` — demo app
- `/api/auth/sign-in` — OAuth sign-in entry point
- `/callback` — OAuth callback handler
- `/api/wipe` — cookie cleaning route (protected by its own origin guard)

**All other paths** are protected. Unauthenticated requests are redirected to `/api/auth/sign-in` before the page or route handler runs.

The proxy also handles:
- **Stale cookie recovery**: detects the "Cookies can only be modified" error from the Logto SDK and redirects to `/api/wipe` to clear stale session cookies.
- **`invalid_grant` recovery**: detects server-side grant revocation and redirects to `/api/wipe`.
- **Transient errors**: Logto client fetch failures return HTTP 503.
- **Per-request CSP nonce**: a unique base64url nonce is generated per request and injected as the `x-nonce` header for use by the layout's inline script.

If the Logto client throws an unknown error (network/config), the request is **allowed through** rather than blocked — this prevents Logto misconfiguration from locking out all users. The page/route handler is responsible for re-checking auth in this case.

### Protected Server Actions (Inner Boundary)

Protected Server Actions explicitly reject unauthenticated callers with the `UNAUTHENTICATED` error code. This is the **second security layer** inside the proxy choke point.

All destructive mutations (profile updates, account deletion, session revocation, MFA enrollment, etc.) are implemented as Server Actions wrapped with `safeAction`. The first thing each action does is introspect the session cookie and extract the authenticated `sub`. If no valid session exists, the action returns `{ ok: false, error: 'UNAUTHENTICATED' }` before any mutation occurs.

**Key invariants:**
- User ID is **always** derived from session token introspection, never from client input (IDOR prevention).
- Unauthenticated calls never reach mutation logic — they short-circuit at the session check.
- `safeAction` wraps every exported server action to guarantee a consistent `{ ok, error }` / `{ ok, data }` discriminated union return type.

### Auth-Gated UI Features

Client components that require authentication (e.g., the calculator demo) render the main auth modal when the user is unauthenticated rather than exposing an error message or silently doing nothing. The `<Protected>` component and the `CalculatorPanel` component follow this pattern: they open the sign-in modal and optionally show a "Read Only Mode" button.

This is a UX pattern, not a security boundary. The actual security boundary remains the Server Action layer described above.

---

## AGENTS.md Security Constraints

The following security-critical patterns must never be modified without explicit review.
See `AGENTS.md` for the full list of never-touch areas, including:

- `getManagementApiToken` — M2M token fetch with `scope: 'all'`
- `checkSameOrigin` — origin guard for CSRF-sensitive routes
- `cleanPhoneNumber` — phone number digit-only normalization
- `assertVerificationNotExpired` — 15-second staleness check
- `deleteUserAccount` — server-derived userId (IDOR prevention)
- `pickPreferences` — mass-assignment protection allowlist
