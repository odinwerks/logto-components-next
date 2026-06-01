'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function DashboardTabStructure() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Tab configuration">
        <p style={styles.textStyle}>
          Tabs are configured via the <code style={styles.codeStyle}>LOAD_TABS</code> environment variable. This variable accepts a comma-separated list of tab names.
        </p>

        <CodeBlock title="ENV Configuration" code={`LOAD_TABS=profile,security,organizations`} />

        <p style={styles.textStyle}>
          The system resolves and filters active tabs dynamically during the initialization phase:
        </p>

        <CodeBlock
          title="Resolving tabs"
          code={`const TAB_ALIASES: Record<string, TabId> = {
  profile: 'profile', personal: 'profile', user: 'profile',
  preferences: 'preferences', prefs: 'preferences', 'custom-data': 'preferences',
  security: 'security', mfa: 'security', '2fa': 'security',
  // ...other aliases mapped to TabId
};

export function getLoadedTabs(): TabId[] {
  const raw = readEnv('LOAD_TABS') || '';

  if (!raw.trim()) {
    // ENV not set → show all tabs in default order (minus 'dev' in prod).
    return isDev ? [...ALL_TABS] : ALL_TABS.filter(id => id !== 'dev');
  }

  const seen = new Set<TabId>();
  const result: TabId[] = [];

  for (const token of raw.split(',')) {
    const key = token.trim().toLowerCase();
    if (!key) continue;

    const tabId = TAB_ALIASES[key];
    if (!tabId) continue;

    if (!seen.has(tabId)) {
      seen.add(tabId);
      result.push(tabId);
    }
  }

  // Security: strip 'dev' tab in production regardless of LOAD_TABS setting.
  return isDev ? result : result.filter(id => id !== 'dev');
}`}
        />

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Alias Resolution:</strong> Operators can use user-friendly values in <code style={styles.codeSmStyle}>LOAD_TABS</code> (e.g. <code style={styles.codeSmStyle}>personal</code> or <code style={styles.codeSmStyle}>user</code> for <code style={styles.codeSmStyle}>profile</code>, <code style={styles.codeSmStyle}>prefs</code> or <code style={styles.codeSmStyle}>custom-data</code> for <code style={styles.codeSmStyle}>preferences</code>, <code style={styles.codeSmStyle}>2fa</code> or <code style={styles.codeSmStyle}>mfa</code> for <code style={styles.codeSmStyle}>security</code>, etc.).
        </div>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Production Dev-Tab Safety Gate:</strong> In production environments, the sensitive <code style={styles.codeSmStyle}>dev</code> tab is automatically and strictly filtered out of the loaded tabs to prevent OIDC user access token leakage.
        </div>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '25%' }}>Tab</th>
              <th style={{ ...styles.thStyle, width: '75%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>profile</td>
              <td style={styles.tdStyle}>Avatar, display name, username, custom profile fields (given/family name), email, phone, and identity verification.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>preferences</td>
              <td style={styles.tdStyle}>Theme and language selection.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>security</td>
              <td style={styles.tdStyle}>MFA configuration (TOTP, backup codes, WebAuthn passkeys), password configuration, and email or phone verification.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>identities</td>
              <td style={styles.tdStyle}>Read-only list of connected social identity providers.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>sessions</td>
              <td style={styles.tdStyle}>Active device session tracking, active heartbeat, device-specific metadata, and remote revocation.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>organizations</td>
              <td style={styles.tdStyle}>Associated user organizations, active roles, and organization switching logic.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>dev</td>
              <td style={styles.tdStyle}>Raw OIDC ID tokens, secure cookies, and context debug logs.</td>
            </tr>
          </tbody>
        </table>

        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
          Leaving the <code style={styles.codeStyle}>LOAD_TABS</code> variable empty instructs the server to render all seven tabs. Tabs are displayed and rendered using the <code style={styles.codeStyle}>activeTab</code> client state inside <code style={styles.codeStyle}>DashboardClient</code>.
        </div>
      </SectionWrap>
    </div>
  );
}
