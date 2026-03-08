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
│   │   │   │   ├── lang-mode.tsx
│   │   │   │   ├── theme-mode.tsx
│   │   │   │   └── user-data-context.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── client.tsx
│   │   │   │   ├── index.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── types.ts
│   │   │   │   ├── shared/
│   │   │   │   │   ├── CodeBlock.tsx
│   │   │   │   │   ├── design.tsx
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
├── .env
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

### Theme Mode Provider

The dashboard provides a `ThemeModeProvider` and `useThemeMode()` hook for theme management anywhere in your app.

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
- `themeColors` - ThemeColors object with all color values
- `setTheme(theme)` - Set specific theme
- `toggleTheme()` - Toggle between dark/light

#### ThemeModeProvider Props

```tsx
<ThemeModeProvider 
  initialTheme="dark" 
  onUpdateCustomData={async (data) => { /* save to Logto */ }}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialTheme` | `'dark' \| 'light'` | `'dark'` | Initial theme mode |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Optional callback to persist theme to Logto customData |

When `onUpdateCustomData` is provided, theme changes are automatically synced to Logto for cross-device persistence.

### LangModeProvider

The dashboard provides a `LangModeProvider` and `useLangMode()` hook for language management anywhere in your app.

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

#### LangModeProvider Props

```tsx
<LangModeProvider 
  initialLang="en-US"
  onUpdateCustomData={async (data) => { /* save to Logto */ }}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialLang` | `string` | ENV `LANG_MAIN` | Initial language code |
| `onUpdateCustomData` | `(data) => Promise<void>` | - | Optional callback to persist lang to Logto customData |

#### Lang Persistence

Language is stored in sessionStorage for instant switching, then synced to Logto customData for cross-device persistence.

**Priority:**
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
| `themeColors` | `ThemeColors` | - | Theme colors (optional, auto-detected if not provided) |
| `do` | `() => void` | - | UserButton only: custom click handler |

If no user data is available for 1.5 seconds, displays a fallback user icon.

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

The Dashboard component automatically wraps your app with three context providers:

```tsx
<UserDataProvider userData={userData}>
  <ThemeModeProvider initialTheme={theme} onUpdateCustomData={updateCustomData}>
    <LangModeProvider initialLang={lang} onUpdateCustomData={updateCustomData}>
      <DashboardClient ... />
    </LangModeProvider>
  </ThemeModeProvider>
</UserDataProvider>
```

This means:
- **UserDataProvider** - Provides user data to all child components
- **ThemeModeProvider** - Manages theme state with automatic persistence to Logto
- **LangModeProvider** - Manages language state with automatic persistence to Logto

All three providers expose hooks that child components can use:
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

### UI Polish
- [x] Profile tab - redesigned with proper edit UI
- [x] Preferences tab - removed JSON editor
- [x] Security tab - button styling unified across all tabs
- [x] Dev tab - new developer tools tab for tokens and session management
- [x] Identities tab - reviewed, looks good
- [ ] Organizations - system needs to be built from scratch

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

### Conquer All.
- [ ] [DOMINATE. ABSOLUTELY. EVERYTHING.](https://music.youtube.com/watch?v=l6t4gx8vCMI)

## License
If you cause the decadence of Earth running this horrid code, I am not liable. Also take care <3