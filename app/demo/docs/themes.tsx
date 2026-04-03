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
// Page 1: Architecture + Color Tokens
// ═══════════════════════════════════════════════════════════════════════════════

function ArchitectureSection() {
  return (
    <SectionWrap label="Dual theme system">
      <p style={textStyle}>
        The theme system has <strong>two layers</strong> that work together:
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Layer</th>
            <th style={thStyle}>Driven by</th>
            <th style={thStyle}>Used for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>JS ThemeSpec</td>
            <td style={tdStyle}><code style={codeSmStyle}>ThemeSpec</code> object</td>
            <td style={tdStyle}>Inline React styles via <code style={codeSmStyle}>theme.components</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>CSS Variables</td>
            <td style={tdStyle}><code style={codeSmStyle}>dark.css</code> / <code style={codeSmStyle}>light.css</code></td>
            <td style={tdStyle}>Global pseudo-classes (scrollbar, selection, body)</td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Key detail:</strong>{' '}
        These layers are <strong>independently authored</strong>. CSS variable values differ
        from JS tokens intentionally — they serve different rendering contexts.
      </div>
      <CodeBlock title="ThemeSpec structure" code={`interface ThemeSpec {
  mode: 'dark' | 'light';
  tokens: ThemeTokens;     // Raw design tokens
  components: ComponentStyles;  // Pre-built React.CSSProperties
  colors: ThemeColors;
}`} />
    </SectionWrap>
  );
}

function ColorTokensSection() {
  return (
    <SectionWrap label="Color tokens">
      <p style={textStyle}>
        Complete color palette. Values differ between dark and light modes.
        Use <code style={codeStyle}>theme.colors</code> to access.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Dark</th>
            <th style={thStyle}>Light</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>bgPage</td>
            <td style={tdStyle}><code style={codeSmStyle}>#050505</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#f9fafb</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>bgPrimary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#0a0a0a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#ffffff</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>bgSecondary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#111111</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#f3f4f6</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>bgTertiary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#1a1a1a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#e5e7eb</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>textPrimary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#e5e7eb</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#111827</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>textSecondary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#9ca3af</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#374151</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>textTertiary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#6b7280</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#6b7280</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>borderColor</td>
            <td style={tdStyle}><code style={codeSmStyle}>#1f2937</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#d1d5db</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>accentGreen</td>
            <td style={tdStyle}><code style={codeSmStyle}>#10b981</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#059669</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>accentRed</td>
            <td style={tdStyle}><code style={codeSmStyle}>#ef4444</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#dc2626</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>accentYellow</td>
            <td style={tdStyle}><code style={codeSmStyle}>#f59e0b</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#d97706</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>accentBlue</td>
            <td style={tdStyle}><code style={codeSmStyle}>#3b82f6</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#2563eb</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>successBg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#064e3b</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#d1fae5</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>errorBg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#450a0a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#fee2e2</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>warningBg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#451a03</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#fef3c7</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>contrastText</td>
            <td style={tdStyle}><code style={codeSmStyle}>#fff</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#fff</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>fontWeight</td>
            <td style={tdStyle}><code style={codeSmStyle}>400</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>500</code></td>
          </tr>
        </tbody>
      </table>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Utility helpers:</strong>{' '}
        <code style={codeStyle}>alpha(hex, opacity)</code> appends hex alpha channel.
        <code style={codeStyle}>adj(hex, delta)</code> shifts RGB channels for lightness.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Typography, Radii, Shadows, Transitions
// ═══════════════════════════════════════════════════════════════════════════════

function TypographySection() {
  return (
    <SectionWrap label="Typography tokens">
      <p style={textStyle}>
        Mode-independent typography scale. Access via{' '}
        <code style={codeStyle}>theme.tokens.typography</code>.
      </p>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Font families
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>fontMono</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;IBM Plex Mono&apos;, &apos;Courier New&apos;, monospace</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>fontSans</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;DM Sans&apos;, system-ui, sans-serif</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Size scale
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Approx px</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>micro</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.5625rem</code></td>
            <td style={tdStyle}>~9px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>xs</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.625rem</code></td>
            <td style={tdStyle}>~10px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sm</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.6875rem</code></td>
            <td style={tdStyle}>~11px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>base</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.75rem</code></td>
            <td style={tdStyle}>~12px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>md</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.8125rem</code></td>
            <td style={tdStyle}>~13px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lg</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.875rem</code></td>
            <td style={tdStyle}>~14px</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>xl</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.9375rem</code></td>
            <td style={tdStyle}>~15px</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Weight + Leading
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Category</th>
            <th style={thStyle}>Tokens</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>weight</td>
            <td style={tdStyle}><code style={codeSmStyle}>normal: 400</code> <code style={codeSmStyle}>medium: 500</code> <code style={codeSmStyle}>semibold: 600</code> <code style={codeSmStyle}>bold: 700</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>leading</td>
            <td style={tdStyle}><code style={codeSmStyle}>tight: 1.2</code> <code style={codeSmStyle}>normal: 1.5</code> <code style={codeSmStyle}>relaxed: 1.65</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function RadiiShadowsSection() {
  return (
    <SectionWrap label="Radii, shadows, transitions">
      <p style={textStyle}>
        Mode-independent tokens. Radii and transitions are shared; shadows adapt to mode.
      </p>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Border radii
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>none</td>
            <td style={tdStyle}><code style={codeSmStyle}>0</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>xs</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.1875rem</code> (~3px)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sm</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.25rem</code> (~4px)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>md</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.375rem</code> (~6px)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>lg</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.5rem</code> (~8px)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>full</td>
            <td style={tdStyle}><code style={codeSmStyle}>9999px</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Shadows (mode-dependent)
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Dark</th>
            <th style={thStyle}>Light</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>none</td>
            <td style={tdStyle}><code style={codeSmStyle}>none</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>none</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>card</td>
            <td style={tdStyle}><code style={codeSmStyle}>0 1px 3px rgba(0,0,0,0.5)</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>0 1px 3px rgba(0,0,0,0.1)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>popover</td>
            <td style={tdStyle}><code style={codeSmStyle}>0 4px 16px rgba(0,0,0,0.6)</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>0 4px 12px rgba(0,0,0,0.15)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>modal</td>
            <td style={tdStyle}><code style={codeSmStyle}>0 2rem 5.625rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>0 2rem 5.625rem rgba(0,0,0,0.2)</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Transitions
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Token</th>
            <th style={thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>fast</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.1s ease</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>normal</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.15s ease</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>slow</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.25s ease</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Component Styles
// ═══════════════════════════════════════════════════════════════════════════════

function TextStylesSection() {
  return (
    <SectionWrap label="Text styles">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>heading</td>
            <td style={tdStyle}>Main headings — semibold, tight leading</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sectionLabel</td>
            <td style={tdStyle}>ALL-CAPS label preceding a section</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>fieldLabel</td>
            <td style={tdStyle}>Label above a form field — mono, uppercase</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>body</td>
            <td style={tdStyle}>Standard body copy</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>bodyMono</td>
            <td style={tdStyle}>Body copy with monospace font</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>muted</td>
            <td style={tdStyle}>Supporting text — smaller, tertiary color</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>mutedMono</td>
            <td style={tdStyle}>Muted text with monospace</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>micro</td>
            <td style={tdStyle}>Tiny text for footnotes</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>microMono</td>
            <td style={tdStyle}>Tiny ALL-CAPS mono (code block headers)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>link</td>
            <td style={tdStyle}>Hyperlink — accentBlue, underline</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>error</td>
            <td style={tdStyle}>Inline validation error</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>description</td>
            <td style={tdStyle}>Tab description paragraph</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function SurfacesSection() {
  return (
    <SectionWrap label="Surfaces">
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>page</td>
            <td style={tdStyle}>Outermost viewport background</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>modal</td>
            <td style={tdStyle}>Centered floating panel with shadow</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>card</td>
            <td style={tdStyle}>Bordered section card</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>cardHeader</td>
            <td style={tdStyle}>Card title bar (normal)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>cardHeaderDanger</td>
            <td style={tdStyle}>Card title bar (danger variant)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>well</td>
            <td style={tdStyle}>Padded inset section block</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>infoRow</td>
            <td style={tdStyle}>Single key/value display cell</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>chip</td>
            <td style={tdStyle}>Compact pill (IDs, tags)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>dropZone</td>
            <td style={tdStyle}>File drag-drop area</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>dropZoneActive</td>
            <td style={tdStyle}>Drag-over state overrides</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>emptyState</td>
            <td style={tdStyle}>Centered "nothing here" block</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>overlay</td>
            <td style={tdStyle}>Modal backdrop with blur</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>codeInfoBox</td>
            <td style={tdStyle}>Info callout inside modals</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Other structural
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>divider</td>
            <td style={tdStyle}>Horizontal rule — 1px line</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ButtonsSection() {
  return (
    <SectionWrap label="Buttons (InteractiveStyle)">
      <p style={textStyle}>
        Buttons use the <code style={codeStyle}>InteractiveStyle</code> pattern with{' '}
        <code style={codeStyle}>{'{ base, hover, disabled }'}</code> sub-objects.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>primary</td>
            <td style={tdStyle}>Main action button — accentBlue background</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>secondary</td>
            <td style={tdStyle}>Default button — bgTertiary background</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>ghost</td>
            <td style={tdStyle}>No-border button — transparent base</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>danger</td>
            <td style={tdStyle}>Destructive with errorBg</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>dangerSolid</td>
            <td style={tdStyle}>Solid destructive — accentRed background</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>icon</td>
            <td style={tdStyle}>Square icon-only button (1.75rem)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>nav</td>
            <td style={tdStyle}>Sidebar navigation item</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>navDanger</td>
            <td style={tdStyle}>Sidebar danger item (Sign out)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>langItem</td>
            <td style={tdStyle}>Language selector item — has base/active/hover</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>chipBlue</td>
            <td style={tdStyle}>Dev-tab action chip — blue accent</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>chipGreen</td>
            <td style={tdStyle}>Dev-tab action chip — green accent</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>chipRed</td>
            <td style={tdStyle}>Dev-tab action chip — red accent</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="InteractiveStyle pattern" code={`// All InteractiveStyle objects follow this shape:
const btnStyle: InteractiveStyle = {
  base:     { /* default state */ },
  hover:    { /* mouse enter */ },
  disabled: { opacity: 0.45, cursor: 'not-allowed' },
};

// Components spread base, then conditionally merge hover:
<div
  style={isHovering ? { ...btnStyle.base, ...btnStyle.hover } : btnStyle.base}
  onMouseEnter={() => setHovering(true)}
  onMouseLeave={() => setHovering(false)}
/>`} />
    </SectionWrap>
  );
}

function BadgesToastsSection() {
  return (
    <SectionWrap label="Badges & toasts">
      <p style={textStyle}>
        Status indicators use accent colors with alpha backgrounds.
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Badge key</th>
            <th style={thStyle}>Toast key</th>
            <th style={thStyle}>Accent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>success</td>
            <td style={tdStyle}><code style={codeSmStyle}>success</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>accentGreen</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>error</td>
            <td style={tdStyle}><code style={codeSmStyle}>error</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>accentRed</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>info</td>
            <td style={tdStyle}><code style={codeSmStyle}>info</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>accentBlue</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>neutral</td>
            <td style={tdStyle}>—</td>
            <td style={tdStyle}><code style={codeSmStyle}>textTertiary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>warning</td>
            <td style={tdStyle}><code style={codeSmStyle}>warning</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>accentYellow</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: Code, Tabs, Sidebar, tk(), CSS Variables
// ═══════════════════════════════════════════════════════════════════════════════

function CodeTabsSection() {
  return (
    <SectionWrap label="Code & tabs styles">
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
        Code display
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>wrapper</td>
            <td style={tdStyle}>Outer container with gap</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>pre</td>
            <td style={tdStyle}>&lt;pre&gt; element — mono font, overflow auto</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sectionWrapper</td>
            <td style={tdStyle}>Dev-tab section (icon+label bar + pre)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sectionHeader</td>
            <td style={tdStyle}>Dev-tab section title bar</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>copyButton</td>
            <td style={tdStyle}>InteractiveStyle + visible/copied states</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>tokenContainer</td>
            <td style={tdStyle}>TruncatedToken outer div</td>
          </tr>
        </tbody>
      </table>
      <CodeBlock title="copyButton extended InteractiveStyle" code={`// copyButton has additional states beyond base/hover/disabled:
code.copyButton: {
  base:     { opacity: 0, pointerEvents: 'none', /* ... */ },
  hover:    { background: bgTertiary, color: textPrimary },
  disabled: { opacity: 0.4, cursor: 'not-allowed' },
  visible:  { opacity: 1, pointerEvents: 'auto' },
  copied:   { color: accentGreen },
}`} />
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Tab navigation
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>list</td>
            <td style={tdStyle}>Tab bar container with bottom border</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>button</td>
            <td style={tdStyle}>Tab button — InteractiveStyle (base/hover/disabled)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>active</td>
            <td style={tdStyle}>Merged on top of button.base when tab is active</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function SidebarAvatarSection() {
  return (
    <SectionWrap label="Sidebar & avatar">
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
        Sidebar
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>container</td>
            <td style={tdStyle}>Sidebar wrapper — 14.375rem width</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>profileHeader</td>
            <td style={tdStyle}>User avatar/name section</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>avatarImg</td>
            <td style={tdStyle}>Avatar image — 2rem square</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>avatarFallback</td>
            <td style={tdStyle}>Initials fallback when no image</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>actionSection</td>
            <td style={tdStyle}>Bottom action buttons area</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Avatar / user badge
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>container</td>
            <td style={tdStyle}>2rem square with bgTertiary</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>initials</td>
            <td style={tdStyle}>Bold text — accentBlue color</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Inputs
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>text</td>
            <td style={tdStyle}>Text input — full width, inset shadow</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>select</td>
            <td style={tdStyle}>Select dropdown — mono font, no native appearance</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>label</td>
            <td style={tdStyle}>Form field label — mono, uppercase</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Icon box
      </p>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Key</th>
            <th style={thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>base</td>
            <td style={tdStyle}>2.5rem square with bgTertiary</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>blue</td>
            <td style={tdStyle}>Blue accent tint</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>green</td>
            <td style={tdStyle}>Green accent tint</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>red</td>
            <td style={tdStyle}>Red accent tint (errorBg bg)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function TkAliasesSection() {
  return (
    <SectionWrap label="tk() aliases">
      <p style={textStyle}>
        The <code style={codeStyle}>tk()</code> helper creates compact aliases from{' '}
        <code style={codeStyle}>ThemeColors</code> or <code style={codeStyle}>ThemeSpec</code>.
        Used heavily in components for terse inline styles.
      </p>
      <CodeBlock title="Usage" code={`import { tk } from '@odinwerks/logto-kit/components/handlers/theme-helpers';

function MyComponent({ themeSpec }) {
  const t = tk(themeSpec);
  return (
    <div style={{ background: t.bg, color: t.text, border: \`1px solid \${t.borderFaint}\` }}>
      <span style={{ color: t.blueText }}>Link</span>
    </div>
  );
}`} />
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Alias</th>
            <th style={thStyle}>Maps to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>font</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;DM Sans&apos;, system-ui, sans-serif</code> (hardcoded)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>mono</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;IBM Plex Mono&apos;, &apos;Courier New&apos;, monospace</code> (hardcoded)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>text</td>
            <td style={tdStyle}><code style={codeSmStyle}>textPrimary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>sub</td>
            <td style={tdStyle}><code style={codeSmStyle}>textSecondary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>muted</td>
            <td style={tdStyle}><code style={codeSmStyle}>textTertiary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>bg</td>
            <td style={tdStyle}><code style={codeSmStyle}>bgPrimary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>surface</td>
            <td style={tdStyle}><code style={codeSmStyle}>bgSecondary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>raised</td>
            <td style={tdStyle}><code style={codeSmStyle}>bgTertiary</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>border</td>
            <td style={tdStyle}><code style={codeSmStyle}>borderColor</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>borderFaint</td>
            <td style={tdStyle}><code style={codeSmStyle}>alpha(borderColor, 0.5)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>greenDim</td>
            <td style={tdStyle}><code style={codeSmStyle}>alpha(accentGreen, 0.1)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>greenText</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentGreen</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>blueDim</td>
            <td style={tdStyle}><code style={codeSmStyle}>alpha(accentBlue, 0.1)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>blueText</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentBlue</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>blue</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentBlue</code> (alias of blueText)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>redDim</td>
            <td style={tdStyle}><code style={codeSmStyle}>errorBg</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>redText</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentRed</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>redBorder</td>
            <td style={tdStyle}><code style={codeSmStyle}>alpha(accentRed, 0.3)</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>red</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentRed</code> (alias of redText)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>amberDim</td>
            <td style={tdStyle}><code style={codeSmStyle}>warningBg</code></td>
          </tr>
          <tr>
            <td style={tdPropStyle}>amberText</td>
            <td style={tdStyle}><code style={codeSmStyle}>accentYellow</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function CssVariablesSection() {
  return (
    <SectionWrap label="CSS variables">
      <p style={textStyle}>
        CSS variables prefixed <code style={codeStyle}>--ldd-</code> are defined in{' '}
        <code style={codeStyle}>dark.css</code> and <code style={codeStyle}>light.css</code>.
        Activated via <code style={codeStyle}>data-theme</code> attribute on &lt;html&gt;.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Note:</strong>{' '}
        CSS variable values differ from JS tokens — they serve different rendering
        contexts (scrollbar, selection styling).
      </div>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Variable</th>
            <th style={thStyle}>Dark</th>
            <th style={thStyle}>Light</th>
            <th style={thStyle}>Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={tdPropStyle}>--ldd-bg-page</td>
            <td style={tdStyle}><code style={codeSmStyle}>#0a0a0a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#e8eaed</code></td>
            <td style={tdStyle}>Viewport background</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-bg-primary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#050505</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#ffffff</code></td>
            <td style={tdStyle}>Primary surface</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-bg-secondary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#0a0a0a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#dadcde</code></td>
            <td style={tdStyle}>Secondary surface</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-bg-tertiary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#1a1a1a</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#c0c2c4</code></td>
            <td style={tdStyle}>Tertiary / hover states</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-text-primary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#d1d5db</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#050505</code></td>
            <td style={tdStyle}>Primary text</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-text-secondary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#9ca3af</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#333333</code></td>
            <td style={tdStyle}>Secondary text</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-text-tertiary</td>
            <td style={tdStyle}><code style={codeSmStyle}>#6b7280</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#555555</code></td>
            <td style={tdStyle}>Muted text</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-border-color</td>
            <td style={tdStyle}><code style={codeSmStyle}>#374151</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#7a7c7e</code></td>
            <td style={tdStyle}>Borders</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-border-radius</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.375rem</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>0.375rem</code></td>
            <td style={tdStyle}>Standard radius</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-border-radius-sm</td>
            <td style={tdStyle}><code style={codeSmStyle}>0.25rem</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>0.25rem</code></td>
            <td style={tdStyle}>Small radius</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-accent-green</td>
            <td style={tdStyle}><code style={codeSmStyle}>#86efac</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#059669</code></td>
            <td style={tdStyle}>Selection color (dark)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-accent-yellow</td>
            <td style={tdStyle}><code style={codeSmStyle}>#fbbf24</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#d97706</code></td>
            <td style={tdStyle}>Warning accent</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-accent-red</td>
            <td style={tdStyle}><code style={codeSmStyle}>#ef4444</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#dc2626</code></td>
            <td style={tdStyle}>Error accent</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-accent-blue</td>
            <td style={tdStyle}><code style={codeSmStyle}>#60a5fa</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#2563eb</code></td>
            <td style={tdStyle}>Selection color (light)</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-font-family</td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;IBM Plex Mono&apos;...</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>&apos;IBM Plex Mono&apos;...</code></td>
            <td style={tdStyle}>Body font</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-font-weight</td>
            <td style={tdStyle}><code style={codeSmStyle}>400</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>500</code></td>
            <td style={tdStyle}>Body weight</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-success-bg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#003300</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#ecfdf5</code></td>
            <td style={tdStyle}>Success status bg</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-error-bg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#330000</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#fef2f2</code></td>
            <td style={tdStyle}>Error status bg</td>
          </tr>
          <tr>
            <td style={tdPropStyle}>--ldd-warning-bg</td>
            <td style={tdStyle}><code style={codeSmStyle}>#78350f</code></td>
            <td style={tdStyle}><code style={codeSmStyle}>#fffbdc</code></td>
            <td style={tdStyle}>Warning status bg</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 5: Custom Theme Guide
// ═══════════════════════════════════════════════════════════════════════════════

function CustomThemeSection() {
  return (
    <SectionWrap label="Creating a custom theme">
      <p style={textStyle}>
        Add a new theme variant by creating a folder, exporting specs,
        registering in the switch, and setting the ENV.
      </p>
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Required:</strong>{' '}
        Step 2 (code registration) is <strong>mandatory</strong>. Setting <code style={codeStyle}>THEME</code> in{' '}
        <code style={codeStyle}>.env</code> alone does nothing without importing your theme and adding a case to{' '}
        <code style={codeStyle}>resolveTheme()</code> in <code style={codeStyle}>themes/index.ts</code>.
      </div>
      <CodeBlock title="Step 1: Create themes/mytheme/index.ts" code={`import type { ThemeSpec, ThemeColors, ComponentStyles } from '../index';
import { buildDefaultTheme } from '../default';

// Start with default colors and override
const DARK: ThemeColors = {
  ...buildDefaultTheme('dark').colors,
  accentBlue: '#8b5cf6',   // purple accent
  accentGreen: '#22c55e',
  // ... override other tokens
};

const LIGHT: ThemeColors = {
  ...buildDefaultTheme('light').colors,
  accentBlue: '#7c3aed',
  accentGreen: '#16a34a',
  // ...
};

// Build from default factory, then patch components
function buildMyTheme(mode: 'dark' | 'light'): ThemeSpec {
  const base = buildDefaultTheme(mode);
  const c = mode === 'dark' ? DARK : LIGHT;

  return {
    ...base,
    mode,
    tokens: { ...base.tokens },
    colors: c,
    components: {
      ...base.components,
      // Override specific component styles
      buttons: {
        ...base.components.buttons,
        primary: {
          base: { ...base.components.buttons.primary.base, background: c.accentBlue },
          hover: { background: c.accentBlue, filter: 'brightness(1.1)' },
          disabled: base.components.buttons.primary.disabled,
        },
      },
    },
  };
}

export const mythemeDarkTheme:  ThemeSpec = buildMyTheme('dark');
export const mythemeLightTheme: ThemeSpec = buildMyTheme('light');`} />
      <CodeBlock title="Step 2: Register in themes/index.ts (REQUIRED)" code={`import { mythemeDarkTheme, mythemeLightTheme } from './mytheme';

function resolveTheme(themeName: string, mode: 'dark' | 'light'): ThemeSpec {
  switch (themeName) {
    case 'mytheme':
      return mode === 'dark' ? mythemeDarkTheme : mythemeLightTheme;
    case 'default':
    default:
      return mode === 'dark' ? defaultDarkTheme : defaultLightTheme;
  }
}`} />
      <CodeBlock title="Step 3: Set ENV" code={`# .env.local
THEME=mytheme
DEFAULT_THEME_MODE=dark`} />
      <div style={noteStyle}>
        <strong style={{ color: 'rgba(255,255,255,0.55)' }}>CSS variables:</strong>{' '}
        Create <code style={codeStyle}>mytheme/dark.css</code> and{' '}
        <code style={codeStyle}>mytheme/light.css</code> with matching
        <code style={codeStyle}>--ldd-*</code> variables to keep scrollbar/selection
        styles in sync.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ThemesDoc() {
  return (
    <SectionContainer>
      {/* Page 1: Architecture + Color tokens (two-column) */}
      <Section id={1}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <ArchitectureSection />
          </div>
          <div style={colLeftStyle}>
            <ColorTokensSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Typography + Radii/Shadows (two-column) */}
      <Section id={2}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <TypographySection />
          </div>
          <div style={colLeftStyle}>
            <RadiiShadowsSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Component styles (two-column) */}
      <Section id={3}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <TextStylesSection />
            <SurfacesSection />
          </div>
          <div style={colLeftStyle}>
            <ButtonsSection />
          </div>
        </div>
      </Section>

      {/* Page 4: More components + tk() + CSS vars (two-column) */}
      <Section id={4}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <BadgesToastsSection />
            <CodeTabsSection />
          </div>
          <div style={colLeftStyle}>
            <SidebarAvatarSection />
          </div>
        </div>
      </Section>

      {/* Page 5: tk() + CSS vars (two-column) */}
      <Section id={5}>
        <div style={{ ...twoColLayoutStyle, height: '100%', padding: '16px' }}>
          <div style={colLeftStyle}>
            <TkAliasesSection />
          </div>
          <div style={colLeftStyle}>
            <CssVariablesSection />
          </div>
        </div>
      </Section>

      {/* Page 6: Custom theme guide (full width) */}
      <Section id={6}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '16px',
          height: '100%',
          overflow: 'auto',
        }}>
          <CustomThemeSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
