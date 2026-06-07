'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DashboardTabStructure() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Tab configuration")} style={{ ...h2Style, marginTop: 0 }}>
        Tab configuration
      </h2>

      <p style={styles.textStyle}>
        Tabs are configured via the <code style={styles.codeStyle}>LOAD_TABS</code> environment variable. This variable accepts a comma-separated list of tab names.
      </p>

      <CodeBlock title="ENV Configuration" code={`LOAD_TABS=profile,security,organizations`} />

      <p style={styles.textStyle}>
        The system resolves active tabs dynamically during the initialization phase:
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
    // ENV not set -> show all tabs in default order.
    return [...ALL_TABS];
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

  return result.length === 0 ? [...ALL_TABS] : result;
}`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Alias Resolution:</strong> Operators can use user-friendly values in <code style={styles.codeSmStyle}>LOAD_TABS</code> (e.g. <code style={styles.codeSmStyle}>personal</code> or <code style={styles.codeSmStyle}>user</code> for <code style={styles.codeSmStyle}>profile</code>, <code style={styles.codeSmStyle}>prefs</code> or <code style={styles.codeSmStyle}>custom-data</code> for <code style={styles.codeSmStyle}>preferences</code>, <code style={styles.codeSmStyle}>2fa</code> or <code style={styles.codeSmStyle}>mfa</code> for <code style={styles.codeSmStyle}>security</code>, etc.).
      </div>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '25%' }}>Tab</th>
            <th style={{ ...customThStyle, width: '75%' }}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>profile</td>
            <td style={customTdStyle}>Avatar, display name, username, custom profile fields (given/family name), email, phone, and identity verification.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>preferences</td>
            <td style={customTdStyle}>Theme and language selection.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>security</td>
            <td style={customTdStyle}>MFA configuration (TOTP, backup codes, WebAuthn passkeys), password configuration, and email or phone verification.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>identities</td>
            <td style={customTdStyle}>Read-only list of connected social identity providers.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>sessions</td>
            <td style={customTdStyle}>Active device session tracking, active heartbeat, device-specific metadata, and remote revocation.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>organizations</td>
            <td style={customTdStyle}>Associated user organizations, active roles, and organization switching logic.</td>
          </tr>
        </tbody>
      </table>

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        Leaving the <code style={styles.codeStyle}>LOAD_TABS</code> variable empty instructs the server to render all configured tabs in default order. Tabs are displayed and rendered using the <code style={styles.codeStyle}>activeTab</code> client state inside <code style={styles.codeStyle}>DashboardClient</code>.
      </div>
    </div>
  );
}
