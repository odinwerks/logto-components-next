'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function CalculatorOverviewDoc() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Case Study Overview">
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
      </SectionWrap>

      <SectionWrap label="Primary Architecture Files">
        <p style={styles.textStyle}>
          The implementation spans across the following core files in the repository:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '40%' }}>File Path</th>
              <th style={{ ...styles.thStyle, width: '60%' }}>Purpose and Responsibility</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPathStyle}>app/demo/content/calculator/live-calculator.tsx</td>
              <td style={styles.tdStyle}>
                Interactive calculator interface component. It parses mathematical expressions and dispatches them to secure server-side routes.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>app/api/protected/route.ts</td>
              <td style={styles.tdStyle}>
                The server-side endpoint handling calculations. It validates the user session, organization identity, and permissions.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPathStyle}>logto-kit/action-registry/calc-actions.ts</td>
              <td style={styles.tdStyle}>
                Safe action registry mapping math operations to specific roles, permissions, and organization checks.
              </td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>
    </div>
  );
}
