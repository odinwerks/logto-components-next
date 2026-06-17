# Logto components kit.

A modular Next.js app that provides a base for building with a dashboard, user button, providers for user data, Logto Auth integration, theme and language handlers, and custom action runners.

## Features

- **Semi-Clean Production-ish UI**: Squared buttons, CSS-variable theming, and a set of UI components
- **Full Responsive & Mobile Support**: Dynamic orientation-based responsive routing (`useIsPortrait`) that swaps standard sidebar layouts for touch-optimized mobile navigation. Features a tactile, morphing floating button (Hamburger, X, and ArrowLeft), a beautiful two-stage fullscreen navigation drawer (Topics -> Subtopics), and fully responsive, horizontally scrollable data tables.
- **Modal-based Dashboard**: Centered modal with sidebar containing user info, tabs for main content area
- **Full User Management**: Profile, custom data, session management with device metadata (browser, OS, IP), current-session identification (`isCurrent` badge), per-session `lastActiveAt` with automatic 30s heartbeat, IP geolocation minimap, "Revoke all other sessions", identities, organizations, MFA (TOTP, backup codes, passkeys/WebAuthn)
- **User Display Components**: UserButton (clickable avatar), UserBadge (display-only), UserCard (avatar + name card)
- **Theme System**: CSS-only theme system with dark/light CSS variables. THEME env var selects the theme folder. No JS registration needed.
- **i18n Support**: Multi-language support with ENV-configured locale availability and ordering.
- **MFA Management**: TOTP enrollment, backup codes generation, and WebAuthn passkey management (register, rename, delete). Uses `@simplewebauthn/browser` for the browser ceremony.
- **User Preferences**: Automatic persistence of theme and language choices in Logto customData.
- **Auto-Refresh on Preference Change**: When theme or language is changed, tabs automatically refresh to display the latest data from the server.
- **Tab Configuration**: You can select which tabs to display and their order via an ENV variable.
- **Cookie Recovery**: Automatic handling of stale cookie contexts via `/api/wipe` (supports GET for browser redirect flow and POST for CSRF-safe programmatic use).
- **Open Browsing with Auth Modal**: All routes are accessible without signing in. Unauthenticated visitors see an anonymous UserButton; clicking it opens the main auth modal. Auth-gated features open the modal inline instead of showing an error.
- **Debug Logging**: All sensitive debug output (tokens, IPs, introspection) is production-gated.

## Prerequisites

Before running the app locally you need:

| Requirement | Notes |
|-------------|-------|
| **Node.js 18+** | Required by Next.js 16 |
| **A Logto instance** | OSS (self-hosted) or Logto Cloud; you need an App ID/Secret and an M2M App ID/Secret |
| **Redis 7+** *(optional)* | Needed for distributed rate limiting, per-user in-process locks across multiple instances, and M2M token caching. Not required for a single-instance dev setup. |
| **Docker + Docker Compose** *(optional)* | Only if you want to run Redis via `docker compose` or deploy the full stack |

### Redis Setup (local dev)

**1. Generate a password** (do this once):

```bash
openssl rand -base64 32
```

**2. Add to `.env`**:

```env
REDIS_PASSWORD=<paste-generated-password-here>
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:2998
```

> `REDIS_URL` uses the variable-substitution form so the password appears in only one place. Copy it exactly as shown.

**3. Start Redis** (Docker):

```bash
docker compose up -d redis
```

This starts `redis:7-alpine` bound to `127.0.0.1:2998` (loopback-only) with `requirepass` enforced.

> If you prefer not to use Redis at all, omit `REDIS_URL` from `.env`. The app falls back to per-process in-memory state (rate limiting, locks), which is fine for a single-instance dev setup.

### Dev Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy the example env file and fill in your values
cp .env.example .env.local

# 3. (Optional) Start Redis
docker compose up -d redis

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

The app opens at `/getting-started/pre-requisites`. Sign-in is optional — all routes are browseable anonymously. Click the **UserButton** (top-right avatar) to sign in.

## Project Structure

```
./
├── .dockerignore
├── .env.example
├── .env.local
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── workflows/
├── .gitignore
├── .kilo/
│   ├── .gitignore
│   ├── bun.lock
│   ├── package-lock.json
│   ├── package.json
│   └── plans/
├── .opencode/
│   ├── .gitignore
│   ├── bun.lock
│   ├── package-lock.json
│   ├── package.json
│   └── plans/
├── .vscode/
│   └── settings.json
├── AGENTS.md
├── app/
│   ├── (docs)/
│   │   ├── [topic]/
│   │   │   └── [section]/
│   │   │       ├── page.tsx
│   │   │       └── scroll-to-section.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── sign-in/
│   │   │   │   └── route.ts
│   │   │   └── sign-out/
│   │   │       └── route.ts
│   │   ├── protected/
│   │   │   ├── route.test.ts
│   │   │   └── route.ts
│   │   └── wipe/
│   │       ├── route.test.ts
│   │       └── route.ts
│   ├── callback/
│   │   └── route.ts
│   ├── demo/                              # Self-documenting showcase for logto-kit
│   │   ├── components/                    # Shared UI and utilities for doc pages
│   │   │   ├── calculator/
│   │   │   │   ├── CalculatorClient.test.tsx
│   │   │   │   ├── CalculatorClient.tsx   # Calculator UI + expression parser
│   │   │   │   └── CalculatorPanel.tsx    # Protected wrapper for the calculator
│   │   │   ├── Section.tsx                # Multi-page section layout with keyboard nav
│   │   │   ├── SectionComponents.tsx      # Pre-built section header/wrap components
│   │   │   ├── SyntaxBlock.tsx            # Syntax-highlighted code block (VSCode Dark+)
│   │   │   └── useDocStyles.ts            # Shared CSS-in-JS styles for doc pages
│   │   ├── content/                       # Content components for the docs
│   │   │   ├── anatomy/
│   │   │   │   ├── i18n.tsx
│   │   │   │   ├── primitives.tsx
│   │   │   │   ├── providers.tsx
│   │   │   │   └── theme.tsx
│   │   │   ├── calculator/
│   │   │   │   ├── api-authorization.tsx
│   │   │   │   ├── live-calculator.tsx
│   │   │   │   ├── live-demo.tsx
│   │   │   │   ├── overview.tsx
│   │   │   │   └── rbac-design.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── internals.tsx
│   │   │   │   ├── mobile.tsx
│   │   │   │   ├── provider-sync.tsx
│   │   │   │   ├── rendering.tsx
│   │   │   │   └── tab-structure.tsx
│   │   │   ├── getting-started/
│   │   │   │   ├── avatar-upload.tsx
│   │   │   │   ├── clone-and-install.tsx
│   │   │   │   ├── env-setup.tsx
│   │   │   │   ├── logto-console.tsx
│   │   │   │   ├── pre-requisites.tsx
│   │   │   │   └── replace-the-demo.tsx
│   │   │   ├── rbac/
│   │   │   │   ├── api.tsx
│   │   │   │   └── ui-protected.tsx
│   │   │   ├── security/
│   │   │   │   ├── error-handling.tsx
│   │   │   │   ├── input-guards.tsx
│   │   │   │   └── logging.tsx
│   │   │   ├── tabs-and-flows/
│   │   │   │   ├── identities.tsx
│   │   │   │   ├── organizations.tsx
│   │   │   │   ├── overview.tsx
│   │   │   │   ├── preferences.tsx
│   │   │   │   ├── profile.tsx
│   │   │   │   ├── security.tsx
│   │   │   │   └── sessions.tsx
│   │   │   └── user-button/
│   │   │       ├── examples.tsx
│   │   │       └── specs.tsx
│   │   ├── ContentArea.tsx
│   │   ├── docs/                          # Legacy doc components location
│   │   │   └── components/
│   │   ├── index.tsx
│   │   ├── nav-data.tsx
│   │   ├── Sidebar.tsx
│   │   └── types.ts
│   ├── error.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── lib/
│   │   ├── log-events.test.ts
│   │   ├── log-events.ts
│   │   ├── logger.test.ts
│   │   ├── logger.ts
│   │   ├── with-logger.test.ts
│   │   └── with-logger.ts
│   ├── logto-kit/
│   │   ├── config.ts                      # Logto SDK config + M2M token helper
│   │   ├── action-registry/               # Protected action registry for /api/protected
│   │   │   ├── calc-actions.ts            # Calculator action handlers (basic + scientific)
│   │   │   └── index.ts                   # Registry types and getAction() loader
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── client.test.tsx
│   │   │   │   ├── client.tsx             # Desktop dashboard UI
│   │   │   │   ├── dashboard-router.tsx   # Responsive desktop/mobile router
│   │   │   │   ├── index.tsx              # Server component: fetches data, wires actions
│   │   │   │   ├── mobile-client.tsx      # Mobile dashboard UI
│   │   │   │   ├── mobile-page.tsx        # Server component: mobile counterpart
│   │   │   │   ├── shared/
│   │   │   │   │   ├── CodeBlock.tsx      # Themed JSON/data display block
│   │   │   │   │   ├── ContactRow.test.tsx
│   │   │   │   │   ├── ContactRow.tsx     # Email/phone row with verification flow
│   │   │   │   │   ├── FlowModal.test.tsx
│   │   │   │   │   ├── FlowModal.tsx      # Multi-step modal for security flows
│   │   │   │   │   ├── ImageCropper.tsx   # Canvas-based drag/zoom image cropper
│   │   │   │   │   ├── primitives.tsx     # Shared UI atoms: Card, HR, IconBox, SL, Lbl
│   │   │   │   │   ├── RefreshButton.tsx
│   │   │   │   │   ├── RoleCard.tsx       # Role badge with lazy-loaded tooltip
│   │   │   │   │   ├── SessionMapModal.test.tsx
│   │   │   │   │   ├── SessionMapModal.tsx
│   │   │   │   │   └── Toast.tsx
│   │   │   │   ├── tab-utils.ts           # getTabLabel (shared by desktop + mobile)
│   │   │   │   ├── tabs/
│   │   │   │   │   ├── identities.tsx
│   │   │   │   │   ├── organizations.tsx
│   │   │   │   │   ├── preferences.tsx
│   │   │   │   │   ├── profile.test.tsx
│   │   │   │   │   ├── profile.tsx
│   │   │   │   │   ├── security.tsx
│   │   │   │   │   ├── sessions.test.tsx
│   │   │   │   │   └── sessions.tsx
│   │   │   │   └── types.ts
│   │   │   ├── providers/                 # Context providers and behavior components
│   │   │   │   ├── auth-watcher.tsx       # Zero-UI component: refreshes on tab focus / reconnect
│   │   │   │   ├── logto-provider.tsx     # Root provider composing theme + lang + org + dashboard
│   │   │   │   ├── preferences.test.tsx
│   │   │   │   ├── preferences.tsx        # Theme / lang / org context + useThemeMode etc.
│   │   │   │   ├── session-heartbeat.tsx  # Zero-UI component: pings heartbeat every 30s
│   │   │   │   └── user-data-context.tsx  # UserData context + useUserDataContext hook
│   │   │   ├── shared/
│   │   │   │   ├── Button.tsx             # Themed button (5 variants)
│   │   │   │   └── Input.tsx              # Themed text input
│   │   │   └── UserButton.tsx             # UserButton, UserBadge, UserCard components
│   │   ├── custom-logic/                  # App-level feature implementations
│   │   │   ├── index.ts
│   │   │   ├── org-switcher-wrapper.tsx   # Server wrapper: fetches org list automatically
│   │   │   ├── OrgSwitcher.tsx            # Org selector dropdown (client)
│   │   │   ├── Protected.tsx              # Client-side UI permission gate
│   │   │   ├── set-active-org.test.ts
│   │   │   └── set-active-org.ts          # Server action: validates org membership
│   │   ├── hooks/                         # React hooks
│   │   │   ├── use-avatar-upload.ts       # Hook wrapping the uploadAvatar server action
│   │   │   └── use-refreshable.ts         # Hook for unmount/remount refresh cycles
│   │   ├── index.ts                       # Public barrel
│   │   ├── locales/
│   │   │   ├── en-US.ts
│   │   │   ├── index.ts
│   │   │   └── ka-GE.ts
│   │   ├── logic/
│   │   │   ├── actions/                   # Internal server actions
│   │   │   │   ├── account.test.ts
│   │   │   │   ├── account.ts
│   │   │   │   ├── auth.ts
│   │   │   │   ├── avatar.ts              # Avatar upload (S3/Logto Native)
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── heartbeat.ts
│   │   │   │   ├── index.ts               # Barrel (re-exports all actions)
│   │   │   │   ├── introspection.ts
│   │   │   │   ├── mfa.test.ts
│   │   │   │   ├── mfa.ts
│   │   │   │   ├── organizations.test.ts
│   │   │   │   ├── organizations.ts
│   │   │   │   ├── password.ts
│   │   │   │   ├── profile.test.ts
│   │   │   │   ├── profile.ts
│   │   │   │   ├── request.test.ts
│   │   │   │   ├── request.ts             # Authenticated Account API HTTP client
│   │   │   │   ├── roles.ts
│   │   │   │   ├── safe.ts                # safeAction wrapper + ActionResult/DataResult types
│   │   │   │   ├── sessions.test.ts
│   │   │   │   ├── sessions.ts
│   │   │   │   ├── shared.ts              # patchMyAccount helper
│   │   │   │   ├── tokens.ts
│   │   │   │   ├── verification.test.ts
│   │   │   │   ├── verification.ts
│   │   │   │   ├── webauthn.test.ts
│   │   │   │   └── webauthn.ts
│   │   │   ├── audit.test.ts
│   │   │   ├── audit.ts
│   │   │   ├── capture-message.ts
│   │   │   ├── debug.ts
│   │   │   ├── dev-mode.test.ts
│   │   │   ├── dev-mode.ts
│   │   │   ├── env.ts
│   │   │   ├── errors.test.ts
│   │   │   ├── errors.ts
│   │   │   ├── formatting.ts              # formatPhone (E.164 display)
│   │   │   ├── geo-cache.ts               # IP geolocation TTL cache (no React dependency)
│   │   │   ├── guards.test.ts
│   │   │   ├── guards.ts                  # Assert-style input guards for trust boundaries
│   │   │   ├── i18n.ts
│   │   │   ├── index.ts
│   │   │   ├── log.ts
│   │   │   ├── origin-guard.test.ts
│   │   │   ├── origin-guard.ts            # CSRF origin check for plain route handlers
│   │   │   ├── preferences.ts
│   │   │   ├── tabs.ts
│   │   │   ├── types.ts                   # All domain types (UserData, MfaType, etc.)
│   │   │   ├── utils.test.ts
│   │   │   ├── utils.ts
│   │   │   ├── validation.test.ts
│   │   │   └── validation.ts
│   │   ├── server-actions/                # Public server action adapters (client-callable)
│   │   │   ├── load-org-permission-descriptions.ts
│   │   │   ├── load-org-permissions.ts
│   │   │   ├── load-org-roles.ts
│   │   │   ├── load-personal-permissions.ts
│   │   │   └── load-personal-roles.ts
│   │   └── themes/
│   │       ├── default/
│   │       │   ├── dark.css
│   │       │   └── light.css
│   │       └── index.ts                   # ThemeColors, DARK_COLORS, LIGHT_COLORS, FONT_SANS/MONO
│   └── page.tsx
├── proxy.ts
├── docker-compose.yml
├── docker-entrypoint.sh
├── Dockerfile
├── docs/
│   └── superpowers/
│       └── plans/
│           ├── 2026-06-02-documentation-fixes-group-a.md
│           ├── 2026-06-04-docs-update.md
│           └── 2026-06-04-verification-staleness-fix.md
├── LICENSE
├── next-env.d.ts
├── next.config.ts
├── opencode.json
├── package-lock.json
├── package.json
├── public/
│   ├── os-icons/                          # OS icons for session cards
│   │   ├── Android.svg
│   │   ├── ios.svg
│   │   ├── MacOS.svg
│   │   ├── MacroSlop.svg
│   │   └── Tux.jpg
│   └── robots.txt
├── scripts/
│   └── inject-next-public.js
├── global.d.ts
├── tree.py
├── tsconfig.json
├── vitest.config.ts
├── vitest.server-only.mock.ts
└── vitest.setup.ts
```

Test files (`.test.ts` / `.test.tsx`) are co-located alongside their source modules.

## Docker Deployment

The project ships with a `Dockerfile`, `.dockerignore`, and `docker-compose.yml` for deploying behind a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | 3-stage build: install deps → `next build` (with `NEXT_PUBLIC_*` baked in) → minimal standalone runtime |
| `.dockerignore` | Excludes `node_modules`, `.next`, `.env*`, test files from build context |
| `docker-compose.yml` | Two services: `logto-dash` (app) + `cloudflared` (CF tunnel), on an internal bridge network |

### Architecture

```
Internet → Cloudflare Tunnel → cloudflared (container)
                                      ↓
                              dash-net (bridge)
                                      ↓
                         logto-dash:2999 (not exposed to host)
```

Port 2999 is never mapped to the Docker host - only `cloudflared` can reach it on the internal `dash-net` network.

### Quick Start

**1. Fill in your `.env`**

Copy `.env.example` → `.env` and populate all required vars. Then set:

```env
# Your public CF tunnel URL - mapped to BASE_URL at container runtime
PUBLIC_BASE_URL=https://dash.yourdomain.org

# From: Cloudflare Zero Trust → Networks → Tunnels → Create a tunnel
CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
```

> `PUBLIC_BASE_URL` is your public CF tunnel URL. The container maps it to `BASE_URL` at runtime, which the Logto SDK uses for OIDC redirect URIs and origin checking. For local development (`npm run dev`), set `BASE_URL=http://localhost:3000` instead.

**2. Configure tunnel routing in the Cloudflare dashboard**

In your tunnel's public hostname settings, point your domain to:
```
http://logto-dash:2999
```

**3. Build and run**

```bash
docker compose build
docker compose up -d
```

**Updating after code changes:**

```bash
git pull
docker compose build
docker compose up -d
```

### NEXT_PUBLIC_* Vars and Docker

`NEXT_PUBLIC_*` variables are inlined into the client-side JavaScript bundle at **build time** by the Next.js compiler. They cannot be changed at runtime without rebuilding.

The `docker-compose.yml` passes them as `build.args` sourced from your `.env` file. If you change any `NEXT_PUBLIC_*` variable, rebuild the image:

```bash
docker compose build --no-cache
docker compose up -d
```

Build args currently include:
- `NEXT_PUBLIC_THEME`
- `NEXT_PUBLIC_LANG_MAIN`
- `NEXT_PUBLIC_LANG_AVAILABLE`
- `NEXT_PUBLIC_MFA_ISSUER`
- `NEXT_PUBLIC_DEFAULT_THEME_MODE`
- `NEXT_PUBLIC_USER_SHAPE`
- `NEXT_PUBLIC_NAME_TYPE`
- `NEXT_PUBLIC_LOAD_TABS`
- `NEXT_PUBLIC_DELETE_REDIRECT_DELAY`
- `NEXT_PUBLIC_BACKEND_TYPE`

Runtime env passthrough currently includes backend and country behavior gates:
- `BACKEND_TYPE`
- `PFP_BACKEND`
- `COUNTRY_CODE_ALLOW_LIST`
- `COUNTRY_CODE_BLOCK_LIST`
- `LOGTO_M2M_RESOURCE`

## Security Architecture (v0.3.0)

v0.3.0 introduced dedicated security modules for defense-in-depth:

| Module | Location | Purpose |
|--------|----------|---------|
| `origin-guard.ts` | `app/logto-kit/logic/origin-guard.ts` | CSRF protection - validates `Origin` header on all non-Server-Action API routes |
| `guards.ts` | `app/logto-kit/logic/guards.ts` | Input validators for all trust boundaries - IDs, user IDs, MFA types, passkey names, custom data |
| `audit.ts` | `app/logto-kit/logic/audit.ts` | Audit log primitive - emits structured events for mutations (no-op until you provide a custom transport) |
| `dev-mode.ts` | `app/logto-kit/logic/dev-mode.ts` | `NODE_ENV` gate - strips dev-only features at runtime in non-development/test environments |

To activate audit logging, create `app/logto-kit/audit-transport.ts` exporting a default `async function(entry: AuditEntry)`.

## Environment Variables

### Required

```env
APP_ID=your-app-id
APP_SECRET=your-app-secret
ENDPOINT=https://auth.yourdomain.org
BASE_URL=http://localhost:3000
COOKIE_SECRET=your-random-secret

# Scopes (comma-separated, required - no defaults)
# Must include: openid,profile,custom_data,email,phone,identities,sessions
# Add: organizations for org features
# Add: organization_roles for org role data
# Add: offline_access for refresh tokens
# Custom scopes pass through to the Logto SDK unchanged
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations,organization_roles
```

### Permission-Based Access Control & Account Management

```env
# M2M for Management API (required for account deletion)
LOGTO_M2M_APP_ID=your-m2m-app-id
LOGTO_M2M_APP_SECRET=your-m2m-app-secret
LOGTO_M2M_RESOURCE=https://your-tenant.logto.app/api  # Logto Cloud. For OSS, defaults to https://default.logto.app/api

# Token Introspection (required for Protected Actions API)
LOGTO_INTROSPECTION_URL=https://your-tenant.logto.app/oidc/token/introspection
```

You have to set this up for pfp uploads and account deletion to work. Also to retrieve user data. 

### Tab Configuration

```env
# Which tabs to show and in what order (comma-separated)
# Allowed: profile, preferences, security, sessions, identities, organizations
# Aliases: personal, user → profile; prefs, custom-data, custom, customdata → preferences; mfa, 2fa, totp → security; sessions, session, devices, activity → sessions; identity → identities; orgs, org → organizations
LOAD_TABS=profile,preferences,security,sessions,identities,organizations
```

### Account Deletion

```env
# Redirect delay after account deletion in ms (default: 3000)
DELETE_REDIRECT_DELAY=3000
```

### Theme Configuration

```env
# Theme folder name (default: default)
# Folder name under app/logto-kit/themes/ containing dark.css and light.css
THEME=default

# Default theme mode: dark or light (default: dark)
DEFAULT_THEME_MODE=dark

# User avatar/badge shape: circle, sq (square), rsq (rounded square), or custom border-radius (e.g., 0.5rem, 4px)
USER_SHAPE=circle
```

### Name Type Configuration

```env
# Controls how user names are displayed in the Profile tab (default: given_family)
# given_family - shows Given Name + Family Name fields
# username      - shows Username field
# full          - shows all three (Given Name, Family Name, Username)
NAME_TYPE=given_family
```

### MFA Configuration

```env
# MFA Configuration
# Name that will show up in the TOTP QR code issuer field
MFA_ISSUER=YourAppName
```

> **WebAuthn Origins**: For WebAuthn passkey operations to work from your app's domain, you must configure `webauthnRelatedOrigins` in your Logto tenant's Account Center settings. This allows cross-origin passkey operations from your deployed app domain.

### i18n Configuration

```env
# Default language
LANG_MAIN=en-US

# Available languages
LANG_AVAILABLE=en-US,ka-GE
```

### Debug Logging

```env
# Set to true to enable verbose server-side debug logging
# (token introspection, API request flow, permission checks)
# DEBUG=true
```

### Backend Type Configuration

Set `BACKEND_TYPE` to select the capability mode of your Logto backend environment:

```env
# Values: blacktop | upstream
# Server default: upstream (if unset or invalid)
BACKEND_TYPE=upstream
```

- **`blacktop` (Custom Fork Mode)**: Enables all advanced features. This includes:
  - **Real-Time Heartbeats**: Keeps the session fresh by posting heartbeats every 30 seconds.
  - **Last Active Timestamps**: Tracks and displays precise `lastActiveAt` timestamps for active user sessions.
  - **Logto Native Avatar Uploads**: Allows choosing `PFP_BACKEND=logto` to store profile pictures natively in Logto customData.
- **`upstream` (Stock OIDC / Official SaaS Mode)**: Intended for stock Logto Open-Source or Cloud instances. In this mode, certain custom features are automatically disabled to guarantee compatibility:
  - **Heartbeats**: The 30s background heartbeat loop is completely disabled.
  - **Last Active Timestamps**: Precise active session tracking is disabled, and timestamps are hidden in the Sessions tab.
  - **Avatar Uploads**: The `logto` native backend is disabled. S3-compatible storage (`s3`) is strictly forced as the effective backend, even if `PFP_BACKEND` is set to `logto`.

Set `BACKEND_TYPE` explicitly in your env file. The resolver falls back to `upstream` when missing or invalid.

### Phone Country Code Filtering

Configure how phone number registration and update validation behaves for different countries.

You can specify either an allow-list or a block-list (they are mutually exclusive). If both are set, the allow-list takes precedence. If neither is set, fallback allow-list is `1,995`.

```env
# Comma-separated list of country dial codes to ALLOW (e.g., 1,995,380).
# If specified, ONLY these country codes can be selected or saved.
# COUNTRY_CODE_ALLOW_LIST=1,995,380

# Comma-separated list of country dial codes to BLOCK (e.g., 7,86).
# If specified, phone numbers from these countries are rejected.
# COUNTRY_CODE_BLOCK_LIST=7,86
```

- **Interactive Dropdown Combobox**: When adding or updating phone numbers, the **PhoneCountrySelect** dropdown matches and filters active countries on-the-fly. If an allow-list is active, only permitted countries are shown. If a block-list is active, blocked countries are removed from the options list.
- **Dropdown fallback behavior**: If filtering produces zero options, the dropdown falls back to the full country list.
- **Server-Side Verification**: Server actions normalize phone input to digits and enforce the country filter. In allow mode, unknown or unmapped prefixes are rejected with `PHONE_COUNTRY_NOT_ALLOWED`.

### Avatar Storage Backend

Avatar backend selection follows this matrix:

- `BACKEND_TYPE=blacktop`: `PFP_BACKEND` can be `logto` or `s3`
- `BACKEND_TYPE=upstream`: effective avatar backend is always `s3`

Choose between these storage backends when `BACKEND_TYPE=blacktop`:

#### Option 1: S3-Compatible Storage

Set `PFP_BACKEND=s3` (default) and configure S3 variables:

```env
PFP_BACKEND=s3

# S3-Compatible Storage (Supabase, AWS S3, MinIO, DigitalOcean Spaces)
S3_BUCKET_NAME=avatars
S3_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/avatars
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=auto

# Optional: Supabase REST API (more reliable)
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Use this when you want full control over storage, already have S3 infrastructure, or need CDN integration.

#### Option 2: Logto Native Avatar API

Set `PFP_BACKEND=logto` to use Logto's built-in avatar handling:

```env
PFP_BACKEND=logto
```

No S3 configuration required. Logto handles upload, storage, and cleanup internally using your existing Logto endpoint. Use this for simpler deployments without external storage infrastructure.

> **Note**: Full configuration details are in `.env.example` and the [Avatar Upload](#avatar-upload) section below.

### NEXT_PUBLIC_* Variants

All user-facing config variables support `NEXT_PUBLIC_` prefixes for Next.js build-time inlining into client bundles: `NEXT_PUBLIC_THEME`, `NEXT_PUBLIC_DEFAULT_THEME_MODE`, `NEXT_PUBLIC_USER_SHAPE`, `NEXT_PUBLIC_LANG_MAIN`, `NEXT_PUBLIC_LANG_AVAILABLE`, `NEXT_PUBLIC_MFA_ISSUER`, `NEXT_PUBLIC_LOAD_TABS`, `NEXT_PUBLIC_NAME_TYPE`, `NEXT_PUBLIC_DELETE_REDIRECT_DELAY`.

### Redis Configuration

Redis is optional but recommended for multi-instance deployments. It provides distributed rate limiting, per-user operation serialization, and M2M token caching.

```env
# Generate with: openssl rand -base64 32
REDIS_PASSWORD=<generated-password>

# Variable-substitution form — password appears only once
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:2998
```

When `REDIS_URL` is not set, the app falls back to per-process in-memory state. This is fine for single-instance dev, but not safe for multi-instance production.

The Docker Compose `redis` service uses `redis:7-alpine`, binds to the loopback interface only (`127.0.0.1:2998:6379`), and enforces `requirepass` via the `REDIS_PASSWORD` env var.

### Docker-Only Variables

```env
# Public base URL for Docker deployment - mapped to BASE_URL at container runtime
# Must match your Cloudflare Tunnel domain
PUBLIC_BASE_URL=https://dash.yourdomain.org
```

## Theme System

Themes are CSS-only. Each theme is a folder in `app/logto-kit/themes/` containing `dark.css` and `light.css` with CSS custom properties (`--ldd-*`). CSS files are loaded via `@import` in `app/globals.css` - change these paths to switch theme folders.

### How it works

- `data-theme` attribute on `<html>` controls which CSS custom properties are active
- `useThemeMode()` provides `{ mode, colors, setMode, toggleMode }` for inline React styles
- `ThemeColors` interface + `DARK_COLORS` / `LIGHT_COLORS` constants provide JS color values that mirror the CSS variables
- All other design values (typography, radii, shadows, transitions) are hardcoded directly in component source code
- CSS files are imported via `@import` in `app/globals.css` - change these paths to switch theme folders

### Customizing

1. Copy `app/logto-kit/themes/default/` to a new folder like `app/logto-kit/themes/my-brand/`
2. Edit the hex values in `dark.css` and `light.css`
3. Update `app/globals.css` to point to your new folder:
   ```css
   @import './logto-kit/themes/my-brand/dark.css';
   @import './logto-kit/themes/my-brand/light.css';
   ```
4. Optionally export matching `ThemeColors` constants if you want inline styles to match your custom CSS:
   ```ts
   export const MY_DARK_COLORS: ThemeColors = { ...DARK_COLORS, accentBlue: '#8b5cf6' };
   ```

No JS registration or factory functions are needed.

### User Shape Configuration

Control the avatar/badge shape across the dashboard:

```env
USER_SHAPE=circle    # Circular (default)
USER_SHAPE=sq        # Square
USER_SHAPE=rsq       # Rounded square
USER_SHAPE=0.5rem   # Custom border-radius
```

## Demo App

The project includes a demo app at `/demo` that acts as a self-documenting showcase for the logto-kit components.

### What It Is

The demo app (`app/demo/`) is a standalone application with 15 sidebar tabs - one for each major logto-kit component or concept:

| Tab | Type | Description |
|-----|------|-------------|
| Getting Started | guide | Clone, configure, set up avatar upload, Logto Console setup |
| UserButton | component | Clickable avatar button, badge, and card with props table and live examples |
| Dashboard | component | Full user management dashboard modal |
| Tabs & Flows | reference | Deep dive into each dashboard tab: props, hooks, actions, FlowModal architecture |
| `<Protected />` | component | Client component for permission-gated UI |
| OrgSwitcher | component | Organization selector dropdown |
| Providers | setup | LogtoProvider, useLogto(), context hooks |
| Theme | config | File-based theme system with dark/light CSS variables |
| i18n | config | Translation files, language switching |
| Sessions | component | Active session management with device info, IP geolocation, and revocation |
| Calculator | component | Permission-gated calculator demo with live RBAC examples |
| Error Handling | reference | Error sanitization: 22 ErrorCodes, safeAction, ActionResult, DataResult, throwOnApiError, sanitize, LogtoApiError |
| Input Guards | reference | Input validation at trust boundaries: 10 assert guards, 8 validate functions, safeUrl, pickPreferences, origin-guard, readEnv |
| Logging | reference | Configurable LOG_BACKEND routing: unstructured (log/warn/error/debug) and structured (logEvent) APIs |
| Primitives | reference | Reusable building blocks: useRefreshable() hook, <RefreshButton />, direct org token fetch, PermissionsBlock pattern |

Each tab has its own documentation file in `app/demo/docs/`. The **UserButton** tab has full documentation with props, notes, and 6 example cards. The **Dashboard** tab has comprehensive documentation - a 4-page guide covering internals, provider sync, tab configuration, and the Server Component rendering pattern. The **tabs-and-flows** doc provides detailed documentation for all dashboard tabs, including props, hooks, actions, and implementation details for Profile, Preferences, Security (with FlowModal architecture, TOTP enrollment, backup codes, and account deletion), Sessions (device overview and session revocation), Identities, and Organizations.

> **Demo Dark Mode Palette:** The docs pages and sidebar use a custom scoped dark palette (`app/globals.css` → `.docs-content-container`) independent of the main dashboard theme for optimal reading contrast:
> - Sidebar BG: `#050608`
> - Docs content BG: `#08090a`
> - Card/section BG: `#171c2a`
> - Border: `#181c2b`

### How It Works

The demo app consists of:

| File | Purpose |
|------|---------|
| `index.tsx` | Demo page entry point |
| `Sidebar.tsx` | Navigation sidebar with user info and theme toggle |
| `ContentArea.tsx` | Main content area - lazy-loads doc files from the registry |
| `nav-data.tsx` | 15-tab navigation definitions with section hints |
| `types.ts` | TypeScript type definitions |
| `docs/getting-started.tsx` | Getting started guide - clone, configure, avatar upload, Logto Console |
| `docs/user-button.tsx` | UserButton documentation - Quick Start, Props table, Notes, 6 example cards |
| `docs/dashboard.tsx` | Dashboard documentation - Internals, Provider Sync, Tab Structure, Rendering (4 pages) |
| `docs/tabs-and-flows.tsx` | Detailed tabs documentation - props, hooks, actions for all dashboard tabs (7 pages) |
| `docs/org-switcher.tsx` | OrgSwitcher documentation - props, wrapper, useOrgMode, setActiveOrg |
| `docs/providers.tsx` | Providers documentation - LogtoProvider, hooks reference |
| `docs/themes.tsx` | Theme system documentation - dual system, color tokens, custom themes |
| `docs/i18n.tsx` | i18n documentation - file-based locales, useLangMode, adding languages |
| `docs/protected.tsx` | Protected component and API documentation - permission-based access control, server actions, examples (4 pages) |
| `docs/errors.tsx` | Error handling guide - sanitization, 22 error codes, safeAction, server action pattern (4 pages) |
| `docs/guards.tsx` | Input guards - 13 assert guards, 8 validate functions, safeUrl, pickPreferences, origin-guard, readEnv (5 pages) |
| `docs/logging.tsx` | Logging - LOG_BACKEND routing, unstructured API, structured logEvent, child loggers (4 pages) |
| `docs/primitives.tsx` | Primitives - useRefreshable() hook, RefreshButton, direct token fetch, PermissionsBlock pattern (2 pages) |
| `docs/components/calculator.tsx` | Permission-gated calculator demo with live RBAC examples |
| `components/SyntaxBlock.tsx` | Syntax-highlighted code block with VSCode Dark+ colors and copy button |
| `components/Section.tsx` | `SectionContainer` and `Section` - multi-page split with keyboard navigation |
| `components/SectionComponents.tsx` | Pre-built page components for documentation (SectionHeader, SectionWrap) |
| `components/useDocStyles.ts` | Shared CSS-in-JS styles for documentation pages |

### Documentation Format

Each doc file in `docs/` is a TSX component wrapped in a `SectionContainer` with `Section` children (each with a mandatory `id` prop). Pages are split horizontally and navigated with **ArrowUp** / **ArrowDown** keys or the bottom-right chevron buttons.

Typical layout:
- **Two-column grid** - Left and right sections side by side (matching `user-button.tsx` pattern)
- **Single column** - For detailed content like the Security tab's FlowModal architecture

To add documentation for a new tab/section:
1. Create a TSX file inside `app/demo/content/{topic}/{section}.tsx`
2. Add the loader to `CONTENT_REGISTRY` in `app/(docs)/[topic]/[section]/page.tsx`
3. Update `NAV_ITEMS` and `SECTION_HINTS` in `app/demo/nav-data.tsx` to include the new topic, its sections, and their section descriptions/hints
4. Use `SectionWrap` for section-bordered layout, `CodeBlock` for code, and inline layouts for live demos

### Using the Demo App

Visit `/demo` to see the demo app in action. It displays:
- A sidebar with 15 navigation tabs covering every major logto-kit feature
- A UserCard showing the logged-in user with name and avatar
- A theme toggle button
- A particle background effect
- Clicking any tab loads its documentation into the content area
- Press **ArrowUp** / **ArrowDown** to switch between pages within a tab
- Bottom-right chevron buttons and a page counter (e.g. "1/2") show the current position

The UserButton tab includes a Quick Start section, a full Props table with TypeScript interface, usage notes, and 6 interactive example cards. The Dashboard tab covers internals, provider sync, tab configuration, and rendering patterns across 4 pages with a two-column grid layout.

### Documentation Utilities

These shared utilities live in `app/demo/components/` and are used by all doc files:

#### SyntaxBlock

A syntax-highlighted code block component using VSCode Dark+ color scheme. Includes a copy button that appears on hover.

```tsx
import CodeBlock from '../components/SyntaxBlock';

// Basic
<CodeBlock code={`<UserButton Size="48px" />`} />

// With title bar
<CodeBlock title="Import" code={`import { UserButton } from './logto-kit';`} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | - | The code string to display |
| `lang` | `'tsx' \| 'ts' \| 'bash'` | `'tsx'` | Language label shown in the title bar |
| `title` | `string` | - | Optional title shown above the code block |

Features: regex-based TSX tokenizer (no external deps), horizontal scroll for long lines, `marginBottom: 6px`, `#1e1e1e` background.

#### SectionContainer & Section

A multi-page layout system. `SectionContainer` is the viewport that manages page transitions via CSS `translateY` - each `Section` child is a full-height page stacked vertically. Pages slide up/down with a cubic-bezier transition.

```tsx
import { SectionContainer, Section } from '../components/Section';

export default function MyDoc() {
  return (
    <SectionContainer>
      <Section id={1}>
        {/* Page 1 content - Quick Start, Props table */}
      </Section>
      <Section id={2}>
        {/* Page 2 content - Example cards */}
      </Section>
    </SectionContainer>
  );
}
```

Features: ArrowUp/ArrowDown keyboard navigation, bottom-right nav buttons with page counter, `overflowY: auto` per page for scrollable content, `overflow: hidden` on the viewport to prevent scrollbar cascade.

### PreferencesProvider

The dashboard provides a `PreferencesProvider` that combines theme and language management. It exports both `useThemeMode()` and `useLangMode()` hooks.

> **Important**: All hooks (`useThemeMode`, `useLangMode`, `useOrgMode`, `useUserDataContext`) must be used within their provider contexts. Using them outside will return no-op values with silent failures - the component will appear to work but changes won't persist.

#### useThemeMode Hook

Any component can use the theme context:

```tsx
import { useThemeMode } from './logto-kit';

function MyComponent() {
  const { mode, colors, setMode, toggleMode } = useThemeMode();
  
  return (
    <button onClick={toggleMode}>
      Current: {mode}
    </button>
  );
}
```

The hook returns:
- `mode` - `'dark' | 'light'`
- `colors` - `ThemeColors` object (bgPage, textPrimary, accentBlue, etc.)
- `setMode(mode)` - Set specific mode
- `toggleMode()` - Toggle between dark/light

#### useLangMode Hook

```tsx
import { useLangMode } from './logto-kit';

function MyComponent() {
  const { lang, setLang } = useLangMode();
  
  return (
    <select value={lang} onChange={(e) => setLang(e.target.value)}>
      <option value="en-US">English</option>
      <option value="ka-GE">Georgian</option>
    </select>
  );
}
```

The hook returns:
- `lang` - Current language code (e.g., `'en-US'`, `'ka-GE'`)
- `setLang(lang)` - Set specific language

#### PreferencesProvider Props

```tsx
<PreferencesProvider 
  initialTheme="dark" 
  initialLang="en-US"
  onUpdateCustomData={async (data) => { /* save to Logto */ }}
  onLangChange={() => { /* called when language changes */ }}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
| `initialOrgId` | `string \| null` | - | Initial organization ID |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Optional callback to persist preferences to Logto customData |
| `onLangChange` | `() => void` | - | Optional callback fired when language changes |

When `onUpdateCustomData` is provided, theme and language changes are automatically synced to Logto for cross-device persistence.

#### Preference Persistence

Theme and language are stored in sessionStorage for instant switching, then synced to Logto customData for cross-device persistence.

**Theme Priority:**
1. sessionStorage (current session - instant)
2. Logto customData.Preferences.theme (cross-device)
3. ENV DEFAULT_THEME_MODE (fallback)

**Language Priority:**
1. sessionStorage (current session - instant)
2. Logto customData.Preferences.lang (cross-device)
3. ENV LANG_MAIN (fallback)

### UserDataProvider

The dashboard provides a `UserDataProvider` and `useUserDataContext()` hook for centralized user data management.

```tsx
import { useUserDataContext } from './logto-kit';

function MyComponent() {
  const userData = useUserDataContext();
  // Returns UserData or null if not available
}
```

#### UserDataProvider Props

```tsx
<UserDataProvider userData={userData}>
  {children}
</UserDataProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `userData` | `UserData` | The user data object to provide |

### Provider Hierarchy

The codebase uses a nested provider structure where each provider wraps its children with specific context:

```
LogtoProvider
├── PreferencesProvider  (theme, language, org state)
│   └── LogtoProviderContent
│       └── UserDataProvider
│           └── children
```

When using the `Dashboard` component standalone (outside `LogtoProvider`), it creates its own provider tree:

```
Dashboard (Server Component)
├── UserDataProvider
│   └── PreferencesProvider
│       └── DashboardClient
```

#### LogtoProvider

LogtoProvider is a convenience wrapper that combines `UserDataProvider` and `PreferencesProvider` into a single component. It also provides a `useLogto()` hook for accessing user data and access token anywhere in your app.

```tsx
import { LogtoProvider, useLogto, Dashboard } from './logto-kit';
import { MobileDashboard } from './logto-kit/components/dashboard/mobile-page';

function MyComponent() {
  const { userData, openDashboard } = useLogto();
  // ...
}

<LogtoProvider 
  userData={userData}
  dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
  initialTheme="dark"
  initialLang="en-US"
  onUpdateCustomData={updateCustomData}
>
  <MyComponent />
</LogtoProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userData` | `UserData` | - | The user data object |
| `dashboard` | `{ desktop: ReactNode; mobile: ReactNode }` | - | Optional dashboard desktop/mobile views |
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Callback for updating user custom data (forwarded to PreferencesProvider) |
| `onLangChange` | `() => void` | - | Callback fired when language changes |

#### useLogto Hook

The `useLogto()` hook provides access to user data, authentication, and all preference state in one place:

```tsx
import { useLogto } from './logto-kit';

function MyComponent() {
  const { userData, openDashboard, mode, colors, lang, setLang, asOrg, setAsOrg } = useLogto();
  // ...
}
```

Returns:

| Field | Type | Description |
|-------|------|-------------|
| `userData` | `UserData` | Current user data |
| `mode` | `'dark' \| 'light'` | Current theme mode |
| `colors` | `ThemeColors` | Color tokens for inline React styles |
| `setMode` | `(mode: 'dark' \| 'light') => void` | Set theme mode |
| `toggleMode` | `() => void` | Toggle between dark/light |
| `lang` | `string` | Current language code |
| `setLang` | `(lang: string) => void` | Set language |
| `asOrg` | `string \| null` | Active organization ID (null = global) |
| `setAsOrg` | `(orgId: string \| null) => void` | Set active organization |
| `openDashboard` | `() => void` | Open the dashboard modal |
| `closeDashboard` | `() => void` | Close the dashboard modal |

Use this hook to access user data, theme, language, and dashboard controls anywhere within `LogtoProvider`.

> **Security note (v0.3.0)**: `accessToken` was removed from browser exposure - it is now only available server-side via `getTokenForServerAction()`. The `useLogto()` hook no longer exposes raw tokens to the client.

#### SessionStorage Caching

User data is automatically cached in sessionStorage under the key `user-data`. This enables:
- Instant access across components without re-fetching
- Persistence across page navigations within the same session
- Automatic hydration on component mount

#### Data Priority

All three user display components (`UserButton`, `UserBadge`, `UserCard`) use a shared `useUserDisplay` hook that resolves data from the provider:

1. **Prop** - if `userData` prop passed to component, use it
2. **Provider** - otherwise use `userData` and `lang` from `useLogto()` context (auto-updates when profile or language changes)

### UserButton, UserBadge & UserCard

The dashboard exports three components for displaying user avatars:

- **UserButton** - clickable avatar, opens Dashboard modal on click
- **UserBadge** - non-interactive display only
- **UserCard** - clickable card with avatar + "Logged in as" + user name, opens Dashboard on click

All three use a shared `useUserDisplay` hook that resolves `userData` and translations from the `LogtoProvider` context. They react to language changes automatically.

```tsx
import { UserButton, UserBadge, UserCard } from './logto-kit';

// Simple avatar button (opens dashboard on click)
<UserButton />

// With options
<UserButton Size="48px" Canvas="Avatar" shape="circle" />

// With custom click handler
<UserButton do={() => console.log('clicked!')} />

// Non-interactive badge
<UserBadge Size="32px" Canvas="Avatar" shape="sq" />

// User card - avatar + "Logged in as" + name (click opens dashboard)
<UserCard Size="32px" shape="rsq" />

// Inside Dashboard - no props needed, uses provider context
<UserButton Size="32px" />
<UserCard Size="32px" shape="circle" />
```

#### Props

All three components share the same props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `Canvas` | `'Avatar' \| 'Initials'` | `Avatar` (when omitted) | Display mode |
| `Size` | `string` | `'6.25rem'` (Button/Badge), `'2.5rem'` (Card) | CSS size (e.g., `'48px'`, `'3rem'`) |
| `shape` | `'circle' \| 'sq' \| 'rsq'` | - | Border radius shape (falls back to `USER_SHAPE` ENV) |
| `userData` | `UserData` | - | User data (optional, uses provider context if not provided) |
| `colors` | `ThemeColors` | - | Color tokens (optional, auto-detected from provider if not provided) |
| `do` | `() => void` | - | Custom click handler (Button and Card only; defaults to `openDashboard`) |

UserCard's "Logged in as" label is automatically translated based on the provider's current language state - no `t` prop needed.

### Calculator Demo

A permission-gated calculator demonstrating the Protected Actions API. Located in `app/demo/components/calculator/`.

#### Files

| File | Purpose |
|------|---------|
| `CalculatorPanel.tsx` | Wrapper with `<Protected>` gate for `calc:basic` permission |
| `CalculatorClient.tsx` | Calculator UI, expression parser, API calls on `=` |
| `action-registry/calc-actions.ts` | Action handlers for basic (+, -, x, /, %) and scientific (sin, cos, log, etc.) operations |

#### How It Works

1. `CalculatorPanel` wraps `CalculatorClient` with `<Protected orgId="5b6sw6p5uzti" perm="calc:basic">`
2. Each operation (+, −, ×, ÷, sin, cos, etc.) is sent to the Protected Actions API as an individual action (`calc/add`, `calc/multiply`, `calc/sin`, etc.)
3. The API validates the user's personal role and permission, computes server-side, and returns the answer
4. The calculator parses expressions into an AST and evaluates by calling the API for each node - it cannot calculate without the API
5. Basic operations require `calc:basic` permission; scientific functions require `calc:scientific`
6. Session state (expression, mode) persists via `sessionStorage`

See the **Protected** tab in the demo app for a live RBAC demo with the calculator.

### AuthWatcher

`AuthWatcher` is a zero-UI component that automatically refreshes the page when authentication state might have changed. This keeps user data in sync without requiring manual refreshes.

```tsx
import { AuthWatcher } from './logto-kit';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <AuthWatcher />
        {children}
      </body>
    </html>
  );
}
```

**What it does:**
- **Tab visibility** - When user switches back to the tab (catches "logged out in another tab")
- **Network reconnect** - When device comes back online (catches expired sessions during offline)
- **Periodic check** - Every 5 minutes by default (catches account deletion while idle)

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `refreshIntervalMs` | `number` | `300000` (5 min) | How often to check auth state. Set `0` to disable. |
| `debounceMs` | `number` | `1000` | Minimum ms between refreshes to prevent spam |

## Custom Logic (Organization & Permission-Based Access Control)

> **⚠️ WARNING - NOT PRODUCTION READY**: This module is FUNCTIONAL but NOT tested enough for production use. 
> Use at your own risk. Extensive testing required before deploying to production.
> This is a work in progress - APIs may change.

The `custom-logic` module provides UI protection components and organization management:
- **\<Protected\>** - Client component for gating UI based on organization permissions
- **OrgSwitcher** - Dropdown for switching between organizations
- **useOrgMode** hook - Access organization context throughout your app

For protected server actions, use the **Protected Actions API** (`POST /api/protected`).

### Exports

```tsx
import {
  // Components
  Dashboard,
  LogtoProvider,
  UserButton,
  UserBadge,
  UserCard,
  OrgSwitcher,

  // Client components
  Protected,
  AuthWatcher,

  // Hooks
  useLogto,
  useThemeMode,
  useLangMode,
  useOrgMode,
  useUserDataContext,
  useAvatarUpload,

  // Organization & Permission-Based Access Control
  OrgSwitcherWrapper,
  setActiveOrg,

  // Validation
  ValidationError,
  validateEmail,
  validatePassword,
  validateUsername,
  validateUrl,
  validateE164,
} from './logto-kit';

import type {
  OrganizationData,
  ValidationResult,
  ThemeColors,
  UserData,
  KitTranslations,
  Translations,
} from './logto-kit';
```

> **Note**: For personal RBAC, use `orgId="self"` in `<Protected />` and the Protected Actions API. For org-scoped RBAC, pass the organization ID.

---

### \<Protected\> - UI Gate Component

A **client component** that conditionally renders children based on permissions. Must be used within `LogtoProvider` context.
**Key behavior:**
- **Self Mode (`orgId="self"`)**: Shifts to user RBAC. It only fetches personal roles and gates strictly on roles (`roleId`), completely bypassing permission checks.
- **Organization Mode (`orgId=<real>`)**: Enforces organization-scoped RBAC. It strictly matches the target `orgId` against the active organization (`asOrg`). If there is a mismatch, the component breaks immediately. If it matches, it checks BOTH roles (`roleId`) and permissions (`perm`).
- Permissions are loaded asynchronously on mount or context change
- Shows `fallback` (or nothing) while loading
- This is a UI convenience component, not a security boundary

```tsx
import { Protected } from './logto-kit';

<Protected perm="read:users">
  <SensitiveData />
</Protected>

<Protected perm={['read:users', 'write:users']} requireAll={false}>
  <AnyPermissionGranted />
</Protected>

<Protected perm="launch-nuke" orgId="org-123">
  <NukeButton />
</Protected>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `perm` | `string \| string[]` | - | Required permission(s) to check |
| `orgId` | `string \| null` | `undefined` | Specific org to check against. If omitted, uses user's stored org preference |
| `orgName` | `string \| null` | - | Look up org by name from userData.organizations |
| `requireAll` | `boolean` | `true` | If `true`, ALL permissions required. If `false`, ANY one suffices |
| `fallback` | `ReactNode` | `null` | Placeholder shown while loading or when access denied |

**With fallback:**

```tsx
<Protected
  orgId="your-org-id"
  perm="kidnap:kids"
  fallback={<div className="animate-pulse">Loading...</div>}
>
  <PresidentControlPanel />
</Protected>
```

**Best Practice - Separate Concerns:**

Avoid wrapping protected content inline in your main page files. Instead, create a dedicated component file for the protected UI and wrap it with `<Protected />` there. This keeps permission logic co-located with the component it guards:

```tsx
// app/admin/admin-panel.tsx
import { Protected } from '../../logto-kit';
import { AdminDashboard } from './admin-dashboard';

export function AdminPanel() {
  return (
    <Protected perm="admin">
      <AdminDashboard />
    </Protected>
  );
}
```

```tsx
// app/page.tsx
import { AdminPanel } from './admin/admin-panel';

// Just import and use - permissions are encapsulated
<AdminPanel />
```

---

### Protected Actions API

A secure API endpoint for executing permission-gated actions from the client.

**Endpoint:** `POST /api/protected`

```tsx
import { useCallback } from 'react';

// Inside a client component
const callProtected = useCallback(async (action: string, payload: unknown) => {
  const response = await fetch('/api/protected', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload })
  });

  const result = await response.json();
  if (result.error) {
    console.error(result.error);
    return null;
  }
  return result.data;
}, []);
```

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | Action name registered in registry |
| `payload` | unknown | No | Data to pass to the action handler (defaults to `{}` if omitted) |

**Response:**

```tsx
// Success (200)
{ error: null, data: <handler-return-value> }

// Error (status varies)
{ error: 'ERROR_CODE', data: null }
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_FIELDS` | 400 | action missing from request body |
| `TOKEN_INVALID` | 401 | Token not active or expired |
| `INTROSPECTION_ERROR` | 401 | Failed to validate token |
| `UNAUTHORIZED` | 401 | Not authenticated or session expired |
| `IMPROPER_SETUP_ERROR` | 500 | Action config missing requiredOrgId, requiredRoleId, or requiredPermId |
| `ORG_NOT_MEMBER` | 403 | User not member of the required org |
| `ACTION_NOT_FOUND` | 404 | Action doesn't exist in registry |
| `ROLE_DENIED` | 403 | User lacks the required role |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `INVALID_PAYLOAD` | 400 | Handler rejected the payload shape |
| `INTERNAL_ERROR` | 500 | Unexpected server error (catch-all) |

---

### Registering Custom Actions

Actions are registered in `app/logto-kit/action-registry/` as async functions returning an `ActionConfig` with three required fields:

```tsx
import type { ActionConfig } from '../logic/types';

export async function getDoSomething(): Promise<ActionConfig> {
  return {
    requiredOrgId: 'self',              // 'self' = personal RBAC, or a real org ID
    requiredRoleId: 'some-role-uuid',   // role ID(s) the user must have
    requiredPermId: 'do:something',     // permission scope(s) required
    handler: async ({ userId, orgId, payload }) => {
      // Your protected logic here
      return { success: true };
    },
  };
}
```

**Handler receives:**
- `userId` - The authenticated user's ID (from token introspection)
- `orgId` - The `requiredOrgId` value from the action config
- `payload` - The payload sent from the client (defaults to `{}` if omitted)

---

### \<OrgSwitcher\> - Organization Selector

A dropdown component for switching between organizations.

```tsx
import { OrgSwitcher } from './logto-kit';

<OrgSwitcher 
  organizations={[
    { id: 'org-1', name: 'Acme Corp' },
    { id: 'org-2', name: 'Beta Inc' }
  ]}
  currentOrgId="org-1"
  mode={mode}
  colors={colors}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `organizations` | `OrganizationData[]` | - | List of organizations to display |
| `currentOrgId` | `string` | - | Currently active organization ID |
| `mode` | `'dark' \| 'light'` | - | Current theme mode |
| `colors` | `ThemeColors` | - | Color tokens for styling |
| `t` | `{ organizations?: { beYourself?: string } }` | - | Optional translations |

**Features:**
- Shows "Be yourself (global)" option to exit org context
- Auto-selects first org if user is in only one
- Persists selection to `customData.Preferences.asOrg`
- Uses sessionStorage for client-side state

---

### setActiveOrg() - Server Action

Validates org membership. Does NOT persist the selection - use `useOrgMode().setAsOrg()` for that.

```tsx
import { setActiveOrg } from './logto-kit';

// Returns true if valid, false if user not in org
const isValid = await setActiveOrg('org-123');

// Clear org selection (act as global)
await setActiveOrg(null);
```

**Returns:** `Promise<boolean>` - `true` if valid org membership, `false` otherwise

---

### useOrgMode() - Hook

Access and manage organization context anywhere in your app. Part of `PreferencesProvider` alongside theme and language.

```tsx
import { useOrgMode } from './logto-kit';

function MyComponent() {
  const { asOrg, setAsOrg } = useOrgMode();
  
  // asOrg: string | null (null = global context)
  // setAsOrg(orgId: string | null) => void
  
  return (
    <div>
      Current org: {asOrg ?? 'global'}
      <button onClick={() => setAsOrg(null)}>Be yourself</button>
    </div>
  );
}
```

**Storage:**
- `sessionStorage` (client) - immediate UI updates
- `customData.Preferences.asOrg` (server) - cross-session persistence

---

### How It Works

#### Protected Actions API Flow

1. **Client Request** - Client calls `POST /api/protected` with `{ action, payload? }` (token and userId are handled server-side)
2. **Token Retrieval** - Gets the session token server-side via `getTokenForServerAction()`
3. **Token Validation** - Validates token via OIDC introspection, extracting `sub` as the authenticated `userId`
4. **RBAC Data Fetch** - Fetches user orgs and active org from `/oidc/me`
5. **Org Membership Check** - Ensures user is member of selected org (or passes through for personal RBAC with orgId="self")
6. **Permission Check** - Calls Management API to verify user's organization token has required permission
7. **Execute Action** - Runs the registered handler if all checks pass

#### Organization Switching Flow

1. User selects org from `<OrgSwitcher>` or Organizations tab
2. `setActiveOrg()` validates membership via OIDC userinfo (live fetch, not cached JWT claims)
3. Selection stored in:
   - `sessionStorage` (client) - for immediate UI updates
   - `customData.Preferences.asOrg` (server) - for persistence
4. `useOrgMode()` hook provides `asOrg` and `setAsOrg()` throughout the app

---

### Required Configuration

#### Environment Variables

```env
# Logto Core
APP_ID=your_app_id
APP_SECRET=your_app_secret
ENDPOINT=https://your-tenant.logto.app
BASE_URL=http://localhost:3000
COOKIE_SECRET=your_cookie_secret

# Scopes (must include org scopes ON TOP of the required ones)
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations,organization_roles

# M2M for Management API
LOGTO_M2M_APP_ID=your_m2m_app_id
LOGTO_M2M_APP_SECRET=your_m2m_app_secret
LOGTO_M2M_RESOURCE=https://your-tenant.logto.app/api

# Token Introspection (required for Protected Actions API)
LOGTO_INTROSPECTION_URL=https://your-tenant.logto.app/oidc/token/introspection
```

#### Logto Console Setup

1. **Application Scopes**: Add `organizations`
2. **M2M Application**: Create a Machine-to-Machine app with:
   - Permissions to read organization roles and user data
   - Add to environment variables above

---

### Usage Examples

#### Basic Permission Check

```tsx
import { Protected } from './logto-kit';

export default function AdminPage() {
  return (
    <Protected perm="admin">
      <div>
        <h1>Admin Dashboard</h1>
        <DeleteUserButton />
      </div>
    </Protected>
  );
}
```

#### With Org-Specific Content

```tsx
<Protected perm="view:reports" orgId="org-abc">
  <OrgReport orgId="org-abc" />
</Protected>
```

---

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "User not in organization" | User must be a member of the org in Logto |
| Permission always returns false | Check: 1) User has the permission in Logto Console, 2) Permission string matches exactly, 3) Management API token is configured |
| Org switcher not appearing | User needs multiple organizations in their Logto claims |
| "PERMISSION_DENIED" | Verify user has the permission in Logto Console for the active organization |
| "IMPROPER_SETUP_ERROR" | Action config missing required fields - check action registry for missing requiredOrgId, requiredRoleId, or requiredPermId |
| "ORG_NOT_MEMBER" | Selected org not in user's organization list |
| "ACTION_NOT_FOUND" | Action not registered in `action-registry/index.ts` |
| "TOKEN_INVALID" | Token expired, revoked, or userId mismatch |

---

### i18n System

Translations are loaded from `app/logto-kit/locales/`:

- `index.ts` - Locale loader and registry
- `{locale-code}.ts` - Translation files (e.g., `en-US.ts`, `ka-GE.ts`)

### Adding a New Language

1. Create a new file in `app/logto-kit/locales/{locale-code}.ts`
2. Export a `Translations` object matching the interface
3. Register in `locales/index.ts`
4. Add to `LANG_AVAILABLE` in your `.env`

## Tab Configuration

The dashboard supports configurable tabs via the `LOAD_TABS` environment variable. This allows you to control which tabs are displayed and their order.

### Tab IDs and Aliases

Available tab IDs with their display aliases:

| Tab ID | Aliases | Description |
|--------|---------|-------------|
| `profile` | `personal`, `user` | User profile and basic info |
| `preferences` | `prefs`, `custom-data`, `custom`, `customdata` | User preferences and settings |
| `security` | `mfa`, `2fa`, `totp` | Multi-factor authentication management (TOTP, backup codes, passkeys) |
| `sessions` | `session`, `devices`, `activity` | Active session management and device overview |
| `identities` | `identity` | External identity providers |
| `organizations` | `orgs`, `org` | Organization memberships and roles |

### Configuration Examples

```env
# Show all tabs in default order
LOAD_TABS=profile,preferences,security,sessions,identities,organizations

# Show only profile, security, sessions, and preferences (in that order)
LOAD_TABS=profile,security,sessions,preferences

# Use aliases - these are all equivalent to the first example
LOAD_TABS=personal,prefs,mfa,sessions,identity,orgs
LOAD_TABS=user,custom-data,2fa,devices,identities,organization

# If not set or empty, shows all tabs in default order
```

### How Tab Loading Works

1. **ENV Parsing**: `LOAD_TABS` is parsed as comma-separated list
2. **Alias Resolution**: Each token is mapped to its canonical tab ID
3. **Validation**: Invalid tokens are skipped with a warning
4. **Deduplication**: Duplicate tabs are removed while preserving order
5. **Fallback**: If no valid tabs remain, all tabs are shown in default order

## Implementation Patterns

This section explains how to integrate and extend the dashboard. The Dashboard is a Server Component passed as a JSX prop to LogtoProvider, which renders it as a centered modal.

### Authentication Model

The app uses an **open browsing** model — all routes are accessible without signing in. Authentication is opt-in, triggered by user action.

- **`proxy.ts`** (Next.js middleware) does **NOT** enforce authentication. It allows all requests through and only handles session error recovery (stale cookies, `invalid_grant`) and sets per-request CSP headers.
- **Unauthenticated users** see an anonymous `UserButton` (generic user icon). Clicking it opens the main auth modal (sign-in / sign-up).
- **Auth-gated features** (e.g., the calculator demo) open the main auth modal with a "Read Only Mode" option when the user is not signed in — they do not show an inline fallback error.
- **Sign-in** is initiated exclusively by `signIn()` from `@logto/next/server-actions`, called in `GET /api/auth/sign-in`. The `handleSignIn()` function in `app/callback/route.ts` **only** completes the OAuth callback after Logto redirects back.
- **Protected Server Actions** reject unauthenticated calls explicitly with `UNAUTHENTICATED`. The middleware does not gate server action calls.

> **CSP connect-src**: `next.config.ts` dynamically builds the `connect-src` CSP directive from the `ENDPOINT` env var (no hardcoded domains). Allowed external domains: `ipapi.co` (IP geolocation), `basemaps.cartocdn.com` (map tiles), `supabase.co` (avatar storage), `wss:` (HMR in dev).

Basic request flow:

```
Request → proxy.ts
  → Session error (stale cookie / invalid_grant) → redirect to /api/wipe
  → Any other state (authed or not) → pass through to page/route handler
```

### Making Routes Require Auth

All routes are public by default. If you want to protect a specific route (redirect unauthenticated users to sign-in), add a server-side auth check inside the page component using `getLogtoContext()`. Example:

```typescript
// app/admin/page.tsx
import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../logto-kit/config';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const { isAuthenticated } = await getLogtoContext(getLogtoConfig());
  if (!isAuthenticated) redirect('/api/auth/sign-in');
  // ...
}
```

### Using the Dashboard Component

The Dashboard is a Server Component that fetches data server-side and renders as a centered modal. You can import it anywhere:

```tsx
import { Dashboard } from './logto-kit';

export default function AdminPage() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <Dashboard />
    </div>
  );
}
```

This is the main use case - drop it into your app wherever you need it. The Dashboard automatically fetches user data on the server and displays as a centered modal overlay.

### Dashboard Provider Structure

The Dashboard Server Component fetches user data on the server and renders as a centered modal. When imported standalone, it does not automatically wrap your consuming app. Instead, it only wraps its own `DashboardClient` component with two context providers:

```tsx
<UserDataProvider userData={userData}>
  <PreferencesProvider initialTheme={theme} initialLang={lang} onUpdateCustomData={updateCustomData}>
    <DashboardClient ... />
  </PreferencesProvider>
</UserDataProvider>
```

A wrapper like `<LogtoProvider>` is needed to wrap the consuming application if you want these context providers and hooks to be accessible across your entire app subtree.

This means:
- **UserDataProvider** - Provides user data to all child components (server-fetched)
- **PreferencesProvider** - Manages theme and language state with automatic persistence to Logto

Both providers expose hooks that child components can use:
- `useUserDataContext()` - Access user data
- `useThemeMode()` - Access mode and colors (ThemeColors object)
- `useLangMode()` - Access current language

The preferences tab no longer needs props passed to it - it uses the hooks directly!

### Adding a Custom Tab

1. Create your tab component in `app/logto-kit/components/dashboard/tabs/`
2. Add to `LOAD_TABS` in your `.env`

The tab system is pretty simple - look at existing tabs for examples.

### Adding a Theme

1. Copy `app/logto-kit/themes/default/` to `app/logto-kit/themes/{your-theme}/`
2. Edit the hex values in `dark.css` and `light.css`
3. Import your CSS files in `app/layout.tsx` or `app/globals.css`
4. Set `THEME=your-theme` in `.env`

### Adding a Language

1. Create `app/logto-kit/locales/{locale-code}.ts`
2. Follow the pattern in existing locale files
3. Register in `locales/index.ts` and add the locale code to the `LocaleCode` type
4. Add to `LANG_AVAILABLE` in `.env`

### Refreshable Data Blocks (Primitives)

Three reusable building blocks for data that needs live-refreshing without full page reloads or re-authentication:

| Primitive | File | Purpose |
|-----------|------|---------|
| `useRefreshable()` hook | `hooks/use-refreshable.ts` | 0→35ms→1 toggle - unmounts children, waits one render cycle, remounts fresh |
| `<RefreshButton />` | `components/dashboard/shared/RefreshButton.tsx` | Shared button that lives inside the guarded block |
| Direct token fetch | `logic/actions/organizations.ts` | Calls Logto's `/oidc/token` directly, bypassing the SDK's cookie-persisted `accessTokenMap` cache |

**Why this pattern exists:**

`getOrganizationToken()` returns stale cached tokens. Direct POST to `/oidc/token` bypasses the cache without cookie writes.

**Usage pattern:**
```tsx
function MyDataBlock({ orgId }) {
  const { visible, triggerRefresh } = useRefreshable();
  const [data, setData] = useState([]);
  
  useEffect(() => { fetchMyData(orgId).then(setData); }, [orgId]);
  
  if (!visible) return null; // 0 = unloaded
  
  return (
    <div>
      <RefreshButton onClick={triggerRefresh} loading={loading} ... />
      {data.map(d => <div key={d.id}>{d.label}</div>)}
    </div>
  );
}
```

Documented in the Primitives tab in `app/demo/docs/primitives.tsx`.

## Cookie & Session Management

The dashboard handles stale cookies automatically. When the Logto access token goes stale:

1. Request to fetch data fails
2. System detects "stale cookie" error
3. Browser is redirected to `GET /api/wipe` which clears all app cookies
4. Browser is redirected to `/` - a fresh token is obtained from the valid Logto session
5. Dashboard loads normally

`/api/wipe` supports both `GET` (browser navigation - redirect-based flow) and `POST` (CSRF-safe fetch for programmatic use).

### Sessions Tab - Logto Fork Required

> **⚠️ NOTE**: Basic session listing (session IDs, timestamps, device info) works with any Logto version. The Sessions tab's advanced features (`isCurrent` flag, `lastActiveAt`, heartbeat endpoint) require a patched Logto backend.
> Until [upstream PR #8748](https://github.com/logto-io/logto/pull/8748) is merged, you must run Logto from the fork branch:
> [`odinwerks/logto - feat/session-last-active-at`](https://github.com/odinwerks/logto/tree/feat/session-last-active-at)
>
> A subset branch with only the `isCurrent` flag (no heartbeat/lastActiveAt) is available at
> [`feat/iscurrent-v1.39`](https://github.com/odinwerks/logto/tree/feat/iscurrent-v1.39).

The Sessions tab features include:
- **`isCurrent` badge** - The session backing the current request is marked with a green "This device" badge
- **`lastActiveAt`** - Each session shows when it was last active (`null` / `"Active now"` / ISO timestamp)
- **IP geolocation minimap** - Sessions are shown on an interactive map via `SessionMiniMap` / `SessionMapModal`. IP geolocation lookups are cached with a 5-minute TTL via `geo-cache.ts`.
- **Automatic heartbeat** - A zero-UI `SessionHeartbeat` component fires `recordHeartbeat()` every 30s and on tab focus
- **Revoke all other sessions** - Safe-guarded: aborts if no `isCurrent` session is identified

### Manual Cookie Wipe

Navigate to `/api/wipe` in a browser (GET) to clear all app cookies and be redirected to `/`. Or send a POST request programmatically:

```bash
curl -X POST http://localhost:3000/api/wipe -H "Cookie: <your-session-cookie>"
```

### Force Sign-Out

POST to `/api/wipe` with query parameter `?force=true` to completely sign out - clears both app cookies AND the Logto session:

```bash
curl -X POST "http://localhost:3000/api/wipe?force=true" -H "Cookie: <your-session-cookie>"
```

## User Preferences & JSON Schema

The dashboard automatically stores user preferences (theme mode and language selection) in Logto's `customData` field under a `Preferences` key. This allows preferences to persist across sessions and devices.

### JSON Schema Update (Important!)

To ensure type safety and proper validation in your Logto application, update your Logto applications JSON schema to include the `Preferences` key:

```json
{
  "type": "object",
  "properties": {
    "Preferences": {
      "type": "object",
      "properties": {
        "theme": {
          "type": "string",
          "enum": ["dark", "light"]
        },
        "lang": {
          "type": "string",
          "pattern": "^[a-zA-Z]{2}-[A-Z]{2}$"
        },
        "asOrg": {
          "type": ["string", "null"]
        }
      },
      "additionalProperties": false
    }
  },
  "additionalProperties": true
}
```

This ensures that:
1. The `Preferences` object has the correct structure
2. Only valid theme values (`dark` or `light`) are accepted
3. Language codes follow the locale pattern (e.g., `en-US`, `ka-GE`)
4. Other custom data keys remain unaffected

### How Preferences Work

1. **First Visit**: No preferences exist, defaults from ENV are used (`DEFAULT_THEME_MODE`, `LANG_MAIN`)
2. **User Changes**: When user changes theme or language, preferences are saved to `customData.Preferences`
3. **Subsequent Visits**: Preferences are read from `customData` and override ENV defaults
4. **ENV Changes**: If supported languages change (ENV `LANG_AVAILABLE`), preferences are validated and normalized

## Avatar Upload

The dashboard supports user avatar uploads via drag-and-drop or file browser. The Profile tab includes a canvas-based **ImageCropper** (`app/logto-kit/components/dashboard/shared/ImageCropper.tsx`) for pre-crop before upload. Email and phone management in the Profile tab uses **ContactRow** (`shared/ContactRow.tsx`) with verification flows driven by **FlowModal**. When a user uploads an image, it's stored in S3-compatible storage and the URL is automatically saved to their Logto profile.

> **Security Note**: The previous URL input box has been removed. Users can only upload images via drag-and-drop or file browser. This prevents malicious URL injection attacks. If storage is not configured in production, uploads will fail with a clear error message.

### Architecture

Avatar upload is implemented as a **Next.js Server Action** (`uploadAvatar()` in `app/logto-kit/logic/actions/avatar.ts`). The client calls the Protected Actions API (`POST /api/protected/`), which validates auth and delegates to the server action:

```
┌─────────────┐     ┌─────────────────────────────────┐     ┌───────────┐
│   Client    │────▶│  Server Action: uploadAvatar()  │────▶│  S3       │
│             │     │  (app/logto-kit/logic/actions/  │     │  Storage  │
│ 1. Select   │     │   avatar.ts)                    │     │           │
│    file     │     │                                 │     │ {userId}/ │
│ 2. Call     │     │ 1. Derive token + userId        │     │   you.png │
│    action   │     │    server-side from session     │     │           │
│ 3. Get URL  │◀────│ 2. Validate file (MIME + size)  │◀────│           │
└─────────────┘     │ 3. Upload to S3                 │     └───────────┘
      │             └─────────────────────────────────┘
      │ 4. Push URL to Logto
      ▼
┌─────────────────┐
│  Logto Account  │
│  API            │
│  updateAvatar() │
└─────────────────┘
```

### Security

The access token and user ID are **derived server-side** from the session cookie - they are never accepted from the client. This prevents token leakage and cross-user upload attempts.

Server Actions enforce same-origin at the framework level, eliminating CSRF from cross-site origins.

> **Note**: The same server-side credential derivation pattern is used for account deletion - the server never trusts client-supplied tokens or user IDs.

### Environment Variables

Add these to your `.env` file:

```env
# ===============================================
# AVATAR UPLOAD STORAGE CONFIGURATION
# ===============================================

# S3-Compatible Storage (Supabase, AWS S3, MinIO, DigitalOcean Spaces)

# Bucket name for storing avatars
S3_BUCKET_NAME=avatars

# Public-facing URL for reading stored avatars
# This is what gets saved to Logto and displayed to users
S3_PUBLIC_URL=https://your-project.supabase.co/storage/v1/object/public/avatars

# S3 API Endpoint
# For Supabase: https://your-project.supabase.co/storage/v1/s3
# For AWS S3: https://s3.amazonaws.com
# For MinIO: http://localhost:9000
S3_ENDPOINT=https://your-project.supabase.co/storage/v1/s3

# S3 Credentials
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
S3_REGION=auto

# ===============================================
# OPTIONAL: Supabase Storage REST API
# ===============================================
# If using Supabase Storage, you can use their REST API directly
# instead of S3 compatibility. Get the service role key from:
# Supabase Dashboard → Settings → API → Service role key
#
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
#
# When set, the system uses Supabase's REST API (more reliable).
# When unset, uses MinIO client (works with AWS S3, DO Spaces, MinIO).
```

### Supported Storage Backends

| Storage | S3_ENDPOINT | Notes |
|---------|-------------|-------|
| **Supabase** | `https://{project}.supabase.co/storage/v1/s3` | Use REST API with `SUPABASE_SERVICE_ROLE_KEY` for best results |
| **AWS S3** | `https://s3.amazonaws.com` | Standard AWS S3 |
| **DigitalOcean Spaces** | `https://{region}.digitaloceanspaces.com` | S3-compatible |
| **MinIO** | `http://localhost:9000` | Self-hosted S3-compatible |

### File Requirements

- **Allowed types**: JPEG, PNG, WebP, GIF
- **Max size**: 2 MB
- **Storage path**: `{userId}/you.png` (always overwrites previous)

### Setup Steps

1. **Create S3 Bucket**:
   - Create a new bucket named `avatars`
   - Set it to **Public** (for avatar viewing)
   - Or configure appropriate bucket policies

2. **Configure Credentials**:
   - Add the environment variables to `.env`
   - Ensure credentials have `s3:PutObject` permission on the bucket

3. **Test**:
   - Go to the Profile tab in the dashboard
   - Try uploading an avatar image
   - The image should appear and persist to your Logto profile

### Implementation Details

The avatar upload system consists of:

| File | Purpose |
|------|---------|
| `app/logto-kit/logic/actions/avatar.ts` | Server Action - validates file, derives auth from session, uploads to S3 |
| `app/logto-kit/hooks/use-avatar-upload.ts` | React hook for client-side upload state management |

The hook (`useAvatarUpload`) is already integrated into the Profile tab component. It:
1. Builds a `FormData` with only the `file` field
2. Calls the `uploadAvatar()` Server Action directly
3. On success, automatically updates the avatar in Logto via `updateAvatarUrl()`

### Usage in Custom Components

You can use the avatar upload hook in your own components:

```tsx
import { useAvatarUpload } from './logto-kit';

function MyAvatarUploader() {
  const { upload, isUploading, error } = useAvatarUpload({
    onSuccess: (url) => console.log('Uploaded to:', url),
    onError: (msg) => console.error('Failed:', msg),
  });

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}
```

## Server Actions

All server actions are exported from `logto-kit` and can be used in your own custom flows when the provided UI doesn't meet your needs.

### Import

```tsx
import {
  fetchDashboardData,
  signOutUser,
  updateUserBasicInfo,
  updateUserProfile,
  updateUserCustomData,
  updateAvatarUrl,
  updateUserPassword,
  deleteUserAccount,
  uploadAvatar,
  verifyPasswordForIdentity,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyVerificationCode,
  updateEmailWithVerification,
  updatePhoneWithVerification,
  removeUserEmail,
  removeUserPhone,
  getMfaVerifications,
  generateTotpSecret,
  addMfaVerification,
  deleteMfaVerification,
  replaceTotpVerification,
  generateBackupCodes,
  getBackupCodes,
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
  getUserSessions,
  getSessionsWithDeviceMeta,
  revokeUserSession,
  revokeAllOtherSessions,
  getUserGrants,
  revokeUserGrant,
  getOrganizationUserPermissions,
  getUserRoles,
} from './logto-kit';
```

### Profile Updates

```tsx
// Update basic info (name, username)
await updateUserBasicInfo({ name: 'John', username: 'johndoe' });

// Update profile (given name, family name)
await updateUserProfile({ givenName: 'John', familyName: 'Doe' });

// Update custom data
await updateUserCustomData({ preferences: { notifications: true } });

// Update avatar URL
await updateAvatarUrl('https://example.com/avatar.png');
```

### Password & Account

```tsx
// Update password (requires identity verification first)
await updateUserPassword('newPassword123', 'verificationRecordId');

// Delete account (requires identity verification record ID; access token is derived server-side)
await deleteUserAccount('identityVerificationRecordId');

// Sign out and clear cookies
await signOutUser();
```

### MFA Management

```tsx
// List all MFA methods
const mfaList = await getMfaVerifications();

// Generate TOTP secret for new enrollment
const { secret } = await generateTotpSecret();
// Use `secret` with qrcode.react to generate a scannable QR code

// Add MFA verification (takes 2 args: verification payload + identity verification record ID)
await addMfaVerification({ type: 'Totp', payload: { secret, code: '123456' } }, 'verificationRecordId');

// Delete MFA method
await deleteMfaVerification('mfaVerificationId', 'verificationRecordId');

// Replace an existing TOTP verification (unlinks old, links new)
await replaceTotpVerification('new-totp-secret', '123456', 'verificationRecordId');

// Generate backup codes
const { codes } = await generateBackupCodes('verificationRecordId');

// Get existing backup codes
const backupCodes = await getBackupCodes('verificationRecordId');
```

### WebAuthn Passkeys

```tsx
// Request registration options from Logto
const { registrationOptions, verificationRecordId } = await requestWebAuthnRegistration();

// Client-side: run browser ceremony with @simplewebauthn/browser
import { startRegistration } from '@simplewebauthn/browser';
const response = await startRegistration({ optionsJSON: registrationOptions });

// Verify and link the passkey to the account
await verifyAndLinkWebAuthn(response, verificationRecordId, identityVerificationRecordId);

// Rename a passkey
await renamePasskey('passkey-verification-id', 'My MacBook', identityVerificationRecordId);

// Delete a passkey (uses existing deleteMfaVerification)
await deleteMfaVerification('passkey-verification-id', identityVerificationRecordId);
```

> **Note**: WebAuthn requires configuring `webauthnRelatedOrigins` in your Logto tenant's Account Center settings to allow cross-origin passkey operations from your app's domain.

### Sessions & Grants

```tsx
// Get all user sessions (raw from Logto API)
const sessions = await getUserSessions('identityVerificationRecordId');

// Get sessions with device metadata (browser, OS, IP geo-location)
const sessionsWithMeta = await getSessionsWithDeviceMeta('identityVerificationRecordId');

// Revoke a single session
await revokeUserSession('sessionId', 'identityVerificationRecordId');

// Revoke all sessions except the current one
await revokeAllOtherSessions('identityVerificationRecordId');

// Get OAuth grants (third-party app consents)
const grants = await getUserGrants();

// Revoke a grant (third-party app consent)
await revokeUserGrant('grantId');
```

### Organization Permissions

```tsx
// Get all permissions for a user in a specific organization
const permissions = await getOrganizationUserPermissions('org-123');
// Returns: string[] (e.g., ['read:users', 'write:users'])

// Get all roles assigned to the authenticated user
const roles = await getUserRoles();
// Returns: DataResult<UserRole[]> ({ id, name, description, type, tenantId, isDefault })
```

### Utilities

```tsx
import { formatPhone } from './logto-kit';

// Format a raw E.164 phone number for display
const displayPhone = formatPhone('+12345678901');
// "+1 234 567 8901"
```

### Identity Verification

```tsx
// Verify password for identity operations
const { verificationRecordId } = await verifyPasswordForIdentity('password123');

// Send email verification code
const { verificationId } = await sendEmailVerificationCode('user@example.com');

// Send phone verification code  
const { verificationId } = await sendPhoneVerificationCode('+1234567890');

// Verify any code (email, phone, or backup)
await verifyVerificationCode('email', 'user@example.com', 'verificationId', '123456');

// Update email with verification
await updateEmailWithVerification('newemail@example.com', 'verificationId', 'verificationRecordId');

// Update phone with verification
await updatePhoneWithVerification('+1234567890', 'verificationId', 'verificationRecordId');

// Remove email
await removeUserEmail('verificationRecordId');

// Remove phone
await removeUserPhone('verificationRecordId');
```

### Avatar Upload

```tsx
// Upload avatar (returns the public URL)
const { url } = await uploadAvatar(formData);

// FormData must contain ONLY:
// - file: File object (JPEG, PNG, WebP, GIF, max 2MB)
// The access token and user ID are derived server-side from the session cookie.
const formData = new FormData();
formData.append('file', fileInput.files[0]);
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Testing

The project uses **Vitest** with `jsdom` for browser-like test environment. Test files (`.test.ts` / `.test.tsx`) are co-located alongside their source modules.

```bash
# Run all tests
npm run test:run

# Watch mode
npm test
```

**Test coverage** (27 test files):
- Security: `origin-guard.test.ts`, `guards.test.ts`, `dev-mode.test.ts`
- Logic: `validation.test.ts`, `errors.test.ts`
- Actions: `sessions.test.ts`, `webauthn.test.ts`
- Components: `profile.test.tsx`, `SessionMapModal.test.tsx`
- Custom logic: `set-active-org.test.ts`

Configuration: `vitest.config.ts` and `vitest.setup.ts` at the project root.

## Todo

> **⚠️ Organization/RBAC features are FUNCTIONAL but NOT PRODUCTION READY**
> Extensive testing required before production use. APIs may change.

### Security TODO - Enhanced Session Context Validation

**Goal**: Prevent stolen tokens from being used to call Protected API actions by validating session context (user agent, GEO location) against Logto's native session data.

#### Attack Vector Being Mitigated

Imagine: User (SEDH - evil dingus hacker) steals a token:
1. User closes tab in Georgia, USA
2. SEDH tries to call Protected API from Mexico/Russia using stolen token
3. Even if SEDH has the token + org ID + permissions → **BLOCKED** because GEO/UA doesn't match user's active sessions

#### Current Protected API Security (Already Implemented)

| Check | Purpose |
|-------|---------|
| ✅ Token introspection | Token is active (not expired/revoked) |
| ✅ User ID vs OIDC sub | Token belongs to the claimed user |
| ✅ Org membership | User is member of the selected organization |
| ✅ Permission check | User has required permission for action |

#### New Security Pipeline - Session Context Validation

| Check | Data Source | Purpose |
|-------|-------------|---------|
| 🔲 **User Agent Match** | Request UA vs Logto sessions | Detect device/browser mismatch |
| 🔲 **GEO Location** | Request IP country vs Logto session GEO | Detect impossible travel |

#### Implementation Plan

**Phase 1: Core Security Module**

1. Create `app/logto-kit/action-registry/security-validation.ts`
   - Fetch user's active sessions from Logto API (`GET /api/my-account/sessions`)
   - Parse User-Agent header into components (browser, OS, device type)
   - Compare request context against all active sessions (any session match = pass)
   - Country-level GEO matching (no IP stored, just country from Logto)

2. User Agent Matching Strategy (Strict but Smart)
   ```
   Extract from request:
   - browser: exact match (Chrome, Firefox, Safari, Edge)
   - browserVersion: major version match only (120.x == 120.y)
   - os: exact match (Windows, macOS, Linux, iOS, Android)
   - deviceType: exact match (desktop, mobile, tablet)
   
   Excluded (too volatile):
   - Full UA string (browser updates change it)
   - OS version (too many variants)
   ```

3. GEO Matching Strategy
   ```
   Normal Mode:
   - Country must match exactly (e.g., "US" == "US")
   
   Travel Mode (user-triggered):
   - Bypass country check
   - Still validate UA
   ```

4. Integrate into Protected Actions API (`/api/protected`)
   - Add security validation after token introspection, before org validation
   - New error codes:
     - `SESSION_CONTEXT_MISMATCH` (403) - Request context doesn't match any active session
     - `GEO_MISMATCH` (403) - Request location doesn't match session
     - `UA_MISMATCH` (403) - Request device doesn't match session

**Phase 2: Travel Mode UI**

5. Add travel mode toggle to Preferences tab
   ```typescript
   // In customData.Preferences:
   {
     "travelMode": {
       "enabled": true,
       "expiresAt": "2024-01-15T00:00:00Z"  // Auto-disable after trip
     }
   }
   ```
   - User enables before traveling
   - Auto-expires after set time
   - Can be disabled manually

**Phase 3: Security Hardening**

6. Error handling: Hard reject on security violation
   - Return 403 with specific error code
   - Clear `asOrg` in customData (force re-selection)
   - Log security event for audit

#### Security Check Flow

```
Request arrives at /api/protected:
  - token, id, action, payload (from client)
  - User-Agent header (automatic)
  - IP address (automatic for GEO)

1. Token introspection
   └─> Get active status + sub claim

2. Session security validation (NEW)
   ├─> Fetch user's active sessions from Logto
   ├─> Parse request UA → {browser, os, deviceType}
   ├─> Get GEO country from request IP
   ├─> Compare against all active sessions:
   │     - UA match? (browser + os + deviceType)
   │     - GEO match? (country)
   └─> If no match → SECURITY_VIOLATION (hard reject)

3. Org validation (existing)
   └─> Check asOrg from customData.Preferences

4. Permission check (existing)
   └─> Verify user has required permission

5. Execute action
```

#### Files to Modify/Create

| File | Changes |
|------|---------|
| `app/logto-kit/action-registry/security-validation.ts` | **NEW**: UA parsing, GEO matching, session fetching |
| `app/api/protected/route.ts` | Add security validation pipeline |
| `app/logto-kit/components/dashboard/tabs/preferences.tsx` | Add travel mode toggle |
| `app/logto-kit/logic/actions/account.ts` | Add `updateTravelMode` action |
| `app/logto-kit/locales/en-US.ts` | Add travel mode translations |
| `app/logto-kit/locales/ka-GE.ts` | Add travel mode translations |

#### Example Logto Session Structure

```json
{
  "payload": {
    "exp": 1712345678,
    "iat": 1712345678,
    "jti": "session-id-here",
    "uid": "user-id",
    "kind": "Session",
    "loginTs": 1712345678,
    "accountId": "user-id",
    "authorizations": {}
  },
  "lastSubmission": {
    "interactionEvent": "SignIn",
    "userId": "user-id",
    "verificationRecords": [...]
  }
}
```

Note: Session context (IP, user agent, GEO) is provided by Logto v1.38.0+ via the session management API. GEO data is attached to sessions by Logto when available.

#### Discussion Notes (for future reference)

- **IP matching excluded**: IPs change too frequently (NAT, VPN, dynamic allocation) - not useful for security
- **Country matching sufficient**: Store country only, not exact location (privacy + no PII liability)
- **Any session match**: If user has 3 sessions (phone, laptop, tablet), request matching ANY is sufficient
- **Step-up auth deferred**: Could be implemented later but adds complexity (Logto's verification API)
- **Travel mode UX**: User proactively enables before traveling, auto-expires after trip duration

#### ENV Configuration (Future)

```env
# Security settings (optional, defaults to strict)
SECURITY_GEO_CHECK=enabled  # enabled | disabled
SECURITY_UA_CHECK=enabled    # enabled | disabled
SECURITY_TRAVEL_MODE_UI=enabled  # Show travel mode toggle in preferences
```

---

### Functions

- [x] Org switcher - Complete (OrgSwitcher, OrgSwitcherWrapper, setActiveOrg, useOrgMode)
- [x] Protected component - Complete (<Protected> client component with async permission loading)
- [x] Protected Actions API - Complete (POST /api/protected endpoint)
- [x] RBAC validation - Complete (verifyOrgAccess, verifyPersonalAccess, ActionConfig with mandatory fields)
- [x] `fallback` prop - Complete (custom placeholder while loading/denied)
- [ ] Fine-tune permission checks for your needs
- [ ] Extensive testing before production use

### UI Polish
- [x] Profile tab - redesigned with proper edit UI
- [x] Preferences tab - removed JSON editor
- [x] Security tab - button styling unified across all tabs
- [x] Identities tab - reviewed, looks good
- [x] Organizations tab - implemented with org memberships, roles display, and org switching 

### Theme Context Provider
- [x] Currently theme handling is internal to the dashboard
- [x] Need to export theme context so consuming apps can sync theme
- [x] For now: simple "is dark / is light" hook
- [x] Later: full context provider that pulls theme from dashboard
- [x] Added onUpdateCustomData prop for Logto sync
- [x] Exported from providers/ folder

### Lang Context Provider
- [x] New LangModeProvider for language management
- [x] Exports useLangMode hook
- [x] Persists to sessionStorage and Logto customData

### UserData Context
- [x] New UserDataProvider for user data management
- [x] Exports useUserDataContext hook
- [x] Caches in sessionStorage

### UserButton
- [x] UserBadge exists but could use finishing touches
- [x] Make it properly reusable as a standalone component
- [x] Auto-fetch user data when used outside Dashboard
- [x] Priority system: prop → context → fetch
- [x] Fallback user icon after 1.5s timeout
- [x] UserCard component - wider card with avatar + "Logged in as" + name
- [x] Shared useUserDisplay hook - all three components use provider context
- [x] Translations resolved from provider lang state (no t prop needed)

### Avatar Upload
- [x] Profile tab - image upload via drag-and-drop
- [x] S3-compatible storage (Supabase, AWS S3, MinIO, DO Spaces)
- [x] OIDC token introspection for security
- [x] User ID matching prevents cross-user uploads
- [x] Automatic URL update to Logto profile

### Conquer All.
- [ ] [Conquer All.](https://music.youtube.com/watch?v=l6t4gx8vCMI)

## License
If you cause the decadence of Earth running this horrid code, I am not liable. Also take care <3
