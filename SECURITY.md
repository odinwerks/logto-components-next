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

## AGENTS.md Security Constraints

The following security-critical patterns must never be modified without explicit review.
See `AGENTS.md` for the full list of never-touch areas, including:

- `getManagementApiToken` — M2M token fetch with `scope: 'all'`
- `checkSameOrigin` — origin guard for CSRF-sensitive routes
- `cleanPhoneNumber` — phone number digit-only normalization
- `assertVerificationNotExpired` — 15-second staleness check
- `deleteUserAccount` — server-derived userId (IDOR prevention)
- `pickPreferences` — mass-assignment protection allowlist
