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
        This case study demonstrates an organization-scoped permissions implementation. 
        The application uses Logto to restrict execution of operations based on organization membership, roles, and fine-grained permissions.
      </p>
      <p style={styles.textStyle}>
        Mathematical operations are split into basic and scientific permission tiers:
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>
          <strong>Basic Tier:</strong> Grants access to fundamental operations (addition, subtraction, multiplication, and division).
        </li>
        <li>
          <strong>Scientific Tier:</strong> Grants access to advanced operations (trigonometric calculations, logarithms, square roots, and factorials).
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
            <td style={customTdPropStyle}>app/demo/content/calculator/live-calculator.tsx</td>
            <td style={customTdStyle}>
              Interactive calculator interface component. It parses mathematical expressions and dispatches them to secure server-side routes.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>app/api/protected/route.ts</td>
            <td style={customTdStyle}>
              The server-side endpoint handling calculations. It validates the user session, organization identity, and permissions.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>logto-kit/action-registry/calc-actions.ts</td>
            <td style={customTdStyle}>
              Safe action registry mapping math operations to specific roles, permissions, and organization checks.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
