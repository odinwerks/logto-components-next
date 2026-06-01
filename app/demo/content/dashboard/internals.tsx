'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function DashboardInternals() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="How the Dashboard works">
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

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '40%' }}>Hook</th>
              <th style={{ ...styles.thStyle, width: '60%' }}>Returns</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>useThemeMode()</td>
              <td style={styles.tdStyle}>mode, colors, setMode, toggleMode</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>useLangMode()</td>
              <td style={styles.tdStyle}>lang, setLang</td>
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
      </SectionWrap>
    </div>
  );
}
