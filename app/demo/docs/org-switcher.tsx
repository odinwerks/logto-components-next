'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';

// ─── Shared styles ──────────────────────────────────────────────────────────

const twoColLayoutStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  alignItems: 'start',
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

const tdPathStyle: React.CSSProperties = {
  ...tdStyle,
  color: '#9cdcdb',
  fontFamily: "'IBM Plex Mono', monospace",
  whiteSpace: 'nowrap',
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
// Page 1: Overview + Props
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Overview">
      <p style={textStyle}>
        Dropdown for switching organizations. Two ways to use it:
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>OrgSwitcherWrapper</strong>{' '}
        — Server Component. Fetches orgs from Logto automatically. No props needed from you.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>OrgSwitcher</strong>{' '}
        — Client Component. You provide orgs. Standalone usage when you have org data already.
      </div>
      <p style={textStyle}>
        Returns <code style={codeStyle}>null</code> if user has no orgs, or auto-selects
        if exactly 1 org and no active org is set.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Export</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>OrgSwitcher</td>
            <td style={tdStyle}>Client Component</td>
            <td style={tdStyle}>custom-logic/OrgSwitcher.tsx</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>OrgSwitcherWrapper</td>
            <td style={tdStyle}>Server Component</td>
            <td style={tdStyle}>custom-logic/org-switcher-wrapper.tsx</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>setActiveOrg</td>
            <td style={tdStyle}>Server Action</td>
            <td style={tdStyle}>custom-logic/actions/set-active-org.ts</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>useOrgMode</td>
            <td style={tdStyle}>Hook</td>
            <td style={tdStyle}>components/handlers/preferences.tsx</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>OrganizationData</td>
            <td style={tdStyle}>Type</td>
            <td style={tdStyle}>custom-logic/types.ts</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Import" code={`import {
  OrgSwitcher,
  OrgSwitcherWrapper,
  setActiveOrg,
  useOrgMode,
  type OrganizationData,
} from './logto-kit';`} />
    </SectionWrap>
  );
}

function OrgSwitcherPropsSection() {
  return (
    <SectionWrap label="OrgSwitcher props">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>organizations</td>
            <td style={tdStyle}><code style={codeStyle}>OrganizationData[]</code></td>
            <td style={tdStyle}>required</td>
            <td style={tdStyle}>Orgs to show in dropdown</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>currentOrgId</td>
            <td style={tdStyle}><code style={codeStyle}>string?</code></td>
            <td style={tdStyle}><code style={codeStyle}>undefined</code></td>
            <td style={tdStyle}>Server-resolved active org (from preferences)</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>required</td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>{"{ organizations?: { beYourself?: string } }"}</code></td>
            <td style={tdStyle}><code style={codeStyle}>undefined</code></td>
            <td style={tdStyle}>Partial translations (fallback: "Be yourself (global)")</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="OrganizationData type" code={`interface OrganizationData {
  id: string;
  name: string;
  description?: string;
}`} />
    </SectionWrap>
  );
}

function WrapperSection() {
  return (
    <SectionWrap label="OrgSwitcherWrapper">
      <p style={textStyle}>
        Server Component that fetches org data from Logto and renders{' '}
        <code style={codeStyle}>OrgSwitcher</code>. No org data needed from you.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPathStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={tdPathStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>Full translations object</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="How it fetches orgs" code={`// 1. getLogtoContext() with fetchUserInfo: true
const { claims, isAuthenticated, userInfo } = await getLogtoContext(logtoConfig, {
  fetchUserInfo: true,
});

// 2. Check claims.organizations (org IDs from JWT)
const orgIds = claims.organizations as string[];

// 3. Get org details from userInfo.organization_data
const organizationData = userInfo?.organization_data as OrganizationData[];

// 4. Render <OrgSwitcher organizations={organizationData} theme={theme} t={t} />`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        Wrapper does NOT pass <code style={codeSmStyle}>currentOrgId</code>.
        OrgSwitcher relies on <code style={codeSmStyle}>useOrgMode().asOrg</code> instead.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Returns null if:</strong>{' '}
        not authenticated, no <code style={codeSmStyle}>claims.organizations</code>,
        or no <code style={codeSmStyle}>organization_data</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Hooks + Actions + Flow
// ═══════════════════════════════════════════════════════════════════════════════

function OrgModeSection() {
  return (
    <SectionWrap label="useOrgMode hook">
      <p style={textStyle}>
        Reads active org from context. Reads{' '}
        <code style={codeStyle}>sessionStorage</code> key <code style={codeStyle}>org-mode</code>{' '}
        for cross-tab sync.
      </p>
      <CodeBlock title="Interface" code={`interface OrgModeContextValue {
  asOrg: string | null;
  setAsOrg: (orgId: string | null) => void;
}`} />
      <CodeBlock title="setAsOrg internals" code={`// When you call setAsOrg('org-123'):
// 1. sessionStorage.setItem('org-mode', 'org-123')
// 2. React state update
// 3. persistOrgToApi('org-123') — writes to Logto custom_data:
//    { Preferences: { theme, lang, asOrg: 'org-123' } }
// 4. window.dispatchEvent(new Event('preferences-changed'))`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Three fallback paths:</strong>{' '}
        Context exists → real setter. SSR → no-op. No context, client → no-op.
      </div>
    </SectionWrap>
  );
}

function ServerActionSection() {
  return (
    <SectionWrap label="setActiveOrg server action">
      <p style={textStyle}>
        Validates org membership via JWT claims. Does NOT persist anything.
      </p>
      <CodeBlock title="Signature" code={`export async function setActiveOrg(orgId: string | null): Promise<boolean>`} />
      <CodeBlock title="Validation logic" code={`// 1. Get Logto context (server-side, reads session/cookies)
const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

// 2. Not authenticated or no orgs claim → return false
if (!isAuthenticated || !claims?.organizations) return false;

// 3. "Be yourself" always valid → return true
if (orgId === null) return true;

// 4. Check org ID against JWT claims
const userOrgs = claims.organizations as string[];
if (!userOrgs.includes(orgId)) return false;

return true;`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key:</strong>{' '}
        Validation is against JWT claims, not a database lookup. Fast, secure,
        can't forge org membership.
      </div>
    </SectionWrap>
  );
}

function SwitchingFlowSection() {
  return (
    <SectionWrap label="Switching flow">
      <p style={textStyle}>
        End-to-end flow when user selects an org:
      </p>
      <CodeBlock title="OrgSwitcher.handleChange" code={`const handleChange = async (newOrgId: string) => {
  const orgIdToSet = newOrgId || null;

  // Step 1: Validate (only if selecting an org, not "be yourself")
  if (orgIdToSet !== null) {
    const isValid = await setActiveOrg(orgIdToSet);
    if (!isValid) return; // abort if invalid
  }

  // Step 2: Persist (3 targets at once)
  setAsOrg(orgIdToSet);
  //   → sessionStorage update
  //   → React state update
  //   → Logto custom_data (async)
  //   → preferences-changed event

  // Step 3: Refresh (re-fetch RSC with new org context)
  router.refresh();
};`} />
      <p style={textStyle}>
        <code style={codeStyle}>router.refresh()</code> re-executes the Dashboard
        server component, which re-fetches user data with the new org context from the
        API. The updated <code style={codeStyle}>currentOrgId</code> flows back through
        the component tree.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Auto-select:</strong>{' '}
        If exactly 1 org and neither <code style={codeSmStyle}>asOrg</code> nor{' '}
        <code style={codeSmStyle}>currentOrgId</code> is set, auto-calls{' '}
        <code style={codeSmStyle}>handleChange(orgId)</code> via useEffect.
        Fires only once.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Integration + "Be yourself"
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardWiringSection() {
  return (
    <SectionWrap label="Dashboard wiring">
      <p style={textStyle}>
        How org context flows through the Dashboard pipeline:
      </p>
      <CodeBlock title="Data flow" code={`Dashboard (Server Component)
  ├── fetchDashboardData() → userData
  ├── getPreferencesFromUserData(userData) → { theme, lang, asOrg }
  ├── PreferencesProvider(initialOrgId=asOrg)
  │     └── Provides useOrgMode() context
  └── DashboardClient(currentOrgId=resolvedOrg)
        └── OrganizationsTab(currentOrgId)
              └── activeOrgId = asOrg ?? currentOrgId`} />
      <CodeBlock title="PreferencesProvider initialization" code={`// asOrg state initialization
const [asOrg, setAsOrgState] = useState<string | null>(() => {
  const stored = getStoredOrg();  // sessionStorage check
  if (stored) return stored;
  return initialOrgId ?? null;    // falls back to server value
});`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        <code style={codeSmStyle}>getPreferencesFromUserData</code> reads{' '}
        <code style={codeSmStyle}>userData.customData.Preferences.asOrg</code>.
        This is the server-side source of truth for the active org.
      </div>
    </SectionWrap>
  );
}

function BeYourselfSection() {
  return (
    <SectionWrap label="'Be yourself' (global mode)">
      <p style={textStyle}>
        Selecting "Be yourself" clears the active org, acting as the global user
        not scoped to any organization.
      </p>
      <CodeBlock title="How it works" code={`// OrgSwitcher: <select> value="" → handleChange('')
// OrganizationsTab: handleBeYourself() → setAsOrg(null)

// In handleChange:
const orgIdToSet = newOrgId || null;  // '' → null
// null → skips setActiveOrg validation (always valid)
setAsOrg(null);   // clear org context
router.refresh(); // re-fetch as global user`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Validation:</strong>{' '}
        "Be yourself" skips <code style={codeSmStyle}>setActiveOrg</code> entirely —{' '}
        <code style={codeSmStyle}>null</code> is always valid.
      </div>
    </SectionWrap>
  );
}

function ConditionalSection() {
  return (
    <SectionWrap label="Conditional rendering">
      <p style={textStyle}>
        OrgSwitcher returns <code style={codeStyle}>null</code> (renders nothing)
        in two cases:
      </p>
      <CodeBlock title="Early returns" code={`// 1. No organizations
if (organizations.length === 0) return null;

// 2. Single org + no active org set → auto-select, hide dropdown
if (organizations.length === 1 && !asOrg && !currentOrgId) {
  // useEffect auto-calls handleChange(org.id)
  return null;
}`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Wrapper:</strong>{' '}
        <code style={codeSmStyle}>OrgSwitcherWrapper</code> also returns null if
        not authenticated, no orgs claim, or no organization_data.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OrgSwitcherDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Overview + Props */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={colLeftStyle}>
            <OrgSwitcherPropsSection />
            <WrapperSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Hooks + Actions + Flow */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <OrgModeSection />
            <ServerActionSection />
          </div>
          <div style={colLeftStyle}>
            <SwitchingFlowSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Integration + "Be yourself" */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <DashboardWiringSection />
            <BeYourselfSection />
          </div>
          <div style={colLeftStyle}>
            <ConditionalSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
