'use client';

import CodeBlock from '../../components/SyntaxBlock';
import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function OverviewSection() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Tab overview">
        <p style={styles.textStyle}>
          The Dashboard renders tabs based on the <code style={styles.codeStyle}>LOAD_TABS</code>{' '}
          env var. <code style={styles.codeStyle}>DashboardClient</code> maintains{' '}
          <code style={styles.codeStyle}>activeTab</code> state and conditionally renders
          each tab component.
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Tab</th>
              <th style={styles.thStyle}>Props</th>
              <th style={styles.thStyle}>Hooks</th>
              <th style={styles.thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>Profile</td>
              <td style={styles.tdStyle}>14 + common</td>
              <td style={styles.tdStyle}>useAvatarUpload</td>
              <td style={styles.tdStyle}>5+</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Preferences</td>
              <td style={styles.tdStyle}>1 + common</td>
              <td style={styles.tdStyle}>useThemeMode, useLangMode</td>
              <td style={styles.tdStyle}>0 (via context)</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Security</td>
              <td style={styles.tdStyle}>14 + common</td>
              <td style={styles.tdStyle}> - </td>
              <td style={styles.tdStyle}>15</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Sessions</td>
              <td style={styles.tdStyle}>6 + common</td>
              <td style={styles.tdStyle}> - </td>
              <td style={styles.tdStyle}>3</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Identities</td>
              <td style={styles.tdStyle}>common only</td>
              <td style={styles.tdStyle}> - </td>
              <td style={styles.tdStyle}>0</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Organizations</td>
              <td style={styles.tdStyle}>1 + common</td>
              <td style={styles.tdStyle}>useOrgMode</td>
              <td style={styles.tdStyle}>2</td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>Dev</td>
              <td style={styles.tdStyle}>1 + common</td>
              <td style={styles.tdStyle}> - </td>
              <td style={styles.tdStyle}>0</td>
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
          <code style={styles.codeSmStyle}>mobmode?: number</code>. These are omitted from individual prop tables below.
        </div>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>mobmode:</strong>{' '}
          Mobile rendering flag. <code style={styles.codeSmStyle}>mobmode === 1</code> enables compact layouts,
          reduced spacing, and mobile-optimized button styling. Desktop clients omit this prop (undefined to desktop mode).
          Affects form layout, avatar modal (camera/upload buttons vs drag-and-drop), and action button placement.
        </div>
      </SectionWrap>

      <SectionWrap label="Tab Orchestration & Routing State">
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
          <li style={{ marginBottom: '8px' }}>
            <strong>Dev Tab Hard Gating:</strong> In production environments, the <code style={styles.codeStyle}>dev</code> tab is strictly omitted from the <code style={styles.codeStyle}>loadedTabs</code> list. Even if a client attempts to artificially manipulate the local <code style={styles.codeStyle}>activeTab</code> state, the conditional rendering block prevents the component from mounting.
          </li>
        </ul>
      </SectionWrap>

      <SectionWrap label="LOAD_TABS Env Variable Parsing">
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
              <li><code style={styles.codeSmStyle}>debug</code>, <code style={styles.codeSmStyle}>data</code>, <code style={styles.codeSmStyle}>raw</code> : resolves to <code style={styles.codeSmStyle}>dev</code></li>
            </ul>
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Deduplication and Validation:</strong> Skips invalid tokens with warning logs and inserts valid canonical IDs into a <code style={styles.codeSmStyle}>Set</code> to eliminate duplicate values while preserving the configured tab order.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Production Sanitization:</strong> Explicitly excludes the <code style={styles.codeSmStyle}>dev</code> tab if the environment is not in development mode (preventing exposure of active OIDC ID tokens or debugging payloads).
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Empty Fallback:</strong> If no tabs remain or the variable is not set, the helper falls back to loading all tabs (excluding the <code style={styles.codeSmStyle}>dev</code> tab in production).
          </li>
        </ol>

        <CodeBlock
          title="Helper Parsing Flow"
          code={`export function getLoadedTabs(): TabId[] {
  const raw = readEnv('LOAD_TABS') || '';

  if (!raw.trim()) {
    return isDev ? [...ALL_TABS] : ALL_TABS.filter(id => id !== 'dev');
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

  const filtered = isDev ? result : result.filter(id => id !== 'dev');
  return filtered.length === 0 ? ALL_TABS.filter(id => id !== 'dev') : filtered;
}`}
        />
      </SectionWrap>

      <SectionWrap label="Common Tab Properties Specification">
        <p style={styles.textStyle}>
          To maintain a uniform UI layout, every tab component consumes a standardized prop contract. These properties provide identity context, global theme details, interface translations, and mobile optimization flags.
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '20%' }}>Property</th>
              <th style={{ ...styles.thStyle, width: '25%' }}>Type</th>
              <th style={{ ...styles.thStyle, width: '55%' }}>Technical Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>userData</td>
              <td style={{ ...styles.tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>UserData</td>
              <td style={styles.tdStyle}>
                The parsed OIDC user claims containing user identifiers, usernames, emails, phone numbers, custom profile fields, and registration metadata.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mode</td>
              <td style={{ ...styles.tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={styles.tdStyle}>
                The active client UI mode managed by preferences providers. Tabs use this to adjust style layers and assets.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>colors</td>
              <td style={{ ...styles.tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>ThemeColors</td>
              <td style={styles.tdStyle}>
                A collection of styling color variables containing CSS background colors, text primaries, border styles, and accent colors.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>t</td>
              <td style={{ ...styles.tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>Translations</td>
              <td style={styles.tdStyle}>
                The active locale language bundle containing translated text strings for headers, labels, form descriptions, and feedback alerts.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>mobmode</td>
              <td style={{ ...styles.tdStyle, fontFamily: 'monospace', fontSize: '11px' }}>number | undefined</td>
              <td style={styles.tdStyle}>
                Mobile rendering flag. Setting this parameter to 1 notifies child tabs to override desktop layouts and apply compact styling definitions.
              </td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Mobile Layout Adaptation Behavior">
        <p style={styles.textStyle}>
          When the viewport matches a mobile screen size, the client architecture passes <code style={styles.codeSmStyle}>mobmode === 1</code>. This flag forces components to restructure themselves vertically, shrink typography, and switch interactive features to match small viewports.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          1. Spacing and Structural Adaptation
        </h4>
        <p style={styles.textStyle}>
          Components adjust container bounds to reclaim valuable screen width. Grid elements transition from multi-column configurations to a simplified single column layout. Padding parameters are scaled down, and container min-height constraints are deactivated:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Desktop: Uses padded container configurations (e.g., <code style={styles.codeSmStyle}>padding: &apos;0.5rem 1.25rem 0.5rem 1rem&apos;</code>) and fixed row heights (e.g., <code style={styles.codeSmStyle}>minHeight: &apos;5.5rem&apos;</code>).
          </li>
          <li style={{ marginBottom: '8px' }}>
            Mobile: Sets margins and paddings to minimal bounds (e.g., <code style={styles.codeSmStyle}>padding: &apos;0.75rem 0.75rem&apos;</code>) and allows auto container expansion (e.g., <code style={styles.codeSmStyle}>minHeight: &apos;auto&apos;</code>).
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          2. Form Rows and Input Flex Alignment
        </h4>
        <p style={styles.textStyle}>
          Form rows switch alignment dynamically based on the active viewport. Actions that are horizontally aligned on desktop are stacked vertically to prevent clipping:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Desktop Layout: Horizontal arrangement (<code style={styles.codeSmStyle}>flexDirection: &apos;row&apos;</code>, <code style={styles.codeSmStyle}>gap: &apos;0.375rem&apos;</code>).
          </li>
          <li style={{ marginBottom: '8px' }}>
            Mobile Layout: Vertical layout stacking (<code style={styles.codeSmStyle}>flexDirection: &apos;column&apos;</code>, <code style={styles.codeSmStyle}>gap: &apos;0.25rem&apos;</code>) ensuring interactive fields fill the horizontal space.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          3. Typography and Button Sizing
        </h4>
        <p style={styles.textStyle}>
          Font sizing, spacing values, and action pads are reduced to ensure a consistent, non-overlapping design:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            Primary text displays scale down from <code style={styles.codeSmStyle}>0.9375rem</code> on desktop to <code style={styles.codeSmStyle}>0.8125rem</code> on mobile. Supporting meta labels shrink to <code style={styles.codeSmStyle}>0.625rem</code>.
          </li>
          <li style={{ marginBottom: '8px' }}>
            Action buttons scale down padding from desktop bounds (<code style={styles.codeSmStyle}>0.3125rem 0.75rem</code>) to mobile-friendly boundaries (<code style={styles.codeSmStyle}>0.25rem 0.5rem</code>) with scaled text sizes (<code style={styles.codeSmStyle}>0.625rem</code>).
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          4. Interactive and Action Adapters
        </h4>
        <p style={styles.textStyle}>
          Complex workflows adapt their interface to make interactions easier on small touch devices:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Avatar Upload:</strong> The profile avatar component disables hover triggers and the desktop drag-and-drop file target. It displays simple upload and camera picker buttons directly.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Passkey Management:</strong> Security tab operations switch modal templates. Rather than using centered desktop overlay panels, it renders bottom action lists for passkey management.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Text Simplification:</strong> Long strings are shortened or replaced. Mobile viewports omit verbose labels (e.g., displaying raw dates instead of prefixed logged-in descriptions).
          </li>
        </ul>
      </SectionWrap>
    </div>
  );
}
