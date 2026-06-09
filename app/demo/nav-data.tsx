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
    sections: ['Pre-requisites', 'Clone & install', 'ENV setup', 'Backend selection', 'Avatar upload', 'Logto Console', 'Replace the demo'],
  },
  {
    id: 'user-button',
    label: 'UserButton',
    code: false,
    type: 'component',
    icon: <UserButtonIcon />,
    desc: 'Standalone avatar primitives. Renders as UserButton (clickable avatar), UserBadge (display-only avatar), or UserCard (clickable avatar + identity text). Data priority: userData prop -> provider context -> fallback icon after 1.5 s (no auto-fetch step).',
    sections: ['Specs', 'Examples'],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    code: false,
    type: 'component',
    icon: <DashboardIcon />,
    desc: 'Full user management dashboard. Tabs: Profile, Preferences, Security (TOTP, backup codes, WebAuthn), Identities, Organizations. Drop it anywhere - wraps itself in required providers.',
    sections: ['Internals', 'Provider Sync', 'Tab Structure', 'Rendering', 'Mobile'],
  },
  {
    id: 'tabs-and-flows',
    label: 'Tabs & Flows',
    code: false,
    type: 'reference',
    icon: <DashboardIcon />,
    desc: 'Deep dive into each dashboard tab: props, hooks (useAvatarUpload, useThemeMode, useLangMode, useOrgMode), server actions, FlowModal architecture, TOTP flows, ContactRow, org switching.',
    sections: ['Overview', 'Profile', 'Preferences', 'Security', 'Sessions', 'Identities', 'Organizations'],
  },
  {
    id: 'rbac',
    label: 'RBAC',
    code: false,
    type: 'component',
    icon: <ProtectedIcon />,
    desc: 'Permission-based access control architecture. Features conditional client-side UI rendering with the <Protected /> wrapper, server-side API claims verification, and organization role scoping.',
    sections: ['UI <Protected />', 'API'],
  },
  {
    id: 'calculator',
    label: 'Calculator',
    code: false,
    type: 'component',
    icon: <CalculatorIcon />,
    desc: 'Organization-scoped permissions and RBAC study case. Includes live multi-tier permission-gated calculator demo supporting basic and scientific operational tiers.',
    sections: ['Overview', 'RBAC Design', 'API Authorization', 'Live Demo'],
  },
  {
    id: 'anatomy',
    label: 'Anatomy',
    code: false,
    type: 'reference',
    icon: <PrimitivesIcon />,
    desc: 'Internal layout contexts and architectural tokens. Consolidates multi-tier provider hierarchies, CSS custom color modes, file-bound translation bundles, and baseline building blocks.',
    sections: ['Providers', 'Theme', 'i18n', 'Primitives', 'Async Patterns'],
  },
  {
    id: 'security',
    label: 'Security',
    code: false,
    type: 'reference',
    icon: <ActionsApiIcon />,
    desc: 'Defensive backend and operations framework. Consolidates server-action safe sanitize wrappers, input field and same-origin validation guards, and configurable Pino logging backend routers.',
    sections: ['Error Handling', 'Input Guards', 'Logging'],
  },
];

export const SECTION_HINTS: SectionHint = {
  'Pre-requisites': 'Necessary developer prerequisites...',
  'Clone & install': 'Clone the repository and install packages...',
  'ENV setup': 'Required environment variables...',
  'Backend selection': 'Backend selection, feature comparison matrix, and phone country code filters...',
  'Avatar upload': 'Supabase REST API or MinIO/S3...',
  'Logto Console': 'Regular Web App, M2M App...',
  'Replace the demo': 'Swap DemoApp with your component...',
  Specs: 'Full specification and component attributes...',
  Examples: 'Live code examples and pattern demos...',
  Internals: 'Internal implementation details and routing logic...',
  'Provider Sync': 'Context provider state synchronization flows...',
  'Tab Structure': 'Dashboard tab layouts and interface components...',
  Rendering: 'Component mounting, layout flows, and rendering lifecycle...',
  Mobile: 'Responsive viewport adaptation and mobile components...',
  'Tab overview': 'All tabs, hooks, actions summary...',
  Profile: 'User details management, avatars, and identity verification...',
  Preferences: 'Regional languages, theme customizers, and event broadcasts...',
  Security: 'MFA registrations, password complexity validators, and account purges...',
  Sessions: 'Device session maps, hearts beats, and revocations...',
  Identities: 'OIDC social integrations, sync timelines, and metadata trackers...',
  Organizations: 'Role mappings, permissions, and dynamic organization switching...',
  'UI <Protected />': 'Client-side gating component and conditional layout rendering...',
  API: 'Server-side action validation and token claims enforcement...',
  Overview: 'System design, directory mappings, and operational flows...',
  'RBAC Design': 'Organization-scoped permission roles and access tier allocations...',
  'API Authorization': 'Secure service actions and token claim checks...',
  'Live Demo': 'Interactive calculator demo utilizing multi-tier permissions...',
  Providers: 'Provider hierarchy: PreferencesProvider, LogtoProvider, and UserDataProvider...',
  Theme: 'ThemeColors, color tokens, and custom styling parameters...',
  i18n: 'Statically bundled locale dictionaries and on-the-fly language switching...',
  Primitives: 'Lower-level building blocks: useRefreshable, RefreshButton, and direct token fetches...',
  'Async Patterns': 'Cancelled flag pattern for Server Action race handling. Why AbortController does not work for server-side requests.',
  'Error Handling': 'Action error sanitization wrappers and standard safety filters...',
  'Input Guards': 'Boundary verification guards, SafeUrl, and same-origin protections...',
  Logging: 'Unstructured and structured event logs with Pino configurations...',
};
