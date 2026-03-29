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
// Profile Tab
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Profile tab overview">
      <p style={textStyle}>
        The <code style={codeStyle}>ProfileTab</code> manages the user&apos;s avatar, display name,
        and given/family name. It uses a <code style={codeStyle}>useAvatarUpload</code> hook for
        drag-and-drop avatar upload.
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
            <td style={tdStyle}>Current user data</td>
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
          <tr>
            <td style={tdPropStyle}>onUpdateBasicInfo</td>
            <td style={tdStyle}><code style={codeStyle}>(updates) =&gt; Promise&lt;void&gt;</code></td>
            <td style={tdStyle}>Update name</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>onUpdateAvatarUrl</td>
            <td style={tdStyle}><code style={codeStyle}>(url) =&gt; Promise&lt;void&gt;</code></td>
            <td style={tdStyle}>Update avatar URL</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>onUpdateProfile</td>
            <td style={tdStyle}><code style={codeStyle}>(profile) =&gt; Promise&lt;void&gt;</code></td>
            <td style={tdStyle}>Update given/family name</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>onSuccess</td>
            <td style={tdStyle}><code style={codeStyle}>(msg) =&gt; void</code></td>
            <td style={tdStyle}>Toast success</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>onError</td>
            <td style={tdStyle}><code style={codeStyle}>(msg) =&gt; void</code></td>
            <td style={tdStyle}>Toast error</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>refreshData</td>
            <td style={tdStyle}><code style={codeStyle}>() =&gt; void</code></td>
            <td style={tdStyle}>Re-fetch user data</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Component signature" code={`interface ProfileTabProps {
  userData:          UserData;
  theme:             ThemeSpec;
  t:                 Translations;
  onUpdateBasicInfo: (updates: { name?: string }) => Promise<void>;
  onUpdateAvatarUrl: (avatarUrl: string) => Promise<void>;
  onUpdateProfile:   (profile: { givenName?: string; familyName?: string }) => Promise<void>;
  onSuccess:         (message: string) => void;
  onError:           (message: string) => void;
  refreshData:       () => void;
}`} />
    </SectionWrap>
  );
}

function AvatarSection() {
  return (
    <SectionWrap label="Avatar upload">
      <p style={textStyle}>
        Avatar upload uses the <code style={codeStyle}>useAvatarUpload</code> hook which handles
        drag-and-drop, file selection, and upload. The tab renders a{' '}
        <code style={codeStyle}>UserBadge</code> component for preview.
      </p>
      <CodeBlock title="Avatar upload flow" code={`// 1. User drops/selects file
// 2. useAvatarUpload hook validates and uploads
// 3. Returns avatar URL
// 4. Calls onUpdateAvatarUrl(url)
// 5. Calls refreshData() to update displayed avatar

const { handleFile, isUploading, error } = useAvatarUpload({
  onUpload: async (url) => {
    await onUpdateAvatarUrl(url);
    onSuccess(t.profile.avatarUpdated);
    refreshData();
  },
  onError: (msg) => onError(msg),
});`} />
      <p style={textStyle}>
        The avatar can also be removed via the trash icon, which calls{' '}
        <code style={codeStyle}>onUpdateAvatarUrl("")</code>.
      </p>
    </SectionWrap>
  );
}

function NameSection() {
  return (
    <SectionWrap label="Name editing">
      <p style={textStyle}>
        The tab provides two editing modes for names: simple name field and extended
        given/family name fields.
      </p>
      <CodeBlock title="Name update flow" code={`// Simple name update
const handleSaveName = async () => {
  await onUpdateBasicInfo({ name });
  onSuccess(t.profile.nameUpdated);
  refreshData();
};

// Profile (given/family name) update
const handleSaveProfile = async () => {
  await onUpdateProfile({
    givenName: givenName || undefined,
    familyName: familyName || undefined,
  });
  onSuccess(t.profile.profileUpdated);
  refreshData();
};`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Data source:</strong>{' '}
        The tab reads from <code style={codeStyle}>userData.profile.givenName</code>,{' '}
        <code style={codeStyle}>userData.profile.familyName</code>, and{' '}
        <code style={codeStyle}>userData.name</code>. Changes are persisted via the
        Logto Management API.
      </div>
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Auto-save:</strong>{' '}
        Name changes require explicit save. Avatar upload saves immediately.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>UserBadge preview:</strong>{' '}
        The avatar preview uses the <code style={codeStyle}>UserBadge</code> component with{' '}
        <code style={codeStyle}>shape=&quot;sq&quot;</code> and the current user data.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ProfileDoc() {
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
          <AvatarSection />
          <NameSection />
          <NotesSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
