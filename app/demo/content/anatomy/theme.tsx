'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { slugify } from '../../components/SectionComponents';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';

export default function AnatomyThemeDoc() {
  const styles = useDocStyles();
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  const h2Style: React.CSSProperties = {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: isDark ? '#f3f4f6' : '#111827',
    marginTop: '32px',
    marginBottom: '16px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
    paddingBottom: '8px',
  };

  const customTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.8rem',
    marginBottom: '20px',
    marginTop: '12px',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
  };

  const customThStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: `2px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1'}`,
    background: isDark ? 'rgba(255,255,255,0.02)' : '#f8fafc',
    color: isDark ? 'rgba(255,255,255,0.6)' : '#475569',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const customTdStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9'}`,
    color: isDark ? 'rgba(255,255,255,0.55)' : '#334155',
    verticalAlign: 'top',
    lineHeight: '1.5',
  };

  const customTdPropStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Color-Only Theme System")} style={{ ...h2Style, marginTop: 0 }}>
        Color-Only Theme System
      </h2>
      <p style={styles.textStyle}>
        The design system uses a strict color-only theme mechanism. Color parameters are configured through CSS custom properties (variables) that are mapped directly to JS-accessible parameters. All layout structure, typography sizing, margins, and border radii remain constant between themes to maintain layout consistency.
      </p>
      <p style={styles.textStyle}>
        Theme transitions are managed by applying a <code>data-theme</code> attribute on the document root (<code>&lt;html&gt;</code> element). This attribute selects the appropriate CSS rules loaded from <code>dark.css</code> or <code>light.css</code>. Component styles read these values inline via the <code>colors</code> object supplied by the theme hook.
      </p>

      <CodeBlock
        title="Component Theme Integration"
        code={`const { colors } = useThemeMode();

const elementStyle: React.CSSProperties = {
  background: colors.bgPrimary,
  color: colors.textPrimary,
  border: \`1px solid \${colors.borderColor}\`,
  borderRadius: '0.375rem',
  padding: '0.5rem 1rem',
};`}
      />

      <h2 id={slugify("Default Theme Token Constants")} style={h2Style}>
        Default Theme Token Constants
      </h2>
      <p style={styles.textStyle}>
        The design system defines two static token maps (<code>DARK_COLORS</code> and <code>LIGHT_COLORS</code>) containing hex color definitions for each theme state:
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Token Name</th>
            <th style={customThStyle}>DARK_COLORS</th>
            <th style={customThStyle}>LIGHT_COLORS</th>
            <th style={customThStyle}>Core Application</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>bgPage</td>
            <td style={customTdStyle}><code>#050505</code></td>
            <td style={customTdStyle}><code>#f9fafb</code></td>
            <td style={customTdStyle}>Overall application viewport background.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>bgPrimary</td>
            <td style={customTdStyle}><code>#0a0a0a</code></td>
            <td style={customTdStyle}><code>#ffffff</code></td>
            <td style={customTdStyle}>Primary content surfaces and card backgrounds.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>bgSecondary</td>
            <td style={customTdStyle}><code>#111111</code></td>
            <td style={customTdStyle}><code>#f3f4f6</code></td>
            <td style={customTdStyle}>Secondary layout areas, panels, and code block headers.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>bgTertiary</td>
            <td style={customTdStyle}><code>#1a1a1a</code></td>
            <td style={customTdStyle}><code>#e5e7eb</code></td>
            <td style={customTdStyle}>Tertiary panels, divider lines, and hover surfaces.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>textPrimary</td>
            <td style={customTdStyle}><code>#e5e7eb</code></td>
            <td style={customTdStyle}><code>#111827</code></td>
            <td style={customTdStyle}>Standard readability level for primary text.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>textSecondary</td>
            <td style={customTdStyle}><code>#9ca3af</code></td>
            <td style={customTdStyle}><code>#374151</code></td>
            <td style={customTdStyle}>De-emphasized labels and metadata details.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>textTertiary</td>
            <td style={customTdStyle}><code>#6b7280</code></td>
            <td style={customTdStyle}><code>#6b7280</code></td>
            <td style={customTdStyle}>Highly muted placeholder or help text.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>borderColor</td>
            <td style={customTdStyle}><code>#1f2937</code></td>
            <td style={customTdStyle}><code>#d1d5db</code></td>
            <td style={customTdStyle}>Component boundaries, dividing lines, and outlines.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>accentGreen</td>
            <td style={customTdStyle}><code>#10b981</code></td>
            <td style={customTdStyle}><code>#059669</code></td>
            <td style={customTdStyle}>Positive indicators, checked states, and active items.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>accentRed</td>
            <td style={customTdStyle}><code>#ef4444</code></td>
            <td style={customTdStyle}><code>#dc2626</code></td>
            <td style={customTdStyle}>Negative actions, deletion triggers, and error messages.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>accentYellow</td>
            <td style={customTdStyle}><code>#f59e0b</code></td>
            <td style={customTdStyle}><code>#d97706</code></td>
            <td style={customTdStyle}>Warnings, pending setups, and configuration alerts.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>accentBlue</td>
            <td style={customTdStyle}><code>#3b82f6</code></td>
            <td style={customTdStyle}><code>#2563eb</code></td>
            <td style={customTdStyle}>Primary interaction actions, links, and selections.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>successBg</td>
            <td style={customTdStyle}><code>#064e3b</code></td>
            <td style={customTdStyle}><code>#d1fae5</code></td>
            <td style={customTdStyle}>Background highlights indicating success.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>errorBg</td>
            <td style={customTdStyle}><code>#450a0a</code></td>
            <td style={customTdStyle}><code>#fee2e2</code></td>
            <td style={customTdStyle}>Background highlights indicating failures.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>warningBg</td>
            <td style={customTdStyle}><code>#451a03</code></td>
            <td style={customTdStyle}><code>#fef3c7</code></td>
            <td style={customTdStyle}>Background highlights indicating attention requirements.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>contrastText</td>
            <td style={customTdStyle}><code>#fff</code></td>
            <td style={customTdStyle}><code>#fff</code></td>
            <td style={customTdStyle}>Readable text on accent backgrounds.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>fontWeight</td>
            <td style={customTdStyle}><code>400</code></td>
            <td style={customTdStyle}><code>500</code></td>
            <td style={customTdStyle}>Base typographic weight adjustment factor.</td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Theme Resolution Priority and Overrides")} style={h2Style}>
        Theme Resolution Priority and Overrides
      </h2>
      <p style={styles.textStyle}>
        Theme state is determined on the client through a multi-step resolution pipeline inside the <code>useThemeMode</code> hook. The system checks data sources sequentially to resolve the active configuration:
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={customThStyle}>Resolution Order</th>
            <th style={customThStyle}>Data Source</th>
            <th style={customThStyle}>Mechanism</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>1. Active Session</td>
            <td style={customTdStyle}><code>sessionStorage</code></td>
            <td style={customTdStyle}>
              Checks the <code>theme-mode</code> key first. This allows tab isolation and preserves manual user selections across relative navigations.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>2. Configured Prop</td>
            <td style={customTdStyle}><code>initialTheme</code> prop</td>
            <td style={customTdStyle}>
              Uses the value supplied to <code>LogtoProvider</code> from server configuration or server-side parameters.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>3. Environment Setup</td>
            <td style={customTdStyle}><code>DEFAULT_THEME_MODE</code></td>
            <td style={customTdStyle}>
              Reads the build-time or run-time environment variable default parameter.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>4. Client Native</td>
            <td style={customTdStyle}>System Media Query</td>
            <td style={customTdStyle}>
              Evaluates browser system media preference queries (<code>prefers-color-scheme</code>). Falls back to <code>dark</code> if undefined.
            </td>
          </tr>
        </tbody>
      </table>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Component-Level Coordination:</strong> When <code>setMode()</code> is executed, the new state is stored in <code>sessionStorage</code> and a custom <code>theme-changed</code> DOM event is dispatched to the window object. This signals other client components in the same window/tab to re-read from storage and update their interfaces in parallel. (Note: Because sessionStorage and custom window events are isolated per tab, instant cross-tab propagation does not occur natively via window events).
      </div>
    </div>
  );
}