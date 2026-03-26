# Logto Debug Dashboard

A modular Next.js debug dashboard for Logto authentication with comprehensive user profile management, featuring a terminal/hacker aesthetic.

## Features

- **Semi-Clean Production-ish UI**: Modern, professional styling with squared buttons, consistent theming, and polished components
- **Modal-based Dashboard**: Centered modal with sidebar containing user info, tabs for main content area
- **Full User Management**: Profile, custom data, identities, organizations, MFA, and developer tools views
- **Dev Tab**: Debug view for access tokens, ID tokens, cookie management, and session control
- **Theme System**: User-created themes with ENV-selected activation and default theme mode
- **i18n Support**: Multi-language support with ENV-configured locale availability and ordering
- **MFA Management**: TOTP enrollment, backup codes generation, and WebAuthn support
- **User Preferences**: Automatic persistence of theme and language choices in Logto customData
- **Auto-Refresh on Preference Change**: When theme or language is changed, tabs automatically refresh to display the latest data from the server
- **Tab Configuration**: Select which tabs to display and their order via ENV variable
- **Cookie Recovery**: Automatic handling of stale cookie contexts via /api/wipe route
- **Proxy-Based Auth**: Route protection happens in middleware before page rendering
- **Translation-First Validation**: All validation messages use translation strings for full i18n coverage

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
│   │   │   └── route.ts              # Protected Actions API
│   │   ├── upload-avatar/
│   │   │   └── route.ts
│   │   └── wipe/
│   │       └── route.ts
│   ├── callback/
│   │   └── route.ts
│   ├── demo/                         # Demo app showcasing theme integration
│   │   ├── ContentArea.tsx           # Main content with particle background
│   │   ├── Sidebar.tsx              # Navigation sidebar with theme toggle
│   │   ├── index.tsx                # Demo page entry
│   │   ├── nav-data.tsx             # Navigation data
│   │   ├── Particles.tsx            # Particle effect background
│   │   └── types.ts                 # Type definitions
│   ├── globals.css
│   ├── layout.tsx
│   ├── logto-kit/
│   │   ├── components/
│   │   │   ├── handlers/
│   │   │   │   ├── auth-watcher.tsx
│   │   │   │   ├── preferences.tsx
│   │   │   │   ├── logto-provider.tsx
│   │   │   │   ├── theme-helpers.ts
│   │   │   │   ├── use-avatar-upload.tsx
│   │   │   │   └── user-data-context.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── client.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── shared/
│   │   │   │   │   ├── CodeBlock.tsx
│   │   │   │   │   └── Toast.tsx
│   │   │   │   └── tabs/
│   │   │   │       ├── identities.tsx
│   │   │   │       ├── organizations.tsx
│   │   │   │       ├── preferences.tsx
│   │   │   │       ├── profile.tsx
│   │   │   │       ├── dev.tsx
│   │   │   │       └── security.tsx
│   │   │   └── userbutton/
│   │   │       └── index.tsx
│   │   ├── custom-actions/
│   │   │   ├── index.ts                  # Action registry and types
│   │   │   └── validation.ts             # RBAC validation functions
│   │   ├── custom-logic/
│   │   │   ├── actions/
│   │   │   │   └── set-active-org.ts    # Set active org
│   │   │   ├── OrgSwitcher.tsx          # Org selector dropdown
│   │   │   ├── OrgSwitcherWrapper.tsx   # Server wrapper
│   │   │   ├── Protected.tsx            # Route protection component
│   │   │   ├── token-validator.ts       # JWT validation
│   │   │   ├── types.ts                 # TypeScript types
│   │   │   └── index.ts                # Exports
│   │   ├── index.ts
│   │   ├── locales/
│   │   │   ├── en-US.ts
│   │   │   ├── index.ts
│   │   │   └── ka-GE.ts
│   │   ├── logic/
│   │   │   ├── actions.ts
│   │   │   ├── errors.ts
│   │   │   ├── i18n.ts
│   │   │   ├── index.ts
│   │   │   ├── preferences.ts
│   │   │   ├── tabs.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.ts                # Utility functions
│   │   │   └── validation.ts
│   │   └── themes/
│   │       ├── default/
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
├── package.json
├── README.md
└── tsconfig.json
```

## Environment Variables

### Required

```env
APP_ID=your-app-id
APP_SECRET=your-app-secret
ENDPOINT=https://auth.yourdomain.org
BASE_URL=http://localhost:3000
COOKIE_SECRET=your-random-secret
```

### Optional - Theme Configuration

```env
# Theme folder name (default: default)
THEME=default
# Also reads: NEXT_PUBLIC_THEME

# Default theme mode: dark or light (default: dark)
DEFAULT_THEME_MODE=dark
# Also reads: NEXT_PUBLIC_DEFAULT_THEME_MODE

# Available themes (comma-separated) - for future multi-theme support
THEMES_AVAILABLE=default
NEXT_THEMES_AVAILABLE=default

# User avatar/badge shape: circle, sq (square), rsq (rounded square), or custom border-radius (e.g., 0.5rem, 4px)
NEXT_PUBLIC_USER_SHAPE=circle
```

### Optional - MFA Configuration

```env
# MFA Configuration
# Name that will show up in the TOTP QR code issuer field
NEXT_PUBLIC_MFA_ISSUER=YourAppName
```

### Optional - i18n Configuration

```env
# Default language
LANG_MAIN=en-US
NEXT_LANG_NAME=en-US

# Available languages
LANG_AVAILABLE=en-US,ka-GE
NEXT_LANG_AVAILABLE=en-US,ka-GE
```

## Theme System

Themes are user-created and ENV-selected. Each theme lives in its own folder under `app/logto-kit/themes/` and is activated by setting the `THEME` environment variable.

Themes are loaded from `app/logto-kit/themes/{THEME}/`:

- `dark.css` - Dark theme variables
- `light.css` - Light theme variables
- `index.ts` - Theme metadata

### Adding a New Theme

1. Create a new folder in `app/logto-kit/themes/{your-theme}/`
2. Add `dark.css` and `light.css` with CSS variables
3. Add `index.ts` with theme metadata
4. Set `THEME=your-theme` in your `.env`

### Multiple Theme Support

The system supports multiple themes via `THEMES_AVAILABLE`:

```env
THEMES_AVAILABLE=default,custom
NEXT_THEMES_AVAILABLE=default,custom
```

Each theme folder in `app/logto-kit/themes/` provides its own dark.css, light.css, and index.ts.

### User Shape Configuration

Control the avatar/badge shape across the dashboard:

```env
NEXT_PUBLIC_USER_SHAPE=circle    # Circular (default)
NEXT_PUBLIC_USER_SHAPE=sq        # Square
NEXT_PUBLIC_USER_SHAPE=rsq       # Rounded square
NEXT_PUBLIC_USER_SHAPE=0.5rem   # Custom border-radius
```

## Demo App

The project includes a demo app at `/demo` that showcases how to integrate the Logto dashboard components with your own application's theme.

### What It Is

The demo app (`app/demo/`) is a standalone application that demonstrates:
- How to wrap your app with the necessary providers
- How to sync theme between the Dashboard and your custom components
- How to create a custom sidebar with navigation
- How to use the particle background effect

### How It Works

The demo app consists of:

| File | Purpose |
|------|---------|
| `index.tsx` | Demo page entry point |
| `Sidebar.tsx` | Navigation sidebar with user info and theme toggle |
| `ContentArea.tsx` | Main content area with particle background effect |
| `Particles.tsx` | Canvas-based particle animation |
| `nav-data.tsx` | Navigation configuration |
| `types.ts` | TypeScript type definitions |

### Theme Synchronization

The Dashboard and DemoApp share theme state via a custom `theme-changed` event and `sessionStorage`:

1. When theme changes in Dashboard, it dispatches a custom `theme-changed` event
2. DemoApp listens for this event and updates its theme accordingly
3. Both apps read/write the theme from `sessionStorage` key `theme-mode`

```tsx
// Theme change listener in DemoApp
useEffect(() => {
  const handleThemeChange = (e: CustomEvent) => {
    setTheme(e.detail.theme);
    applyTheme(e.detail.theme, themeSpec);
  };
  
  window.addEventListener('theme-changed', handleThemeChange as EventListener);
  
  // Also read initial theme from sessionStorage
  const stored = sessionStorage.getItem('theme-mode');
  if (stored) {
    const { theme } = JSON.parse(stored);
    setTheme(theme);
    applyTheme(theme, themeSpec);
  }
  
  return () => {
    window.removeEventListener('theme-changed', handleThemeChange as EventListener);
  };
}, []);
```

### Using the Demo App

Visit `/demo` to see the demo app in action. It displays:
- A sidebar with navigation options (Dashboard, Settings, Profile)
- A user badge showing the logged-in user
- A theme toggle button
- A particle background effect
- Clicking "Dashboard" opens the full Dashboard modal

### PreferencesProvider

The dashboard provides a `PreferencesProvider` that combines theme and language management. It exports both `useThemeMode()` and `useLangMode()` hooks.

> **Important**: All hooks (`useThemeMode`, `useLangMode`, `useOrgMode`, `useUserDataContext`) must be used within their provider contexts. Using them outside will return no-op values with silent failures — the component will appear to work but changes won't persist.

#### useThemeMode Hook

Any component can use the theme context:

```tsx
import { useThemeMode } from './logto-kit';

function MyComponent() {
  const { theme, themeColors, setTheme, toggleTheme } = useThemeMode();
  
  return (
    <button onClick={toggleTheme}>
      Current: {theme}
    </button>
  );
}
```

The hook returns:
- `theme` - `'dark' | 'light'`
- `themeSpec` - Full ThemeSpec object with colors, components, tokens
- `themeColors` - ThemeColors object with all color values
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
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
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
├── UserDataProvider    (provides user data)
│   └── PreferencesProvider
│       └── PreferencesContext
│           ├── ThemeModeContext    (theme state)
│           ├── LangModeContext     (language state)
│           └── OrgModeContext      (organization state)
```

#### LogtoProvider

LogtoProvider is a convenience wrapper that combines `UserDataProvider` and `PreferencesProvider` into a single component. It also provides a `useLogto()` hook for accessing user data and access token anywhere in your app.

```tsx
import { LogtoProvider, useLogto } from './logto-kit';

function MyComponent() {
  const { userData, accessToken } = useLogto();
  // ...
}

<LogtoProvider 
  userData={userData} 
  accessToken={token}
  initialTheme="dark"
  initialLang="en"
  onUpdateCustomData={updateCustomData}
>
  <MyComponent />
</LogtoProvider>
```

| Prop | Type | Description |
|------|------|-------------|
| `userData` | `UserData` | The user data object |
| `accessToken` | `string` | JWT or opaque access token |
| `initialTheme` | `'dark' \| 'light'` | Initial theme (default: 'dark') |
| `initialLang` | `string` | Initial language code |
| `onUpdateCustomData` | `(data) => Promise<void>` | Callback for updating user custom data |
| `onLangChange` | `() => void` | Callback fired when language changes |

#### useLogto Hook

The `useLogto()` hook returns:

```tsx
{
  userData: UserData;
  accessToken: string;
}
```

Use this hook to access user data and access token in any component nested within `LogtoProvider`.

#### SessionStorage Caching

User data is automatically cached in sessionStorage under the key `user-data`. This enables:
- Instant access across components without re-fetching
- Persistence across page navigations within the same session
- Automatic hydration on component mount

#### Data Priority

When using components like `UserButton` or `UserBadge`:

1. **Prop** - if `userData` prop passed to component, use it
2. **Context** - if inside Dashboard, use context (auto-updates when profile changes!)
3. **Fetch** - standalone button outside Dashboard, fetch from server on mount

### UserButton & UserBadge

The dashboard exports two components for displaying user avatars:

- **UserButton** - clickable, opens Dashboard modal on click
- **UserBadge** - non-interactive display only

Both components work **fully standalone** - they automatically fetch user data if not provided via props or context:

```tsx
import { UserButton, UserBadge } from './logto-kit';

// Fully automatic (standalone - fetches its own data)
<UserButton />

// With options
<UserButton Size="48px" Canvas="Avatar" shape="circle" />

// With custom click handler
<UserButton do={() => console.log('clicked!')} />

// Non-interactive badge
<UserBadge Size="32px" Canvas="Avatar" shape="sq" />

// Inside Dashboard - no props needed, uses context automatically
<UserBadge Size="32px" Canvas="Avatar" shape="sq" />
```

#### How Auto-Fetching Works

When used outside the Dashboard:

1. **1.5s timeout** - Waits up to 1.5 seconds for data
2. **Fallback icon** - If no data arrives, shows a user icon placeholder
3. **Internal fetch** - Calls `fetchUserBadgeData()` to get user info from `/api/my-account`

The component uses the priority system:
1. **Prop** - if `userData` prop passed, use it
2. **Context** - if inside Dashboard, use `UserDataProvider` context
3. **Fetch** - standalone, fetch from server automatically

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `Canvas` | `'Avatar' \| 'Initials'` | `'Initials'` | Display mode |
| `Size` | `string` | `'6.25rem'` | CSS size (e.g., `'48px'`, `'3rem'`) |
| `shape` | `'circle' \| 'sq' \| 'rsq'` | - | Border radius shape |
| `userData` | `UserData` | - | User data (optional, auto-fetched if not provided) |
| `theme` | `ThemeSpec` | - | Theme spec (optional, auto-detected if not provided) |
| `do` | `() => void` | - | UserButton only: custom click handler |

If no user data is available for 1.5 seconds, displays a fallback user icon.

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

## Custom Logic (Organization & RBAC Support)

> **⚠️ WARNING - NOT PRODUCTION READY**: This module is FUNCTIONAL but NOT tested enough for production use. 
> Use at your own risk. Extensive testing required before deploying to production.
> This is a work in progress - APIs may change.

The `custom-logic` module provides UI protection components and organization management:
- **\<Protected\>** - Server component for gating UI based on permissions/roles
- **OrgSwitcher** - Dropdown for switching between organizations
- **useOrgMode** hook - Access organization context throughout your app

For protected server actions, use the **Protected Actions API** (`POST /api/protected`).

### Exports

```tsx
import {
  // Organization & RBAC
  Protected,
  OrgSwitcher,
  OrgSwitcherWrapper,
  setActiveOrg,
  useOrgMode,
  
  // Context hooks
  useThemeMode,
  useLangMode,
} from './logto-kit';

import type {
  OrganizationData,
} from './logto-kit';
```

> **Note**: The RBAC validation functions (`fetchUserRbacData`, `validateOrgMembership`, `checkPermissionInOrg`, `checkRoleInOrg`, `validateRbac`, `introspectTokenWithOrg`) and token validation (`validateToken`, `invalidateJWKS`) are internal-only. **Do not import or use these directly** — use the Protected Actions API (`POST /api/protected`) instead.

---

### \<Protected\> - UI Gate Component

A server component that conditionally renders children based on permissions/roles.

```tsx
import { Protected } from './logto-kit';

<Protected perm="read:users">
  <SensitiveData />
</Protected>

<Protected role="admin">
  <AdminPanel />
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
| `role` | `string \| string[]` | - | Required role(s) to check |
| `orgId` | `string \| null \| undefined` | `undefined` | Specific org to check against. If `undefined`, uses user's stored org preference |
| `requireAll` | `boolean` | `true` | If `true`, ALL permissions/roles required. If `false`, ANY one suffices |

---

### Protected Actions API

A secure API endpoint for executing permission-gated actions from the client.

**Endpoint:** `POST /api/protected`

```tsx
// Client-side usage
const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: accessToken,
    id: userId,
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
| `payload` | unknown | No | Data to pass to the action handler |

**Response:**

```tsx
// Success
{ ok: true, data: <handler-return-value> }

// Error
{ ok: false, error: 'ERROR_CODE', message: '...' }
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `MISSING_FIELDS` | token, id, or action missing |
| `TOKEN_INVALID` | Token not active, expired, or userId mismatch |
| `INTROSPECTION_ERROR` | Failed to validate token |
| `USER_DATA_ERROR` | Failed to fetch user RBAC data |
| `NO_ORG_SELECTED` | User has no org selected (need org context) |
| `ORG_NOT_MEMBER` | User not member of selected org |
| `ACTION_NOT_FOUND` | Action doesn't exist in registry |
| `PERMISSION_DENIED` | User lacks required permission |

---

### Registering Custom Actions

Actions are registered in `app/logto-kit/custom-actions/index.ts`:

```tsx
import type { ActionRegistry, ActionConfig, ProtectedActionHandler } from './index';

const actions: ActionRegistry = {
  'explode-earth': {
    requiredPermission: 'launch-nuke',
    handler: async ({ userId, orgId, payload }) => {
      // Your protected logic here
      // payload is typed as unknown, cast as needed
      const { force } = payload as { force: boolean };
      
      return { success: true, message: 'Earth exploded!' };
    },
  },
  'send-notification': {
    requiredPermission: 'send-notifications',
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
- `orgId` - The active organization ID (from `customData.Preferences.asOrg`)
- `payload` - The payload sent from the client

**Role to Permission Mapping:**

Edit `app/logto-kit/custom-actions/validation.ts` to customize:

```typescript
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ['*'],                          // All permissions
  'nuke-commander': ['launch-nuke', 'abort-nuke'],
  astronaut: ['land-on-moon', 'spacewalk'],
};
```

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
  theme={themeSpec}
/>
```

**Features:**
- Shows "Be yourself (global)" option to exit org context
- Auto-selects first org if user is in only one
- Persists selection to `customData.Preferences.asOrg`
- Uses sessionStorage for client-side state

---

### setActiveOrg() - Server Action

Validates and sets the active organization.

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
6. **Permission Check** - Calls Management API to verify user's role has required permission
7. **Execute Action** - Runs the registered handler if all checks pass

#### Organization Switching Flow

1. User selects org from `<OrgSwitcher>` or Organizations tab
2. `setActiveOrg()` validates membership via Logto claims
3. Selection stored in:
   - `sessionStorage` (client) - for immediate UI updates
   - `customData.Preferences.asOrg` (server) - for persistence
4. `useOrgMode()` hook provides `asOrg` and `setAsOrg()` throughout the app

---

### Role to Permission Mapping

Default mapping in `custom-actions/validation.ts`:

```typescript
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: ['*'],                          // All permissions
  'nuke-commander': ['launch-nuke', 'abort-nuke'],
  astronaut: ['land-on-moon', 'spacewalk'],
};
```

**Extend this** by editing `app/logto-kit/custom-actions/validation.ts`.

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

# Scopes (must include org scopes)
SCOPES=profile,organizations,organization_roles

# M2M for Management API
LOGTO_M2M_APP_ID=your_m2m_app_id
LOGTO_M2M_APP_SECRET=your_m2m_app_secret
LOGTO_M2M_RESOURCE=https://your-tenant.logto.app/api

# Token Introspection (required for Protected Actions API)
LOGTO_INTROSPECTION_URL=https://your-tenant.logto.app/oidc/token/introspection
```

#### Logto Console Setup

1. **Application Scopes**: Add `organizations` and `organization_roles`
2. **M2M Application**: Create a Machine-to-Machine app with:
   - Permissions to read organization roles
   - Add to environment variables above

---

### Usage Examples

#### Basic Permission Check

```tsx
import { Protected } from './logto-kit';

export default function AdminPage() {
  return (
    <Protected role="admin">
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
| Permission always returns false | Check: 1) User has the role in Logto Console, 2) Role name matches exactly in ROLE_PERMISSION_MAP, 3) Management API token is configured |
| Org switcher not appearing | User needs multiple organizations in their Logto claims |
| "MISSING_PERM" / "PERMISSION_DENIED" | Verify role is in Logto Console AND matches ROLE_PERMISSION_MAP |
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
| `security` | `mfa`, `2fa`, `totp` | Multi-factor authentication management |
| `identities` | `identity` | External identity providers |
| `organizations` | `orgs`, `org` | Organization memberships and roles |
| `dev` | `debug`, `data`, `raw` | Developer tools: access tokens, ID tokens, cookies, session management |

### Configuration Examples

```env
# Show all tabs in default order
LOAD_TABS=profile,preferences,security,identities,organizations,dev

# Show only profile, security, and preferences (in that order)
LOAD_TABS=profile,security,preferences

# Use aliases - these are all equivalent to the first example
LOAD_TABS=personal,prefs,mfa,identity,orgs,debug
LOAD_TABS=user,custom-data,2fa,identities,organization,data

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
- `useThemeMode()` - Access theme and themeColors
- `useLangMode()` - Access current language

The preferences tab no longer needs props passed to it - it uses the hooks directly!

### Adding a Custom Tab

1. Create your tab component in `app/logto-kit/components/dashboard/tabs/`
2. Add to `LOAD_TABS` in your `.env`

The tab system is pretty simple - look at existing tabs for examples.

### Adding a Theme

1. Create a folder in `app/logto-kit/themes/{your-theme}/`
2. Add `dark.css` and `light.css` with your CSS variables
3. Set `THEME=your-theme` in `.env`

### Adding a Language

1. Create `app/logto-kit/locales/{locale-code}.ts`
2. Follow the pattern in existing locale files
3. Add to `LANG_AVAILABLE` in `.env`

## Cookie & Session Management

The dashboard handles stale cookies automatically. When the Logto access token goes stale:

1. Request to fetch data fails
2. System detects "stale cookie" error
3. Redirects to `/api/wipe` which clears the stale cookie
4. User is redirected home - fresh token is obtained from valid session
5. Dashboard loads normally

This means users don't need to re-authenticate just because their access token expired - the system handles it transparently.

### Manual Cookie Wipe

Visit `/api/wipe` to manually clear cookies. Useful for debugging.

### Force Sign-Out

Visit `/api/wipe?force=true` to completely sign out - clears both app cookies AND the Logto session.

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

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐     ┌───────────┐
│   Client    │────▶│  API Route       │────▶│  Server Action  │────▶│  S3       │
│             │     │  /api/upload-    │     │  uploadAvatar   │     │  Storage  │
│ 1. Select   │     │    avatar        │     │                 │     │           │
│ 2. Get      │     │ 1. Receive       │     │ 1. Validate     │     │ {userId}/ │
│    token    │     │    FormData      │     │    token        │     │   you.png │
│ 3. POST     │     │ 2. Call action   │     │ 2. Upload to    │     │           │
│ 4. Get URL  │◀────│ 3. Return URL    │◀────│    S3           │◀────│           │
│ 5. Push to  │     │                  │     │                 │     │           │
│    Logto    │     └──────────────────┘     └─────────────────┘     └───────────┘
└─────────────┘
```

### Security

The upload is protected by two-layer validation:

1. **Token Validation**: Calls Logto's OIDC introspection endpoint to verify the token is `active: true`
2. **User ID Match**: Verifies the token's `sub` claim matches the submitted `userId`

This prevents users from uploading avatars for other users. If user A tries to upload with userId = "userB", the request is rejected with `UNAUTHORIZED: token subject does not match the provided userId.`

> **Note**: This same security pattern is also used for account deletion - the user's token must be valid and belong to the account being deleted.

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
| `app/api/upload-avatar/route.ts` | API route that handles HTTP requests |
| `app/logto-kit/components/handlers/use-avatar-upload.tsx` | React hook for client-side upload logic |
| `app/logto-kit/logic/actions.ts` | Server action with `uploadAvatar()` function |

The hook (`useAvatarUpload`) is already integrated into the Profile tab component. It:
1. Fetches the user's access token via `fetchUserBadgeData()`
2. Sends the file + token + userId to the API route
3. On success, automatically updates the avatar in Logto via `updateAvatarUrl()`

### Usage in Custom Components

You can use the avatar upload hook in your own components:

```tsx
import { useAvatarUpload } from './logto-kit';

function MyAvatarUploader({ userId }: { userId: string }) {
  const { upload, isUploading, error } = useAvatarUpload({
    userId,
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
} from './logto-kit';
```

### Profile Updates

```tsx
// Update basic info (name, username)
await updateUserBasicInfo({ name: 'John', username: 'johndoe' });

// Update full profile
await updateUserProfile({ name: 'John', username: 'johndoe', primaryEmail: 'john@example.com' });

// Update custom data
await updateUserCustomData({ preferences: { notifications: true } });

// Update avatar URL
await updateAvatarUrl('https://example.com/avatar.png');
```

### Password & Account

```tsx
// Update password (requires identity verification first)
await updateUserPassword('newPassword123', 'verificationRecordId');

// Delete account (requires identity verification and access token)
await deleteUserAccount('verificationRecordId', 'accessToken');

// Sign out and clear cookies
await signOutUser();
```

### MFA Management

```tsx
// List all MFA methods
const mfaList = await getMfaVerifications();

// Generate TOTP secret for new enrollment
const { secret, secretQrCode } = await generateTotpSecret();

// Add MFA verification
await addMfaVerification({
  type: 'Totp',
  code: '123456',
  verificationId: 'verificationRecordId',
});

// Delete MFA method
await deleteMfaVerification('mfaVerificationId', 'verificationRecordId');

// Generate backup codes
const { codes } = await generateBackupCodes('verificationRecordId');

// Get existing backup codes
const backupCodes = await getBackupCodes('verificationRecordId');
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
await verifyVerificationCode('123456', 'verificationId', 'email');

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

// FormData must contain:
// - file: File object (JPEG, PNG, WebP, GIF, max 2MB)
// - accessToken: string
// - userId: string
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('accessToken', accessToken);
formData.append('userId', userId);
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

### Functions

- [x] Org switcher - Complete (OrgSwitcher, OrgSwitcherWrapper, setActiveOrg, useOrgMode)
- [x] Protected component - Complete (<Protected> server component)
- [x] Protected Actions API - Complete (POST /api/protected endpoint)
- [x] RBAC validation - Complete (validateRbac, checkPermissionInOrg, checkRoleInOrg)
- [x] Token validation - Complete (validateToken with jose JWKS)
- [ ] Fine-tune ROLE_PERMISSION_MAP for your needs
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
