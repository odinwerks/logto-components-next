'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function CalculatorRbacDesignDoc() {
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
      <h2 id={slugify("Permission Scope Matrix")} style={{ ...h2Style, marginTop: 0 }}>Permission Scope Matrix</h2>
      <p style={styles.textStyle}>
        Access control is defined through a set of permission scopes mapped to roles within Logto. 
        The application evaluates these scopes during computation requests to determine if the operation is allowed.
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Scope / Permission</th>
            <th style={{ ...customThStyle, width: '70%' }}>Mathematical Capabilities and Operations</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>calc:basic</td>
            <td style={customTdStyle}>
              Grants access to basic mathematical operations (add, subtract, multiply, divide). 
              This scope is also required for the initial rendering of the calculator keypad.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>calc:scientific</td>
            <td style={customTdStyle}>
              Grants access to advanced scientific functions (sin, cos, tan, log, square root, etc.). 
              This scope is checked prior to evaluating trigonometric or logarithmic nodes.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Role-Assignment Mechanics")} style={h2Style}>Role-Assignment Mechanics</h2>
      <p style={styles.textStyle}>
        User access changes dynamically when switching organizations via the workspace selector in the UI. 
        The application state updates the active organization selection, changing the contextual customData state.
      </p>
      <p style={styles.textStyle}>
        When switching organizations, the client requests a new access token from Logto with scopes corresponding to the selected organization. 
        Both the frontend UI and the backend API then contextually evaluate permissions against the newly selected organization:
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>
          <strong>Token Scope Update:</strong> The active token scope changes to reflect the selected organization's context, including corresponding organizational roles and permissions.
        </li>
        <li>
          <strong>Frontend Adaptability:</strong> The client detects the change in active organization permissions and restricts or enables calculator buttons dynamically.
        </li>
        <li>
          <strong>Backend Verification:</strong> The server-side route handles incoming computation payloads and verifies the token claims against the specified organization ID.
        </li>
      </ul>
    </div>
  );
}
