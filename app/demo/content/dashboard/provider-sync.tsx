'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function DashboardProviderSync() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Provider sync - Dashboard to External">
        <p style={styles.textStyle}>
          The Dashboard creates <strong>isolated</strong> provider instances. External consumers (such as <code style={styles.codeStyle}>LogtoProvider</code>) run separate instances.
        </p>

        <CodeBlock
          title="Two separate provider trees"
          code={`// Dashboard (Server Component)
//   └─ UserDataProvider (INSTANCE B)
//   └─ PreferencesProvider (INSTANCE B)

// Your app (LogtoProvider)  
//   └─ PreferencesProvider (INSTANCE A)
//   └─ UserDataProvider (INSTANCE A)`}
        />

        <p style={styles.textStyle}>
          Synchronization uses <code style={styles.codeStyle}>sessionStorage</code> and a unified event dispatcher:
        </p>

        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '40%' }}>Storage key</th>
              <th style={{ ...styles.thStyle, width: '60%' }}>Dispatched by</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>theme-mode</td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setMode()</code></td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>lang-mode</td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setLang()</code></td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>org-mode</td>
              <td style={styles.tdStyle}><code style={styles.codeSmStyle}>setAsOrg()</code></td>
            </tr>
          </tbody>
        </table>

        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Event:</strong>{' '}
          All changes dispatch custom DOM events for cross-tab or cross-component synchronization:
          <code style={styles.codeSmStyle}>theme-changed</code> (for themes) and{' '}
          <code style={styles.codeSmStyle}>preferences-changed</code> (for language and organization selections).
        </div>
      </SectionWrap>
    </div>
  );
}
