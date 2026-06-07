'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

export default function OverviewSection() {
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
      <div>
        <h2 id={slugify("Tab overview")} style={h2Style}>Tab overview</h2>
        <p style={styles.textStyle}>
          The Dashboard renders tabs based on the <code style={styles.codeStyle}>LOAD_TABS</code>{' '}
          env var. <code style={styles.codeStyle}>DashboardClient</code> maintains{' '}
          <code style={styles.codeStyle}>activeTab</code> state and conditionally renders
          each tab component.
        </p>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={customThStyle}>Tab</th>
              <th style={customThStyle}>Props</th>
              <th style={customThStyle}>Hooks</th>
              <th style={customThStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>Profile</td>
              <td style={customTdStyle}>Common props plus profile callbacks</td>
              <td style={customTdStyle}>useAvatarUpload</td>
              <td style={customTdStyle}>Profile updates and contact verification</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Preferences</td>
              <td style={customTdStyle}>Common props plus preferences state</td>
              <td style={customTdStyle}>useThemeMode, useLangMode</td>
              <td style={customTdStyle}>Context-driven updates</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Security</td>
              <td style={customTdStyle}>Common props plus security callbacks</td>
              <td style={customTdStyle}> - </td>
              <td style={customTdStyle}>MFA, passkeys, password, account actions</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Sessions</td>
              <td style={customTdStyle}>Common props plus session callbacks</td>
              <td style={customTdStyle}> - </td>
              <td style={customTdStyle}>List and revoke session actions</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Identities</td>
              <td style={customTdStyle}>common only</td>
              <td style={customTdStyle}> - </td>
              <td style={customTdStyle}>0</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>Organizations</td>
              <td style={customTdStyle}>Common props plus organization callbacks</td>
              <td style={customTdStyle}>useOrgMode</td>
              <td style={customTdStyle}>Organization switch and state updates</td>
            </tr>
          </tbody>
        </table>
        <CodeBlock title="LOAD_TABS" code={`# Show all tabs (default)
LOAD_TABS=

# Show specific tabs
LOAD_TABS=profile,preferences,security,organizations`} />
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Common props:</strong>{' '}
          Every tab receives <code style={styles.codeSmStyle}>userData: UserData</code>,{' '}
          <code style={styles.codeSmStyle}>mode: &apos;dark&apos; | &apos;light&apos;</code>,{' '}
          <code style={styles.codeSmStyle}>colors: ThemeColors</code>,{' '}
          <code style={styles.codeSmStyle}>t: Translations</code>, and{' '}
          <code style={styles.codeSmStyle}>mobmode?: number</code>. Individual sections only document tab-specific props.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>mobmode:</strong>{' '}
          Mobile rendering flag. <code style={styles.codeSmStyle}>mobmode === 1</code> enables compact spacing and stacked layout blocks.
        </div>
      </div>

      <div>
        <h2 id={slugify("Tab Orchestration & Routing State")} style={h2Style}>Tab Orchestration & Routing State</h2>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>DashboardClient</code> acts as the primary layout controller on the client side. It manages tab selection and conditional rendering using a centralized state pipeline.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Active Tab Routing State
        </h4>
        <p style={styles.textStyle}>
          The state variable <code style={styles.codeStyle}>activeTab</code> is initialized to the first valid tab returned in the <code style={styles.codeStyle}>loadedTabs</code> array (falling back to <code style={styles.codeSmStyle}>&apos;profile&apos;</code> if none are available):
        </p>
        <CodeBlock
          title="State Initialization"
          code={`const [activeTab, setActiveTab] = useState<TabId>(loadedTabs[0] ?? 'profile');`}
        />
        <p style={styles.textStyle}>
          When a user interacts with the sidebar navigation, the component triggers the state transition by calling <code style={styles.codeSmStyle}>setActiveTab(tabId)</code>. Since state transitions occur locally, there are no full-page reloads, preserving client-side context.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          The Tab Gating Pipeline
        </h4>
        <p style={styles.textStyle}>
          Tab gating operates through a strict multi-tier verification process:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Sidebar Filtering:</strong> The sidebar navigation links are dynamically iterated using only the elements in the <code style={styles.codeStyle}>loadedTabs</code> array. This ensures that unconfigured tabs do not appear in the interface.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Conditional Rendering:</strong> The central content panel uses short-circuit operators (e.g., <code style={styles.codeSmStyle}>activeTab === &apos;security&apos; &amp;&amp; &lt;SecurityTab ... /&gt;</code>) to render components. Unrendered tabs remain unmounted, preventing unauthorized component lifecycles, background api calls, or state initializations.
          </li>
        </ul>
      </div>

      <div>
        <h2 id={slugify("LOAD_TABS Env Variable Parsing")} style={h2Style}>LOAD_TABS Env Variable Parsing</h2>
        <p style={styles.textStyle}>
          The tab configuration is declared via the <code style={styles.codeStyle}>LOAD_TABS</code> environment variable. The helper function <code style={styles.codeStyle}>getLoadedTabs()</code> parses this variable on the server side or client side (with <code style={styles.codeSmStyle}>NEXT_PUBLIC_LOAD_TABS</code> as a fallback) using the following pipeline:
        </p>
        
        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Parsing and Resolution Sequence
        </h4>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'decimal' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Comma-Separated Tokenization:</strong> Splits the raw configuration string using commas as delimiters.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Alias Resolution:</strong> Translates user-friendly names to canonical tab IDs using a lookup map:
            <ul style={{ paddingLeft: '20px', listStyleType: 'circle', marginTop: '4px' }}>
              <li><code style={styles.codeSmStyle}>personal</code>, <code style={styles.codeSmStyle}>user</code> : resolves to <code style={styles.codeSmStyle}>profile</code></li>
              <li><code style={styles.codeSmStyle}>prefs</code>, <code style={styles.codeSmStyle}>custom-data</code>, <code style={styles.codeSmStyle}>custom</code>, <code style={styles.codeSmStyle}>customdata</code> : resolves to <code style={styles.codeSmStyle}>preferences</code></li>
              <li><code style={styles.codeSmStyle}>identity</code> : resolves to <code style={styles.codeSmStyle}>identities</code></li>
              <li><code style={styles.codeSmStyle}>orgs</code>, <code style={styles.codeSmStyle}>org</code> : resolves to <code style={styles.codeSmStyle}>organizations</code></li>
              <li><code style={styles.codeSmStyle}>mfa</code>, <code style={styles.codeSmStyle}>2fa</code>, <code style={styles.codeSmStyle}>totp</code> : resolves to <code style={styles.codeSmStyle}>security</code></li>
              <li><code style={styles.codeSmStyle}>session</code>, <code style={styles.codeSmStyle}>devices</code>, <code style={styles.codeSmStyle}>activity</code> : resolves to <code style={styles.codeSmStyle}>sessions</code></li>
            </ul>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Deduplication and Validation:</strong> Skips invalid tokens with warning logs and inserts valid canonical IDs into a <code style={styles.codeSmStyle}>Set</code> to eliminate duplicate values while preserving the configured tab order.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Normalization:</strong> The resolved tab list is normalized to canonical tab IDs before render-time checks.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Empty Fallback:</strong> If no tabs remain or the variable is not set, the helper falls back to loading all tabs in default order.
          </li>
        </ol>

        <CodeBlock
          title="Helper Parsing Flow"
          code={`export function getLoadedTabs(): TabId[] {
  const raw = readEnv('LOAD_TABS') || '';

  if (!raw.trim()) {
    return [...ALL_TABS];
  }

  const seen = new Set<TabId>();
  const result: TabId[] = [];

  for (const token of raw.split(',')) {
    const key = token.trim().toLowerCase();
    if (!key) continue;

    const tabId = TAB_ALIASES[key];
    if (!tabId) {
      warn(\`Unknown tab identifier "\${token.trim()}" in LOAD_TABS - skipping.\`);
      continue;
    }

    if (!seen.has(tabId)) {
      seen.add(tabId);
      result.push(tabId);
    }
  }

  return result.length === 0 ? [...ALL_TABS] : result;
}`}
        />
      </div>

      <div>
        <h2 id={slugify("Common Tab Properties Specification")} style={h2Style}>Common Tab Properties Specification</h2>
        <p style={styles.textStyle}>
          To maintain a uniform UI layout, every tab component consumes a standardized prop contract. These properties provide identity context, global theme details, interface translations, and mobile optimization flags.
        </p>

        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '20%' }}>Property</th>
              <th style={{ ...customThStyle, width: '25%' }}>Type</th>
              <th style={{ ...customThStyle, width: '55%' }}>Technical Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>userData</td>
              <td style={{ ...customTdStyle, fontFamily: 'monospace', fontSize: '11px' }}>UserData</td>
              <td style={customTdStyle}>
                The parsed OIDC user claims containing user identifiers, usernames, emails, phone numbers, custom profile fields, and registration metadata.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={{ ...customTdStyle, fontFamily: 'monospace', fontSize: '11px' }}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={customTdStyle}>
                The active client UI mode managed by preferences providers. Tabs use this to adjust style layers and assets.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={{ ...customTdStyle, fontFamily: 'monospace', fontSize: '11px' }}>ThemeColors</td>
              <td style={customTdStyle}>
                A collection of styling color variables containing CSS background colors, text primaries, border styles, and accent colors.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>t</td>
              <td style={{ ...customTdStyle, fontFamily: 'monospace', fontSize: '11px' }}>Translations</td>
              <td style={customTdStyle}>
                The active locale language bundle containing translated text strings for headers, labels, form descriptions, and feedback alerts.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mobmode</td>
              <td style={{ ...customTdStyle, fontFamily: 'monospace', fontSize: '11px' }}>number | undefined</td>
              <td style={customTdStyle}>
                Mobile rendering flag. Setting this parameter to 1 notifies child tabs to override desktop layouts and apply compact styling definitions.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div>
        <h2 id={slugify("Mobile Layout Adaptation Behavior")} style={h2Style}>Mobile Layout Adaptation Behavior</h2>
        <p style={styles.textStyle}>
          When the viewport is mobile, the client passes <code style={styles.codeSmStyle}>mobmode === 1</code>.
          Tabs use this flag to reduce spacing and move dense rows into stacked layouts.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          1. Spacing and Structural Adaptation
        </h4>
        <p style={styles.textStyle}>
          Layout changes are simple:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Desktop keeps wider spacing and multi-column rows where needed.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Mobile reduces spacing and prefers one-column blocks.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          2. Form Rows and Input Flex Alignment
        </h4>
        <p style={styles.textStyle}>
          Form rows switch by viewport:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Desktop uses row alignment for labels and actions.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Mobile stacks controls so inputs stay readable.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          3. Typography and Button Sizing
        </h4>
        <p style={styles.textStyle}>
          Typography and buttons scale down on smaller screens:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Primary and secondary text use smaller sizes.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Buttons use smaller padding and compact labels.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          4. Interactive and Action Adapters
        </h4>
        <p style={styles.textStyle}>
          Some workflows also switch to touch-friendly controls:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Avatar Upload:</strong> Uses direct pick controls instead of desktop-only hover patterns.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Passkey Management:</strong> Uses compact action layouts.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Text Simplification:</strong> Labels are shortened where space is limited.
          </li>
        </ul>
      </div>
    </div>
  );
}
