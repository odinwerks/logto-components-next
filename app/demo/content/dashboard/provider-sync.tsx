'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function DashboardProviderSync() {
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
      <h2 id={slugify("Provider sync - Dashboard to External")} style={{ ...h2Style, marginTop: 0 }}>
        Provider sync - Dashboard to External
      </h2>

      <p style={styles.textStyle}>
        The Dashboard creates <strong>isolated</strong> provider instances. External consumers (such as <code style={styles.codeStyle}>LogtoProvider</code>) run separate instances.
      </p>

      <p style={styles.textStyle}>
        While the kit is engineered to support isolated/multiple provider synchronization via custom window events and storage, the default starter-kit layout configuration simplifies this by mapping all components inside a single, unified root-level provider tree.
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

      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '40%' }}>Storage key</th>
            <th style={{ ...customThStyle, width: '60%' }}>Dispatched by</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>theme-mode</td>
            <td style={customTdStyle}><code style={styles.codeSmStyle}>setMode()</code></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>lang-mode</td>
            <td style={customTdStyle}><code style={styles.codeSmStyle}>setLang()</code></td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>org-mode</td>
            <td style={customTdStyle}><code style={styles.codeSmStyle}>setAsOrg()</code></td>
          </tr>
        </tbody>
      </table>

      <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
        <strong style={styles.strongNoteStyle}>Event:</strong>{' '}
        All changes dispatch custom DOM events for cross-tab or cross-component synchronization:
        <code style={styles.codeSmStyle}>theme-changed</code> (for themes) and{' '}
        <code style={styles.codeSmStyle}>preferences-changed</code> (for language and organization selections).
      </div>
    </div>
  );
}
