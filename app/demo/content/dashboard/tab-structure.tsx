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
          code={`export function getLoadedTabs(): TabId[] {
  const raw = process.env.LOAD_TABS || '';
  if (!raw.trim()) {
    return ALL_TABS;
  }
  return raw.split(',').map(s => s.trim()).filter(Boolean) as TabId[];
}`}
        />

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
