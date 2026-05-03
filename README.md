# Logto components kit.

Is a modular Next.js app. A base upon which you can build your own app. Think of it as a quick start pre-built. Includes a dashboard, a user button, providers for user data, safe implementation of Logto's Auth system, theme and language handlers, custom action runners, etc.

## Features

- **Semi-Clean Production-ish UI**: Modern, professional styling with squared buttons, consistent theming, and polished components
- **Modal-based Dashboard**: Centered modal with sidebar containing user info, tabs for main content area
- **Full User Management**: Profile, custom data, session management with device metadata (browser, OS, IP), current-session identification (`isCurrent` badge), per-session `lastActiveAt` with automatic 30s heartbeat, IP geolocation minimap, "Revoke all other sessions", identities, organizations, MFA (TOTP, backup codes, passkeys/WebAuthn), and developer tools views
- **User Display Components**: UserButton (clickable avatar), UserBadge (display-only), UserCard (avatar + name card)
- **Dev Tab**: Debug view for access tokens (click-to-reveal), ID tokens, cookie management, and session control
- **Theme System**: File-based theme system with dark/light CSS variables — requires code registration in `themes/index.ts`
- **i18n Support**: Multi-language support with ENV-configured locale availability and ordering.
- **MFA Management**: TOTP enrollment, backup codes generation, and WebAuthn passkey management (register, rename, delete). Uses `@simplewebauthn/browser` for the browser ceremony.
- **User Preferences**: Automatic persistence of theme and language choices in Logto customData.
- **Auto-Refresh on Preference Change**: When theme or language is changed, tabs automatically refresh to display the latest data from the server.
- **Tab Configuration**: You can select which tabs to display and their order via an ENV variable.
- **Cookie Recovery**: Automatic handling of stale cookie contexts via POST /api/wipe route.
- **Proxy-routed Auth**: Route protection happens in middleware before page rendering, all protected calls and requests get caught at the request layer if problematic.
- **Debug Logging**: All sensitive debug output (tokens, IPs, introspection) is production-gated. The Dev tab is only visible in `NODE_ENV=development`.

## Project Structure

```
./
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── sign-in/
│   │   │   │   └── route.ts
│   │   │   └── sign-out/
│   │   │       └── route.ts
│   │   ├── protected/
│   │   │   └── route.ts
│   │   └── wipe/
│   │       └── route.ts
│   ├── callback/
│   │   └── route.ts
│   ├── demo/                         # Self-documenting showcase for logto-kit components
│   │   ├── ContentArea.tsx           # Main content area with doc registry
│   │   ├── Sidebar.tsx              # Navigation sidebar with theme toggle
│   │   ├── index.tsx                # Demo page entry
│   │   ├── nav-data.tsx             # 9-tab navigation definitions
│   │   ├── Particles.tsx            # Canvas particle animation
│   │   ├── types.ts                # Type definitions
│   │   ├── docs/                   # Per-tab documentation files (TSX)
│   │   │   ├── getting-started.tsx
│   │   │   ├── user-button.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── tabs-and-flows.tsx
│   │   │   ├── protected.tsx
│   │   │   ├── org-switcher.tsx
│   │   │   ├── providers.tsx
│   │   │   ├── themes.tsx
│   │   │   ├── i18n.tsx
│   │   │   └── components/
│   │   │       └── sessions.tsx   # Sessions tab documentation
│   │   ├── logic/                  # Demo-specific components
│   │   │   ├── CalculatorPanel.tsx
│   │   │   └── CalculatorClient.tsx
│   │   └── utils/
│   │       ├── CodeBlock.tsx
│   │       └── Section.tsx
│   ├── globals.css
│   ├── layout.tsx
│   ├── logto-kit/
│   │   ├── components/
│   │   │   ├── handlers/
│   │   │   │   ├── auth-watcher.tsx
│   │   │   │   ├── session-heartbeat.tsx
│   │   │   │   ├── preferences.tsx
│   │   │   │   ├── logto-provider.tsx
│   │   │   │   ├── theme-helpers.ts
│   │   │   │   ├── use-avatar-upload.tsx
│   │   │   │   └── user-data-context.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── client.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── shared/
│   │   │   │   │   ├── CodeBlock.tsx
│   │   │   │   │   ├── FlowModal.tsx
│   │   │   │   │   ├── SessionMiniMap.tsx
│   │   │   │   │   ├── SessionMapModal.tsx
│   │   │   │   │   ├── Toast.tsx
│   │   │   │   │   └── geo-cache.ts
│   │   │   │   └── tabs/
│   │   │   │       ├── dev.tsx
│   │   │   │       ├── identities.tsx
│   │   │   │       ├── organizations.tsx
│   │   │   │       ├── preferences.tsx
│   │   │   │       ├── profile.tsx
│   │   │   │       ├── sessions.tsx
│   │   │   │       └── security.tsx
│   │   │   └── shared/
│   │   │       ├── Button.tsx
│   │   │       └── Input.tsx
│   │   ├── userbutton/
│   │   │   └── index.tsx
│   │   ├── custom-actions/
│   │   │   ├── index.ts                  # Action registry and types
│   │   │   ├── validation.ts             # RBAC validation functions
│   │   │   └── calc-actions/             # Calculator action handlers
│   │   │       ├── basic.ts
│   │   │       └── scientific.ts
│   │   ├── custom-logic/
│   │   │   ├── actions/
│   │   │   │   └── set-active-org.ts    # Set active org
│   │   │   ├── OrgSwitcher.tsx          # Org selector dropdown
│   │   │   ├── org-switcher-wrapper.tsx # Server wrapper
│   │   │   ├── Protected.tsx            # Client-side permission gate
│   │   │   ├── types.ts                 # TypeScript types
│   │   │   └── index.ts                # Exports
│   │   ├── index.ts
│   │   ├── locales/
│   │   │   ├── en-US.ts
│   │   │   ├── index.ts
│   │   │   └── ka-GE.ts
│   │   ├── logic/
│   │   │   ├── actions/               # Modular server actions
│   │   │   │   ├── shared.ts          # Shared helpers (throwOnApiError, patchMyAccount)
│   │   │   │   ├── tokens.ts          # Token helpers
│   │   │   │   ├── request.ts         # Request helper (makeRequest)
│   │   │   │   ├── dashboard.ts       # Dashboard data fetching
│   │   │   │   ├── auth.ts            # Authentication (signOutUser)
│   │   │   │   ├── profile.ts         # Profile management
│   │   │   │   ├── verification.ts    # Email/phone verification
│   │   │   │   ├── mfa.ts             # MFA management (TOTP, backup codes)
│   │   │   │   ├── webauthn.ts         # WebAuthn passkey management (register, rename)
│   │   │   │   ├── password.ts        # Password updates
│   │   │   │   ├── account.ts         # Account deletion
│   │   │   │   ├── avatar.ts          # Avatar upload (S3/Supabase)
│   │   │   │   ├── organizations.ts   # Organization permissions
│   │   │   │   ├── sessions.ts        # Session management
│   │   │   │   ├── heartbeat.ts       # Session heartbeat (recordHeartbeat server action)
│   │   │   │   ├── introspection.ts   # Token introspection for RBAC
│   │   │   │   └── index.ts           # Barrel file (re-exports all)
│   │   │   ├── actions.ts             # Re-export barrel (backwards compat)
│   │   │   ├── debug.ts               # Debug logging utility
│   │   │   ├── env.ts                 # Environment variable handling
│   │   │   ├── errors.ts              # Custom error classes
│   │   │   ├── formatting.ts          # Text formatting utilities
│   │   │   ├── i18n.ts                # Internationalization logic
│   │   │   ├── index.ts               # Main exports
│   │   │   ├── preferences.ts         # Preference persistence logic
│   │   │   ├── tabs.ts                # Tab configuration logic
│   │   │   ├── types.ts               # TypeScript type definitions
│   │   │   ├── utils.ts               # Utility functions (introspection, validation)
│   │   │   └── validation.ts          # Input validation functions
│   │   └── themes/
│   │       ├── default/
│   │       │   ├── dark.css
│   │       │   ├── index.ts
│   │       │   └── light.css
│   │       ├── pretty/
│   │       │   ├── dark.css
│   │       │   ├── index.ts
│   │       │   └── light.css
│   │       └── index.ts
│   ├── logto.ts
│   └── page.tsx
├── proxy.ts
├── .env.example
├── next.config.ts
├── next-env.d.ts
├── public/
│   └── os-icons/                   # OS icons for session cards (Tux.jpg, MacroSlop.svg, MacOS.svg, ios.svg, Android.svg)
├── package.json
├── README.md
└── tsconfig.json
```

## CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and pull request:

- **TypeScript check**: `npm run type-check`
- **Tests**: `npm run test:run`
- **Build**: `npm run build`

The workflow uses Node.js 20 and caches npm dependencies for faster runs.

## Security Architecture (v0.3.0)

v0.3.0 introduced dedicated security modules for defense-in-depth:

| Module | Location | Purpose |
|--------|----------|---------|
| `origin-guard.ts` | `logic/origin-guard.ts` | CSRF protection — validates `Origin`/`Referer` header on all non-Server-Action API routes |
| `guards.ts` | `logic/guards.ts` | Input validators for all trust boundaries — IDs, user IDs, MFA types, passkey names, custom data |
| `audit.ts` | `logic/audit.ts` | Audit log primitive — emits structured events for mutations (no-op until you provide a custom transport) |
| `dev-mode.ts` | `logic/dev-mode.ts` | `NODE_ENV` gate — strips dev-only features at runtime in non-development environments |
| `debug-token.ts` | `logic/actions/debug-token.ts` | Dev-only Server Action for token access (refused by server in production) |

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
# Add: offline_access for refresh tokens
SCOPES=openid,profile,custom_data,email,phone,identities,sessions
```

### Permission-Based Access Control & Account Management

```env
# M2M for Management API (required for account deletion)
LOGTO_M2M_APP_ID=your-m2m-app-id
LOGTO_M2M_APP_SECRET=your-m2m-app-secret
LOGTO_M2M_RESOURCE=https://your-tenant.logto.app/api

# Token Introspection (required for Protected Actions API)
LOGTO_INTROSPECTION_URL=https://your-tenant.logto.app/oidc/token/introspection
```

You have to set this up for pfp uploads and account deletion to work. Also to retrieve user data. 

### Tab Configuration

```env
# Which tabs to show and in what order (comma-separated)
# Allowed: profile, preferences, security, sessions, identities, organizations, dev
# Aliases: personal, user → profile; prefs, custom-data, custom, customdata → preferences; mfa, 2fa, totp → security; sessions, session, devices, activity → sessions; identity → identities; orgs, org → organizations; debug, data, raw → dev
LOAD_TABS=profile,preferences,security,sessions,identities,organizations,dev
```

### Theme Configuration

```env
# Theme folder name (default: default)
# Must match a folder in app/logto-kit/themes/ AND be registered in themes/index.ts
THEME=default

# Default theme mode: dark or light (default: dark)
DEFAULT_THEME_MODE=dark

# User avatar/badge shape: circle, sq (square), rsq (rounded square), or custom border-radius (e.g., 0.5rem, 4px)
USER_SHAPE=circle
```

### MFA Configuration

```env
# MFA Configuration
# Name that will show up in the TOTP QR code issuer field
MFA_ISSUER=YourAppName
```

### i18n Configuration

```env
# Default language
LANG_MAIN=en-US

# Available languages
LANG_AVAILABLE=en-US,ka-GE
```

### S3 Storage (for Avatar Upload)

```env
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

> **Note**: Full S3 configuration details are in the [Avatar Upload](#avatar-upload) section below.

## Theme System

Themes are user-created and ENV-selected. Each theme lives in its own folder under `app/logto-kit/themes/` and is activated by setting the `THEME` environment variable.

> **Important:** Adding a theme requires a code change. You must register the theme in `themes/index.ts` — setting `THEME` in `.env` alone is not enough.

Themes are loaded from `app/logto-kit/themes/{THEME}/`:

- `dark.css` - Dark theme variables
- `light.css` - Light theme variables
- `index.ts` - Theme metadata and exported ThemeSpec objects

### Adding a New Theme

1. Create a new folder in `app/logto-kit/themes/{your-theme}/`
2. Add `dark.css` and `light.css` with CSS variables
3. Add `index.ts` that exports `{ yourThemeDarkTheme, yourThemeLightTheme }` as `ThemeSpec` objects
4. Import and register your theme in `app/logto-kit/themes/index.ts`:
   ```ts
   import { yourThemeDarkTheme, yourThemeLightTheme } from './your-theme';

   function resolveTheme(themeName: string, mode: 'dark' | 'light'): ThemeSpec {
     switch (themeName) {
       case 'your-theme':
         return mode === 'dark' ? yourThemeDarkTheme : yourThemeLightTheme;
       case 'default':
       default:
         return mode === 'dark' ? defaultDarkTheme : defaultLightTheme;
     }
   }
   ```
5. Set `THEME=your-theme` in your `.env`

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

The demo app (`app/demo/`) is a standalone application with 11 sidebar tabs — one for each major logto-kit component or concept:

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

Each tab has its own documentation file in `app/demo/docs/`. The **UserButton** tab has full documentation with props, notes, and 6 example cards. The **Dashboard** tab has comprehensive documentation — a 3-page guide covering internals, provider sync, tab configuration, and the Server Component rendering pattern. The **tabs-and-flows** doc provides detailed documentation for all dashboard tabs, including props, hooks, actions, and implementation details for Profile, Preferences, Security (with FlowModal architecture, TOTP enrollment, backup codes, and account deletion), Sessions (device overview and session revocation), Identities, Organizations, and Dev tabs.

### How It Works

The demo app consists of:

| File | Purpose |
|------|---------|
| `index.tsx` | Demo page entry point |
| `Sidebar.tsx` | Navigation sidebar with user info and theme toggle |
| `ContentArea.tsx` | Main content area — lazy-loads doc files from the registry |
| `Particles.tsx` | Canvas-based particle animation |
| `nav-data.tsx` | 11-tab navigation definitions with section hints |
| `types.ts` | TypeScript type definitions |
| `docs/getting-started.tsx` | Getting started guide — clone, configure, avatar upload, Logto Console |
| `docs/user-button.tsx` | UserButton documentation — Quick Start, Props table, Notes, 6 example cards |
| `docs/dashboard.tsx` | Dashboard documentation — Internals, Provider Sync, Tab Structure, Rendering (3 pages) |
| `docs/tabs-and-flows.tsx` | Detailed tabs documentation — props, hooks, actions for all dashboard tabs (5 pages) |
| `docs/org-switcher.tsx` | OrgSwitcher documentation — props, wrapper, useOrgMode, setActiveOrg |
| `docs/providers.tsx` | Providers documentation — LogtoProvider, hooks reference |
| `docs/themes.tsx` | Theme system documentation — dual system, color tokens, custom themes |
| `docs/i18n.tsx` | i18n documentation — file-based locales, useLangMode, adding languages |
| `docs/protected.tsx` | Protected component and API documentation — permission-based access control, server actions, examples (4 pages) |
| `utils/CodeBlock.tsx` | Syntax-highlighted code block with VSCode Dark+ colors and copy button |
| `utils/Section.tsx` | `SectionContainer` and `Section` — multi-page split with keyboard navigation |

### Documentation Format

Each doc file in `docs/` is a TSX component wrapped in a `SectionContainer` with `Section` children (each with a mandatory `id` prop). Pages are split horizontally and navigated with **ArrowUp** / **ArrowDown** keys or the bottom-right chevron buttons.

Typical layout:
- **Two-column grid** — Left and right sections side by side (matching `user-button.tsx` pattern)
- **Single column** — For detailed content like the Security tab's FlowModal architecture

To add documentation for a new tab:
1. Create `app/demo/docs/{tab-id}.tsx`
2. Add the loader to `DOC_REGISTRY` in `ContentArea.tsx`
3. Use `SectionContainer` / `Section` for pages, `CodeBlock` for code, and `ExampleCard` for live demos

### Using the Demo App

Visit `/demo` to see the demo app in action. It displays:
- A sidebar with 11 navigation tabs covering every major logto-kit feature
- A UserCard showing the logged-in user with name and avatar
- A theme toggle button
- A particle background effect
- Clicking any tab loads its documentation into the content area
- Press **ArrowUp** / **ArrowDown** to switch between pages within a tab
- Bottom-right chevron buttons and a page counter (e.g. "1/2") show the current position

The UserButton tab includes a Quick Start section, a full Props table with TypeScript interface, usage notes, and 6 interactive example cards. The Dashboard tab covers internals, provider sync, tab configuration, and rendering patterns across 3 pages with a two-column grid layout.

### Documentation Utilities

These shared utilities live in `app/demo/utils/` and are used by all doc files:

#### CodeBlock

A syntax-highlighted code block component using VSCode Dark+ color scheme. Includes a copy button that appears on hover.

```tsx
import CodeBlock from '../utils/CodeBlock';

// Basic
<CodeBlock code={`<UserButton Size="48px" />`} />

// With title bar
<CodeBlock title="Import" code={`import { UserButton } from './logto-kit';`} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `code` | `string` | — | The code string to display |
| `lang` | `'tsx' \| 'ts' \| 'bash'` | `'tsx'` | Language label shown in the title bar |
| `title` | `string` | — | Optional title shown above the code block |

Features: regex-based TSX tokenizer (no external deps), horizontal scroll for long lines, `marginBottom: 6px`, `#1e1e1e` background.

#### SectionContainer & Section

A multi-page layout system. `SectionContainer` is the viewport that manages page transitions via CSS `translateY` — each `Section` child is a full-height page stacked vertically. Pages slide up/down with a cubic-bezier transition.

```tsx
import { SectionContainer, Section } from '../utils/Section';

export default function MyDoc() {
  return (
    <SectionContainer>
      <Section id={1}>
        {/* Page 1 content — Quick Start, Props table */}
      </Section>
      <Section id={2}>
        {/* Page 2 content — Example cards */}
      </Section>
    </SectionContainer>
  );
}
```

Features: ArrowUp/ArrowDown keyboard navigation, bottom-right nav buttons with page counter, `overflowY: auto` per page for scrollable content, `overflow: hidden` on the viewport to prevent scrollbar cascade.

### PreferencesProvider

The dashboard provides a `PreferencesProvider` that combines theme and language management. It exports both `useThemeMode()` and `useLangMode()` hooks.

> **Important**: All hooks (`useThemeMode`, `useLangMode`, `useOrgMode`, `useUserDataContext`) must be used within their provider contexts. Using them outside will return no-op values with silent failures — the component will appear to work but changes won't persist.

#### useThemeMode Hook

Any component can use the theme context:

```tsx
import { useThemeMode } from './logto-kit';

function MyComponent() {
  const { theme, themeSpec, setTheme, toggleTheme } = useThemeMode();
  
  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  );
}
```

The hook returns:
- `theme` - `'dark' | 'light'`
- `themeSpec` - Full ThemeSpec object with colors, components, tokens. Access colors via `themeSpec.colors`.
- `setTheme(theme)` - Set specific theme
- `toggleTheme()` - Toggle between dark/light

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
  darkThemeSpec={defaultDarkTheme}
  lightThemeSpec={defaultLightTheme}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Optional callback to persist preferences to Logto customData |
| `onLangChange` | `() => void` | - | Optional callback fired when language changes |
| `darkThemeSpec` | `ThemeSpec` | — | **Required.** Dark theme specification object |
| `lightThemeSpec` | `ThemeSpec` | — | **Required.** Light theme specification object |

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
import { LogtoProvider, useLogto } from './logto-kit';

function MyComponent() {
  const { userData, openDashboard } = useLogto();
  // ...
}

<LogtoProvider 
  userData={userData}
  initialTheme="dark"
  initialLang="en-US"
  onUpdateCustomData={updateCustomData}
  darkThemeSpec={defaultDarkTheme}
  lightThemeSpec={defaultLightTheme}
>
  <MyComponent />
</LogtoProvider>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userData` | `UserData` | — | The user data object |
| `dashboard` | `ReactNode` | - | Optional dashboard modal content |
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Callback for updating user custom data (forwarded to PreferencesProvider) |
| `onLangChange` | `() => void` | - | Callback fired when language changes |
| `darkThemeSpec` | `ThemeSpec` | — | **Required.** Dark theme specification object |
| `lightThemeSpec` | `ThemeSpec` | — | **Required.** Light theme specification object |

#### useLogto Hook

The `useLogto()` hook provides access to user data, authentication, and all preference state in one place:

```tsx
import { useLogto } from './logto-kit';

function MyComponent() {
  const { userData, openDashboard, theme, themeSpec, lang, setLang, asOrg, setAsOrg } = useLogto();
  // ...
}
```

Returns:

| Field | Type | Description |
|-------|------|-------------|
| `userData` | `UserData` | Current user data |
| `theme` | `'dark' \| 'light'` | Current theme mode |
| `themeSpec` | `ThemeSpec` | Full theme specification (colors, components, tokens) |
| `setTheme` | `(theme: 'dark' \| 'light') => void` | Set theme mode |
| `toggleTheme` | `() => void` | Toggle between dark/light |
| `lang` | `string` | Current language code |
| `setLang` | `(lang: string) => void` | Set language |
| `asOrg` | `string \| null` | Active organization ID (null = global) |
| `setAsOrg` | `(orgId: string \| null) => void` | Set active organization |
| `openDashboard` | `() => void` | Open the dashboard modal |
| `closeDashboard` | `() => void` | Close the dashboard modal |

Use this hook to access user data, theme, language, and dashboard controls anywhere within `LogtoProvider`.

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

// User card — avatar + "Logged in as" + name (click opens dashboard)
<UserCard Size="32px" shape="rsq" />

// Inside Dashboard — no props needed, uses provider context
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
| `theme` | `ThemeSpec` | - | Theme spec (optional, auto-detected from provider if not provided) |
| `do` | `() => void` | - | Custom click handler (Button and Card only; defaults to `openDashboard`) |

UserCard's "Logged in as" label is automatically translated based on the provider's current language state — no `t` prop needed.

### Calculator Demo

A permission-gated calculator demonstrating the Protected Actions API. Located in `app/demo/logic/`.

#### Files

| File | Purpose |
|------|---------|
| `CalculatorPanel.tsx` | Wrapper with `<Protected>` gate for `calc:basic` permission |
| `CalculatorClient.tsx` | Calculator UI, expression parser, API calls on `=` |
| `custom-actions/calc-actions/basic.ts` | Action handler for basic operations (+, −, ×, ÷, %) |
| `custom-actions/calc-actions/scientific.ts` | Action handler for scientific functions (sin, cos, log, etc.) |

#### How It Works

1. `CalculatorPanel` wraps `CalculatorClient` with `<Protected orgId="5b6sw6p5uzti" perm="calc:basic">`
2. Pressing `=` calls `POST /api/protected` with `action: 'calc-basic'` or `'calc-scientific'`
3. The API validates the user's org membership and permission, then executes the handler
4. Basic operations require `calc:basic` permission; scientific functions require `calc:scientific`
5. Session state (expression, mode) persists via `sessionStorage`

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
  sanitizeLogtoError,
} from './logto-kit';

import type {
  OrganizationData,
  ValidationResult,
  ThemeSpec,
  UserData,
  KitTranslations,
  Translations,
} from './logto-kit';
```

> **Note**: The permission validation functions (`fetchUserRbacData`, `validateOrgMembership`) are exported and available for advanced use cases. For most apps, use the `<Protected />` component or the Protected Actions API (`POST /api/protected`) instead.

---

### \<Protected\> - UI Gate Component

A **client component** that conditionally renders children based on organization permissions. Must be used within `LogtoProvider` context.
**Key behavior:**
- Permissions are loaded asynchronously via `loadOrganizationPermissions(orgId)` on mount or org change
- Shows `fallback` (or nothing) while loading
- When `asOrg` changes (org switch or "Be yourself"), clears cached permissions and re-fetches
- When org context is lost (`asOrg` = null), access is denied immediately

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
  orgId="5b6sw6p5uzti"
  perm="kidnap:kids"
  fallback={<div className="animate-pulse">Loading...</div>}
>
  <PresidentControlPanel />
</Protected>
```

**Best Practice — Separate Concerns:**

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

// Just import and use — permissions are encapsulated
<AdminPanel />
```

---

### Protected Actions API

A secure API endpoint for executing permission-gated actions from the client.

**Endpoint:** `POST /api/protected`

```tsx
import { getFreshAccessToken } from './logto-kit/logic/actions';

// Inside a client component — get userData from context, token from server action
const { userData } = useLogto();
const freshToken = await getFreshAccessToken();

const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: freshToken,
    id: userData.id,
    action: 'explode-earth',
    payload: { force: true }
  })
});

const result = await response.json();
if (!result.ok) {
  console.error(result.error, result.message);
  return;
}
console.log(result.data);
```

**Request:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | Yes | User's access token |
| `id` | string | Yes | User ID |
| `action` | string | Yes | Action name registered in registry |
| `payload` | unknown | No | Data to pass to the action handler (defaults to `{}` if omitted) |

**Response:**

```tsx
// Success (200)
{ ok: true, data: <handler-return-value> }

// Error (status varies)
{ ok: false, error: 'ERROR_CODE', message: '...' }
```

**Error Codes:**

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `MISSING_FIELDS` | 400 | token, id, or action missing |
| `TOKEN_INVALID` | 400 / 401 | Invalid userId format (400), or token not active, expired, or userId mismatch (401) |
| `INTROSPECTION_ERROR` | 401 | Failed to validate token |
| `USER_DATA_ERROR` | 500 | Failed to fetch user RBAC data |
| `NO_ORG_SELECTED` | 403 | User has no org selected (need org context) |
| `ORG_NOT_MEMBER` | 403 | User not member of selected org |
| `ACTION_NOT_FOUND` | 404 | Action doesn't exist in registry |
| `PERMISSION_DENIED` | 403 | User lacks required permission |
| `INTERNAL_ERROR` | 500 | Unexpected server error (catch-all) |

---

### Registering Custom Actions

Actions are registered in `app/logto-kit/custom-actions/index.ts`:

```tsx
import type { ActionRegistry, ActionConfig, ProtectedActionHandler } from './index';

const actions: ActionRegistry = {
  'explode-earth': {
    requiredPerm: 'launch-nuke',
    handler: async ({ userId, orgId, payload }) => {
      // Your protected logic here
      // payload is typed as unknown, cast as needed
      const { force } = payload as { force: boolean };
      
      return { success: true, message: 'Earth exploded!' };
    },
  },
  'send-notification': {
    requiredPerm: 'send-notifications',
    handler: async ({ userId, orgId, payload }) => {
      // ...
      return { sent: true };
    },
  },
};

export async function getAction(actionName: string): Promise<ActionConfig | undefined> {
  return actions[actionName];
}
```

**Handler receives:**
- `userId` - The authenticated user's ID
- `orgId` - The active organization ID (resolved from `customData.Preferences.asOrg` via `fetchUserRbacData`)
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
  theme={themeSpec}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `organizations` | `OrganizationData[]` | — | List of organizations to display |
| `currentOrgId` | `string` | - | Currently active organization ID |
| `theme` | `ThemeSpec` | — | Theme specification for styling |
| `t` | `{ organizations?: { beYourself?: string } }` | - | Optional translations |

**Features:**
- Shows "Be yourself (global)" option to exit org context
- Auto-selects first org if user is in only one
- Persists selection to `customData.Preferences.asOrg`
- Uses sessionStorage for client-side state

---

### setActiveOrg() - Server Action

Validates org membership. Does NOT persist the selection — use `useOrgMode().setAsOrg()` for that.

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

1. **Client Request** - Client calls `POST /api/protected` with `{ token, id, action, payload }`
2. **Token Validation** - Validates token via OIDC introspection
3. **User Verification** - Verifies token `sub` matches provided `userId`
4. **RBAC Data Fetch** - Fetches user orgs and active org from `/oidc/me`
5. **Org Membership Check** - Ensures user is member of selected org
6. **Permission Check** - Calls Management API to verify user's organization token has required permission
7. **Execute Action** - Runs the registered handler if all checks pass

#### Organization Switching Flow

1. User selects org from `<OrgSwitcher>` or Organizations tab
2. `setActiveOrg()` validates membership via Logto claims
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
SCOPES=openid,profile,custom_data,email,phone,identities,sessions,organizations

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
| "NO_ORG_SELECTED" | User must select an organization before calling Protected Actions API |
| "ORG_NOT_MEMBER" | Selected org not in user's organization list |
| "ACTION_NOT_FOUND" | Action not registered in `custom-actions/index.ts` |
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
| `dev` | `debug`, `data`, `raw` | Developer tools: access tokens, ID tokens, cookies, session management |

### Configuration Examples

```env
# Show all tabs in default order
LOAD_TABS=profile,preferences,security,sessions,identities,organizations,dev

# Show only profile, security, sessions, and preferences (in that order)
LOAD_TABS=profile,security,sessions,preferences

# Use aliases - these are all equivalent to the first example
LOAD_TABS=personal,prefs,mfa,sessions,identity,orgs,debug
LOAD_TABS=user,custom-data,2fa,devices,identities,organization,data

# If not set or empty, shows all tabs in default order
```

### How Tab Loading Works

1. **ENV Parsing**: `LOAD_TABS` is parsed as comma-separated list
2. **Alias Resolution**: Each token is mapped to its canonical tab ID
3. **Validation**: Invalid tokens are skipped with a warning
4. **Deduplication**: Duplicate tabs are removed while preserving order
5. **Fallback**: If no valid tabs remain, all tabs are shown in default order

## Implementation Patterns

This section explains how to integrate and extend the dashboard. The whole point of this app is that you can drop the Dashboard component into any part of your app and it just works.

### Where Auth Happens

All route protection happens in `proxy.ts` (which acts as middleware). This runs BEFORE the page renders, so unauthenticated users never even see the page - they get redirected to sign-in first.

Here's the basic flow:
```
Request → proxy.ts → Check auth via Logto SDK →
  → Not authenticated → Redirect to /api/auth/sign-in
  → Authenticated → Render page
```

### Making Routes Public

By default, all routes require authentication. To add public routes (like a landing page), edit the `PUBLIC_PATHS` array in `proxy.ts`:

```typescript
// proxy.ts
const PUBLIC_PATHS = [
  '/callback',           // OAuth callback - must be public
  '/api/auth/sign-in',   // Sign-in endpoint - must be public
  '/api/auth/sign-out', // Sign-out endpoint - must be public
  '/api/wipe',          // Cookie wipe - useful for debugging
  '/landing',           // Your public landing page
  '/about',             // Another public page
];
```

Note: This requires a code change. ENV-based configuration would be nice but doesn't exist yet.

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

The Dashboard Server Component fetches user data on the server and renders as a centered modal. It automatically wraps your app with two context providers:

```tsx
<UserDataProvider userData={userData}>
  <PreferencesProvider initialTheme={theme} initialLang={lang} onUpdateCustomData={updateCustomData}>
    <DashboardClient ... />
  </PreferencesProvider>
</UserDataProvider>
```

This means:
- **UserDataProvider** - Provides user data to all child components (server-fetched)
- **PreferencesProvider** - Manages theme and language state with automatic persistence to Logto

Both providers expose hooks that child components can use:
- `useUserDataContext()` - Access user data
- `useThemeMode()` - Access theme and themeSpec (colors via themeSpec.colors)
- `useLangMode()` - Access current language

The preferences tab no longer needs props passed to it - it uses the hooks directly!

### Adding a Custom Tab

1. Create your tab component in `app/logto-kit/components/dashboard/tabs/`
2. Add to `LOAD_TABS` in your `.env`

The tab system is pretty simple - look at existing tabs for examples.

### Adding a Theme

1. Create a folder in `app/logto-kit/themes/{your-theme}/`
2. Add `dark.css` and `light.css` with your CSS variables
3. Add `index.ts` exporting `{ yourThemeDarkTheme, yourThemeLightTheme }` as `ThemeSpec` objects
4. **Register the theme in `app/logto-kit/themes/index.ts`** — import your exports and add a case to `resolveTheme()`
5. Set `THEME=your-theme` in `.env`

### Adding a Language

1. Create `app/logto-kit/locales/{locale-code}.ts`
2. Follow the pattern in existing locale files
3. Register in `locales/index.ts` and add the locale code to the `LocaleCode` type
4. Add to `LANG_AVAILABLE` in `.env`

## Cookie & Session Management

The dashboard handles stale cookies automatically. When the Logto access token goes stale:

1. Request to fetch data fails
2. System detects "stale cookie" error
3. Redirects to `/api/wipe` which clears the stale cookie
4. User is redirected home - fresh token is obtained from valid session
5. Dashboard loads normally

This means users don't need to re-authenticate just because their access token expired - the system handles it transparently.

### Sessions Tab — Logto Fork Required

> **⚠️ NOTE**: The Sessions tab's advanced features (`isCurrent` flag, `lastActiveAt`, heartbeat endpoint) require a patched Logto backend.
> Until [upstream PR #8748](https://github.com/logto-io/logto/pull/8748) is merged, you must run Logto from the fork branch:
> [`odinwerks/logto — feat/session-last-active-at`](https://github.com/odinwerks/logto/tree/feat/session-last-active-at)
>
> A subset branch with only the `isCurrent` flag (no heartbeat/lastActiveAt) is available at
> [`feat/iscurrent-v1.39`](https://github.com/odinwerks/logto/tree/feat/iscurrent-v1.39).

The Sessions tab features include:
- **`isCurrent` badge** — The session backing the current request is marked with a green "This device" badge
- **`lastActiveAt`** — Each session shows when it was last active (`null` / `"Active now"` / ISO timestamp)
- **Automatic heartbeat** — A zero-UI `SessionHeartbeat` component fires `recordHeartbeat()` every 30s and on tab focus
- **Revoke all other sessions** — Safe-guarded: aborts if no `isCurrent` session is identified

### Manual Cookie Wipe

Send a POST request to `/api/wipe` to manually clear cookies (GET returns 405). Useful for debugging:

```bash
curl -X POST http://localhost:3000/api/wipe -H "Cookie: <your-session-cookie>"
```

### Force Sign-Out

POST to `/api/wipe` with query parameter `?force=true` to completely sign out — clears both app cookies AND the Logto session:

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

The dashboard supports user avatar uploads via drag-and-drop or file browser. When a user uploads an image, it's stored in S3-compatible storage and the URL is automatically saved to their Logto profile.

> **Security Note**: The previous URL input box has been removed. Users can only upload images via drag-and-drop or file browser. This prevents malicious URL injection attacks. If storage is not configured in production, uploads will fail with a clear error message.

### Architecture

Avatar upload is implemented as a **Next.js Server Action** (`uploadAvatar()` in `app/logto-kit/logic/actions/avatar.ts`). There is no intermediate API route — the client calls the action directly:

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

The access token and user ID are **derived server-side** from the session cookie — they are never accepted from the client. This prevents token leakage and cross-user upload attempts.

Server Actions enforce same-origin at the framework level, eliminating CSRF from cross-site origins.

> **Note**: The same server-side credential derivation pattern is used for account deletion — the server never trusts client-supplied tokens or user IDs.

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
| `app/logto-kit/logic/actions/avatar.ts` | Server Action — validates file, derives auth from session, uploads to S3 |
| `app/logto-kit/components/handlers/use-avatar-upload.tsx` | React hook for client-side upload logic |

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
  generateBackupCodes,
  getBackupCodes,
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
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
await deleteUserAccount('verificationRecordId');

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

## Todo

> **⚠️ Organization/RBAC features are FUNCTIONAL but NOT PRODUCTION READY**
> Extensive testing required before production use. APIs may change.

### Security TODO — Enhanced Session Context Validation

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

#### New Security Pipeline — Session Context Validation

| Check | Data Source | Purpose |
|-------|-------------|---------|
| 🔲 **User Agent Match** | Request UA vs Logto sessions | Detect device/browser mismatch |
| 🔲 **GEO Location** | Request IP country vs Logto session GEO | Detect impossible travel |

#### Implementation Plan

**Phase 1: Core Security Module**

1. Create `app/logto-kit/custom-actions/security-validation.ts`
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
     - `SESSION_CONTEXT_MISMATCH` (403) — Request context doesn't match any active session
     - `GEO_MISMATCH` (403) — Request location doesn't match session
     - `UA_MISMATCH` (403) — Request device doesn't match session

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
| `app/logto-kit/custom-actions/security-validation.ts` | **NEW**: UA parsing, GEO matching, session fetching |
| `app/api/protected/route.ts` | Add security validation pipeline |
| `app/logto-kit/custom-actions/validation.ts` | Integrate security checks |
| `app/logto-kit/components/dashboard/tabs/preferences.tsx` | Add travel mode toggle |
| `app/logto-kit/logic/actions.ts` | Add `updateTravelMode` action |
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

- **IP matching excluded**: IPs change too frequently (NAT, VPN, dynamic allocation) — not useful for security
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
- [x] RBAC validation - Complete (validateRbac, fetchUserRbacData, validateOrgMembership)
- [x] `fallback` prop - Complete (custom placeholder while loading/denied)
- [ ] Fine-tune permission checks for your needs
- [ ] Extensive testing before production use

### UI Polish
- [x] Profile tab - redesigned with proper edit UI
- [x] Preferences tab - removed JSON editor
- [x] Security tab - button styling unified across all tabs
- [x] Dev tab - new developer tools tab for tokens and session management
- [x] Identities tab - reviewed, looks good
- [x] Organizations tab - implemented with org memberships, roles display, and org switching 

### Theme Context Provider
- [x] Currently theme handling is internal to the dashboard
- [x] Need to export theme context so consuming apps can sync theme
- [x] For now: simple "is dark / is light" hook
- [x] Later: full context provider that pulls theme from dashboard
- [x] Added onUpdateCustomData prop for Logto sync
- [x] Exported from handlers/ folder

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
- [x] UserCard component — wider card with avatar + "Logged in as" + name
- [x] Shared useUserDisplay hook — all three components use provider context
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
