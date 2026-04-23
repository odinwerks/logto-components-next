'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview + Props
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        Dropdown for switching organizations. Two ways to use it:
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>OrgSwitcherWrapper</strong>{' '}
        — Server Component. Fetches orgs from Logto automatically. No props needed from you.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>OrgSwitcher</strong>{' '}
        — Client Component. You provide orgs. Standalone usage when you have org data already.
      </div>
      <p style={styles.textStyle}>
        Returns <code style={styles.codeStyle}>null</code> if user has no orgs, or auto-selects
        if exactly 1 org and no active org is set.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Export</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>OrgSwitcher</td>
            <td style={styles.tdStyle}>Client Component</td>
            <td style={styles.tdStyle}>custom-logic/OrgSwitcher.tsx</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>OrgSwitcherWrapper</td>
            <td style={styles.tdStyle}>Server Component</td>
            <td style={styles.tdStyle}>custom-logic/org-switcher-wrapper.tsx</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>setActiveOrg</td>
            <td style={styles.tdStyle}>Server Action</td>
            <td style={styles.tdStyle}>custom-logic/actions/set-active-org.ts</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>useOrgMode</td>
            <td style={styles.tdStyle}>Hook</td>
            <td style={styles.tdStyle}>components/handlers/preferences.tsx</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>OrganizationData</td>
            <td style={styles.tdStyle}>Type</td>
            <td style={styles.tdStyle}>custom-logic/types.ts</td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="OrgSwitcher props">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Default</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>organizations</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>OrganizationData[]</code></td>
            <td style={styles.tdStyle}>required</td>
            <td style={styles.tdStyle}>Orgs to show in dropdown</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>currentOrgId</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>string?</code></td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>undefined</code></td>
            <td style={styles.tdStyle}>Server-resolved active org (from preferences)</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>theme</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>ThemeSpec</code></td>
            <td style={styles.tdStyle}>required</td>
            <td style={styles.tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>t</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>{"{ organizations?: { beYourself?: string } }"}</code></td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>undefined</code></td>
            <td style={styles.tdStyle}>Partial translations (fallback: "Be yourself (global)")</td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="OrgSwitcherWrapper">
      <p style={styles.textStyle}>
        Server Component that fetches org data from Logto and renders{' '}
        <code style={styles.codeStyle}>OrgSwitcher</code>. No org data needed from you.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPathStyle}>theme</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>ThemeSpec</code></td>
            <td style={styles.tdStyle}>Theme for UI rendering</td>
          </tr>
          <tr>
            <td style={styles.tdPathStyle}>t</td>
            <td style={styles.tdStyle}><code style={styles.codeStyle}>Translations</code></td>
            <td style={styles.tdStyle}>Full translations object</td>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        Wrapper does NOT pass <code style={styles.codeSmStyle}>currentOrgId</code>.
        OrgSwitcher relies on <code style={styles.codeSmStyle}>useOrgMode().asOrg</code> instead.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Returns null if:</strong>{' '}
        not authenticated, no <code style={styles.codeSmStyle}>claims.organizations</code>,
        or no <code style={styles.codeSmStyle}>organization_data</code>.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Hooks + Actions + Flow
// ═══════════════════════════════════════════════════════════════════════════════

function OrgModeSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useOrgMode hook">
      <p style={styles.textStyle}>
        Reads active org from context. Reads{' '}
        <code style={styles.codeStyle}>sessionStorage</code> key <code style={styles.codeStyle}>org-mode</code>{' '}
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Three fallback paths:</strong>{' '}
        Context exists → real setter. SSR → no-op. No context, client → no-op.
      </div>
    </SectionWrap>
  );
}

function ServerActionSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="setActiveOrg server action">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key:</strong>{' '}
        Validation is against JWT claims, not a database lookup. Fast, secure,
        can't forge org membership.
      </div>
    </SectionWrap>
  );
}

function SwitchingFlowSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Switching flow">
      <p style={styles.textStyle}>
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
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>router.refresh()</code> re-executes the Dashboard
        server component, which re-fetches user data with the new org context from the
        API. The updated <code style={styles.codeStyle}>currentOrgId</code> flows back through
        the component tree.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Auto-select:</strong>{' '}
        If exactly 1 org and neither <code style={styles.codeSmStyle}>asOrg</code> nor{' '}
        <code style={styles.codeSmStyle}>currentOrgId</code> is set, auto-calls{' '}
        <code style={styles.codeSmStyle}>handleChange(orgId)</code> via useEffect.
        Fires only once.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Integration + "Be yourself"
// ═══════════════════════════════════════════════════════════════════════════════

function DashboardWiringSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Dashboard wiring">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        <code style={styles.codeSmStyle}>getPreferencesFromUserData</code> reads{' '}
        <code style={styles.codeSmStyle}>userData.customData.Preferences.asOrg</code>.
        This is the server-side source of truth for the active org.
      </div>
    </SectionWrap>
  );
}

function BeYourselfSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="'Be yourself' (global mode)">
      <p style={styles.textStyle}>
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Validation:</strong>{' '}
        "Be yourself" skips <code style={styles.codeSmStyle}>setActiveOrg</code> entirely —{' '}
        <code style={styles.codeSmStyle}>null</code> is always valid.
      </div>
    </SectionWrap>
  );
}

function ConditionalSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Conditional rendering">
      <p style={styles.textStyle}>
        OrgSwitcher returns <code style={styles.codeStyle}>null</code> (renders nothing)
        in two cases:
      </p>
      <CodeBlock title="Early returns" code={`// 1. No organizations
if (organizations.length === 0) return null;

// 2. Single org + no active org set → auto-select, hide dropdown
if (organizations.length === 1 && !asOrg && !currentOrgId) {
  // useEffect auto-calls handleChange(org.id)
  return null;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Wrapper:</strong>{' '}
        <code style={styles.codeSmStyle}>OrgSwitcherWrapper</code> also returns null if
        not authenticated, no orgs claim, or no organization_data.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OrgSwitcherDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Props */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <OrgSwitcherPropsSection />
            <WrapperSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Hooks + Actions + Flow */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OrgModeSection />
            <ServerActionSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SwitchingFlowSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Integration + "Be yourself" */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <DashboardWiringSection />
            <BeYourselfSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ConditionalSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
