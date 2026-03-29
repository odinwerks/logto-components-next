'use client';

import { Dashboard } from '../../logto-kit/components/dashboard';
import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const sectionWrapStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.058)',
  borderRadius: '5px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.01)',
  display: 'flex',
  flexDirection: 'column',
};

const sectionHeadStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderBottom: '1px solid rgba(255,255,255,0.045)',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  background: 'rgba(255,255,255,0.015)',
};

const sectionDotStyle: React.CSSProperties = {
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.18)',
  flexShrink: 0,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const sectionBodyStyle: React.CSSProperties = {
  padding: '20px 16px',
};

const textStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.5)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.75rem',
};

const codeStyle: React.CSSProperties = {
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.75rem',
};

const codeSmStyle: React.CSSProperties = {
  color: '#ce9178',
  fontSize: '0.6875rem',
  fontFamily: "'IBM Plex Mono', monospace",
};

const noteStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.38)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.625rem',
  paddingLeft: '10px',
  borderLeft: '2px solid rgba(255,255,255,0.06)',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.6875rem',
  marginBottom: '0.75rem',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.35)',
  fontWeight: 600,
  fontSize: '0.5625rem',
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderBottom: '1px solid rgba(255,255,255,0.035)',
  color: 'rgba(255,255,255,0.5)',
  verticalAlign: 'top',
  lineHeight: 1.5,
};

const tdPropStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  whiteSpace: 'nowrap',
};

const tdTypeStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#4ec9b0',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.625rem',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '0.5625rem',
  fontFamily: "'IBM Plex Mono', monospace",
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.45)',
  letterSpacing: '0.03em',
};

// ─── Section wrappers ────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={sectionHeadStyle}>
      <div style={sectionDotStyle} />
      <span style={sectionLabelStyle}>{label}</span>
    </div>
  );
}

function SectionWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={sectionWrapStyle}>
      <SectionHeader label={label} />
      <div style={{ ...sectionBodyStyle, flex: 1 }}>{children}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 1: Internals
// ═══════════════════════════════════════════════════════════════════════════════

function InternalsSection() {
  return (
    <SectionWrap label="How the Dashboard works">
      <p style={textStyle}>
        The <code style={codeStyle}>Dashboard</code> is a <strong>Server Component</strong> that
        fetches user data server-side, then self-wraps with its own internal providers before
        rendering the client-side UI.
      </p>
      <CodeBlock title="Rendering pipeline" code={`// 1. Server Component — fetches data
const result = await fetchDashboardData();

// 2. Resolve preferences from user customData
const userPrefs = getPreferencesFromUserData(result.userData);

// 3. Self-wrap with internal providers
return (
  <UserDataProvider userData={result.userData}>
    <PreferencesProvider
      initialTheme={userPrefs.theme}
      initialLang={userPrefs.lang}
      initialOrgId={userPrefs.asOrg}
      onUpdateCustomData={updateUserCustomData}
    >
      <DashboardClient ... />
    </PreferencesProvider>
  </UserDataProvider>
);`} />
      <p style={textStyle}>
        The <code style={codeStyle}>DashboardClient</code> component consumes these providers via hooks:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Hook</th>
            <th style={thStyle}>Returns</th>
            <th style={thStyle}>Used for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>useThemeMode()</td>
            <td style={tdTypeStyle}>theme, themeSpec, themeColors, setTheme, toggleTheme</td>
            <td style={tdStyle}>Theme switching, styling</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>useLangMode()</td>
            <td style={tdTypeStyle}>lang, setLang</td>
            <td style={tdStyle}>Language switching, translations</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>useOrgMode()</td>
            <td style={tdTypeStyle}>asOrg, setAsOrg</td>
            <td style={tdStyle}>Organization switching</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>useUserDataContext()</td>
            <td style={tdTypeStyle}>UserData</td>
            <td style={tdStyle}>User display data</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        After mutations (e.g. updating profile), the dashboard calls{' '}
        <code style={codeStyle}>router.refresh()</code> to re-run the server component
        pipeline, giving the client fresh user data without a full page reload.
      </p>
      <CodeBlock title="Mutation + refresh" code={`// DashboardClient
const router = useRouter();
const refreshData = useCallback(() => {
  router.refresh(); // re-runs Dashboard server component
}, [router]);`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 2: Provider Sync
// ═══════════════════════════════════════════════════════════════════════════════

function ProviderSyncSection() {
  return (
    <SectionWrap label="Provider sync — Dashboard → External">
      <p style={textStyle}>
        The Dashboard creates <strong>isolated</strong> provider instances that are not
        directly reachable from your app. External consumers (like{' '}
        <code style={codeStyle}>LogtoProvider</code>) have their own separate provider instances.
      </p>
      <CodeBlock title="Two separate provider trees" code={`// Dashboard (Server Component)
//   └─ UserDataProvider ← INSTANCE B
//   └─ PreferencesProvider ← INSTANCE B
//   └─ DashboardClient

// Your app (LogtoProvider)
//   └─ PreferencesProvider ← INSTANCE A
//   └─ LogtoProviderContent
//   └─ UserDataProvider ← INSTANCE A
//   └─ Your app`} />
      <p style={textStyle}>
        When the Dashboard changes a preference, it must notify external consumers. The sync
        mechanism works through <code style={codeStyle}>sessionStorage</code> and a custom
        event:
      </p>
      <CodeBlock title="Sync flow" code={`// 1. Dashboard changes theme → setTheme() called
const setTheme = (newTheme) => {
  sessionStorage.setItem('theme-mode', newTheme);  // persist
  setThemeState(newTheme);                          // update local state
  window.dispatchEvent(new Event('preferences-changed'));  // notify others
};

// 2. External consumer listens
useEffect(() => {
  const handler = () => {
    const stored = sessionStorage.getItem('theme-mode');
    // re-read and apply...
  };
  window.addEventListener('preferences-changed', handler);
  return () => window.removeEventListener('preferences-changed', handler);
}, []);`} />
      <p style={textStyle}>
        The same pattern applies to language and organization changes. All three dispatch the
        unified <code style={codeStyle}>preferences-changed</code> event.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Storage key</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Changed by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>theme-mode</td>
            <td style={tdStyle}>"dark" | "light"</td>
            <td style={tdStyle}><code style={codeSmStyle}>setTheme()</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lang-mode</td>
            <td style={tdStyle}>locale string (e.g. "en-US")</td>
            <td style={tdStyle}><code style={codeSmStyle}>setLang()</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>org-mode</td>
            <td style={tdStyle}>org ID string | null</td>
            <td style={tdStyle}><code style={codeSmStyle}>setAsOrg()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key insight:</strong> The
        Dashboard&apos;s providers are <em>self-contained</em>. They persist to the Logto API
        via <code style={codeSmStyle}>onUpdateCustomData</code> and broadcast changes via
        the <code style={codeSmStyle}>preferences-changed</code> event, but they never
        directly touch external provider state.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 3: Tab Structure
// ═══════════════════════════════════════════════════════════════════════════════

function TabStructureSection() {
  return (
    <SectionWrap label="Tab configuration">
      <p style={textStyle}>
        Tabs are configured via the <code style={codeStyle}>LOAD_TABS</code> environment
        variable. Set it to a comma-separated list of tab identifiers. If omitted, all tabs
        are shown in default order.
      </p>
      <CodeBlock title="ENV configuration" code={`# .env.local
LOAD_TABS=profile,preferences,mfa,raw`} />
      <p style={textStyle}>
        Each identifier resolves through an alias table, so you can use friendly names:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Tab ID</th>
            <th style={thStyle}>Aliases</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>profile</td>
            <td style={tdStyle}><span style={chipStyle}>personal</span>{' '}<span style={chipStyle}>user</span></td>
            <td style={tdStyle}>Avatar, name, username</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>preferences</td>
            <td style={tdStyle}><span style={chipStyle}>prefs</span>{' '}<span style={chipStyle}>custom-data</span></td>
            <td style={tdStyle}>Theme, language</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>security</td>
            <td style={tdStyle}><span style={chipStyle}>mfa</span>{' '}<span style={chipStyle}>2fa</span>{' '}<span style={chipStyle}>totp</span></td>
            <td style={tdStyle}>MFA, password, account deletion</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>identities</td>
            <td style={tdStyle}><span style={chipStyle}>identity</span></td>
            <td style={tdStyle}>Linked social providers</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>organizations</td>
            <td style={tdStyle}><span style={chipStyle}>orgs</span>{' '}<span style={chipStyle}>org</span></td>
            <td style={tdStyle}>Org memberships, roles</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>dev</td>
            <td style={tdStyle}><span style={chipStyle}>debug</span>{' '}<span style={chipStyle}>raw</span>{' '}<span style={chipStyle}>data</span></td>
            <td style={tdStyle}>Token, raw JSON, session</td>
          </tr>
        </tbody>
      </table>
      <p style={textStyle}>
        Tabs are rendered client-side in <code style={codeStyle}>DashboardClient</code>. The
        active tab is managed via internal <code style={codeStyle}>useState</code>:
      </p>
      <CodeBlock title="Tab switching" code={`const [activeTab, setActiveTab] = useState<TabId>(
  loadedTabs[0] ?? 'profile'
);

// Sidebar buttons call setActiveTab()
<button onClick={() => setActiveTab('security')}>
  ...
</button>

// Content renders based on activeTab
{activeTab === 'security' && <SecurityTab ... />}
{activeTab === 'profile' && <ProfileTab ... />}
`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Order preserved:</strong>{' '}
        The order of tabs in <code style={codeSmStyle}>LOAD_TABS</code> determines the
        sidebar order. Duplicates are removed.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Section 4: Live Demo
// ═══════════════════════════════════════════════════════════════════════════════

function LiveDemoSection() {
  return (
    <SectionWrap label="Live dashboard">
      <p style={textStyle}>
        The full Dashboard rendered inline. All tab functionality is active — switch tabs,
        change preferences, manage security settings.
      </p>
      <div style={{
        background: 'rgba(255,255,255,0.008)',
        border: '1px solid rgba(255,255,255,0.058)',
        borderRadius: '5px',
        overflow: 'hidden',
        minHeight: '500px',
      }}>
        <Dashboard />
      </div>
    </SectionWrap>
  );
}

// ─── Notes ────────────────────────────────────────────────────────────────────

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Standalone vs Modal:</strong>{' '}
        The Dashboard can render standalone (as shown above) or as a modal within{' '}
        <code style={codeSmStyle}>LogtoProvider</code> via the{' '}
        <code style={codeSmStyle}>dashboard</code> prop.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Server + Client:</strong>{' '}
        The <code style={codeSmStyle}>Dashboard</code> component is a Server Component.
        It wraps <code style={codeSmStyle}>DashboardClient</code> which is a Client Component.
        Data fetching happens server-side; interactivity happens client-side.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Toast system:</strong>{' '}
        The dashboard includes a built-in toast notification system. All tabs report success/error
        via <code style={codeSmStyle}>showToast()</code>.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Theme integration:</strong>{' '}
        The dashboard uses <code style={codeSmStyle}>ThemeSpec</code> objects for all styling.
        It respects the active theme from <code style={codeSmStyle}>PreferencesProvider</code>.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function DashboardDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Internals + Provider Sync */}
      <Section id={1}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <InternalsSection />
          <ProviderSyncSection />
        </div>
      </Section>

      {/* Page 2: Tab Structure + Notes */}
      <Section id={2}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <TabStructureSection />
          <NotesSection />
        </div>
      </Section>

      {/* Page 3: Live Demo */}
      <Section id={3}>
        <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
          <LiveDemoSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
