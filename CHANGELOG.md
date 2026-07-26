# Changelog

## 0.9.0-beta.1 (2026-07-26)

> **Note on versioning:** This project went through ~10 major internal development waves
> (730+ commits, 79 bug fixes, 3005 tests) without formal versioning. `package.json` sat
> frozen at `0.4.0` through all of it. This `0.9.0-beta.1` reflects the actual maturity of
> the codebase — feature-complete, security-hardened, SAST-clean — while the `-beta.1`
> suffix honestly signals it has not yet been battle-tested on a live production instance.

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
- TypeScript strict mode, 3005 tests, zero type errors
- Docker & CI/CD configuration included
- Comprehensive docs site with interactive demos
- Structured logging with Pino
- Vitest test suite with 237 test files
