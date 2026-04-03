'use client';

import { UserButton, UserBadge, UserCard } from '../../logto-kit/components/userbutton';
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

const noteStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  lineHeight: 1.7,
  color: 'rgba(255,255,255,0.38)',
  fontFamily: "'DM Sans', system-ui, sans-serif",
  marginBottom: '0.625rem',
  paddingLeft: '10px',
  borderLeft: '2px solid rgba(255,255,255,0.06)',
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

// ─── Page 1 sections ────────────────────────────────────────────────────────

function QuickStartSection() {
  return (
    <SectionWrap label="Quick start">
      <p style={textStyle}>
        Import and mount inside a <code style={codeStyle}>LogtoProvider</code>.
        Reads user data from context, opens Dashboard on click.
      </p>
      <CodeBlock title="Import" code={`import { UserButton, UserBadge, UserCard } from './logto-kit';`} />
      <CodeBlock title="Minimal usage" code={`<UserButton />`} />
      <p style={{ ...textStyle, marginBottom: 0 }}>
        Clickable circle avatar. Falls back to user icon after 1.5s if no data.
        Priority: prop, then provider context, then fallback icon.
      </p>
    </SectionWrap>
  );
}

function PropsSection() {
  return (
    <SectionWrap label="Props">
      <p style={textStyle}>
        Shared across UserButton, UserBadge, UserCard.
        <code style={codeStyle}>do</code> is Button/Card only.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Prop</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Default</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>Canvas</td>
            <td style={tdTypeStyle}>Avatar | Initials</td>
            <td style={tdStyle}>auto</td>
            <td style={tdStyle}>Avatar image or initials fallback.</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>Size</td>
            <td style={tdTypeStyle}>string</td>
            <td style={tdStyle}>6.25rem / 2.5rem</td>
            <td style={tdStyle}>CSS size string.</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>shape</td>
            <td style={tdTypeStyle}>circle | sq | rsq</td>
            <td style={tdStyle}>circle</td>
            <td style={tdStyle}>Border radius. Overridable via USER_SHAPE env.</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>userData</td>
            <td style={tdTypeStyle}>UserData</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>theme</td>
            <td style={tdTypeStyle}>ThemeSpec</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>do</td>
            <td style={tdTypeStyle}>() =&gt; void</td>
            <td style={tdStyle}>openDashboard</td>
            <td style={tdStyle}>Custom click handler.</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="TypeScript interface" code={`export interface UserButtonProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  theme?: ThemeSpec;
  do?: () => void;
}`} />
      <p style={{ ...textStyle, marginBottom: 0 }}>
        <code style={codeStyle}>UserBadgeProps</code> is identical minus <code style={codeStyle}>do</code>.{' '}
        <code style={codeStyle}>UserCardProps</code> uses a default Size of <code style={codeStyle}>2.5rem</code>.
      </p>
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Data resolution priority:</strong>{' '}
        prop — LogtoProvider context — fallback user icon (after 1.5s timeout).
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Shape fallback:</strong>{' '}
        Omits <code style={codeSmStyle}>shape</code>? Reads <code style={codeSmStyle}>USER_SHAPE</code>{' '}
        env, defaults to <code style={codeSmStyle}>circle</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Shared hook:</strong>{' '}
        All three use <code style={codeStyle}>useUserDisplay</code>, which reads theme from{' '}
        <code style={codeStyle}>useThemeMode()</code> and user data from <code style={codeStyle}>useLogto()</code>.
      </div>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>i18n:</strong>{' '}
        UserCard&apos;s &quot;Logged in as&quot; label auto-translates — no <code style={codeStyle}>t</code> prop needed.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Image fallback:</strong>{' '}
        Avatar load failure triggers auto-fallback to name initials.
      </div>
    </SectionWrap>
  );
}

// ─── Examples page ───────────────────────────────────────────────────────────

// ─── Examples ───────────────────────────────────────────────────────────────

const examplesListStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
};

const exampleCardStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.058)',
  borderRadius: '5px',
  overflow: 'hidden',
  background: 'rgba(255,255,255,0.008)',
  display: 'flex',
  alignItems: 'stretch',
};

const exampleCodeStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  borderRight: '1px solid rgba(255,255,255,0.04)',
  padding: '8px 10px',
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
};

const exampleMetaStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
  gap: '6px',
  flexWrap: 'wrap' as const,
};

const exampleLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.5rem',
  color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.05em',
  whiteSpace: 'nowrap',
};

const exampleSubLabelStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: '0.5rem',
  color: 'rgba(255,255,255,0.18)',
  letterSpacing: '0.03em',
  whiteSpace: 'nowrap',
};

const examplePreviewStyle: React.CSSProperties = {
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '10px 16px',
  background: 'rgba(0,0,0,0.15)',
};

function ExampleCard({ label, subLabel, code, note, children }: {
  label: string;
  subLabel?: string;
  code: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={exampleCardStyle}>
      <div style={exampleCodeStyle}>
        <div style={exampleMetaStyle}>
          <span style={exampleLabelStyle}>{label}</span>
          {subLabel && <span style={exampleSubLabelStyle}>{subLabel}</span>}
          {note && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.5rem',
              color: 'rgba(255,255,255,0.2)',
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
            }}>
              {note}
            </span>
          )}
        </div>
        <CodeBlock code={code} />
      </div>
      <div style={examplePreviewStyle}>{children}</div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function UserButtonDoc() {
  return (
    <SectionContainer>
      {/* Page 1: two-column layout */}
      <Section id={1}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          alignItems: 'stretch',
          height: '100%',
          padding: '16px',
        }}>
          {/* Left: Quick start + Notes stacked */}
          <div style={colLeftStyle}>
            <QuickStartSection />
            <NotesSection />
          </div>
          {/* Right: Props table */}
          <PropsSection />
        </div>
      </Section>

      {/* Page 2: Examples */}
      <Section id={2}>
        <div style={{ padding: '16px' }}>
          <div style={sectionWrapStyle}>
            <SectionHeader label="Examples" />
            <div style={{ padding: '14px' }}>
              <div style={examplesListStyle}>
                <ExampleCard
                  label="Default + sizes"
                  subLabel="default 80px, 56px, and 36px"
                  code={`<UserButton />            {/* default 6.25rem */}
<UserButton Size="56px" />
<UserButton Size="36px" />`}
                  note="Sizes exaggerated for clarity"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <UserButton Size="80px" />
                    <UserButton Size="56px" />
                    <UserButton Size="36px" />
                  </div>
                </ExampleCard>

                <ExampleCard
                  label="Shapes"
                  subLabel="circle / square / rounded-sq"
                  code={`
<UserBadge Size="56px" shape="circle" />
<UserBadge Size="56px" shape="sq" />
<UserBadge Size="56px" shape="rsq" />

`}
                  note="All three shapes for both components"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserButton Size="56px" shape="circle" />
                      <UserButton Size="56px" shape="sq" />
                      <UserButton Size="56px" shape="rsq" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserButton Size="56px" shape="circle" Canvas="Initials" />
                      <UserButton Size="56px" shape="sq" Canvas="Initials"/>
                      <UserButton Size="56px" shape="rsq" Canvas="Initials"/>
                    </div>
                  </div>
                </ExampleCard>

                <ExampleCard
                  label="Canvas modes"
                  subLabel="Avatar vs Initials"
                  code={`<UserButton /> <UserButton Canvas="Initials" />
<UserBadge /> <UserBadge Canvas="Initials" />`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserButton Size="56px" />
                      <UserButton Size="56px" Canvas="Initials" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserBadge Size="56px" />
                      <UserBadge Size="56px" Canvas="Initials" />
                    </div>
                  </div>
                </ExampleCard>

                <ExampleCard
                  label="UserCard"
                  subLabel="avatar + name + i18n label"
                  code={`
<UserCard Size="36px" shape="sq" />
<UserCard Size="36px" shape="rsq" />`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'stretch' }}>
                    <UserCard Size="36px" shape="sq" />
                    <UserCard Size="36px" shape="rsq" />
                  </div>
                </ExampleCard>

                <ExampleCard
                  label="Custom click"
                  subLabel="override default action"
                  code={`const msg = 'Oh no you have exploded the earth!!!!!!';
<UserButton Size="72px" do={() => alert(msg)} />`}
                >
                  <UserButton Size="72px" do={() => alert('Oh no you have exploded the earth!!!!!!')} />
                </ExampleCard>

                <ExampleCard
                  label="do — open URL"
                  subLabel="window.open in a new tab"
                  code={`const url = 'https://music.youtube.com/watch?v=l6t4gx8vCMI';
<UserButton Size="72px" do={() => window.open(url, '_blank')} />`}
                >
                  <UserButton Size="72px" do={() => window.open('https://music.youtube.com/watch?v=l6t4gx8vCMI', '_blank')} />
                </ExampleCard>

              </div>
            </div>
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}