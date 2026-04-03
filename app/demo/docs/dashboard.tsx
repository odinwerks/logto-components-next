'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'stretch',
};

const colLeftStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

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
// Page 1 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function InternalsSection() {
  return (
    <SectionWrap label="How the Dashboard works">
      <p style={textStyle}>
        The <code style={codeStyle}>Dashboard</code> is a <strong>Server Component</strong> that
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
      <p style={textStyle}>
        Hooks consumed by <code style={codeStyle}>DashboardClient</code>:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Hook</th>
            <th style={thStyle}>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>useThemeMode()</td>
            <td style={tdStyle}>theme, themeSpec, setTheme, toggleTheme</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>useLangMode()</td>
            <td style={tdStyle}>lang, setLang</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        <code style={codeStyle}>useOrgMode()</code> (returns asOrg, setAsOrg) is consumed by{' '}
        <code style={codeStyle}>OrganizationsTab</code>, not <code style={codeStyle}>DashboardClient</code>.
      </div>
      <p style={{ ...textStyle, marginBottom: 0 }}>
        Mutations call <code style={codeStyle}>router.refresh()</code> to re-run the server
        component pipeline for fresh data.
      </p>
    </SectionWrap>
  );
}

function ProviderSyncSection() {
  return (
    <SectionWrap label="Provider sync — Dashboard → External">
      <p style={textStyle}>
        The Dashboard creates <strong>isolated</strong> provider instances.
        External consumers (like <code style={codeStyle}>LogtoProvider</code>) have
        separate instances.
      </p>
      <CodeBlock title="Two separate provider trees" code={`// Dashboard (Server Component)
//   └─ UserDataProvider ← INSTANCE B
//   └─ PreferencesProvider ← INSTANCE B

// Your app (LogtoProvider)  
//   └─ PreferencesProvider ← INSTANCE A
//   └─ UserDataProvider ← INSTANCE A`} />
      <p style={textStyle}>
        Sync via <code style={codeStyle}>sessionStorage</code> + unified event:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Storage key</th>
            <th style={thStyle}>Dispatched by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>theme-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setTheme()</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lang-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setLang()</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>org-mode</td>
            <td style={tdStyle}><code style={codeSmStyle}>setAsOrg()</code></td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Event:</strong>{' '}
        All changes dispatch a unified <code style={codeSmStyle}>preferences-changed</code>{' '}
        event. External consumers re-read from storage.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function TabStructureSection() {
  return (
    <SectionWrap label="Tab configuration">
      <p style={textStyle}>
        Tabs configured via <code style={codeStyle}>LOAD_TABS</code> env. Comma-separated
        list with alias support.
      </p>
      <CodeBlock title="ENV" code={`LOAD_TABS=profile,preferences,mfa,raw`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Tab</th>
            <th style={thStyle}>Aliases</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>profile</td>
            <td style={tdStyle}><span style={chipStyle}>personal</span> <span style={chipStyle}>user</span></td>
            <td style={tdStyle}>Avatar, name</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>preferences</td>
            <td style={tdStyle}><span style={chipStyle}>prefs</span> <span style={chipStyle}>custom-data</span> <span style={chipStyle}>custom</span> <span style={chipStyle}>customdata</span></td>
            <td style={tdStyle}>Theme, language</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>security</td>
            <td style={tdStyle}><span style={chipStyle}>mfa</span> <span style={chipStyle}>2fa</span> <span style={chipStyle}>totp</span></td>
            <td style={tdStyle}>MFA, password</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>identities</td>
            <td style={tdStyle}><span style={chipStyle}>identity</span></td>
            <td style={tdStyle}>Social providers</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>organizations</td>
            <td style={tdStyle}><span style={chipStyle}>orgs</span> <span style={chipStyle}>org</span></td>
            <td style={tdStyle}>Orgs, roles</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>dev</td>
            <td style={tdStyle}><span style={chipStyle}>raw</span> <span style={chipStyle}>debug</span> <span style={chipStyle}>data</span></td>
            <td style={tdStyle}>Token, cookies</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, marginBottom: 0 }}>
        Tabs render via <code style={codeStyle}>activeTab</code> state in{' '}
        <code style={codeStyle}>DashboardClient</code>.
      </p>
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Server + Client:</strong>{' '}
        <code style={codeSmStyle}>Dashboard</code> is a Server Component wrapping{' '}
        <code style={codeSmStyle}>DashboardClient</code> (Client Component).
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Rendering modes:</strong>{' '}
        Modal inside LogtoProvider, or full page at a route (e.g. <code style={codeSmStyle}>/dashboard</code>).
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Toast system:</strong>{' '}
        Built-in. All tabs report via <code style={codeSmStyle}>showToast()</code>.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Theme:</strong>{' '}
        Uses <code style={codeSmStyle}>ThemeSpec</code> from{' '}
        <code style={codeSmStyle}>PreferencesProvider</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3 Sections
// ═══════════════════════════════════════════════════════════════════════════════

function WiringSection() {
  return (
    <SectionWrap label="The wiring (page.tsx)">
      <p style={textStyle}>
        Dashboard is a Server Component JSX prop passed to the Client Component{' '}
        <code style={codeStyle}>LogtoProvider</code>.
      </p>
      <CodeBlock title="Pre-rendered JSX as prop" code={`export default async function HomePage() {
  const result = await fetchDashboardData();

  return (
    <LogtoProvider
      userData={result.userData}
      accessToken={result.accessToken}
      dashboard={<Dashboard />}  {/* Server Component JSX */}
    >
      <DemoApp />
    </LogtoProvider>
  );
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key point:</strong>{' '}
        Next.js allows Server Component JSX to be passed as props to Client Components.
      </div>
    </SectionWrap>
  );
}

function ModalSection() {
  return (
    <SectionWrap label="The modal (LogtoProvider)">
      <p style={textStyle}>
        <code style={codeStyle}>LogtoProvider</code> manages modal state and renders
        the Dashboard when <code style={codeStyle}>isDashboardOpen</code> is true.
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
  return (
    <SectionWrap label="The click (UserButton)">
      <p style={textStyle}>
        <code style={codeStyle}>UserButton</code>, <code style={codeStyle}>UserCard</code> use{' '}
        <code style={codeStyle}>useUserDisplay()</code> which calls{' '}
        <code style={codeStyle}>openDashboard()</code> from LogtoProvider context.
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
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>UserBadge:</strong>{' '}
        Read-only — <code style={codeSmStyle}>pointerEvents: &apos;none&apos;</code>, no click handler.
      </div>
    </SectionWrap>
  );
}

function WhySection() {
  return (
    <SectionWrap label="Why this pattern?">
      <p style={textStyle}>
        Async Server Components cannot be rendered directly from Client Components.
      </p>
      <CodeBlock title="❌ This error" code={`'use client';
import { Dashboard } from './dashboard';
// Error: Dashboard is an async Server Component`} />
      <p style={textStyle}>
        The <strong>prop workaround</strong> works because:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Rule</th>
            <th style={thStyle}>Why</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>Server → Client prop</td>
            <td style={tdStyle}>Pre-rendered JSX passed, not imported</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>Lazy rendering</td>
            <td style={tdStyle}>Only rendered when <code style={codeStyle}>isDashboardOpen</code> is true</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>This doc file:</strong>{' '}
        Is a Client Component — that&apos;s why we can&apos;t render{' '}
        <code style={codeSmStyle}>&lt;Dashboard /&gt;</code> here.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function DashboardDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Internals + Provider Sync (two-column) */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <InternalsSection />
          </div>
          <div style={colLeftStyle}>
            <ProviderSyncSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Tab Structure + Notes (two-column) */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <TabStructureSection />
          </div>
          <div style={colLeftStyle}>
            <NotesSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Rendering (two-column: wiring + modal/click, why) */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <WiringSection />
            <ModalSection />
          </div>
          <div style={colLeftStyle}>
            <ClickSection />
            <WhySection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
