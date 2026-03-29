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

const ActionsApiIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M9.5 2L3 9h5l-1.5 5L13 7H8L9.5 2z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'user-button',
    label: 'UserButton',
    code: false,
    type: 'component',
    icon: <UserButtonIcon />,
    desc: 'Standalone avatar component. Renders as UserButton (clickable, opens Dashboard modal) or UserBadge (display only). Priority: prop → context → auto-fetch. Falls back to a user icon after 1.5 s.',
    sections: ['Quick start', 'Props', 'Examples', 'Notes'],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    code: false,
    type: 'component',
    icon: <DashboardIcon />,
    desc: 'Full user management dashboard. Tabs: Profile, Preferences, Security (TOTP, backup codes, WebAuthn), Identities, Organizations, Dev (tokens, cookies, session). Drop it anywhere — wraps itself in required providers.',
    sections: ['Internals', 'Provider Sync', 'Tab Structure', 'Rendering'],
  },
  {
    id: 'protected',
    label: '<Protected />',
    code: true,
    type: 'component',
    icon: <ProtectedIcon />,
    desc: 'Server component that gates UI subtrees behind permission or role checks. Supports single string, string[], and orgId scoping. requireAll controls AND vs OR logic.',
    sections: ['Quick start', 'Props', 'Examples', 'Notes'],
  },
  {
    id: 'org-switcher',
    label: 'OrgSwitcher',
    code: false,
    type: 'component',
    icon: <OrgSwitcherIcon />,
    desc: 'Dropdown for switching between organisations. Includes "Be yourself (global)" option. Persists to customData.Preferences.asOrg and sessionStorage. Auto-selects when user has a single org.',
    sections: ['Quick start', 'Props', 'Examples', 'Notes'],
  },
  {
    id: 'providers',
    label: 'Providers',
    code: false,
    type: 'setup',
    icon: <ProvidersIcon />,
    desc: 'LogtoProvider wraps UserDataProvider and PreferencesProvider. Exposes useLogto(), useUserDataContext(), useThemeMode(), useLangMode(), and useOrgMode() hooks to the entire subtree.',
    sections: ['Installation', 'Configuration', 'Hooks reference', 'Notes'],
  },
  {
    id: 'theme',
    label: 'Theme',
    code: false,
    type: 'config',
    icon: <ThemeIcon />,
    desc: 'File-based theme system. Each theme is a folder under logto-kit/themes/ containing dark.css, light.css, and index.ts. Activated via THEME env var. useThemeMode() hook available anywhere inside LogtoProvider.',
    sections: ['Overview', 'Adding a theme', 'useThemeMode hook', 'CSS variables'],
  },
  {
    id: 'i18n',
    label: 'i18n',
    code: false,
    type: 'config',
    icon: <I18nIcon />,
    desc: 'Translation files in logto-kit/locales/. Ships with en-US and ka-GE. LANG_AVAILABLE and LANG_MAIN control which locales are offered and the default. All validation messages are translation-keyed for full coverage.',
    sections: ['Overview', 'Adding a language', 'useLangMode hook', 'ENV reference'],
  },
  {
    id: 'actions-api',
    label: 'Actions API',
    code: false,
    type: 'api',
    icon: <ActionsApiIcon />,
    desc: 'POST /api/protected — permission-gated server actions. Pipeline: token introspection → user verification → org membership → RBAC check → handler. Register actions in custom-actions/index.ts.',
    sections: ['Endpoint', 'Request schema', 'Response + error codes', 'Registering actions'],
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
  'Adding a theme': 'Create folder → dark.css, light.css, index.ts...',
  'useThemeMode hook': 'theme, themeColors, setTheme, toggleTheme...',
  'CSS variables': 'Full list of CSS custom properties...',
  Overview: 'How this system works end-to-end...',
  'Adding a language': 'Create locale file → register → add to LANG_AVAILABLE...',
  'useLangMode hook': 'lang, setLang...',
  'ENV reference': 'LANG_MAIN, LANG_AVAILABLE, THEME, DEFAULT_THEME_MODE...',
  Endpoint: 'POST /api/protected — URL, method, auth...',
  'Request schema': '{ token, id, action, payload? }...',
  'Response + error codes': '{ ok, data } or { ok, error, message }...',
  'Registering actions': 'ActionRegistry shape in custom-actions/index.ts...',
};
