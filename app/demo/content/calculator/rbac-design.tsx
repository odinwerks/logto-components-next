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
        Each calculator action declares its organization, required role, and required permission in the action registry.
        The credential-free executor checks live organization assignments through <code style={styles.codeSmStyle}>fetchOrgRolePermissions()</code> before it calls a handler.
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
              Grants access to basic mathematical operations (add, subtract, multiply, divide, modulo, power). 
              The client uses this permission to decide whether to show basic controls. The executor checks the permission on every protected operation.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>calc:scientific</td>
            <td style={customTdStyle}>
              Grants access to advanced scientific functions (sin, cos, tan, asin, acos, atan, log, ln, log2, sqrt, abs, inv, exp10, exp, fact).
              The executor checks this permission before it runs trigonometric, logarithmic, exponential, or other advanced operations.
            </td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("Role-Assignment Mechanics")} style={h2Style}>Role-Assignment Mechanics</h2>
      <p style={styles.textStyle}>
        The action policy names the required organization and role. The executor uses the authenticated subject and action configuration to query current membership and permissions.
      </p>
      <p style={styles.textStyle}>
        The executor receives a server-derived principal with a context mode. It does not read a client-selected organization or accept client-supplied roles and permissions.
        Action metadata also declares allowed <code style={styles.codeSmStyle}>credentialModes</code> and a <code style={styles.codeSmStyle}>permissionBinding</code> rule:
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>
          <strong>Context Mode:</strong> <code style={styles.codeSmStyle}>credentialModes</code> controls which authenticated modes an action accepts. It defaults to <code style={styles.codeSmStyle}>session</code>.
        </li>
        <li>
          <strong>Permission Binding:</strong> <code style={styles.codeSmStyle}>union</code> accepts required permissions across the user&apos;s assigned roles. <code style={styles.codeSmStyle}>required-role</code> binds the permissions to the required role.
        </li>
        <li>
          <strong>Live Authorization:</strong> <code style={styles.codeSmStyle}>fetchOrgRolePermissions()</code> reads current organization roles and permissions. The executor returns a fixed denial code if policy checks fail.
        </li>
        <li>
          <strong>Client UI:</strong> <code style={styles.codeSmStyle}>&lt;Protected&gt;</code> and disabled keypad buttons improve the interface. They do not replace server authorization.
        </li>
      </ul>
    </div>
  );
}
