'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function CloneAndInstall() {
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

  const customTdPathStyle: React.CSSProperties = {
    ...customTdStyle,
    color: isDark ? '#9cdcdb' : '#0369a1',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Clone & Install")} style={{ ...h2Style, marginTop: 0 }}>Clone & Install</h2>
      
      <p style={styles.textStyle}>
        Under the assumption that your Logto instance is now up and running, we move to git cloning the components/quick start kit (<a href="https://github.com/odinwerks/logto-components-next" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>logto-components-next</a>). During development, use <code style={styles.codeSmStyle}>npm run dev</code>, and in production, use docker compose (an example compose should be included in the repo).
      </p>
      
      <CodeBlock title="Clone Repository" code={`git clone https://github.com/odinwerks/logto-components-next.git
cd logto-components-next`} />
      
      <CodeBlock title="Install Dependencies" code={`npm install`} />

      <h2 id={slugify("Project Anatomy")} style={h2Style}>Project Anatomy</h2>
      
      <p style={styles.textStyle}>
        The codebase is partitioned into distinct layers to separate reusable SDK abstractions from the visual showcase application:
      </p>
      
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Directory</th>
            <th style={{ ...customThStyle, width: '70%' }}>Description & Developer Policy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPathStyle}>app/logto-kit/</td>
            <td style={customTdStyle}>
              <strong>Core Abstraction Layer (Do Not Modify):</strong> Contains the core components, SDK wrapper, token management, middleware proxy, hooks, and types. This remains isolated so you can easily pull upstream updates.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>app/demo/</td>
            <td style={customTdStyle}>
              <strong>Showcase & Content (Replace/Delete):</strong> Contains the dynamic documentation, layout, and specific demo components like the live calculator. This is the code you will replace with your own application components.
            </td>
          </tr>
          <tr>
            <td style={customTdPathStyle}>app/(docs)/</td>
            <td style={customTdStyle}>
              <strong>Documentation Route:</strong> Handles rendering of these documentation pages. Can be entirely removed when you deploy your own product.
            </td>
          </tr>
        </tbody>
      </table>
      
      <div style={{ ...styles.noteStyle, marginTop: '16px' }}>
        <strong style={styles.strongNoteStyle}>Pro-tip:</strong> Check the <code style={styles.codeSmStyle}>package.json</code> file to inspect the dependency stack. The project runs on standard Next.js and uses official Logto client SDKs under the hood.
      </div>
    </div>
  );
}
