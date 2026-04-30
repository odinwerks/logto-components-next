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
        Dropdown for switching between organizations. Two variants:
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>OrgSwitcherWrapper</strong>{' '}
        — Server Component. Fetches org data from Logto automatically. Drop it in and it works.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: '12px' }}>
        <strong style={styles.strongNoteStyle}>OrgSwitcher</strong>{' '}
        — Client Component. You provide the org list. Use when you already have org data.
      </div>
      <CodeBlock title="Import" code={`import {
  OrgSwitcher,
  OrgSwitcherWrapper,
  setActiveOrg,
  useOrgMode,
  type OrganizationData,
} from './logto-kit';`} />
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Auto-select:</strong>{' '}
        Returns <code style={styles.codeSmStyle}>null</code> if user has no orgs.
        Auto-selects and hides if exactly 1 org and no active org is set.
      </div>
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
            <td style={styles.tdStyle}>undefined</td>
            <td style={styles.tdStyle}>Server-resolved active org</td>
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
            <td style={styles.tdStyle}>undefined</td>
            <td style={styles.tdStyle}>Partial translations</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="OrganizationData" code={`interface OrganizationData {
  id: string;
  name: string;
  description?: string;
}`} />
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>OrgSwitcherWrapper props:</strong>{' '}
        Just <code style={styles.codeSmStyle}>theme: ThemeSpec</code> and{' '}
        <code style={styles.codeSmStyle}>t: Translations</code>. It fetches orgs via{' '}
        <code style={styles.codeSmStyle}>getLogtoContext()</code> internally — no org data needed from you.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Flow — useOrgMode + setActiveOrg + switching
// ═══════════════════════════════════════════════════════════════════════════════

function OrgModeSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useOrgMode hook">
      <CodeBlock title="Interface + internals" code={`const { asOrg, setAsOrg } = useOrgMode();

// setAsOrg('org-123') does three things at once:
//   1. sessionStorage.setItem('org-mode', 'org-123')
//   2. React state update
//   3. persistOrgToApi() → writes to Logto custom_data:
//      { Preferences: { theme, lang, asOrg: 'org-123' } }
//   + dispatches 'preferences-changed' event for cross-tab sync

setAsOrg(null); // "be yourself" — clears org context`} />
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
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
        Validates org membership via JWT claims. Does <strong>not</strong> persist anything —
        that's <code style={styles.codeStyle}>setAsOrg</code>'s job.
      </p>
      <CodeBlock title="Signature" code={`export async function setActiveOrg(orgId: string | null): Promise<boolean>
// Returns true if user is a member of orgId (or orgId is null).
// Validates against JWT claims — fast, can't forge org membership.`} />
    </SectionWrap>
  );
}

function SwitchingFlowSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Full switching flow">
      <CodeBlock title="OrgSwitcher.handleChange" code={`const handleChange = async (newOrgId: string) => {
  const orgIdToSet = newOrgId || null;

  // 1. Validate (skip for "be yourself" — null is always valid)
  if (orgIdToSet !== null) {
    const isValid = await setActiveOrg(orgIdToSet);
    if (!isValid) return;
  }

  // 2. Persist to sessionStorage + React state + Logto API
  setAsOrg(orgIdToSet);

  // 3. Re-fetch RSC with new org context
  router.refresh();
};`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>router.refresh():</strong>{' '}
        Re-executes the Dashboard server component, re-fetching user data with the
        new org context. The updated <code style={styles.codeSmStyle}>currentOrgId</code> flows
        back through the component tree.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Dashboard wiring:</strong>{' '}
        <code style={styles.codeSmStyle}>getPreferencesFromUserData()</code> reads{' '}
        <code style={styles.codeSmStyle}>userData.customData.Preferences.asOrg</code> as the
        server-side source of truth. <code style={styles.codeSmStyle}>PreferencesProvider</code>{' '}
        initializes from <code style={styles.codeSmStyle}>sessionStorage</code> first, falling back
        to the server value.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Edge cases
// ═══════════════════════════════════════════════════════════════════════════════

function EdgeCasesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Edge cases">
      <CodeBlock title="Conditional rendering" code={`// Returns null in two cases:
if (organizations.length === 0) return null;

// Single org + no active org → auto-select silently, hide dropdown
if (organizations.length === 1 && !asOrg && !currentOrgId) {
  // useEffect auto-calls handleChange(org.id) once
  return null;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>"Be yourself":</strong>{' '}
        Selecting "Be yourself" sets <code style={styles.codeSmStyle}>orgIdToSet = null</code>,
        skips <code style={styles.codeSmStyle}>setActiveOrg</code> validation entirely, calls{' '}
        <code style={styles.codeSmStyle}>setAsOrg(null)</code>, then <code style={styles.codeSmStyle}>router.refresh()</code>.
        Org-gated content hidden until an org is re-selected.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>OrgSwitcherWrapper returns null if:</strong>{' '}
        not authenticated, no <code style={styles.codeSmStyle}>claims.organizations</code>,
        or no <code style={styles.codeSmStyle}>organization_data</code> in userInfo.
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
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <OrgSwitcherPropsSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Flow */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OrgModeSection />
            <ServerActionSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SwitchingFlowSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Edge cases */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <EdgeCasesSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
