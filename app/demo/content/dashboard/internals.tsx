'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DashboardInternals() {
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
      <h2 id={slugify("How the Dashboard works")} style={{ ...h2Style, marginTop: 0 }}>
        How the Dashboard works
      </h2>

      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>Dashboard</code> is an asynchronous <strong>Server Component</strong> that fetches user data server-side and renders <code style={styles.codeStyle}>DashboardClient</code> directly with props. The provider tree wrapping (which hydrates the context) is handled at the root layout level (<code style={styles.codeStyle}>app/(docs)/layout.tsx</code>) by the client-side <code style={styles.codeStyle}>LogtoProvider</code>.
      </p>

      <CodeBlock
        title="Rendering pipeline"
        code={`// 1. Layout level (app/(docs)/layout.tsx)
const result = await fetchDashboardData();

return (
  <LogtoProvider
    userData={result.userData}
    dashboard={{ desktop: <Dashboard />, mobile: <MobileDashboard /> }}
    ...
  >
    {children}
  </LogtoProvider>
);

// 2. Dashboard Server Component (app/logto-kit/components/dashboard/index.tsx)
const result = await fetchDashboardData();
return (
  <DashboardClient
    initialData={{ userData: result.userData }}
    ...
  />
);`}
      />

      <p style={styles.textStyle}>
        Hooks consumed by <code style={styles.codeStyle}>DashboardClient</code>:
      </p>

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '40%' }}>Hook</th>
            <th style={{ ...customThStyle, width: '60%' }}>Returns</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>useThemeMode()</td>
            <td style={customTdStyle}>mode, colors, setMode, toggleMode</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>useLangMode()</td>
            <td style={customTdStyle}>lang, setLang</td>
          </tr>
        </tbody>
      </table>

      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Note:</strong>{' '}
        <code style={styles.codeStyle}>useOrgMode()</code> (returns asOrg, setAsOrg) is consumed by{' '}
        <code style={styles.codeStyle}>OrganizationsTab</code>, not <code style={styles.codeStyle}>DashboardClient</code>.
      </div>

      <p style={{ ...styles.textStyle, marginBottom: 0 }}>
        Mutations call <code style={styles.codeStyle}>router.refresh()</code> to re-run the server component pipeline for fresh data.
      </p>
    </div>
  );
}
