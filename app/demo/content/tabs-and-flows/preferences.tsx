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

export default function PreferencesSection() {
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
        <h2 id={slugify("Preferences Tab Component & Props")} style={h2Style}>Preferences Tab Component & Props</h2>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>PreferencesTab</code> component handles client-side preference configurations, including color theme and display language settings.
        </p>

        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '25%' }}>Prop</th>
              <th style={{ ...customThStyle, width: '25%' }}>Type</th>
              <th style={{ ...customThStyle, width: '50%' }}>Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>mode</td>
              <td style={customTdStyle}>&apos;dark&apos; | &apos;light&apos;</td>
              <td style={customTdStyle}>
                The active color theme mode used to determine the initial layout styling.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>colors</td>
              <td style={customTdStyle}>ThemeColors</td>
              <td style={customTdStyle}>
                The primary style token mapping object containing color hexadecimal strings.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>t</td>
              <td style={customTdStyle}>Translations</td>
              <td style={customTdStyle}>
                Static key-value translations mapped to the active language locale.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>supportedLangs</td>
              <td style={customTdStyle}>string[]?</td>
              <td style={customTdStyle}>
                Optional collection of active locale strings used to populate the selection dropdown.
              </td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>mobmode</td>
              <td style={customTdStyle}>number?</td>
              <td style={customTdStyle}>
                Optional indicator flag where 1 signals mobile screen dimensions to reduce visual spacing.
              </td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Component Visual Architecture
        </h4>
        <p style={styles.textStyle}>
          The component manages layout interactions via two primary modules:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>Theme Selection Grid:</strong> Displays selectable <code style={styles.codeSmStyle}>ThemeOption</code> buttons for light and dark modes. Each option maps to a <code style={styles.codeSmStyle}>ThemeSVG</code> mockup, which dynamically renders styled SVG bars utilizing colors tied to the option mode. Selection changes trigger <code style={styles.codeSmStyle}>setMode(id)</code>.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>Language Selector Dropdown:</strong> If <code style={styles.codeSmStyle}>supportedLangs</code> is provided, it populates a standard HTML select input wrapped in custom border wrappers. Selecting an option triggers <code style={styles.codeSmStyle}>setLang(value)</code>.
          </li>
        </ul>

        <CodeBlock
          title="Component Interface Spec"
          code={`interface PreferencesTabProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  supportedLangs?: string[];
  mobmode?: number;
}`}
        />
      </div>

      <div>
        <h2 id={slugify("Layout Context Initialization & Lifecycle")} style={h2Style}>Layout Context Initialization & Lifecycle</h2>
        <p style={styles.textStyle}>
          The <code style={styles.codeStyle}>PreferencesProvider</code> is placed at the outermost root of the provider tree (wrapping <code style={styles.codeStyle}>LogtoProvider</code>, which wraps <code style={styles.codeStyle}>UserDataProvider</code>). This nesting ensures that display preferences remain mounted and fully active during session transitions, logins, and logouts.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Initial React State Resolution Sequence
        </h4>
        <p style={styles.textStyle}>
          During initialization, state is parsed according to specific rules to prevent React hydration conflicts and provide stable initialization:
        </p>
        <ol style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'decimal' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Theme Initialization (preventing hydration mismatch):</strong>
            <br />
            To avoid mismatches between server-rendered HTML and client-side storage, React state initializes directly with the server-passed <code style={styles.codeSmStyle}>initialTheme</code> (defaulting to &apos;dark&apos;), completely ignoring client-side sessionStorage on the initial render pass. 
            A client-only <code style={styles.codeSmStyle}>useEffect</code> mount callback then executes to write <code style={styles.codeSmStyle}>initialTheme</code> back into sessionStorage, resolving any cached state.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Language State:</strong>
            <br />
            Initialized from <code style={styles.codeSmStyle}>getInitialLang(serverDefaultLang)</code>. This helper reads the stored language from <code style={styles.codeSmStyle}>sessionStorage</code> (key: <code style={styles.codeSmStyle}>lang-mode</code>). If found, it uses the cached string; otherwise, it falls back to the server configuration.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Organization State:</strong>
            <br />
            Initialized by checking <code style={styles.codeSmStyle}>sessionStorage</code> (key: <code style={styles.codeSmStyle}>org-mode</code>). If no cache is found, it falls back to <code style={styles.codeSmStyle}>initialOrgId</code> or null.
          </li>
        </ol>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Provider Side-Effects and Listeners
        </h4>
        <p style={styles.textStyle}>
          After state resolution, the provider configures active listeners:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            <strong>DOM Attribute Update:</strong> A local hook monitors the theme state and applies it to <code style={styles.codeSmStyle}>document.documentElement.setAttribute(&apos;data-theme&apos;, theme)</code> to propagate CSS variables.
          </li>
          <li style={{ marginBottom: '6px' }}>
            <strong>OS Media Query Sync:</strong> A listener is added for <code style={styles.codeSmStyle}>(prefers-color-scheme: dark)</code>. This automatically updates theme state only if the user has not written an explicit selection to sessionStorage.
          </li>
        </ul>

        <CodeBlock
          title="Context Providers Configuration"
          code={`<PreferencesProvider
  initialTheme="dark"
  initialLang="en-US"
  initialOrgId={null}
  onUpdateCustomData={async (data) => updateUserCustomData(data)}
>
  {children}
</PreferencesProvider>`}
        />
      </div>

      <div>
        <h2 id={slugify("Storage & API Syncing Pipelines")} style={h2Style}>Storage & API Syncing Pipelines</h2>
        <p style={styles.textStyle}>
          User configurations utilize a dual-tier persistence strategy: local caching for immediate response, and remote API synchronization with Logto custom data profiles for cross-device consistency.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Client-Side Storage Keys
        </h4>
        <table style={customTableStyle}>
          <thead>
            <tr>
              <th style={{ ...customThStyle, width: '30%' }}>Storage Key</th>
              <th style={{ ...customThStyle, width: '30%' }}>Scope</th>
              <th style={{ ...customThStyle, width: '40%' }}>Saved Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={customTdPropStyle}>theme-mode</td>
              <td style={customTdStyle}>sessionStorage</td>
              <td style={customTdStyle}>&apos;dark&apos; | &apos;light&apos;</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>lang-mode</td>
              <td style={customTdStyle}>sessionStorage</td>
              <td style={customTdStyle}>locale tag string (e.g., &apos;ka-GE&apos;)</td>
            </tr>
            <tr>
              <td style={customTdPropStyle}>org-mode</td>
              <td style={customTdStyle}>sessionStorage</td>
              <td style={customTdStyle}>organization identifier string or null</td>
            </tr>
          </tbody>
        </table>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Remote Database Persistence
        </h4>
        <p style={styles.textStyle}>
          Changes are asynchronously written to Logto custom data profiles via the <code style={styles.codeStyle}>onUpdateCustomData</code> callback. Saved properties use the <code style={styles.codeSmStyle}>Preferences</code> namespace:
        </p>

        <CodeBlock
          title="Logto Custom Data Profile Structure"
          code={`{
  "Preferences": {
    "theme": "dark" | "light",
    "lang": "string",
    "asOrg": "string" | null
  }
}`}
        />

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          API Error Handling & Rollback Safety
        </h4>
        <p style={styles.textStyle}>
          To avoid desynchronization between sessionStorage and the actual Logto profile state, write routines enforce safety checks:
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '6px' }}>
            If theme or language API write fails, errors are captured and output to the web console (e.g., <code style={styles.codeSmStyle}>[PreferencesProvider] Failed to persist theme:</code>).
          </li>
          <li style={{ marginBottom: '6px' }}>
            If organization API write fails, the provider triggers a revert sequence: it restores sessionStorage to the pre-updated organization ID, resets local state to the pre-updated ID, and logs warning details to the console (<code style={styles.codeSmStyle}>[PreferencesProvider] Org persistence failed, reverting</code>). This prevents invalid organization configurations.
          </li>
        </ul>
      </div>

      <div>
        <h2 id={slugify("Cross-Component State Propagation")} style={h2Style}>Cross-Component State Propagation</h2>
        <p style={styles.textStyle}>
          Separate user-interface sections (such as the main dashboard wrapper and isolated modal layers) operate in distinct React provider trees. Synchronization is managed through custom DOM events and state references.
        </p>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          Custom DOM Event Dispatchers
        </h4>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>theme-changed:</strong> Dispatched on the <code style={styles.codeSmStyle}>window</code> object when <code style={styles.codeSmStyle}>setMode()</code> is invoked. Other active provider instances capture this event, read sessionStorage, and synchronize their theme states to match.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>preferences-changed:</strong> Dispatched on the <code style={styles.codeSmStyle}>window</code> object when <code style={styles.codeSmStyle} >setLang()</code> or <code style={styles.codeSmStyle}>setAsOrg()</code> is called, notifying downstream consumers of modifications.
          </li>
        </ul>

        <h4 style={{ ...styles.textStyle, fontWeight: 600, marginTop: '16px', marginBottom: '8px' }}>
          State References and Storage-First Hook Reads
        </h4>
        <p style={styles.textStyle}>
          Asynchronous API operations are protected from race conditions and stale closure loops by keeping current state values stored in mutable references (<code style={styles.codeSmStyle}>themeRef</code>, <code style={styles.codeSmStyle}>langRef</code>, <code style={styles.codeSmStyle}>asOrgRef</code>) that synchronize with each state render.
        </p>
        <p style={styles.textStyle}>
          Furthermore, the custom hooks <code style={styles.codeStyle}>useLangMode()</code> and <code style={styles.codeStyle}>useOrgMode()</code> employ a storage-first read mechanism: on component access, they retrieve active selections directly from sessionStorage (<code style={styles.codeSmStyle}>sessionStorage.getItem(&apos;lang-mode&apos;)</code> and <code style={styles.codeSmStyle}>sessionStorage.getItem(&apos;org-mode&apos;)</code>) instead of relying solely on the React state value. This bypasses asynchronous propagation delays across nested virtual DOM trees.
        </p>

        <CodeBlock
          title="Hook Implementation Logic"
          code={`export function useLangMode() {
  const context = useContext(PreferencesContext);
  if (context) {
    const storedLang = getStoredLang();
    return {
      ...context.lang,
      lang: storedLang ?? context.lang.lang,
    };
  }
  // Fallback for unprovided components
  return { lang: getDefaultLang(), setLang: () => {} };
}`}
        />
      </div>

      <div>
        <h2 id={slugify("Reactive Client-Side Hot-Switching")} style={h2Style}>Reactive Client-Side Hot-Switching</h2>
        <p style={styles.textStyle}>
          Display language configurations are hot-switched dynamically on the client, eliminating full page refreshes or route re-fetching.
        </p>
        <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
          <li style={{ marginBottom: '8px' }}>
            <strong>Local Static Catalog Resolution:</strong> Translations are fetched from local static catalog dictionaries mapped to locale files. On language state updates, localized child elements re-render instantly.
          </li>
          <li style={{ marginBottom: '8px' }}>
            <strong>Callback Execution:</strong> On language changes, the provider triggers the <code style={styles.codeSmStyle}>onLangChange</code> callback. This allows root layout controllers to update custom configurations or initiate localized server transitions.
          </li>
        </ul>
      </div>
    </div>
  );
}
