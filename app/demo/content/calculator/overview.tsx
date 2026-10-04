'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function CalculatorOverviewDoc() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Case Study Overview")} style={{ ...h2Style, marginTop: 0 }}>Case Study Overview</h2>
      
      <p style={styles.textStyle}>
        This case study demonstrates server-side authorization through a credential-free protected-action executor.
        Session and automation adapters authenticate requests, then pass a server-derived principal to the executor.
      </p>
      <p style={styles.textStyle}>
        Mathematical operations are split into basic and scientific permission tiers:
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>
          <strong>Basic Tier:</strong> Grants access to fundamental operations (addition, subtraction, multiplication, division, modulo, and power).
        </li>
        <li>
          <strong>Scientific Tier:</strong> Grants access to advanced operations (sin, cos, tan, asin, acos, atan, log, ln, log2, sqrt, abs, inv, exp10, exp, factorials).
        </li>
      </ul>

      <h2 id={slugify("Primary Architecture Files")} style={h2Style}>Primary Architecture Files</h2>
      
      <p style={styles.textStyle}>
        The implementation spans across the following core files in the repository:
      </p>
      
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '40%' }}>File Path</th>
            <th style={{ ...customThStyle, width: '60%' }}>Purpose and Responsibility</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>app/demo/components/calculator/CalculatorPanel.tsx</td>
            <td style={customTdStyle}>
              Client-side UI gate. The <code>&lt;Protected&gt;</code> wrapper hides the calculator when its display permission is absent, but it does not authorize API requests.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/demo/components/calculator/CalculatorClient.tsx</td>
            <td style={customTdStyle}>
              Client-side AST parser, expression evaluator, and keypad UI. Sends only the action name and operation payload to the session endpoint.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/api/protected/route.ts</td>
            <td style={customTdStyle}>
              Session transport adapter. It checks same-origin requests, authenticates the session, applies route-side request limits, and serializes the executor result as <code>{'{ error, data }'}</code>.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/api/protected/automation/route.ts</td>
            <td style={customTdStyle}>
              Separate automation transport adapter. It validates the configured CORS origin and bearer token before calling the shared executor.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/logto-kit/action-registry/execute.ts</td>
            <td style={customTdStyle}>
              Credential-free action executor. It validates action policy, performs live organization RBAC through <code>fetchOrgRolePermissions()</code>, and invokes the handler.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/logto-kit/action-registry/calc-actions.ts</td>
            <td style={customTdStyle}>
              Calculator action handlers and policy metadata for organization, role, permissions, allowed credential modes, and permission binding.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
