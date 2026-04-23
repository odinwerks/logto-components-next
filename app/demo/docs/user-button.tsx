'use client';

import { UserButton, UserBadge, UserCard } from '../../logto-kit/components/userbutton';
import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ─── Page 1 sections ────────────────────────────────────────────────────────

function QuickStartSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Quick start">
      <p style={styles.textStyle}>
        Import and mount inside a <code style={styles.codeStyle}>LogtoProvider</code>.
        Reads user data from context, opens Dashboard on click.
      </p>
      <CodeBlock title="Import" code={`import { UserButton, UserBadge, UserCard } from './logto-kit';`} />
      <CodeBlock title="Minimal usage" code={`<UserButton />`} />
      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Clickable circle avatar. Falls back to user icon after 1.5s if no data.
        Priority: prop, then provider context, then fallback icon.
      </p>
    </SectionWrap>
  );
}

function PropsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Props">
      <p style={styles.textStyle}>
        Shared across UserButton, UserBadge, UserCard.
        <code style={styles.codeStyle}>do</code> is Button/Card only.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Prop</th>
            <th style={styles.thStyle}>Type</th>
            <th style={styles.thStyle}>Default</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>Canvas</td>
            <td style={styles.tdTypeStyle}>Avatar | Initials</td>
            <td style={styles.tdStyle}>auto</td>
            <td style={styles.tdStyle}>Avatar image or initials fallback.</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Size</td>
            <td style={styles.tdTypeStyle}>string</td>
            <td style={styles.tdStyle}>6.25rem / 2.5rem</td>
            <td style={styles.tdStyle}>CSS size string.</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>shape</td>
            <td style={styles.tdTypeStyle}>circle | sq | rsq</td>
            <td style={styles.tdStyle}>circle</td>
            <td style={styles.tdStyle}>Border radius. Overridable via USER_SHAPE env.</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>userData</td>
            <td style={styles.tdTypeStyle}>UserData</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>Optional override. Reads LogtoProvider context if omitted.</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>theme</td>
            <td style={styles.tdTypeStyle}>ThemeSpec</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}>Optional override. Reads useThemeMode() context if omitted.</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>do</td>
            <td style={styles.tdTypeStyle}>() =&gt; void</td>
            <td style={styles.tdStyle}>openDashboard</td>
            <td style={styles.tdStyle}>Custom click handler.</td>
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
      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        <code style={styles.codeStyle}>UserBadgeProps</code> is identical minus <code style={styles.codeStyle}>do</code>.{' '}
        <code style={styles.codeStyle}>UserCardProps</code> uses a default Size of <code style={styles.codeStyle}>2.5rem</code>.
      </p>
    </SectionWrap>
  );
}

function NotesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Notes">
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Data resolution priority:</strong>{' '}
        prop — LogtoProvider context — fallback user icon (after 1.5s timeout).
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Shape fallback:</strong>{' '}
        Omits <code style={styles.codeSmStyle}>shape</code>? Reads <code style={styles.codeSmStyle}>USER_SHAPE</code>{' '}
        env, defaults to <code style={styles.codeSmStyle}>circle</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Shared hook:</strong>{' '}
        All three use <code style={styles.codeStyle}>useUserDisplay</code>, which reads theme from{' '}
        <code style={styles.codeStyle}>useThemeMode()</code> and user data from <code style={styles.codeStyle}>useLogto()</code>.
      </div>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>i18n:</strong>{' '}
        UserCard&apos;s &quot;Logged in as&quot; label auto-translates — no <code style={styles.codeStyle}>t</code> prop needed.
      </div>
      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Image fallback:</strong>{' '}
        Avatar load failure triggers auto-fallback to name initials.
      </div>
    </SectionWrap>
  );
}

// ─── Examples page ───────────────────────────────────────────────────────────

// ─── Examples ───────────────────────────────────────────────────────────────

function ExampleCard({ label, subLabel, code, note, children }: {
  label: string;
  subLabel?: string;
  code: string;
  note?: string;
  children: React.ReactNode;
}) {
  const styles = useDocStyles();
  return (
    <div style={styles.exampleCardStyle}>
      <div style={styles.exampleCodeStyle}>
        <div style={styles.exampleMetaStyle}>
          <span style={styles.exampleLabelStyle}>{label}</span>
          {subLabel && <span style={styles.exampleSubLabelStyle}>{subLabel}</span>}
          {note && (
            <span style={{
              marginLeft: 'auto',
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.5rem',
              color: styles.textStyle.color,
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
            }}>
              {note}
            </span>
          )}
        </div>
        <CodeBlock code={code} />
      </div>
      <div style={styles.examplePreviewStyle}>{children}</div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function UserButtonDoc() {
  const styles = useDocStyles();
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
          <div style={styles.colLeftStyle}>
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
          <div style={styles.sectionWrapStyle}>
            <SectionHeader label="Examples" />
            <div style={{ padding: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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