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
// Identities Tab
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Identities tab overview">
      <p style={textStyle}>
        The <code style={codeStyle}>IdentitiesTab</code> is a read-only display of the user&apos;s
        linked social identity providers. It renders each identity from{' '}
        <code style={codeStyle}>userData.identities</code>.
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
            <td style={tdStyle}>User data with identities object</td>
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
      <CodeBlock title="Component signature" code={`interface IdentitiesTabProps {
  userData: UserData;
  theme:    ThemeSpec;
  t:        Translations;
}`} />
    </SectionWrap>
  );
}

function ProviderIconsSection() {
  return (
    <SectionWrap label="Provider icons">
      <p style={textStyle}>
        Each social provider has a dedicated inline SVG icon. The icons are defined in
        a <code style={codeStyle}>PROVIDER_ICONS</code> map with no external dependencies.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Provider</th>
            <th style={thStyle}>Icon color</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>google</td>
            <td style={tdStyle}>Multi-color (4 colors)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>github</td>
            <td style={tdStyle}>Uses textColor (dark/light)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>discord</td>
            <td style={tdStyle}>#5865F2</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>facebook</td>
            <td style={tdStyle}>#1877F2</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>twitter</td>
            <td style={tdStyle}>Uses textColor</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>apple</td>
            <td style={tdStyle}>Uses textColor</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>microsoft</td>
            <td style={tdStyle}>Multi-color (4 colors)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>linkedin</td>
            <td style={tdStyle}>#0A66C2</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Provider name resolution" code={`const PROVIDER_NAMES: Record<string, string> = {
  google: 'Google', github: 'GitHub', discord: 'Discord',
  facebook: 'Facebook', twitter: 'Twitter / X', apple: 'Apple',
  microsoft: 'Microsoft', linkedin: 'LinkedIn',
};

function providerName(target: string): string {
  return PROVIDER_NAMES[target] ?? target.charAt(0).toUpperCase() + target.slice(1);
}`} />
    </SectionWrap>
  );
}

function DataDisplaySection() {
  return (
    <SectionWrap label="Data display">
      <p style={textStyle}>
        Each identity is rendered as a row showing the provider icon, name, connection status,
        and detail (email, username, or userId).
      </p>
      <CodeBlock title="Identity detail resolution" code={`function identityDetail(t, identity): string {
  const d = identity.details ?? {};
  if (typeof d.email === 'string' && d.email) return d.email;
  if (typeof d.username === 'string' && d.username) return d.username;
  if (typeof d.name === 'string' && d.name) return d.name;
  if (typeof d.login === 'string' && d.login) return d.login;
  if (identity.userId) return t.identities.idWithUserId.replace('{userId}', identity.userId);
  return t.identities.unknownDetail;
}`} />
      <p style={textStyle}>
        The identities object structure comes from Logto&apos;s user data:
      </p>
      <CodeBlock title="Identities structure" code={`// userData.identities
{
  google: { userId: "...", details: { email: "user@gmail.com", name: "User" } },
  github: { userId: "...", details: { login: "username" } },
}

// Each entry is rendered as:
// [ProviderIcon] [ProviderName] [Connected badge] [detail]
//                                              [external userId chip]`} />
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Read-only:</strong>{' '}
        This tab is display-only. Unlinking providers is handled server-side.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Unknown providers:</strong>{' '}
        Providers without a known icon show the first letter of the provider name as a fallback.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function IdentitiesDoc() {
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
          <ProviderIconsSection />
          <DataDisplaySection />
          <NotesSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
