'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function CloneAndInstall() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Clone & Install">
        <p style={styles.textStyle}>
          Under the assumption that your Logto instance is now up and running, we move to git cloning the components/quick start kit (<a href="https://github.com/odinwerks/logto-components-next" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>logto-components-next</a>). During development, use <code style={styles.codeSmStyle}>npm run dev</code>, and in production, use docker compose (an example compose should be included in the repo).
        </p>
        <CodeBlock title="Clone Repository" code={`git clone https://github.com/odinwerks/logto-components-next.git
cd logto-components-next`} />
        <CodeBlock title="Install Dependencies" code={`npm install`} />
      </SectionWrap>

      <SectionWrap label="Project Anatomy">
        <p style={styles.textStyle}>
          The codebase is partitioned into distinct layers to separate reusable SDK abstractions from the visual showcase application:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Directory</th>
              <th style={{ ...styles.thStyle, width: '70%' }}>Description & Developer Policy</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>app/logto-kit/</td>
              <td style={styles.tdStyle}>
                <strong>Core Abstraction Layer (Do Not Modify):</strong> Contains the core components, SDK wrapper, token management, middleware proxy, hooks, and types. This remains isolated so you can easily pull upstream updates.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>app/demo/</td>
              <td style={styles.tdStyle}>
                <strong>Showcase & Content (Replace/Delete):</strong> Contains the dynamic documentation, layout, and specific demo components like the live calculator. This is the code you will replace with your own application components.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>app/(docs)/</td>
              <td style={styles.tdStyle}>
                <strong>Documentation Route:</strong> Handles rendering of these documentation pages. Can be entirely removed when you deploy your own product.
              </td>
            </tr>
          </tbody>
        </table>
        <div style={{ ...styles.noteStyle, marginBottom: 0 }}>
          <strong style={styles.strongNoteStyle}>Pro-tip:</strong> Check the <code style={styles.codeSmStyle}>package.json</code> file to inspect the dependency stack. The project runs on standard Next.js and uses official Logto client SDKs under the hood.
        </div>
      </SectionWrap>
    </div>
  );
}
