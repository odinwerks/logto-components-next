## [0.3.0] — 2026-04-29

### BREAKING CHANGES

- **`uploadAvatar(formData)`** no longer accepts `accessToken` or `userId` fields in the FormData object. Both values are now derived server-side from the session cookie. Update any callers that previously included those fields.
- **`deleteUserAccount()`** no longer accepts any parameters. Previously it required `(identityVerificationRecordId, accessToken)`. The access token is now derived server-side. The verification record ID is no longer required as a parameter either (the server action enforces authentication via the session).
- **`/api/wipe` and `/api/auth/sign-out`** are now POST-only. GET requests return 405. If you have any links, `<img src>`, or `window.location.href` calls targeting these endpoints, change them to `fetch(url, { method: 'POST', credentials: 'same-origin' })` or a form submission.
- **`DashboardSuccess` type** no longer includes the `accessToken` field. If you destructure this type, remove the `accessToken` key.
- **`DashboardData` interface** no longer includes `accessToken`.
- **`LogtoProvider`** no longer accepts or exposes an `accessToken` prop. The `useLogto()` hook no longer includes `accessToken` in its return value.

### Security Fixes

- **[Finding 1] Access token no longer sent to the browser.** The user's Logto access token was previously serialised into the RSC payload and stored in React state (and rendered verbatim in the Dev tab). It is now kept entirely server-side. The Dev tab fetches the token lazily via a dedicated server action that refuses to return anything outside of `NODE_ENV=development`.
- **[Finding 2] M2M token scope narrowed (documentation).** The Management API M2M token continues to request `scope: 'all'`, but the SECURITY.md now documents that the M2M app in the Logto Console must be configured with **only** the "User data → Delete user" permission. The scope string is enforced by the Console RBAC assignment, not the `scope` field itself.
- **[Finding 3] `/api/upload-avatar` replaced by a Server Action.** The old plain Route Handler accepted `accessToken` and `userId` from the browser and had no CSRF protection. The new `uploadAvatar()` server action runs entirely server-side; Next.js enforces same-origin at the framework level.
- **[Finding 4] Path/query injection fixed across all server actions.** `sessionId`, `grantId`, `verificationId`, and MFA `verificationId` are now validated with `assertSafeLogtoId()` before use. All IDs are `encodeURIComponent()`-encoded when interpolated into URL paths. Query parameters are built via `URLSearchParams`.
- **[Finding 5] CSRF logout fixed.** `/api/wipe` and `/api/auth/sign-out` are POST-only with an `Origin`/`Referer` same-origin check. Anonymous `<img>` or link-based forced-logout attacks are blocked. Also fixes the `APP_URL` env var bug (was `undefined`; now correctly reads `BASE_URL`).
- **[Finding 6] Error messages sanitised in production.** Server actions and route handlers no longer return raw Logto upstream error text to the client in production. Errors are mapped to fixed codes (`VERIFICATION_FAILED`, `UPDATE_FAILED`, etc.). Full upstream detail is preserved server-side in `console.warn` for operator access. Development mode retains full detail for DX.
- **[Finding 7] JWT decoded with correct base64url handling.** `organizations.ts` and `custom-actions/validation.ts` previously used `Buffer.from(..., 'base64')` which silently corrupts base64url characters (`-`, `_`), causing token payloads to fail parse and permissions to return empty. Both now use `@logto/js::decodeAccessToken` (correct base64url).
- **[Finding 8] Mass-assignment in `updateUserCustomData` fixed.** The function now whitelists allowed keys via `pickPreferences()` and merges rather than replaces `customData`, preserving keys written by other apps on the same Logto tenant.
- **Dev tab gated by `NODE_ENV`.** The Dev tab (which shows raw user JSON) is stripped from `LOAD_TABS` at runtime in non-development environments, regardless of the `LOAD_TABS` env var. A client-side guard provides defence-in-depth.

### New Files

- `app/logto-kit/logic/guards.ts` — Input validators for all server-action trust boundaries
- `app/logto-kit/logic/dev-mode.ts` — Single source of truth for `NODE_ENV` checks
- `app/logto-kit/logic/origin-guard.ts` — Same-origin guard for route handlers
- `app/logto-kit/logic/audit.ts` — Audit log primitive (dev console + extensible transport)
- `app/logto-kit/logic/actions/debug-token.ts` — Dev-only server action for accessing the token
- `public/robots.txt` — Disables search engine indexing (recommended for auth dashboards)

### Security Regression Tests (new)

- `guards.test.ts` — 46 tests covering all input validators, injection paths, and the base64url regression
- `origin-guard.test.ts` — 5 tests for the CSRF same-origin check
- `errors.test.ts` — 5 tests for the sanitise/throwOnApiError behaviours
- `dev-mode.test.ts` — Documents expected `isDev` behaviour per environment

### Production Hardening

- Security headers added to all responses via `next.config.ts`: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, XSS-Protection, Referrer-Policy, Permissions-Policy
- CI pipeline now runs `npm audit --audit-level=high` and gitleaks secret scanning on every push/PR


---

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **WebAuthn passkey management** in Security tab — register, rename, and delete passkeys via Logto Account API
  - New server actions: `requestWebAuthnRegistration`, `verifyAndLinkWebAuthn`, `renamePasskey` (`logic/actions/webauthn.ts`)
  - `assertPasskeyName` guard in `guards.ts` — validates non-empty, ≤64 chars, no control chars
  - FlowModal extended with `rename-passkey` step type
  - Browser support detection with `browserSupportsWebAuthn()` from `@simplewebauthn/browser`
  - User cancel (NotAllowedError) handled gracefully — modal closes silently
  - 27 new tests (19 action + 8 guard)
  - 18 new i18n keys with Georgian translations

### Fixed

- **SessionMapModal tests** — 3 pre-existing test failures fixed:
  - Location label test updated for intentional Set-based deduplication (test both dedup and non-dedup cases)
  - Zoom level test corrected from 13 to 14 (original typo)
  - Light theme tile assertion updated from `light_all` to `voyager` (intentional design choice)
  - Mock translations object completed (added missing `viewOnGoogleMaps`)

## [0.2.0] - 2025-01-27

### Added
- Full demo app at `/demo` with 11 documentation tabs
- Protected Actions API for RBAC-gated server actions
- `<Protected />` client component for UI-level permission gating
- `OrgSwitcher` component for organization selection
- Session management with device metadata and IP geolocation
- Avatar upload via drag-and-drop with S3-compatible storage
- MFA management with TOTP enrollment and backup codes
- Theme system with file-based dark/light CSS variables
- i18n support with ENV-configured locales
- UserButton, UserBadge, and UserCard display components
- AuthWatcher component for auto-refresh on auth state changes
- Tab configuration via LOAD_TABS environment variable

### Changed
- Improved error handling with detection of stale cookie contexts
- Enhanced security with server-side token introspection

### Fixed
- Top-level await bug in custom-actions module
- Race conditions in Protected component permission loading
- WebP magic byte boundary validation
- Missing return statements in error handlers

## [0.1.0] - 2024-12-15

### Added
- Basic dashboard with user profile management
- Logto authentication integration
- User preferences persistence
- Cookie recovery mechanism

[Unreleased]: https://github.com/odinwerks/logto-components-next/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/odinwerks/logto-components-next/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/odinwerks/logto-components-next/releases/tag/v0.1.0
