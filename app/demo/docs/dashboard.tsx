'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function InternalsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="How the Dashboard works">
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>Dashboard</code> is a <strong>Server Component</strong> that
        fetches user data server-side, then self-wraps with internal providers.
      </p>
      <CodeBlock title="Rendering pipeline" code={`// 1. Server Component — fetches data
const result = await fetchDashboardData();

// 2. Self-wrap with internal providers
return (
  <UserDataProvider userData={result.userData}>
    <PreferencesProvider ...>
      <DashboardClient ... />
    </PreferencesProvider>
  </UserDataProvider>
);`} />
      <p style={styles.textStyle}>
        Hooks consumed by <code style={styles.codeStyle}>DashboardClient</code>:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Hook</th>
            <th style={styles.thStyle}>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>useThemeMode()</td>
            <td style={styles.tdStyle}>theme, themeSpec, setTheme, toggleTheme</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>useLangMode()</td>
            <td style={styles.tdStyle}>lang, setLang</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        <code style={styles.codeStyle}>useOrgMode()</code> (returns asOrg, setAsOrg) is consumed by{' '}
        <code style={styles.codeStyle}>OrganizationsTab</code>, not <code style={styles.codeStyle}>DashboardClient</code>.
      </div>
      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Mutations call <code style={styles.codeStyle}>router.refresh()</code> to re-run the server
        component pipeline for fresh data.
      </p>
    </SectionWrap>
  );
}

function ProviderSyncSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Provider sync — Dashboard → External">
      <p style={styles.textStyle}>
        The Dashboard creates <strong>isolated</strong> provider instances.
        External consumers (like <code style={styles.codeStyle}>LogtoProvider</code>) have
        separate instances.
      </p>
      <CodeBlock title="Two separate provider trees" code={`// Dashboard (Server Component)
//   └─ UserDataProvider ← INSTANCE B
//   └─ PreferencesProvider ← INSTANCE B

// Your app (LogtoProvider)  
//   └─ PreferencesProvider ← INSTANCE A
//   └─ UserDataProvider ← INSTANCE A`} />
      <p style={styles.textStyle}>
        Sync via <code style={styles.codeStyle}>sessionStorage</code> + unified event:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Storage key</th>
            <th style={styles.thStyle}>Dispatched by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>theme-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setTheme()</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>lang-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setLang()</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>org-mode</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setAsOrg()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Event:</strong>{' '}
        All changes dispatch DOM events for cross-tab sync:
        <code style={styles.codeSmStyle}>theme-changed</code> (theme) and{' '}
        <code style={styles.codeSmStyle}>preferences-changed</code> (lang, org).
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function TabStructureSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Tab configuration">
      <p style={styles.textStyle}>
        Tabs configured via <code style={styles.codeStyle}>LOAD_TABS</code> env. Comma-separated
        list with alias support.
      </p>
      <CodeBlock title="ENV" code={`LOAD_TABS=profile,preferences,mfa,raw`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Tab</th>
            <th style={styles.thStyle}>Aliases</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>profile</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>personal</span> <span style={styles.chipStyle}>user</span></td>
            <td style={styles.tdStyle}>Avatar, name</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>preferences</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>prefs</span> <span style={styles.chipStyle}>custom-data</span> <span style={styles.chipStyle}>custom</span> <span style={styles.chipStyle}>customdata</span></td>
            <td style={styles.tdStyle}>Theme, language</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>security</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>mfa</span> <span style={styles.chipStyle}>2fa</span> <span style={styles.chipStyle}>totp</span></td>
            <td style={styles.tdStyle}>MFA, password</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>identities</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>identity</span></td>
            <td style={styles.tdStyle}>Social providers</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>organizations</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>orgs</span> <span style={styles.chipStyle}>org</span></td>
            <td style={styles.tdStyle}>Orgs, roles</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>dev</td>
            <td style={styles.tdStyle}><span style={styles.chipStyle}>raw</span> <span style={styles.chipStyle}>debug</span> <span style={styles.chipStyle}>data</span></td>
            <td style={styles.tdStyle}>Token, cookies</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Tabs render via <code style={styles.codeStyle}>activeTab</code> state in{' '}
        <code style={styles.codeStyle}>DashboardClient</code>.
      </p>
    </SectionWrap>
  );
}

function NotesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Notes">
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Server + Client:</strong>{' '}
        <code style={styles.codeSmStyle}>Dashboard</code> is a Server Component wrapping{' '}
        <code style={styles.codeSmStyle}>DashboardClient</code> (Client Component).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Rendering modes:</strong>{' '}
        Modal inside LogtoProvider, or full page at a route (e.g. <code style={styles.codeSmStyle}>/dashboard</code>).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Toast system:</strong>{' '}
        Built-in. All tabs report via <code style={styles.codeSmStyle}>showToast()</code>.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Theme:</strong>{' '}
        Uses <code style={styles.codeSmStyle}>ThemeSpec</code> from{' '}
        <code style={styles.codeSmStyle}>PreferencesProvider</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function WiringSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="The wiring (page.tsx)">
      <p style={styles.textStyle}>
        Dashboard is a Server Component JSX prop passed to the Client Component{' '}
        <code style={styles.codeStyle}>LogtoProvider</code>.
      </p>
      <CodeBlock title="Pre-rendered JSX as prop" code={`export default async function HomePage() {
  const result = await fetchDashboardData();

  return (
    <LogtoProvider
      userData={result.userData}
      accessToken={result.accessToken}
      dashboard={<Dashboard />}  {/* Server Component JSX */}
      darkThemeSpec={defaultDarkTheme}
      lightThemeSpec={defaultLightTheme}
    >
      <DemoApp />
    </LogtoProvider>
  );
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key point:</strong>{' '}
        Next.js allows Server Component JSX to be passed as props to Client Components.
      </div>
    </SectionWrap>
  );
}

function ModalSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="The modal (LogtoProvider)">
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>LogtoProvider</code> manages modal state and renders
        the Dashboard when <code style={styles.codeStyle}>isDashboardOpen</code> is true.
      </p>
      <CodeBlock title="Modal lifecycle" code={`const [isDashboardOpen, setIsDashboardOpen] = useState(false);
const openDashboard = useCallback(() => setIsDashboardOpen(true), []);

// ESC key — only when open
useEffect(() => {
  if (!isDashboardOpen) return;
  const handleKey = (e) => e.key === 'Escape' && setIsDashboardOpen(false);
  document.addEventListener('keydown', handleKey);
  return () => document.removeEventListener('keydown', handleKey);
}, [isDashboardOpen]);

// Render when open
{isDashboardOpen && dashboard && (
  <div style={{ position: 'fixed', inset: 0, zIndex: 9999,
    backdropFilter: 'blur(0.5rem)' }}>
    <button onClick={closeDashboard}>✕</button>
    {dashboard}
  </div>
}`} />
    </SectionWrap>
  );
}

function ClickSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="The click (UserButton)">
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>UserButton</code>, <code style={styles.codeStyle}>UserCard</code> use{' '}
        <code style={styles.codeStyle}>useUserDisplay()</code> which calls{' '}
        <code style={styles.codeStyle}>openDashboard()</code> from LogtoProvider context.
      </p>
      <CodeBlock title="useUserDisplay hook" code={`function useUserDisplay(opts) {
  const { openDashboard, userData } = useLogto();

  // Data priority: prop → context → fallback (1.5s)
  const handleClick = useCallback(() => {
    if (typeof opts.do === 'function') opts.do();
    else if (openDashboard) openDashboard();
  }, [opts.do, openDashboard]);

  return { userData, handleClick, ... };
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>UserBadge:</strong>{' '}
        Read-only — <code style={styles.codeSmStyle}>pointerEvents: &apos;none&apos;</code>, no click handler.
      </div>
    </SectionWrap>
  );
}

function WhySection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Why this pattern?">
      <p style={styles.textStyle}>
        Async Server Components cannot be rendered directly from Client Components.
      </p>
      <CodeBlock title="❌ This error" code={`'use client';
import { Dashboard } from './dashboard';
// Error: Dashboard is an async Server Component`} />
      <p style={styles.textStyle}>
        The <strong>prop workaround</strong> works because:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Rule</th>
            <th style={styles.thStyle}>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>Server → Client prop</td>
            <td style={styles.tdStyle}>Pre-rendered JSX passed, not imported</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Lazy rendering</td>
            <td style={styles.tdStyle}>Only rendered when <code style={styles.codeStyle}>isDashboardOpen</code> is true</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>This doc file:</strong>{' '}
        Is a Client Component — that&apos;s why we can&apos;t render{' '}
        <code style={styles.codeSmStyle}>&lt;Dashboard /&gt;</code> here.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function DashboardDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Internals + Provider Sync (two-column) */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <InternalsSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ProviderSyncSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Tab Structure + Notes (two-column) */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <TabStructureSection />
          </div>
          <div style={styles.colLeftStyle}>
            <NotesSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Rendering (two-column: wiring + modal/click, why) */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <WiringSection />
            <ModalSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ClickSection />
            <WhySection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
