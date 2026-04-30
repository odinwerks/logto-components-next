'use client';

import CodeBlock from '../utils/CodeBlock';
import { SectionContainer, Section } from '../utils/Section';
import { useDocStyles } from '../utils/useDocStyles';
import { SectionHeader, SectionWrap } from '../utils/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Architecture + Color Tokens
// ═══════════════════════════════════════════════════════════════════════════════

function ArchitectureSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Dual theme system">
      <p style={styles.textStyle}>
        The theme system has <strong>two layers</strong> that work together:
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Layer</th>
            <th style={styles.thStyle}>Driven by</th>
            <th style={styles.thStyle}>Used for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>JS ThemeSpec</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>ThemeSpec</code> object</td>
            <td style={styles.tdStyle}>Inline React styles via <code style={styles.codeSmStyle}>theme.components</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>CSS Variables</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>dark.css</code> / <code style={styles.codeSmStyle}>light.css</code></td>
            <td style={styles.tdStyle}>Global pseudo-classes (scrollbar, selection, body)</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key detail:</strong>{' '}
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Color tokens">
      <p style={styles.textStyle}>
        Complete color palette. Values differ between dark and light modes.
        Use <code style={styles.codeStyle}>theme.colors</code> to access.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Dark</th>
            <th style={styles.thStyle}>Light</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>bgPage</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#050505</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f9fafb</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>bgPrimary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#0a0a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ffffff</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>bgSecondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#111111</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f3f4f6</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>bgTertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#1a1a1a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#e5e7eb</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>textPrimary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#e5e7eb</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#111827</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>textSecondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#9ca3af</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#374151</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>textTertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#6b7280</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#6b7280</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>borderColor</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#1f2937</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d1d5db</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>accentGreen</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#10b981</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#059669</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>accentRed</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ef4444</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#dc2626</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>accentYellow</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f59e0b</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d97706</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>accentBlue</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#3b82f6</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#2563eb</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>successBg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#064e3b</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d1fae5</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>errorBg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#450a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fee2e2</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>warningBg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#451a03</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fef3c7</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>contrastText</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fff</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fff</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>fontWeight</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>400</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>500</code></td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Utility helpers:</strong>{' '}
        <code style={styles.codeStyle}>alpha(hex, opacity)</code> appends hex alpha channel.
        <code style={styles.codeStyle}>adj(hex, delta)</code> shifts RGB channels for lightness.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Typography, Radii, Shadows, Transitions
// ═══════════════════════════════════════════════════════════════════════════════

function TypographySection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Typography tokens">
      <p style={styles.textStyle}>
        Mode-independent typography scale. Access via{' '}
        <code style={styles.codeStyle}>theme.tokens.typography</code>.
      </p>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Font families
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>fontMono</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;IBM Plex Mono&apos;, &apos;Courier New&apos;, monospace</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>fontSans</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;DM Sans&apos;, system-ui, sans-serif</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Size scale
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Value</th>
            <th style={styles.thStyle}>Approx px</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>micro</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.5625rem</code></td>
            <td style={styles.tdStyle}>~9px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>xs</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.625rem</code></td>
            <td style={styles.tdStyle}>~10px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sm</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.6875rem</code></td>
            <td style={styles.tdStyle}>~11px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>base</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.75rem</code></td>
            <td style={styles.tdStyle}>~12px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>md</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.8125rem</code></td>
            <td style={styles.tdStyle}>~13px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>lg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.875rem</code></td>
            <td style={styles.tdStyle}>~14px</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>xl</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.9375rem</code></td>
            <td style={styles.tdStyle}>~15px</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Weight + Leading
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Category</th>
            <th style={styles.thStyle}>Tokens</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>weight</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>normal: 400</code> <code style={styles.codeSmStyle}>medium: 500</code> <code style={styles.codeSmStyle}>semibold: 600</code> <code style={styles.codeSmStyle}>bold: 700</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>leading</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>tight: 1.2</code> <code style={styles.codeSmStyle}>normal: 1.5</code> <code style={styles.codeSmStyle}>relaxed: 1.65</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function RadiiShadowsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Radii, shadows, transitions">
      <p style={styles.textStyle}>
        Mode-independent tokens. Radii and transitions are shared; shadows adapt to mode.
      </p>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Border radii
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>none</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>xs</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.1875rem</code> (~3px)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sm</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25rem</code> (~4px)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>md</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.375rem</code> (~6px)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>lg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.5rem</code> (~8px)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>full</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>9999px</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Shadows (mode-dependent)
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Dark</th>
            <th style={styles.thStyle}>Light</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>none</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>none</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>none</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>card</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 1px 3px rgba(0,0,0,0.5)</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 1px 3px rgba(0,0,0,0.1)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>popover</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 4px 16px rgba(0,0,0,0.6)</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 4px 12px rgba(0,0,0,0.15)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>modal</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 2rem 5.625rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0 2rem 5.625rem rgba(0,0,0,0.2)</code></td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Transitions
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>fast</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.1s ease</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>normal</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.15s ease</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>slow</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25s ease</code></td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Text styles">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>heading</td>
            <td style={styles.tdStyle}>Main headings — semibold, tight leading</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sectionLabel</td>
            <td style={styles.tdStyle}>ALL-CAPS label preceding a section</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>fieldLabel</td>
            <td style={styles.tdStyle}>Label above a form field — mono, uppercase</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>body</td>
            <td style={styles.tdStyle}>Standard body copy</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>bodyMono</td>
            <td style={styles.tdStyle}>Body copy with monospace font</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>muted</td>
            <td style={styles.tdStyle}>Supporting text — smaller, tertiary color</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>mutedMono</td>
            <td style={styles.tdStyle}>Muted text with monospace</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>micro</td>
            <td style={styles.tdStyle}>Tiny text for footnotes</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>microMono</td>
            <td style={styles.tdStyle}>Tiny ALL-CAPS mono (code block headers)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>link</td>
            <td style={styles.tdStyle}>Hyperlink — accentBlue, underline</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>error</td>
            <td style={styles.tdStyle}>Inline validation error</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>description</td>
            <td style={styles.tdStyle}>Tab description paragraph</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function SurfacesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Surfaces">
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>page</td>
            <td style={styles.tdStyle}>Outermost viewport background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>modal</td>
            <td style={styles.tdStyle}>Centered floating panel with shadow</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>card</td>
            <td style={styles.tdStyle}>Bordered section card</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>cardHeader</td>
            <td style={styles.tdStyle}>Card title bar (normal)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>cardHeaderDanger</td>
            <td style={styles.tdStyle}>Card title bar (danger variant)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>well</td>
            <td style={styles.tdStyle}>Padded inset section block</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>infoRow</td>
            <td style={styles.tdStyle}>Single key/value display cell</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>chip</td>
            <td style={styles.tdStyle}>Compact pill (IDs, tags)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>dropZone</td>
            <td style={styles.tdStyle}>File drag-drop area</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>dropZoneActive</td>
            <td style={styles.tdStyle}>Drag-over state overrides</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>emptyState</td>
            <td style={styles.tdStyle}>Centered "nothing here" block</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>overlay</td>
            <td style={styles.tdStyle}>Modal backdrop with blur</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>codeInfoBox</td>
            <td style={styles.tdStyle}>Info callout inside modals</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Other structural
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>divider</td>
            <td style={styles.tdStyle}>Horizontal rule — 1px line</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function ButtonsSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Buttons (InteractiveStyle)">
      <p style={styles.textStyle}>
        Buttons use the <code style={styles.codeStyle}>InteractiveStyle</code> pattern with{' '}
        <code style={styles.codeStyle}>{'{ base, hover, disabled }'}</code> sub-objects.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>primary</td>
            <td style={styles.tdStyle}>Main action button — accentBlue background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>secondary</td>
            <td style={styles.tdStyle}>Default button — bgTertiary background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ghost</td>
            <td style={styles.tdStyle}>No-border button — transparent base</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>danger</td>
            <td style={styles.tdStyle}>Destructive with errorBg</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>dangerSolid</td>
            <td style={styles.tdStyle}>Solid destructive — accentRed background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>icon</td>
            <td style={styles.tdStyle}>Square icon-only button (1.75rem)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>nav</td>
            <td style={styles.tdStyle}>Sidebar navigation item</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>navDanger</td>
            <td style={styles.tdStyle}>Sidebar danger item (Sign out)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>langItem</td>
            <td style={styles.tdStyle}>Language selector item — has base/active/hover</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>chipBlue</td>
            <td style={styles.tdStyle}>Dev-tab action chip — blue accent</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>chipGreen</td>
            <td style={styles.tdStyle}>Dev-tab action chip — green accent</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>chipRed</td>
            <td style={styles.tdStyle}>Dev-tab action chip — red accent</td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Badges & toasts">
      <p style={styles.textStyle}>
        Status indicators use accent colors with alpha backgrounds.
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Badge key</th>
            <th style={styles.thStyle}>Toast key</th>
            <th style={styles.thStyle}>Accent</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>success</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>success</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentGreen</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>error</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>error</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentRed</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>info</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>info</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentBlue</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>neutral</td>
            <td style={styles.tdStyle}>—</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>textTertiary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>warning</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>warning</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentYellow</code></td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Code & tabs styles">
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
        Code display
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>wrapper</td>
            <td style={styles.tdStyle}>Outer container with gap</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>pre</td>
            <td style={styles.tdStyle}>&lt;pre&gt; element — mono font, overflow auto</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sectionWrapper</td>
            <td style={styles.tdStyle}>Dev-tab section (icon+label bar + pre)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sectionHeader</td>
            <td style={styles.tdStyle}>Dev-tab section title bar</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>copyButton</td>
            <td style={styles.tdStyle}>InteractiveStyle + visible/copied states</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>tokenContainer</td>
            <td style={styles.tdStyle}>TruncatedToken outer div</td>
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
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Tab navigation
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>list</td>
            <td style={styles.tdStyle}>Tab bar container with bottom border</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>button</td>
            <td style={styles.tdStyle}>Tab button — InteractiveStyle (base/hover/disabled)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>active</td>
            <td style={styles.tdStyle}>Merged on top of button.base when tab is active</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function SidebarAvatarSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Sidebar & avatar">
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>
        Sidebar
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>container</td>
            <td style={styles.tdStyle}>Sidebar wrapper — 14.375rem width</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>profileHeader</td>
            <td style={styles.tdStyle}>User avatar/name section</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>avatarImg</td>
            <td style={styles.tdStyle}>Avatar image — 2rem square</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>avatarFallback</td>
            <td style={styles.tdStyle}>Initials fallback when no image</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>actionSection</td>
            <td style={styles.tdStyle}>Bottom action buttons area</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Avatar / user badge
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>container</td>
            <td style={styles.tdStyle}>2rem square with bgTertiary</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>initials</td>
            <td style={styles.tdStyle}>Bold text — accentBlue color</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Inputs
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>text</td>
            <td style={styles.tdStyle}>Text input — full width, inset shadow</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>select</td>
            <td style={styles.tdStyle}>Select dropdown — mono font, no native appearance</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>label</td>
            <td style={styles.tdStyle}>Form field label — mono, uppercase</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.75rem' }}>
        Icon box
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Key</th>
            <th style={styles.thStyle}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>base</td>
            <td style={styles.tdStyle}>2.5rem square with bgTertiary</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>blue</td>
            <td style={styles.tdStyle}>Blue accent tint</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>green</td>
            <td style={styles.tdStyle}>Green accent tint</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>red</td>
            <td style={styles.tdStyle}>Red accent tint (errorBg bg)</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function TkAliasesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="tk() aliases">
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>tk()</code> helper creates compact aliases from{' '}
        <code style={styles.codeStyle}>ThemeColors</code> or <code style={styles.codeStyle}>ThemeSpec</code>.
        Used heavily in components for terse inline styles.
      </p>
      <CodeBlock title="Usage" code={`import { tk } from './logto-kit/components/handlers/theme-helpers';

function MyComponent({ themeSpec }) {
  const t = tk(themeSpec);
  return (
    <div style={{ background: t.bg, color: t.text, border: \`1px solid \${t.borderFaint}\` }}>
      <span style={{ color: t.blueText }}>Link</span>
    </div>
  );
}`} />
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Alias</th>
            <th style={styles.thStyle}>Maps to</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>font</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;DM Sans&apos;, system-ui, sans-serif</code> (hardcoded)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>mono</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;IBM Plex Mono&apos;, &apos;Courier New&apos;, monospace</code> (hardcoded)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>text</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>textPrimary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>sub</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>textSecondary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>muted</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>textTertiary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>bgPrimary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>surface</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>bgSecondary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>raised</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>bgTertiary</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>border</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>borderColor</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>borderFaint</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>alpha(borderColor, 0.5)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>greenDim</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>alpha(accentGreen, 0.1)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>greenText</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentGreen</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>blueDim</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>alpha(accentBlue, 0.1)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>blueText</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentBlue</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>blue</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentBlue</code> (alias of blueText)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>redDim</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>errorBg</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>redText</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentRed</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>redBorder</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>alpha(accentRed, 0.3)</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>red</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentRed</code> (alias of redText)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>amberDim</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>warningBg</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>amberText</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>accentYellow</code></td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

function CssVariablesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="CSS variables">
      <p style={styles.textStyle}>
        CSS variables prefixed <code style={styles.codeStyle}>--ldd-</code> are defined in{' '}
        <code style={styles.codeStyle}>dark.css</code> and <code style={styles.codeStyle}>light.css</code>.
        Activated via <code style={styles.codeStyle}>data-theme</code> attribute on &lt;html&gt;.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        CSS variable values differ from JS tokens — they serve different rendering
        contexts (scrollbar, selection styling).
      </div>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Variable</th>
            <th style={styles.thStyle}>Dark</th>
            <th style={styles.thStyle}>Light</th>
            <th style={styles.thStyle}>Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-page</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#0a0a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#e8eaed</code></td>
            <td style={styles.tdStyle}>Viewport background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-primary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#050505</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ffffff</code></td>
            <td style={styles.tdStyle}>Primary surface</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-secondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#0a0a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#dadcde</code></td>
            <td style={styles.tdStyle}>Secondary surface</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-tertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#1a1a1a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#c0c2c4</code></td>
            <td style={styles.tdStyle}>Tertiary / hover states</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-primary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d1d5db</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#050505</code></td>
            <td style={styles.tdStyle}>Primary text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-secondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#9ca3af</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#333333</code></td>
            <td style={styles.tdStyle}>Secondary text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-tertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#6b7280</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#555555</code></td>
            <td style={styles.tdStyle}>Muted text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-border-color</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#374151</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#7a7c7e</code></td>
            <td style={styles.tdStyle}>Borders</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-border-radius</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.375rem</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.375rem</code></td>
            <td style={styles.tdStyle}>Standard radius</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-border-radius-sm</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25rem</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25rem</code></td>
            <td style={styles.tdStyle}>Small radius</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-accent-green</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#86efac</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#059669</code></td>
            <td style={styles.tdStyle}>Selection color (dark)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-accent-yellow</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fbbf24</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d97706</code></td>
            <td style={styles.tdStyle}>Warning accent</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-accent-red</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ef4444</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#dc2626</code></td>
            <td style={styles.tdStyle}>Error accent</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-accent-blue</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#60a5fa</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#2563eb</code></td>
            <td style={styles.tdStyle}>Selection color (light)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-font-family</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;IBM Plex Mono&apos;...</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;IBM Plex Mono&apos;...</code></td>
            <td style={styles.tdStyle}>Body font</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-font-weight</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>400</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>500</code></td>
            <td style={styles.tdStyle}>Body weight</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-success-bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#003300</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ecfdf5</code></td>
            <td style={styles.tdStyle}>Success status bg</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-error-bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#330000</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fef2f2</code></td>
            <td style={styles.tdStyle}>Error status bg</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-warning-bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#78350f</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fffbdc</code></td>
            <td style={styles.tdStyle}>Warning status bg</td>
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
  const styles = useDocStyles();
  return (
    <SectionWrap label="Creating a custom theme">
      <p style={styles.textStyle}>
        Add a new theme variant by creating a folder, exporting specs,
        registering in the switch, and setting the ENV.
      </p>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Required:</strong>{' '}
        Step 2 (code registration) is <strong>mandatory</strong>. Setting <code style={styles.codeStyle}>THEME</code> in{' '}
        <code style={styles.codeStyle}>.env</code> alone does nothing without importing your theme and adding a case to{' '}
        <code style={styles.codeStyle}>resolveTheme()</code> in <code style={styles.codeStyle}>themes/index.ts</code>.
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
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>CSS variables:</strong>{' '}
        Create <code style={styles.codeStyle}>mytheme/dark.css</code> and{' '}
        <code style={styles.codeStyle}>mytheme/light.css</code> with matching
        <code style={styles.codeStyle}>--ldd-*</code> variables to keep scrollbar/selection
        styles in sync.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ThemesDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Architecture + Color tokens (two-column) */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <ArchitectureSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ColorTokensSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Typography + Radii/Shadows (two-column) */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <TypographySection />
          </div>
          <div style={styles.colLeftStyle}>
            <RadiiShadowsSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Component styles (two-column) */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <TextStylesSection />
            <SurfacesSection />
          </div>
          <div style={styles.colLeftStyle}>
            <ButtonsSection />
          </div>
        </div>
      </Section>

      {/* Page 4: More components + tk() + CSS vars (two-column) */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <BadgesToastsSection />
            <CodeTabsSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SidebarAvatarSection />
          </div>
        </div>
      </Section>

      {/* Page 5: tk() + CSS vars (two-column) */}
      <Section id={5}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <TkAliasesSection />
          </div>
          <div style={styles.colLeftStyle}>
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
          minHeight: '100%',
          overflow: 'auto',
        }}>
          <CustomThemeSection />
        </div>
      </Section>
    </SectionContainer>
  );
}
