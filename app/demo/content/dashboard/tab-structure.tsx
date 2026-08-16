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
        Tabs are configured via the <code style={styles.codeStyle}>LOAD_TABS</code> environment variable. This variable accepts a comma-separated list of tab names. On the client, <code style={styles.codeStyle}>readEnv(&apos;LOAD_TABS&apos;)</code> falls back to <code style={styles.codeStyle}>NEXT_PUBLIC_LOAD_TABS</code> (see <code style={styles.codeSmStyle}>app/logto-kit/logic/env.ts</code>). Dev/PAT has an additional private, strict, default-off <code style={styles.codeSmStyle}>PAT_ENABLED</code> gate.
      </p>

      <CodeBlock
        title="ENV Configuration"
        code={`# Safe default: Dev/PAT is disabled and absent from both tab lists
PAT_ENABLED=false
LOAD_TABS=profile,preferences,security,sessions,identities,organizations
NEXT_PUBLIC_LOAD_TABS=profile,preferences,security,sessions,identities,organizations

# Explicit PAT opt-in (existing Management API M2M setup is also required)
PAT_ENABLED=true
LOAD_TABS=profile,preferences,security,sessions,identities,organizations,dev`}
      />

      <p style={styles.textStyle}>
        The system resolves active tabs dynamically during the initialization phase:
      </p>

      <CodeBlock
        title="Resolving tabs"
        code={`const TAB_ALIASES: Record<string, TabId> = {
  // profile aliases
  profile: 'profile', personal: 'profile', user: 'profile',
  // preferences aliases
  preferences: 'preferences', prefs: 'preferences', 'custom-data': 'preferences',
  custom: 'preferences', customdata: 'preferences',
  // identities aliases
  identities: 'identities', identity: 'identities',
  // organizations aliases
  organizations: 'organizations', orgs: 'organizations', org: 'organizations',
  // security aliases
  security: 'security', mfa: 'security', '2fa': 'security', totp: 'security',
  // sessions aliases
  sessions: 'sessions', session: 'sessions', devices: 'sessions', activity: 'sessions',
  // dev / personal access token aliases
  dev: 'dev', developer: 'dev', pat: 'dev', pats: 'dev',
  'pat-tokens': 'dev', tokens: 'dev',
};

export function isPatEnabled(): boolean {
  // Private read: no public-prefixed fallback.
  return readEnv('PAT_ENABLED', false)?.trim().toLowerCase() === 'true';
}

export function getLoadedTabs(): TabId[] {
  const patEnabled = isPatEnabled();
  const defaultTabs = patEnabled
    ? [...ALL_TABS]
    : ALL_TABS.filter((tab) => tab !== 'dev');
  const raw = readEnv('LOAD_TABS') || '';

  if (!raw.trim()) {
    // Missing/empty -> all enabled tabs in default order.
    return defaultTabs;
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

  // Filter after alias resolution so every Dev alias is covered.
  const enabledTabs = patEnabled
    ? result
    : result.filter((tab) => tab !== 'dev');

  // Covers all-invalid and Dev-only input without reintroducing Dev.
  return enabledTabs.length === 0 ? defaultTabs : enabledTabs;
}`}
      />

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Alias Resolution:</strong> Operators can use user-friendly values in <code style={styles.codeSmStyle}>LOAD_TABS</code> (e.g. <code style={styles.codeSmStyle}>personal</code> or <code style={styles.codeSmStyle}>user</code> for <code style={styles.codeSmStyle}>profile</code>, <code style={styles.codeSmStyle}>prefs</code> or <code style={styles.codeSmStyle}>custom-data</code> for <code style={styles.codeSmStyle}>preferences</code>, <code style={styles.codeSmStyle}>2fa</code> or <code style={styles.codeSmStyle}>mfa</code> for <code style={styles.codeSmStyle}>security</code>, and <code style={styles.codeSmStyle}>developer</code>, <code style={styles.codeSmStyle}>pat</code>, <code style={styles.codeSmStyle}>pats</code>, <code style={styles.codeSmStyle}>pat-tokens</code>, or <code style={styles.codeSmStyle}>tokens</code> for <code style={styles.codeSmStyle}>dev</code>). Dev aliases are retained as valid configuration vocabulary, but all resolve to the gated Dev tab and are ignored while PAT is disabled.
      </div>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Filtering and fallback:</strong>{' '}
        Filtering happens after alias resolution for either tab-list source. Mixed lists
        preserve the configured order of deduplicated non-Dev tabs. Missing, empty,
        all-invalid, or Dev-only input returns all enabled tabs in the existing default
        order—all non-Dev tabs while PAT is off. The PAT gate is private and has no{' '}
        <code style={styles.codeSmStyle}>NEXT_PUBLIC_PAT_ENABLED</code> assignment.
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
            <td style={customTdStyle}>MFA configuration (TOTP, backup codes, WebAuthn passkeys), password configuration, and account deletion.</td>
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
            <td style={customTdPropStyle}>dev</td>
            <td style={customTdStyle}>Purpose-scoped personal access token listing, creation, renaming, deletion, and one-time credential display.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>organizations</td>
            <td style={customTdStyle}>Associated user organizations, active roles, and organization switching logic.</td>
          </tr>
        </tbody>
      </table>

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        Leaving the <code style={styles.codeStyle}>LOAD_TABS</code> variable empty instructs the server to render all enabled tabs in default order. With PAT disabled, that fallback contains every non-Dev tab and never Dev. Tabs are displayed and rendered using the <code style={styles.codeStyle}>activeTab</code> client state inside <code style={styles.codeStyle}>DashboardClient</code>.
      </div>
    </div>
  );
}
