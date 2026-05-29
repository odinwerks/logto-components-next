'use client';

import CodeBlock from '../components/SyntaxBlock';
import { SectionContainer, Section } from '../components/Section';
import { useDocStyles } from '../components/useDocStyles';
import { SectionHeader, SectionWrap } from '../components/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Architecture + Color Tokens
// ═══════════════════════════════════════════════════════════════════════════════

function ArchitectureSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        The theme system uses <strong>CSS custom properties</strong> (<code style={styles.codeStyle}>--ldd-*</code>)
        defined in <code style={styles.codeStyle}>dark.css</code> and <code style={styles.codeStyle}>light.css</code> for all color switching.
        All other design values (typography, radii, shadows, transitions) are hardcoded directly in component source code.
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
            <td style={styles.tdPropStyle}>CSS Variables</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>dark.css</code> / <code style={styles.codeSmStyle}>light.css</code></td>
            <td style={styles.tdStyle}>All color switching + global pseudo-classes (scrollbar, selection, body)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>ThemeColors</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>DARK_COLORS</code> / <code style={styles.codeSmStyle}>LIGHT_COLORS</code></td>
            <td style={styles.tdStyle}>Inline React styles via <code style={styles.codeSmStyle}>colors.X</code> from useThemeMode()</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key detail:</strong>{' '}
        CSS variable values differ from <code style={styles.codeStyle}>ThemeColors</code> JS values intentionally - 
        they serve different rendering contexts (global scrollbar/selection styling vs. inline component styles).
      </div>
      <CodeBlock title="ThemeColors interface" code={`interface ThemeColors {
  bgPage: string;
  bgPrimary: string;
  bgSecondary: string;
  bgTertiary: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  borderColor: string;
  accentGreen: string;
  accentRed: string;
  accentYellow: string;
  accentBlue: string;
  successBg: string;
  errorBg: string;
  warningBg: string;
  contrastText: string;
  fontWeight: number | string;
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
        Use <code style={styles.codeStyle}>colors</code> from <code style={styles.codeStyle}>useThemeMode()</code> to access.
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
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: CSS Variables + useThemeMode
// ═══════════════════════════════════════════════════════════════════════════════

function HardcodedDesignSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Typography, radii, shadows, transitions">
      <p style={styles.textStyle}>
        All non-color design values are <strong>hardcoded directly in component source files</strong>.
        They do not vary between dark and light modes and are not part of the theme system.
      </p>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Typography
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Property</th>
            <th style={styles.thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>Font (sans)</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;DM Sans&apos;, system-ui, sans-serif</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Font (mono)</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>&apos;IBM Plex Mono&apos;, &apos;Courier New&apos;, monospace</code></td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Base size</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.75rem</code> (~12px)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Weights</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>400</code> (normal), <code style={styles.codeSmStyle}>500</code> (medium), <code style={styles.codeSmStyle}>600</code> (semibold), <code style={styles.codeSmStyle}>700</code> (bold)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Leading</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>1.2</code> (tight), <code style={styles.codeSmStyle}>1.5</code> (normal), <code style={styles.codeSmStyle}>1.65</code> (relaxed)</td>
          </tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Radii
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Token</th>
            <th style={styles.thStyle}>Value</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style={styles.tdPropStyle}>none</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0</code></td></tr>
          <tr><td style={styles.tdPropStyle}>xs</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.1875rem</code> (~3px)</td></tr>
          <tr><td style={styles.tdPropStyle}>sm</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25rem</code> (~4px)</td></tr>
          <tr><td style={styles.tdPropStyle}>md</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.375rem</code> (~6px)</td></tr>
          <tr><td style={styles.tdPropStyle}>lg</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.5rem</code> (~8px)</td></tr>
          <tr><td style={styles.tdPropStyle}>full</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>9999px</code></td></tr>
        </tbody>
      </table>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Transitions
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr><th style={styles.thStyle}>Token</th><th style={styles.thStyle}>Value</th></tr>
        </thead>
        <tbody>
          <tr><td style={styles.tdPropStyle}>fast</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.1s ease</code></td></tr>
          <tr><td style={styles.tdPropStyle}>normal</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.15s ease</code></td></tr>
          <tr><td style={styles.tdPropStyle}>slow</td><td style={styles.tdStyle}><code style={styles.codeSmStyle}>0.25s ease</code></td></tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Why hardcoded:</strong>{' '}
        Fonts, radii, and transition speeds never change with theme mode. Keeping them
        inlined reduces abstraction indirection and makes components self-contained.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Component Styles (inlined)
// ═══════════════════════════════════════════════════════════════════════════════

function InlinedStylesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Component styles (inlined)">
      <p style={styles.textStyle}>
        Component styles are now <strong>inlined directly in each component</strong>. There is
        no centralized component style factory. Each component defines its own <code style={styles.codeStyle}>React.CSSProperties</code> objects
        using <code style={styles.codeStyle}>colors.X</code> for color values and hardcoded values for everything else.
      </p>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Pattern
      </p>
      <CodeBlock title="How components use colors" code={`// Each component defines its own styles inline:
function MyButton() {
  const { mode, colors } = useThemeMode();

  const btnStyle: React.CSSProperties = {
    background: colors.bgPrimary,
    color: colors.textPrimary,
    border: \`1px solid \${colors.borderColor}\`,
    borderRadius: '0.375rem',
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '0.75rem',
    fontWeight: 500,
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    transition: '0.15s ease',
  };

  return <button style={btnStyle}>Click me</button>;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>No more InteractiveStyle:</strong>{' '}
        The <code style={styles.codeStyle}>InteractiveStyle</code> pattern (base/hover/disabled sub-objects) has been removed.
        Components now handle hover/active/disabled states directly using React state and conditional styling.
      </div>
      <p style={{ ...styles.textStyle, fontWeight: 500, color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem' }}>
        Why inlined
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Benefit</th>
            <th style={styles.thStyle}>Result</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>Self-contained</td>
            <td style={styles.tdStyle}>Each component owns its styles - no external style dependency</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>No abstraction</td>
            <td style={styles.tdStyle}>No <code style={styles.codeSmStyle}>theme.components.button.primary.base</code> chains to chase</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>Simple override</td>
            <td style={styles.tdStyle}>Pass <code style={styles.codeSmStyle}>colors</code> prop to customize color - all structural styles stay the same</td>
          </tr>
        </tbody>
      </table>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: useThemeMode + Custom themes
// ═══════════════════════════════════════════════════════════════════════════════

function UseThemeModeDocSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="useThemeMode hook">
      <p style={styles.textStyle}>
        The primary hook for theme access. Returns the current mode, color tokens,
        and functions to change the theme.
      </p>
      <CodeBlock title="Signature" code={`const { mode, colors, setMode, toggleMode } = useThemeMode();

// mode:       'dark' | 'light'
// colors:     ThemeColors (has bgPage, textPrimary, accentBlue, etc.)
// setMode(m): Set theme mode, persists to sessionStorage + dispatches event
// toggleMode(): Swap dark ↔ light`} />
      <CodeBlock title="Basic usage" code={`import { useThemeMode } from './logto-kit';

function ThemeToggle() {
  const { mode, colors, toggleMode } = useThemeMode();

  return (
    <div style={{ background: colors.bgPage, color: colors.textPrimary }}>
      <p>Current mode: {mode}</p>
      <button onClick={toggleMode}>
        Switch to {mode === 'dark' ? 'light' : 'dark'}
      </button>
    </div>
  );
}`} />
      <CodeBlock title="DARK_COLORS / LIGHT_COLORS constants" code={`import { DARK_COLORS, LIGHT_COLORS, getDefaultThemeMode } from './logto-kit';

// Static color constants (keep in sync with CSS files):
// DARK_COLORS.accentBlue  → '#3b82f6'
// LIGHT_COLORS.accentBlue → '#2563eb'

// Default mode from ENV (default: 'dark'):
const defaultMode = getDefaultThemeMode(); // reads DEFAULT_THEME_MODE env`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Also via useLogto():</strong>{' '}
        <code style={styles.codeStyle}>useLogto()</code> also exposes{' '}
        <code style={styles.codeSmStyle}>mode</code>, <code style={styles.codeSmStyle}>colors</code>,{' '}
        <code style={styles.codeSmStyle}>setMode</code>, and <code style={styles.codeSmStyle}>toggleMode</code>.
      </div>
    </SectionWrap>
  );
}

function NoTkSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="tk() helper removed">
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>tk()</code> helper (and <code style={styles.codeStyle}>adj()</code>/{' '}
        <code style={styles.codeStyle}>alpha()</code> utilities) have been <strong>removed</strong>.
        Components access colors directly from the <code style={styles.codeStyle}>colors</code> object
        provided by <code style={styles.codeStyle}>useThemeMode()</code>.
      </p>
      <CodeBlock title="Before → After" code={`// OLD: tk() aliases
const t = tk(themeSpec);
<div style={{ background: t.bg, color: t.text }} />

// NEW: direct color access
const { colors } = useThemeMode();
<div style={{ background: colors.bgPrimary, color: colors.textPrimary }} />`} />
      <p style={styles.textStyle}>
        Use <code style={styles.codeStyle}>colors.textPrimary</code>,{' '}
        <code style={styles.codeStyle}>colors.bgSecondary</code>, etc. directly in your inline styles.
        For opacity adjustments, use CSS <code style={styles.codeStyle}>rgba()</code> or{' '}
        <code style={styles.codeStyle}>opacity</code> directly.
      </p>
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
        CSS variable values differ from <code style={styles.codeStyle}>ThemeColors</code> JS constants - 
        they serve different rendering contexts (scrollbar, selection styling vs. inline component styles).
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
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#050505</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f9fafb</code></td>
            <td style={styles.tdStyle}>Viewport background</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-primary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#0a0a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#ffffff</code></td>
            <td style={styles.tdStyle}>Primary surface</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-secondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#111111</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f3f4f6</code></td>
            <td style={styles.tdStyle}>Secondary surface</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-bg-tertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#1a1a1a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#e5e7eb</code></td>
            <td style={styles.tdStyle}>Tertiary / hover states</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-primary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#e5e7eb</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#111827</code></td>
            <td style={styles.tdStyle}>Primary text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-secondary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#9ca3af</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#374151</code></td>
            <td style={styles.tdStyle}>Secondary text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-text-tertiary</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#6b7280</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#6b7280</code></td>
            <td style={styles.tdStyle}>Muted text</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-border-color</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#1f2937</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d1d5db</code></td>
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
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#10b981</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#059669</code></td>
            <td style={styles.tdStyle}>Selection color (dark)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-accent-yellow</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#f59e0b</code></td>
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
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#3b82f6</code></td>
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
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#064e3b</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#d1fae5</code></td>
            <td style={styles.tdStyle}>Success status bg</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-error-bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#450a0a</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fee2e2</code></td>
            <td style={styles.tdStyle}>Error status bg</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>--ldd-warning-bg</td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#451a03</code></td>
            <td style={styles.tdStyle}><code style={styles.codeSmStyle}>#fef3c7</code></td>
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
        To customize the theme, copy <code style={styles.codeStyle}>themes/default/dark.css</code> and{' '}
        <code style={styles.codeStyle}>themes/default/light.css</code> to a new folder.
        Customize the hex values in those CSS files. There is no JS registration - 
        the CSS files are loaded globally and applied via the <code style={styles.codeStyle}>data-theme</code> attribute.
      </p>
      <CodeBlock title="Step 1: Copy and customize CSS files" code={`# themes/mytheme/dark.css
:root[data-theme="dark"] {
  --ldd-bg-page: #000000;
  --ldd-accent-blue: #8b5cf6;
  /* ... override other --ldd-* variables */
}

# themes/mytheme/light.css
:root[data-theme="light"] {
  --ldd-bg-page: #ffffff;
  --ldd-accent-blue: #7c3aed;
  /* ... override other --ldd-* variables */
}`} />
      <CodeBlock title="Step 2: Update ThemeColors constants (optional)" code={`// Only needed if you want inline React styles to match.
// In a custom colors file, export your own constants:
export const MY_DARK_COLORS: ThemeColors = {
  ...DARK_COLORS,
  accentBlue: '#8b5cf6',
  // ... override other tokens
};

export const MY_LIGHT_COLORS: ThemeColors = {
  ...LIGHT_COLORS,
  accentBlue: '#7c3aed',
  // ... override other tokens
};`} />
      <CodeBlock title="Step 3: Load your CSS files" code={`/* app/globals.css */
@import './logto-kit/themes/mytheme/dark.css';
@import './logto-kit/themes/mytheme/light.css';`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        Update <code style={styles.codeStyle}>app/globals.css</code> to point to your theme folder.
        There is no automatic THEME-based switching - the import paths are explicit.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ThemesDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview + Color tokens (two-column) */}
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

      {/* Page 2: CSS variables + Hardcoded design values (two-column) */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <CssVariablesSection />
          </div>
          <div style={styles.colLeftStyle}>
            <HardcodedDesignSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Inlined styles + No tk() (two-column) */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <InlinedStylesSection />
          </div>
          <div style={styles.colLeftStyle}>
            <NoTkSection />
          </div>
        </div>
      </Section>

      {/* Page 4: useThemeMode + Custom themes (two-column) */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <UseThemeModeDocSection />
          </div>
          <div style={styles.colLeftStyle}>
            <CustomThemeSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
