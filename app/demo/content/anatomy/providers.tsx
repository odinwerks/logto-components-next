'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function AnatomyProvidersDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Multi-Tier Context Tree">
        <p style={styles.textStyle}>
          The application architecture relies on a structured, multi-tier provider tree. This hierarchy ensures that configuration preferences, authentication state, and user details are isolated and propagated to downstream components.
        </p>

        <p style={styles.textStyle}>
          The structure of the provider tree is ordered as follows:
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Provider</th>
              <th style={styles.thStyle}>Position</th>
              <th style={styles.thStyle}>Core Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>PreferencesProvider</td>
              <td style={styles.tdStyle}>Outermost</td>
              <td style={styles.tdStyle}>Tracks client-side user preferences including active theme mode and language locale.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>LogtoProvider</td>
              <td style={styles.tdStyle}>Intermediate</td>
              <td style={styles.tdStyle}>Manages the OpenID Connect (OIDC) authentication state, tokens, and active session.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>UserDataProvider</td>
              <td style={styles.tdStyle}>Innermost</td>
              <td style={styles.tdStyle}>Caches and distributes structured user profile details retrieved from the Logto Management API.</td>
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
      </SectionWrap>

      <SectionWrap label="Core React Hooks">
        <p style={styles.textStyle}>
          Components fetch state and execute operations using targeted custom hooks. These hooks interface directly with the multi-tier context tree.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Hook</th>
              <th style={styles.thStyle}>Target Context Layer</th>
              <th style={styles.thStyle}>Returned Values and Operations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>useLogto()</td>
              <td style={styles.tdStyle}>Unified / Multiple</td>
              <td style={styles.tdStyle}>
                Exposes overall user data, active theme, language, organization ID, and modal controller functions (openDashboard, closeDashboard). Throws an error if used outside a LogtoProvider.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>useThemeMode()</td>
              <td style={styles.tdStyle}>PreferencesProvider</td>
              <td style={styles.tdStyle}>
                Provides current mode (light or dark), colors token dictionary, setMode function, and toggleMode function. Integrates a silent fallback to default values if called outside the provider context.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>useLangMode()</td>
              <td style={styles.tdStyle}>PreferencesProvider</td>
              <td style={styles.tdStyle}>
                Provides active locale string and setLang callback to update and persist localization choice.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>useOrgMode()</td>
              <td style={styles.tdStyle}>PreferencesProvider</td>
              <td style={styles.tdStyle}>
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
      </SectionWrap>
    </div>
  );
}
