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
// Dev Tab
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  return (
    <SectionWrap label="Dev tab overview">
      <p style={textStyle}>
        The <code style={codeStyle}>DevTab</code> is a developer tools panel that displays the
        access token, raw user data JSON, and session management actions. It uses the{' '}
        <code style={codeStyle}>CodeBlock</code> shared component for JSON display.
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
            <td style={tdStyle}>Full user data for JSON display</td>
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
            <td style={tdPropStyle}>accessToken</td>
            <td style={tdStyle}><code style={codeStyle}>string</code></td>
            <td style={tdStyle}>Current access token for display</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Component signature" code={`interface DevTabProps {
  userData:    UserData;
  theme:       ThemeSpec;
  t:           Translations;
  accessToken: string;
}`} />
    </SectionWrap>
  );
}

function SectionsSection() {
  return (
    <SectionWrap label="Sections">
      <p style={textStyle}>
        The tab is organized into three sections, each wrapped in a card with an icon header:
      </p>

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Access Token
      </p>
      <p style={textStyle}>
        Displays the current access token in a scrollable <code style={codeStyle}>CodeBlock</code>.
        The token type (JWT or opaque) is detected by checking for 3 dot-separated segments.
      </p>

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Raw Data
      </p>
      <p style={textStyle}>
        Displays the complete <code style={codeStyle}>userData</code> object as formatted JSON.
        This is useful for debugging user data structure.
      </p>

      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Cookie Actions
      </p>
      <p style={textStyle}>
        Two destructive actions for session management:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Action</th>
            <th style={thStyle}>Route</th>
            <th style={thStyle}>Effect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>Clear cookies</td>
            <td style={tdStyle}><code style={codeStyle}>/api/wipe</code></td>
            <td style={tdStyle}>Clears session cookies</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>Invalidate session</td>
            <td style={tdStyle}><code style={codeStyle}>/api/wipe?force=true</code></td>
            <td style={tdStyle}>Force-invalidates session and redirects</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="Cookie actions" code={`const handleClearCookies = () => {
  window.location.href = '/api/wipe';
};

const handleInvalidateSession = () => {
  window.location.href = '/api/wipe?force=true';
};`} />
    </SectionWrap>
  );
}

function CodeBlockUsageSection() {
  return (
    <SectionWrap label="CodeBlock component">
      <p style={textStyle}>
        The <code style={codeStyle}>CodeBlock</code> shared component renders JSON data with
        syntax highlighting and a copy button. It&apos;s used throughout the dashboard for
        displaying structured data.
      </p>
      <CodeBlock title="CodeBlock usage" code={`<CodeBlock
  data={accessToken}
  theme={theme}
  maxHeight="7.5rem"
  t={t}
/>`} />
      <p style={textStyle}>
        The component accepts a <code style={codeStyle}>maxHeight</code> prop for scrollable
        display, and uses theme-aware styling for syntax colors.
      </p>
    </SectionWrap>
  );
}

function NotesSection() {
  return (
    <SectionWrap label="Notes">
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Production use:</strong>{' '}
        This tab is intended for development and debugging. In production, use{' '}
        <code style={codeStyle}>LOAD_TABS</code> to exclude it:
        <code style={codeStyle}>LOAD_TABS=profile,preferences,security</code>.
      </div>
      <div style={{ ...noteStyle, marginBottom: 0 }}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Full page navigation:</strong>{' '}
        Cookie actions use <code style={codeStyle}>window.location.href</code> for
        full-page navigation, not client-side routing, because they destroy the session.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function DevDoc() {
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
          <SectionsSection />
          <CodeBlockUsageSection />
          <NotesSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
