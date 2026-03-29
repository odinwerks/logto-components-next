'use client';

import CodeBlock from '../../utils/CodeBlock';
import { SectionContainer, Section } from '../../utils/Section';

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
// Organizations Tab
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Organizations tab overview">
      <p style={textStyle}>
        The <code style={codeStyle}>OrganizationsTab</code> displays the user&apos;s organization
        memberships and roles. It also handles organization switching via the{' '}
        <code style={codeStyle}>useOrgMode()</code> hook.
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
            <td style={tdPropStyle}>userData</td>
            <td style={tdStyle}><code style={codeStyle}>UserData</code></td>
            <td style={tdStyle}>User data with organizations and organizationRoles</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>currentOrgId</td>
            <td style={tdStyle}><code style={codeStyle}>string | undefined</code></td>
            <td style={tdStyle}>Active org ID from server (fallback)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>theme</td>
            <td style={tdStyle}><code style={codeStyle}>ThemeSpec</code></td>
            <td style={tdStyle}>Active theme</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>t</td>
            <td style={tdStyle}><code style={codeStyle}>Translations</code></td>
            <td style={tdStyle}>Active translations</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Component signature" code={`interface OrganizationsTabProps {
  userData:      UserData;
  currentOrgId?: string;
  theme:         ThemeSpec;
  t:             Translations;
}`} />
    </SectionWrap>
  );
}

function OrgSwitchingSection() {
  return (
    <SectionWrap label="Organization switching">
      <p style={textStyle}>
        Organization switching uses the <code style={codeStyle}>useOrgMode()</code> hook and
        validates against the server via <code style={codeStyle}>setActiveOrg()</code>.
      </p>
      <CodeBlock title="Switching flow" code={`const { asOrg, setAsOrg } = useOrgMode();
const router = useRouter();

// Determine active org (prefer context, fall back to server prop)
const activeOrgId = asOrg ?? currentOrgId;

// Switch to a specific org
const handleOrgClick = async (orgId: string) => {
  if (orgId === activeOrgId) return; // already active

  // 1. Validate via server action
  const isValid = await setActiveOrg(orgId);
  if (!isValid) return;

  // 2. Update local state
  setAsOrg(orgId);

  // 3. Refresh to get new permissions/data
  router.refresh();
};

// Switch to "Be yourself" (global)
const handleBeYourself = () => {
  setAsOrg(null);
  router.refresh();
};`} />
      <p style={textStyle}>
        The &quot;Be yourself&quot; option appears when an organization is currently active.
        Clicking it clears the org context and refreshes the page with global permissions.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Validation:</strong>{' '}
        The <code style={codeStyle}>setActiveOrg()</code> server action verifies the user
        is still a member before switching. If validation fails, no state change occurs.
      </div>
    </SectionWrap>
  );
}

function RolesSection() {
  return (
    <SectionWrap label="Organization roles">
      <p style={textStyle}>
        The roles section displays organization-level roles from{' '}
        <code style={codeStyle}>userData.organizationRoles</code>. Each role is associated
        with an organization.
      </p>
      <CodeBlock title="Roles display" code={`const organizations = userData.organizations || [];
const organizationRoles = userData.organizationRoles || [];

// Each role shows:
// - Role name
// - Organization name (looked up from organizations array)
// - Role ID

{organizationRoles.map((role, index) => {
  const org = organizations.find(o => o.id === role.organizationId);
  return (
    <div key={role.id}>
      <div>{role.name}</div>
      <div>Organization: {org?.name || role.organizationId}</div>
      <div>Role ID: {role.id}</div>
    </div>
  );
})}`} />
    </SectionWrap>
  );
}

function RawDataSection() {
  return (
    <SectionWrap label="Raw data">
      <p style={textStyle}>
        The tab includes a raw JSON view of the organizations and roles data for debugging.
        It uses the <code style={codeStyle}>CodeBlock</code> shared component.
      </p>
      <CodeBlock title="Raw data section" code={`<CodeBlock
  title={t.organizations.rawTitle}
  data={{ organizations, organizationRoles }}
  theme={theme}
  t={t}
/>`} />
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Persistence:</strong>{' '}
        The active org is persisted to <code style={codeStyle}>customData.Preferences.asOrg</code>{' '}
        and <code style={codeStyle}>sessionStorage[&quot;org-mode&quot;]</code>.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Refresh required:</strong>{' '}
        Switching organizations triggers <code style={codeStyle}>router.refresh()</code> because
        organization membership affects permissions and available data.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function OrganizationsDoc() {
  return (
    <SectionContainer>
      <Section id={1}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <OverviewSection />
          <OrgSwitchingSection />
          <RolesSection />
          <RawDataSection />
          <NotesSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
