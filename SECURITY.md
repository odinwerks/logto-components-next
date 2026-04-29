# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | ✅ Yes    |
| 0.2.x   | ❌ No — upgrade to 0.3.0 |
| < 0.2   | ❌ No     |

## Threat Model

logto-dash is a **self-hosted authentication dashboard** intended for developers building on top of Logto. Its security threat model:

**Trusted:**
- The server runtime environment (env vars, server-side session cookies, `'use server'` actions)
- Logto's own API responses (treated as authoritative after token validation)

**Untrusted:**
- All inputs arriving from the browser (FormData, server action arguments, route handler body)
- User-supplied strings of any kind (names, emails, IDs, codes, URLs)

**Out of scope:**
- Physical access to the server
- Compromised infrastructure
- Attacks on the Logto instance itself (report to [Logto's security policy](https://github.com/logto-io/logto/blob/master/SECURITY.md))

## Security Guarantees (What the Library Enforces)

- **No access token in the browser.** The Logto access token never reaches client-side JavaScript in production builds. The Dev tab (which shows it) is disabled in `NODE_ENV=production`.
- **Same-origin enforcement.** Non-Server-Action route handlers (`/api/wipe`, `/api/auth/sign-out`) validate the `Origin`/`Referer` header against `BASE_URL` on every POST. GET requests return 405.
- **Input validation at trust boundaries.** Every `'use server'` function validates its client-supplied arguments before performing any privileged operation. IDs are restricted to `[A-Za-z0-9_-]{1,128}`. Types are asserted against allowlists. Complex inputs (customData) are whitelist-filtered.
- **Error message sanitisation.** In production, errors returned to the browser are fixed error codes. Raw upstream text (which can contain email addresses, request details, and internal information) is discarded client-side and retained only in server-side logs.
- **Mass-assignment prevention.** `updateUserCustomData` accepts only the `Preferences` key, and within it only `asOrg`, `themeMode`, and `language`. All other keys are dropped silently.
- **Security headers.** Every response includes CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy headers.

## Non-Guarantees (What You Must Do)

- **Narrow your M2M app's permissions in Logto Console.** The library's M2M client credential is only used for account deletion. In the Logto Console, the M2M app should have *only* the "User data → Delete user" permission assigned. The `scope: 'all'` in the code requests everything the Console grants — granting less in the Console is the enforcing layer.
- **Set `SUPABASE_SERVICE_ROLE_KEY` to a bucket-scoped key, not the service-role key.** If you use Supabase storage for avatars, generate a bucket-scoped secret instead of the service-role key which has full database access.
- **Use `HTTPS` in production.** HSTS only activates when the connection is HTTPS. Run behind a reverse proxy (Nginx, Caddy, Cloudflare) with TLS.
- **Set your `ENDPOINT` env var correctly.** The `connect-src` directive in `next.config.ts` is derived dynamically from your `ENDPOINT` environment variable. If `ENDPOINT` is not set, it falls back to `https://*.logto.app` (suitable for Logto Cloud). No manual CSP edits are needed after forking.
- **Your own API routes.** Security enforced here applies to logto-dash's own API surface. Routes you add to the app are your responsibility.
- **Audit trail requires a custom transport.** The `audit()` primitive is wired into all mutation actions (account deletion, password change, MFA enroll/remove, avatar upload) but produces **no output in production** by default. To activate audit logging, create `app/logto-kit/audit-transport.ts` exporting a default `async function(entry: AuditEntry)`. Without it, security-relevant mutations are not logged.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Email: [see repository for contact] or open a [private GitHub advisory](https://github.com/odinwerks/logto-components-next/security/advisories/new).

Include:
- Description of the vulnerability
- Steps to reproduce
- Affected version(s)
- Suggested fix (optional)

We aim to acknowledge reports within 48 hours and publish a fix within 14 days for critical issues.

## Past Security Issues

| Version | Issue | Fix |
|---------|-------|-----|
| 0.2.0   | Access token exposed to browser; CSRF logout via GET; path injection in session/MFA actions; error text user enumeration; base64url JWT decode bug; mass-assignment in customData | Fixed in 0.3.0 — see CHANGELOG |
