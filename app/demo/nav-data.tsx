import React from 'react';
import type { NavItem, SectionHint } from './types';

const UserButtonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
    <path
      d="M2.5 13c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

const DashboardIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9" y="2" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    <rect x="2" y="9" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
    <rect x="9" y="9" width="5" height="5" rx="0.8" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const ProtectedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

const OrgSwitcherIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="4" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="3" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="13" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 5.8V9M8 9L3 10.2M8 9l5 1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const ProvidersIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 10l6 3 6-3M2 6l6 3 6-3M2 6l6-3 6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ThemeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const I18nIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3" />
    <path d="M8 2.5S5.5 5 5.5 8s2.5 5.5 2.5 5.5M8 2.5S10.5 5 10.5 8 8 13.5 8 13.5M2.5 8h11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const SessionsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="5.5" cy="8" r="1.2" fill="currentColor" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" />
    <circle cx="10.5" cy="8" r="1.2" fill="currentColor" />
  </svg>
);

const CalculatorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
    <rect x="5" y="4" width="6" height="2.5" rx="0.5" stroke="currentColor" strokeWidth="1" />
    <circle cx="5.5" cy="8.5" r="0.6" fill="currentColor" />
    <circle cx="8" cy="8.5" r="0.6" fill="currentColor" />
    <circle cx="10.5" cy="8.5" r="0.6" fill="currentColor" />
    <circle cx="5.5" cy="11" r="0.6" fill="currentColor" />
    <circle cx="8" cy="11" r="0.6" fill="currentColor" />
    <circle cx="10.5" cy="11" r="0.6" fill="currentColor" />
  </svg>
);

const ActionsApiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 2L3 9h5l-1.5 5L13 7H8L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const RocketIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2L10 7h3l-2.5 4L12 14l-4-2-4 2 1.5-3L3 7h3l2-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PrimitivesIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 1L15 4.5v7L8 15 1 11.5v-7L8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    <path d="M8 8L1 4.5M8 8l7-3.5M8 8v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    code: false,
    type: 'guide',
    icon: <RocketIcon />,
    desc: 'Clone, configure ENV, replace the demo with your app. All other docs assume this environment.',
    sections: ['Pre-requisites', 'Clone & install', 'ENV setup', 'Avatar upload', 'Logto Console', 'Replace the demo'],
  },
  {
    id: 'user-button',
    label: 'UserButton',
    code: false,
    type: 'component',
    icon: <UserButtonIcon />,
    desc: 'Standalone avatar component. Renders as UserButton (clickable, opens Dashboard modal), UserBadge (display only), or UserCard (inline with name/email). Priority: prop → context → auto-fetch. Falls back to a user icon after 1.5 s.',
    sections: ['Specs', 'Examples'],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    code: false,
    type: 'component',
    icon: <DashboardIcon />,
    desc: 'Full user management dashboard. Tabs: Profile, Preferences, Security (TOTP, backup codes, WebAuthn), Identities, Organizations, Dev (tokens, cookies, session). Drop it anywhere - wraps itself in required providers.',
    sections: ['Internals', 'Provider Sync', 'Tab Structure', 'Rendering', 'Mobile'],
  },
  {
    id: 'tabs-and-flows',
    label: 'Tabs & Flows',
    code: false,
    type: 'reference',
    icon: <DashboardIcon />,
    desc: 'Deep dive into each dashboard tab: props, hooks (useAvatarUpload, useThemeMode, useLangMode, useOrgMode), server actions, FlowModal architecture, TOTP flows, ContactRow, org switching.',
    sections: ['Tab overview', 'Profile', 'Preferences', 'Security', 'Organizations', 'Dev'],
  },
  {
    id: 'protected',
    label: '<Protected />',
    code: true,
    type: 'component',
    icon: <ProtectedIcon />,
    desc: 'Client component that gates UI subtrees behind permission checks. Supports single string, string[], and orgId scoping. requireAll controls AND vs OR logic.',
    sections: ['RBAC Overview', 'Protected Component', 'Protected Actions API', 'Action Registration', 'API Response & Errors', 'Permission System'],
  },
  {
    id: 'org-switcher',
    label: 'OrgSwitcher',
    code: false,
    type: 'component',
    icon: <OrgSwitcherIcon />,
     desc: 'Dropdown for switching organisations. OrgSwitcherWrapper auto-fetches from Logto. setActiveOrg validates via OIDC userinfo. setAsOrg persists to customData + sessionStorage. Auto-selects single org.',
    sections: ['Overview', 'OrgSwitcher props', 'Wrapper', 'useOrgMode', 'setActiveOrg', 'Switching flow'],
  },
  {
    id: 'providers',
    label: 'Providers',
    code: false,
    type: 'setup',
    icon: <ProvidersIcon />,
    desc: 'Provider hierarchy: PreferencesProvider (outer) wraps LogtoProviderContent which wraps UserDataProvider (inner). Exposes useLogto(), useUserDataContext(), useThemeMode(), useLangMode(), and useOrgMode() hooks to the entire subtree.',
    sections: ['Installation', 'Configuration', 'Hooks reference', 'Notes'],
  },
  {
    id: 'theme',
    label: 'Theme',
    code: false,
    type: 'config',
    icon: <ThemeIcon />,
    desc: 'Color-only theme system: dark/light CSS custom properties for color switching, with all typography/radii/shadows hardcoded directly in components. ThemeColors interface, DARK_COLORS/LIGHT_COLORS constants, useThemeMode hook.',
    sections: ['Overview', 'Color tokens', 'CSS variables', 'useThemeMode hook'],
  },
  {
    id: 'i18n',
    label: 'i18n',
    code: false,
    type: 'config',
    icon: <I18nIcon />,
    desc: 'File-based i18n. All locales bundled statically. LANG_AVAILABLE controls the picker UI. useLangMode() for client-side, getTranslations() for server-side. Re-renders on language change without server round-trip.',
    sections: ['Overview', 'How it works', 'ENV variables', 'Direct imports', 'Custom hook', 'Adding a language'],
  },
  {
    id: 'sessions',
    label: 'Sessions',
    code: false,
    type: 'component',
    icon: <SessionsIcon />,
    desc: 'Active session management tab. Lists sessions from Logto Account API with device info and IP geolocation. Password-protected revocation. Current session identified via JTI matching.',
    sections: ['Overview', 'Props', 'Server Actions', 'IP Geolocation', 'Limitations'],
  },
  {
    id: 'calculator',
    label: 'Calculator',
    code: false,
    type: 'component',
    icon: <CalculatorIcon />,
    desc: 'Permission-gated calculator demo. Wraps UI with <Protected>, calls /api/protected on =. Two-tier permissions: calc:basic and calc:scientific. Live demo included.',
    sections: ['Overview', 'Files', 'Protected Gate', 'Permission Matrix', 'Permission Flow', 'API Call', 'Action Handlers', 'Live Calculator'],
  },
  {
    id: 'errors',
    label: 'Error Handling',
    code: false,
    type: 'reference',
    icon: <ActionsApiIcon />,
    desc: 'Error sanitization system. All errors returned to the client are fixed codes. 22 ErrorCodes, safeAction, ActionResult, DataResult, throwOnApiError, sanitize, LogtoApiError.',
    sections: ['Overview', 'Error Codes', 'Server Action Pattern', 'API Helpers'],
  },
  {
    id: 'guards',
    label: 'Input Guards',
    code: false,
    type: 'reference',
    icon: <ProtectedIcon />,
    desc: 'Input validation at server-action trust boundaries. ID guards, enum guards, field guards, validation functions, safeUrl builder, mass-assignment protection, origin guard, readEnv.',
    sections: ['Overview', 'ID & Enum Guards', 'Field Guards & Validation', 'URL Builder & Mass Assignment', 'Origin Guard & readEnv'],
  },
  {
    id: 'logging',
    label: 'Logging',
    code: false,
    type: 'reference',
    icon: <I18nIcon />,
    desc: 'Configurable logging with LOG_BACKEND routing. Two APIs: unstructured (log/warn/error/debug) and structured (logEvent). Pino integration for production observability.',
    sections: ['Overview', 'Unstructured API', 'Structured API', 'Integration'],
  },
  {
    id: 'primitives',
    label: 'Primitives',
    code: false,
    type: 'reference',
    icon: <PrimitivesIcon />,
    desc: 'Reusable building blocks: useRefreshable() hook (unmount/remount pattern), <RefreshButton />, direct org token fetch, and the PermissionsBlock pattern for live-refreshing data.',
    sections: ['useRefreshable()', '<RefreshButton />', 'Direct token fetch', 'PermissionsBlock pattern'],
  },
];

export const SECTION_HINTS: SectionHint = {
  'Quick start': 'Import and mount the component...',
  Props: 'Full prop table and TypeScript signatures...',
  Examples: 'Live code examples and pattern demos...',
  Notes: 'Caveats, known issues, migration notes...',
  'Tab configuration': 'LOAD_TABS env var and aliases...',
  Installation: 'npm install steps and peer dependencies...',
  Configuration: 'Provider props and environment variables...',
  'Hooks reference': 'useLogto, useThemeMode, useLangMode, useOrgMode...',
  'Custom themes': 'Copy default/dark.css and default/light.css, customize hex values...',
  'useThemeMode hook': 'mode, colors, setMode, toggleMode...',
  'Color tokens': 'All 17 color tokens with dark/light values...',
  'CSS variables': 'Full list of CSS custom properties...',
  Overview: 'How this system works end-to-end...',
  'Adding a language': 'Create locale file → register → add to LANG_AVAILABLE...',
  'useLangMode hook': 'lang, setLang...',
  'ENV reference': 'LANG_MAIN, LANG_AVAILABLE, THEME, DEFAULT_THEME_MODE...',
  Endpoint: 'POST /api/protected - URL, method, auth...',
  'Request schema': '{ action, payload? }...',
  'Response + error codes': '{ ok, data } or { ok, error, message }...',
  'Registering actions': 'ActionRegistry shape in custom-actions/index.ts...',
  'Logto Console': 'Regular Web App, M2M App...',
  'ENV setup': 'Required environment variables...',
  'Avatar upload': 'Supabase REST API or MinIO/S3...',
  'Replace the demo': 'Swap DemoApp with your component...',
  'Tab overview': 'All tabs, hooks, actions summary...',
  'Security': 'TOTP, backup codes, password, account deletion...',
  'useRefreshable()': '0/1 toggle hook, triggerRefresh API, 35ms gap mechanism...',
  '<RefreshButton />': 'Shared button component, props, design tokens, placement rules...',
  'Direct token fetch': 'Bypassing SDK accessTokenMap cache, direct /oidc/token call...',
  'PermissionsBlock pattern': 'Full annotated example combining hook + button + fetch...',
  Mobile: 'useIsPortrait, DashboardRouter, desktop/mobile prop, MobileClient...',
};
