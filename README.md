# Logto Debug Dashboard

A modular Next.js debug dashboard for Logto authentication with comprehensive user profile management, featuring a terminal/hacker aesthetic.

## Features

- **Terminal/Hacker Aesthetic**: OG styling with bracketed buttons, monospace fonts, and dark/light themes
- **Two-Column Layout**: Sidebar with avatar, token, and user info; main content area with tabs
- **Full User Management**: Profile, custom data, identities, organizations, MFA, and raw data views
- **Theme System**: User-created themes with ENV-selected activation and default theme mode
- **i18n Support**: Multi-language support with ENV-configured locale availability and ordering
- **MFA Management**: TOTP enrollment, backup codes generation, and WebAuthn support
- **User Preferences**: Automatic persistence of theme and language choices in Logto customData
- **Auto-Refresh on Preference Change**: When theme or language is changed, tabs (profile, custom-data, raw) automatically refresh to display the latest data from the server
- **Tab Configuration**: Select which tabs to display and their order via ENV variable
- **Cookie Recovery**: Automatic handling of stale cookie contexts with cookie-killer utility
- **Translation-First Validation**: All validation messages use translation strings for full i18n coverage

## Project Structure

```
./
├── app/
│   ├── callback/
│   │   └── route.ts
│   ├── logto-kit/
│   │   └── src/
│   │       ├── components/
│   │       │   └── dashboard/
│   │       │       ├── shared/
│   │       │       │   ├── CodeBlock.tsx
│   │       │       │   └── Toast.tsx
│   │       │       ├── tabs/
│   │       │       │   ├── custom-data.tsx
│   │       │       │   ├── identities.tsx
│   │       │       │   ├── mfa.tsx
│   │       │       │   ├── organizations.tsx
│   │       │       │   ├── profile.tsx
│   │       │       │   └── raw-data.tsx
│   │       │       ├── client.tsx
│   │       │       ├── index.tsx
│   │       │       └── types.ts
│   │       ├── locales/
│   │       │   ├── en-US.ts
│   │       │   ├── index.ts
│   │       │   └── ka-GE.ts
│   │       ├── logic/
│   │       │   ├── actions.ts
│   │       │   ├── errors.ts
│   │       │   ├── index.ts
│   │       │   ├── types.ts
│   │       │   └── validation.ts
│   │       ├── themes/
│   │       │   ├── default/
│   │       │   │   ├── dark.css
│   │       │   │   ├── index.ts
│   │       │   │   └── light.css
│   │       │   └── index.ts
│   │       └── index.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── logto.ts
│   └── page.tsx
├── .env
├── .env.example
├── middleware.ts
├── package-lock.json
├── package.json
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
NEXT_THEME=default

# Available themes
THEMES_AVAILABLE=default
NEXT_THEMES_AVAILABLE=default
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

Themes are user-created and ENV-selected. Each theme lives in its own folder under `app/logto-kit/src/themes/` and is activated by setting the `THEME` environment variable.

Themes are loaded from `app/logto-kit/src/themes/{THEME}/`:

- `dark.css` - Dark theme variables
- `light.css` - Light theme variables
- `index.ts` - Theme metadata

### Adding a New Theme

1. Create a new folder in `app/logto-kit/src/themes/{your-theme}/`
2. Add `dark.css` and `light.css` with CSS variables
3. Add `index.ts` with theme metadata
4. Set `THEME=your-theme` in your `.env`

## i18n System

Translations are loaded from `app/logto-kit/src/locales/`:

- `index.ts` - Locale loader and registry
- `{locale-code}.ts` - Translation files (e.g., `en-US.ts`, `ka-GE.ts`)

### Adding a New Language

1. Create a new file in `app/logto-kit/src/locales/{locale-code}.ts`
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
| `custom-data` | `custom`, `customdata` | Custom JSON data editor |
| `identities` | `identity` | External identity providers |
| `organizations` | `orgs`, `org` | Organization memberships and roles |
| `mfa` | `2fa`, `totp` | Multi-factor authentication management |
| `raw` | `debug`, `data` | Raw user data view |

### Configuration Examples

```env
# Show all tabs in default order
LOAD_TABS=profile,custom-data,identities,organizations,mfa,raw

# Show only profile, MFA, and custom data (in that order)
LOAD_TABS=profile,mfa,custom-data

# Use aliases - these are all equivalent to the first example
LOAD_TABS=personal,custom,identity,orgs,2fa,debug
LOAD_TABS=user,customdata,identities,organization,totp,data

# If not set or empty, shows all tabs in default order
```

### How Tab Loading Works

1. **ENV Parsing**: `LOAD_TABS` is parsed as comma-separated list
2. **Alias Resolution**: Each token is mapped to its canonical tab ID
3. **Validation**: Invalid tokens are skipped with a warning
4. **Deduplication**: Duplicate tabs are removed while preserving order
5. **Fallback**: If no valid tabs remain, all tabs are shown in default order

## User Preferences & JSON Schema

The dashboard automatically stores user preferences (theme mode and language selection) in Logto's `customData` field under a `Preferences` key. This allows preferences to persist across sessions and devices.

### JSON Schema Update (Important!)

To ensure type safety and proper validation in your Logto application, update your Logto application's JSON schema to include the `Preferences` key:

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

I need to add a workable, multi-state, multi-function user button. Once this is fully polished, repackage the logto-kit folder as a components library, enabling Logto usage in a way similar to Clerk (a great and easyto use SaaS but I am too broke).

## License
If you cause the decadence of Earth running this horrid code, I am not liable. Also take care <3
