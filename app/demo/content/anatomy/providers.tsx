'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function AnatomyProvidersDoc() {
  const styles = useDocStyles();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const h2Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f3f4f6' : '#111827',
    marginTop: '32px',
    marginBottom: '16px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    paddingBottom: '8px',
  };

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    color: isDark ? 'rgba(255,255,255,0.6)' : '#475569',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Multi-Tier Context Tree")} style={{ ...h2Style, marginTop: 0 }}>
        Multi-Tier Context Tree
      </h2>
      <p style={styles.textStyle}>
        The application architecture relies on a structured, multi-tier provider tree. This hierarchy ensures that configuration preferences, authentication state, and user details are isolated and propagated to downstream components.
      </p>

      <p style={styles.textStyle}>
        The structure of the provider tree is ordered as follows:
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Provider</th>
            <th style={customThStyle}>Position</th>
            <th style={customThStyle}>Core Responsibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>PreferencesProvider</td>
            <td style={customTdStyle}>Outermost</td>
            <td style={customTdStyle}>Tracks client-side user preferences including active theme mode and language locale.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>LogtoProvider</td>
            <td style={customTdStyle}>Intermediate</td>
            <td style={customTdStyle}>Manages the OpenID Connect (OIDC) authentication state, tokens, and active session.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UserDataProvider</td>
            <td style={customTdStyle}>Innermost</td>
            <td style={customTdStyle}>Caches and distributes structured user profile details retrieved from the Logto Management API.</td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        title="Provider Tree Nesting Pattern"
        code={`// Internal nesting of providers inside the root wrapper:
<PreferencesProvider
  initialTheme={initialTheme}
  initialLang={initialLang}
>
  <LogtoProviderContent
    userData={userData}
    dashboard={dashboard}
  >
    <UserDataProvider userData={userData}>
      {children}
    </UserDataProvider>
  </LogtoProviderContent>
</PreferencesProvider>`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong> By wrapping the authentication state within the preferences layer, client-side preferences (such as theme and language selection) remain active and stable regardless of authentication transitions or active session changes.
      </div>

      <h2 id={slugify("Core React Hooks")} style={h2Style}>
        Core React Hooks
      </h2>
      <p style={styles.textStyle}>
        Components fetch state and execute operations using targeted custom hooks. These hooks interface directly with the multi-tier context tree.
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Hook</th>
            <th style={customThStyle}>Target Context Layer</th>
            <th style={customThStyle}>Returned Values and Operations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>useLogto()</td>
            <td style={customTdStyle}>Unified / Multiple</td>
            <td style={customTdStyle}>
              Exposes overall user data, active theme, language, organization ID, and modal controller functions (openDashboard, closeDashboard). Throws an error if used outside a LogtoProvider.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>useThemeMode()</td>
            <td style={customTdStyle}>PreferencesProvider</td>
            <td style={customTdStyle}>
              Provides current mode (light or dark), colors token dictionary, setMode function, and toggleMode function. Integrates a silent fallback to default values if called outside the provider context.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>useLangMode()</td>
            <td style={customTdStyle}>PreferencesProvider</td>
            <td style={customTdStyle}>
              Provides active locale string and setLang callback to update and persist localization choice.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>useOrgMode()</td>
            <td style={customTdStyle}>PreferencesProvider</td>
            <td style={customTdStyle}>
              Tracks the currently selected organization ID (asOrg) and provides setAsOrg to switch organization contexts.
            </td>
          </tr>
        </tbody>
      </table>

      <CodeBlock
        title="Component Hook Usage"
        code={`'use client';

import { useLogto, useThemeMode } from './logto-kit';

function UserPreferenceManager() {
  const { userData, openDashboard } = useLogto();
  const { mode, toggleMode, colors } = useThemeMode();

  return (
    <div style={{ background: colors.bgPrimary, color: colors.textPrimary, padding: '1rem' }}>
      <p>Logged in as: {userData.name}</p>
      <p>Current theme style: {mode}</p>
      <button onClick={toggleMode} style={{ borderColor: colors.borderColor }}>
        Toggle Color Style
      </button>
      <button onClick={openDashboard} style={{ background: colors.accentBlue }}>
        Manage Settings
      </button>
    </div>
  );
}`}
      />
    </div>
  );
}