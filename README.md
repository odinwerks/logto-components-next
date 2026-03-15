# Logto Debug Dashboard

A modular Next.js debug dashboard for Logto authentication with comprehensive user profile management, featuring a terminal/hacker aesthetic.

## Features

- **Semi-Clean Production-ish UI**: Modern, professional styling with squared buttons, consistent theming, and polished components
- **Two-Column Layout**: Sidebar with avatar, token, and user info; main content area with tabs
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
│   │   ├── upload-avatar/
│   │   │   └── route.ts
│   │   └── wipe/
│   │       └── route.ts
│   ├── callback/
│   │   └── route.ts
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
│   │   ├── custom-logic/
│   │   │   ├── actions/
│   │   │   │   ├── get-active-org.ts
│   │   │   │   └── set-active-org.ts
│   │   │   ├── OrgSwitcher.tsx
│   │   │   ├── OrgSwitcherWrapper.tsx
│   │   │   ├── Protected.tsx
│   │   │   ├── run-protected.ts
│   │   │   ├── token-validator.ts
│   │   │   └── types.ts
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

### PreferencesProvider

The dashboard provides a `PreferencesProvider` that combines theme and language management. It exports both `useThemeMode()` and `useLangMode()` hooks.

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

### LogtoProvider

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

> **⚠️ WARNING**: The custom-logic module is incomplete and not ready for production use. This is a work in progress.

The `custom-logic` module provides components and utilities for organization switching and role-based access control. This is currently under active development.

### Exports

```tsx
import {
  OrgSwitcher,
  OrgSwitcherWrapper,
  Protected,
  runProtected,
  setActiveOrg,
  getActiveOrgId,
  introspectTokenWithOrg,
} from './logto-kit';
```

### Components

- **OrgSwitcher** - Dropdown component for selecting active organization (WIP)
- **OrgSwitcherWrapper** - Server-side wrapper that fetches org data and renders OrgSwitcher
- **Protected** - Higher-order component for protecting routes by organization/role (WIP)

### Functions

- **setActiveOrg(orgId)** - Set the active organization cookie
- **getActiveOrgId()** - Get the current active organization ID
- **runProtected(requirements, token)** - Validate token against org/role requirements (WIP)
- **introspectTokenWithOrg(token)** - Introspect token with organization context

### Environment Variables

```env
# Custom-logic / RBAC Configuration
LOGTO_M2M_RESOURCE=https://your-logto-endpoint/api
```

> Note: Organization features require additional Logto configuration (organization scopes enabled in your Logto application).

## i18n System

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

The Dashboard is just a React component. You can import it anywhere:

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

This is the main use case - drop it into your app wherever you need it.

### Dashboard Provider Structure

The Dashboard component automatically wraps your app with two context providers:

```tsx
<UserDataProvider userData={userData}>
  <PreferencesProvider initialTheme={theme} initialLang={lang} onUpdateCustomData={updateCustomData}>
    <DashboardClient ... />
  </PreferencesProvider>
</UserDataProvider>
```

This means:
- **UserDataProvider** - Provides user data to all child components
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

> **⚠️ Organization/RBAC features are WIP** - See custom-logic module above.

### Functions

- [x] Org switcher - Basic structure added (OrgSwitcher, OrgSwitcherWrapper, setActiveOrg)
- [ ] Org permission (by role and logto perm) wrappers - Not started
- [ ] Protected action runner for special permission graced users - Not started
- [ ] Full org-scoped token handling - Partially done (getOrganizationToken usage)

### UI Polish
- [x] Profile tab - redesigned with proper edit UI
- [x] Preferences tab - removed JSON editor
- [x] Security tab - button styling unified across all tabs
- [x] Dev tab - new developer tools tab for tokens and session management
- [x] Identities tab - reviewed, looks good
- [x] Organizations tab - implemented with org memberships and roles display
- [ ] All UI to cover full Org and RBAC things - Noooooooope. 

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
