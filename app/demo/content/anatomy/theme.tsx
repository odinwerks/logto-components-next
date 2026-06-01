'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function AnatomyThemeDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Color-Only Theme System">
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
      </SectionWrap>

      <SectionWrap label="Default Theme Token Constants">
        <p style={styles.textStyle}>
          The design system defines two static token maps (<code>DARK_COLORS</code> and <code>LIGHT_COLORS</code>) containing hex color definitions for each theme state:
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Token Name</th>
              <th style={styles.thStyle}>DARK_COLORS</th>
              <th style={styles.thStyle}>LIGHT_COLORS</th>
              <th style={styles.thStyle}>Core Application</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>bgPage</td>
              <td style={styles.tdStyle}><code>#050505</code></td>
              <td style={styles.tdStyle}><code>#f9fafb</code></td>
              <td style={styles.tdStyle}>Overall application viewport background.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>bgPrimary</td>
              <td style={styles.tdStyle}><code>#0a0a0a</code></td>
              <td style={styles.tdStyle}><code>#ffffff</code></td>
              <td style={styles.tdStyle}>Primary content surfaces and card backgrounds.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>bgSecondary</td>
              <td style={styles.tdStyle}><code>#111111</code></td>
              <td style={styles.tdStyle}><code>#f3f4f6</code></td>
              <td style={styles.tdStyle}>Secondary layout areas, panels, and code block headers.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>bgTertiary</td>
              <td style={styles.tdStyle}><code>#1a1a1a</code></td>
              <td style={styles.tdStyle}><code>#e5e7eb</code></td>
              <td style={styles.tdStyle}>Tertiary panels, divider lines, and hover surfaces.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>textPrimary</td>
              <td style={styles.tdStyle}><code>#e5e7eb</code></td>
              <td style={styles.tdStyle}><code>#111827</code></td>
              <td style={styles.tdStyle}>Standard readability level for primary text.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>textSecondary</td>
              <td style={styles.tdStyle}><code>#9ca3af</code></td>
              <td style={styles.tdStyle}><code>#374151</code></td>
              <td style={styles.tdStyle}>De-emphasized labels and metadata details.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>textTertiary</td>
              <td style={styles.tdStyle}><code>#6b7280</code></td>
              <td style={styles.tdStyle}><code>#6b7280</code></td>
              <td style={styles.tdStyle}>Highly muted placeholder or help text.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>borderColor</td>
              <td style={styles.tdStyle}><code>#1f2937</code></td>
              <td style={styles.tdStyle}><code>#d1d5db</code></td>
              <td style={styles.tdStyle}>Component boundaries, dividing lines, and outlines.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>accentGreen</td>
              <td style={styles.tdStyle}><code>#10b981</code></td>
              <td style={styles.tdStyle}><code>#059669</code></td>
              <td style={styles.tdStyle}>Positive indicators, checked states, and active items.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>accentRed</td>
              <td style={styles.tdStyle}><code>#ef4444</code></td>
              <td style={styles.tdStyle}><code>#dc2626</code></td>
              <td style={styles.tdStyle}>Negative actions, deletion triggers, and error messages.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>accentYellow</td>
              <td style={styles.tdStyle}><code>#f59e0b</code></td>
              <td style={styles.tdStyle}><code>#d97706</code></td>
              <td style={styles.tdStyle}>Warnings, pending setups, and configuration alerts.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>accentBlue</td>
              <td style={styles.tdStyle}><code>#3b82f6</code></td>
              <td style={styles.tdStyle}><code>#2563eb</code></td>
              <td style={styles.tdStyle}>Primary interaction actions, links, and selections.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>successBg</td>
              <td style={styles.tdStyle}><code>#064e3b</code></td>
              <td style={styles.tdStyle}><code>#d1fae5</code></td>
              <td style={styles.tdStyle}>Background highlights indicating success.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>errorBg</td>
              <td style={styles.tdStyle}><code>#450a0a</code></td>
              <td style={styles.tdStyle}><code>#fee2e2</code></td>
              <td style={styles.tdStyle}>Background highlights indicating failures.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>warningBg</td>
              <td style={styles.tdStyle}><code>#451a03</code></td>
              <td style={styles.tdStyle}><code>#fef3c7</code></td>
              <td style={styles.tdStyle}>Background highlights indicating attention requirements.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>contrastText</td>
              <td style={styles.tdStyle}><code>#fff</code></td>
              <td style={styles.tdStyle}><code>#fff</code></td>
              <td style={styles.tdStyle}>Readable text on accent backgrounds.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>fontWeight</td>
              <td style={styles.tdStyle}><code>400</code></td>
              <td style={styles.tdStyle}><code>500</code></td>
              <td style={styles.tdStyle}>Base typographic weight adjustment factor.</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Theme Resolution Priority and Overrides">
        <p style={styles.textStyle}>
          Theme state is determined on the client through a multi-step resolution pipeline inside the <code>useThemeMode</code> hook. The system checks data sources sequentially to resolve the active configuration:
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={styles.thStyle}>Resolution Order</th>
              <th style={styles.thStyle}>Data Source</th>
              <th style={styles.thStyle}>Mechanism</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>1. Active Session</td>
              <td style={styles.tdStyle}><code>sessionStorage</code></td>
              <td style={styles.tdStyle}>
                Checks the <code>theme-mode</code> key first. This allows tab isolation and preserves manual user selections across relative navigations.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>2. Configured Prop</td>
              <td style={styles.tdStyle}><code>initialTheme</code> prop</td>
              <td style={styles.tdStyle}>
                Uses the value supplied to <code>LogtoProvider</code> from server configuration or server-side parameters.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>3. Environment Setup</td>
              <td style={styles.tdStyle}><code>DEFAULT_THEME_MODE</code></td>
              <td style={styles.tdStyle}>
                Reads the build-time or run-time environment variable default parameter.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>4. Client Native</td>
              <td style={styles.tdStyle}>System Media Query</td>
              <td style={styles.tdStyle}>
                Evaluates browser system media preference queries (<code>prefers-color-scheme</code>). Falls back to <code>dark</code> if undefined.
              </td>
            </tr>
          </tbody>
        </table>

        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Cross-Tab Coordination:</strong> When <code>setMode()</code> is executed, the new state is stored in <code>sessionStorage</code> and a custom <code>theme-changed</code> DOM event is dispatched to the window object. This signals other client components in parallel tabs to re-read from storage and update their interfaces.
        </div>
      </SectionWrap>
    </div>
  );
}
