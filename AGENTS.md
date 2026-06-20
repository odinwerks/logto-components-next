# Next.js DevTools MCP

**When starting work on a Next.js project, ALWAYS call the `init` tool from next-devtools-mcp FIRST to set up proper context and establish documentation requirements. Do this automatically without being asked.**

This initializes the MCP context and ensures the AI assistant uses official Next.js documentation for all queries.

# NEVER TOUCH Rules

These functions/environmental constants must NEVER be modified without explicit approval and verification against git history + Logto docs:

## M2M Management API Token (`app/logto-kit/config.ts :: getManagementApiToken`)

- **`scope`** MUST be `'all'`. Do NOT remove it, do NOT change it to `''`. The M2M client_credentials flow requires explicit scope. The blast radius is determined by Logto Console permissions, not this string.
- **`resource`** for Logto OSS MUST be `'https://default.logto.app/api'` (hardcoded default). For Logto Cloud, it's `https://[tenant-id].logto.app/api` and should be set via `LOGTO_M2M_RESOURCE` env var.
- **Fallback chain**: `process.env.LOGTO_M2M_RESOURCE || 'https://default.logto.app/api'`  do NOT derive from ENDPOINT.
- These values are confirmed by Logto's official Management API documentation. Always verify against Logto MCP before proposing changes.

## Origin Guard (`app/logto-kit/logic/origin-guard.ts :: checkSameOrigin`)

- **Do NOT add to auth routes** (`/api/auth/sign-in`). Logto's OAuth `state` parameter provides CSRF protection for the sign-in/callback flow. Adding `checkSameOrigin` there breaks local dev when BASE_URL doesn't match the browser's Origin.
- **Sign-out does NOT use an API route.** Sign-out is handled exclusively by the `signOutUser()` Server Action (see `app/logto-kit/logic/actions/auth.ts`). Next.js Server Actions have built-in origin validation, so no API route or `checkSameOrigin` guard is needed for sign-out. The `/api/auth/sign-out` route has been removed - do NOT recreate it.
- **Only use on** `/api/wipe` and `/api/protected`  routes that don't go through Logto's OAuth flow and need CSRF protection.
- **Source chain**: `process.env.BASE_URL || process.env.APP_URL`  no localhost bypasses, no PUBLIC_BASE_URL fallback.

## Auth Redirect (`app/page.tsx`)

- `app/page.tsx` is a **public redirect route**. It does NOT render a complex interactive landing page, and it does NOT redirect unauthenticated users to sign-in. Instead, it performs a minimal redirect to the public documentation at `/getting-started/pre-requisites`.
- Sign-in is initiated exclusively by `signIn()` from `@logto/next/server-actions` (called in `app/api/auth/sign-in/route.ts`). The `handleSignIn()` function in `app/callback/route.ts` ONLY completes the OAuth callback — it is not called for sign-in initiation.
- `proxy.ts` (Next.js middleware) **enforces authentication**. It is the network-level choke point: only `/`, docs topic paths (`/getting-started/*`, `/user-button/*`, `/dashboard/*`, `/tabs-and-flows/*`, `/rbac/*`, `/calculator/*`, `/anatomy/*`, `/security/*`), `/demo/*`, `/api/auth/sign-in`, `/callback`, and `/api/wipe` are public; all other routes redirect unauthenticated users to `/api/auth/sign-in`. It also handles session error recovery (stale cookies, invalid_grant) and sets CSP headers. Note: docs routes use the Next.js `(docs)` parenthesized group so URLs are at top-level paths (no `/docs/` prefix). To add a new docs topic, add its `id` to `DOCS_TOPIC_PREFIXES` in `proxy.ts`.
- Do NOT add state/param guards before `handleSignIn()` in the callback route — the SDK needs to see the raw request params to process the OAuth response.

## Env Vars

- `LOGTO_M2M_RESOURCE` is derived from `'https://default.logto.app/api'` by default and should NOT be required. Do not add throw-guards for it.
- `BASE_URL` should always fall back to `'http://localhost:3000'` where used in route handlers (not in `checkSameOrigin`).

## General Rules

- Before claiming a working pattern is a "bug," check git history to see if it was intentionally designed that way.
- Verify against Logto MCP (`Logto_queryKnowledgeBase`) before changing any OAuth/M2M/token-related code.
- When a commit introduces multiple changes, trace back to the last known-working commit and diff carefully.

## Phone Number Normalization (`app/logto-kit/logic/actions/verification.ts :: cleanPhoneNumber`)

- **Strips ALL non-digit characters including `+`**. Logto's Account API accepts digit-only format - the `+` prefix is NOT required.
- Do NOT add `+` preservation logic. The stripping is intentional and verified against Logto's API contract.
- The JSDoc comment accurately describes this behavior. Do not "fix" it to say it keeps the `+`.

## Custom OIDC Scopes Pass-Through (`app/logto-kit/config.ts :: parseScopes`)

- **Unknown scopes pass through `SCOPE_MAP` unchanged**. Resource-specific scopes (`calc:basic`, `calc:scientific`, etc.) are defined in Logto Console and must flow through to the OIDC authorization request.
- Do NOT add warnings for unknown scopes. They are legitimate custom scopes, not typos.
- Only `organizations` and `organization_roles` need mapping via SCOPE_MAP. Standard OIDC scopes (`openid`, `profile`, `email`, etc.) are handled by the SDK.

## Identity Verification Flow

- **`verifyPasswordForIdentity`** returns an opaque `identityVerificationRecordId`. This is a server-issued token, not guessable by attackers.
- All destructive operations (account deletion, password change, email/phone update, MFA enrollment, session revocation, identity linking) require this record ID via the `logto-verification-id` request header.
- **Staleness check** (`VERIFICATION_CLOCK_SKEW_TOLERANCE_MS`, 15 seconds) is enforced on EVERY operation. Do NOT remove or weaken these checks.
- The verification flow is: `POST /api/verifications/password` → get `verificationRecordId` → pass in `logto-verification-id` header on subsequent mutation.

## Server-Derived User Identity (IDOR Prevention)

- **User ID is ALWAYS derived from session token introspection**, never from client input.
- `deleteUserAccount`, `updateUserCustomData`, `uploadAvatar`, and all role/org operations extract `sub` from the introspected session token.
- Do NOT add client-supplied `userId` parameters to destructive operations. Do NOT trust `userId` from request bodies.
- This pattern prevents Insecure Direct Object Reference (IDOR) attacks.

## Error Handling (`app/logto-kit/logic/errors.ts`)

- **`sanitize()`** strips all error details to fixed error codes in production. Do NOT add upstream message passthrough to sanitize().
- **`throwOnApiError(res, safeCode, auditAction?, exposeMessage?)`** - the `exposeMessage` parameter defaults to `false`. Only Account API callers (`/api/my-account/*`) opt in with `true`. Management API callers MUST use the default `false` to prevent internal detail leakage.
- **`isAuthError`** uses both `error.name` checks (preferred) and string matching (fallback). Do NOT remove the string fallback without adding equivalent error name checks.
- **Audit logging** is best-effort: `audit()` calls are wrapped in try/catch and NEVER surface errors to the caller. Do NOT add throw behavior to audit functions.

## Mass-Assignment Protection (`app/logto-kit/logic/guards.ts :: pickPreferences`)

- **Explicit allowlist** (`PREFERENCES_ALLOWED_KEYS`) controls which preference keys can be set.
- **Blocks `__proto__` and `constructor`** prototype pollution.
- Unknown keys are silently dropped - this is intentional, not a bug. Do NOT add warnings for dropped keys.
- `updateUserCustomData` uses `pickPreferences()` before sending to the Management API.

## Input Validation (`app/logto-kit/logic/guards.ts`)

- **`SAFE_ID_REGEX`** (`/^[A-Za-z0-9_-]{1,128}$/`) validates all user IDs and Logto IDs before URL interpolation. This prevents path traversal and query injection.
- **`assertSafeLogtoId(id, label)`** is the canonical ID validator. `assertSafeUserId` is preserved for backward compatibility but new code should use `assertSafeLogtoId(id, 'userId')` instead.
- **`encodeURIComponent()`** is used on all IDs interpolated into URLs. Do NOT remove these encodings.
- `safeUrl` was removed as dead production code - `makeRequest()` is the canonical URL builder.

## Server Actions Pattern

- **Token containment**: NO access tokens, refresh tokens, M2M tokens, or ID tokens are ever returned to the client. `fetchDashboardData` explicitly strips tokens from responses.
- **All server actions use `safeAction` wrapper** - consistent `{ ok, error }` / `{ ok, data }` discriminated union return type.
- **In-memory locks** (`Map<string, Promise<void>>`) serialize per-user operations (customData updates, backup code generation). These are single-instance only - for multi-instance deployments, use Redis/distributed locks.
- **`createLockManager()`** in `app/lib/distributed-state.ts` is the canonical lock factory for production use (namespaced, Redis-backed). The version in `app/logto-kit/logic/actions/helpers.ts` is an in-memory-only variant used by `helpers.test.ts`; production callers in `mfa.ts` and `profile.ts` import from `distributed-state.ts`. Use `distributed-state.ts`, don't copy-paste Map-based locks.

## Logto SDK Verified Patterns

- **`getAccessToken(config, resource?)`** from `@logto/next/server-actions` - two arguments, resource is optional. Single-arg call for default resource token is correct.
- **Token introspection** at `/oidc/token/introspection` with Basic auth (client credentials) or Bearer token. Returns `active`, `sub`, `client_id`, `scope`, `token_type`, `exp`, `iat`.
- **Org token validation**: `setActiveOrg` validates org membership against LIVE OIDC userinfo (`fetchUserInfo: true`), not stale JWT claims. Do NOT replace with JWT-based org membership checks.
- **Account API base path**: `/api/my-account`. Profile fields (givenName, familyName) use `PATCH /api/my-account/profile`. Basic fields (username, name, avatar, customData) use `PATCH /api/my-account`.

## Origin Guard Return Convention (`app/logto-kit/logic/origin-guard.ts`)

- **Returns `null` (falsy) for success** - caller should continue processing.
- **Returns `NextResponse` (truthy) for failure** - caller should return this 403 response.
- This is an inverse boolean pattern. The JSDoc documents it. Do NOT "fix" it to return a boolean without updating ALL callers.
- **No `Referer` header fallback** - GET requests without `Origin` header fail closed (403), same as POST. Do NOT add Referer-based origin extraction.
- Applied ONLY on `/api/wipe` and `/api/protected`. Auth routes are intentionally excluded.

## Session & Backend Type

- **`BACKEND_TYPE=upstream`** disables session heartbeats and `lastActiveAt` tracking. This is intentional - the code is not dead, it's gated by platform.
- Do NOT remove the `if (getBackendType() === 'upstream') return;` guards. They are feature flags, not dead code.

## Build Detection

- **`IS_NEXT_BUILD`** constant uses `process.env.npm_lifecycle_event === 'build' || process.env.NEXT_PHASE !== undefined`. The `NEXT_PHASE` fallback supports yarn/pnpm/bun.
- Do NOT reintroduce `process.env.VITEST` into `isBuildTime`. Test setup should mock `npm_lifecycle_event` or set `NEXT_PHASE` instead.
- Do NOT duplicate `parseCountryList()` calls or `IS_NEXT_BUILD` expressions - they are now centralized.

# Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm test             # Vitest watch mode
npm run test:run     # Vitest single run
npm run lint         # Next.js lint
npm run type-check   # tsc --noEmit
```
