# Changelog

## 0.9.1-beta.1 (2026-08-07)

### Security hardening
- Proxy fails closed on unsupported RSC recovery branches (7c23031)
- Introspection audience (`client_id`) validation (47a8073)
- Log redaction + webhook egress hardening (6d2db55, 48a6be2)
- Percent-encoded and RFC 6750 named token redaction (48a6be2)
- Logout-wins ordering for sign-out vs. session revalidation (d4b0416)
- Sign-out cookie clearing when revocation fails (29522ad)
- Rotated session cookie propagation + request-side CSP (102d291)

### Data & RBAC
- Management API list pagination with fail-closed caps (7d3079b)
- Org confirmed-nonmembership mapping (6581d75)
- Revoked-org reconciliation and token-refresh fencing (2581389)
- RBAC source-key async state and stream generation swap (7a710ba)
- Backup-code lock held through reconciled rotation (48dd574)

### Profile, sessions & calculator
- Truthful save outcomes and username null contract (4838ccb)
- Avatar failure propagation and input contracts (bff2745)
- Geo-locate state restore and pending-request invalidation (dda8a46)
- Fail-closed current-session detection and re-verification (0e2e029)
- Calculator runtime shape validation and fractional factorial rejection (abca842)

### Platform & UI
- Canonical locale resolution and localized OAuth errors (115bcaf, b235f38)
- Keyboard access and light-theme contrast compliance (193bce4)
- Dashboard shell preservation across orientation/menu transitions (15b0a7f)
- Loading settlement on invalidation and focus restore after dismissal (cd5ac5b)
- Password-flow persistence and refresh/switch announcements (da35673)
- Preferences reconcile with authoritative updates (b1a87bf)
- Rate-limit fail-fast on Redis init failure with bounded in-memory fallback (9febd50)
- Country-policy fail-closed validation (8c276c1)
- MFA factor ID validation (6581d75)
- Sign-in scope, URL, and verification-email contract hardening (4777f8e)

### Infra
- Redis password delivered via mounted secret only (fad9c9d)
- Pinned image digests + enforced semgrep gate (110e52a)
- Test mock retargeting to direct module imports (8525328)

### Docs & release prep
- Comprehensive README / SECURITY / in-app docs corrections verified against code
- Sessions-tab loading skeleton rework: neutral unverified placeholder, refresh no
  longer collapses the session list, skeleton geometry matches real session cards,
  loading states always settle
- .dockerignore / .gitignore additions for local tooling directories
- Version bump to 0.9.1-beta.1
- Measured at release: 135 test files / 2209 tests, zero type errors, lint clean

## 0.9.0-beta.2 (2026-07-28)

- fix: resolve all 24 verified bugs across codebase (c044d9d)
- fix: restore lint compatibility and resolve findings (033c1c2)
- fix(docker): sever barrel re-export to avoid server-only import in client components (f0f02d4)

## 0.9.0-beta.1 (2026-07-26)

> **Note on versioning:** This project went through ~10 major internal development waves
> (730+ commits, 79 bug fixes, a comprehensive test suite) without formal versioning.
> `package.json` sat frozen at `0.4.0` through all of it. This `0.9.0-beta.1` reflects
> the actual maturity of the codebase — feature-complete, security-hardened, SAST-clean —
> while the `-beta.1` suffix honestly signals it has not yet been battle-tested on a
> live production instance.

### Core
- Full Logto OIDC integration with session management
- RBAC and organization-aware component system
- Multi-language support (i18n) with RTL readiness
- Responsive dashboard with mobile-first design
- Dark/light theme system

### Security
- Server-side token introspection (no tokens exposed to client)
- IDOR prevention via session-derived user identity
- Phone number verification with sealed cookie validation
- Origin guard CSRF protection
- SAST pipeline (Semgrep + CodeQL) with zero true-positive alerts
- Protected Actions pattern for role-gated operations

### Developer Experience
- TypeScript strict mode with a comprehensive test suite and zero type errors
- Docker & CI/CD configuration included
- Comprehensive docs site with interactive demos
- Structured logging with Pino
- Vitest test suite
