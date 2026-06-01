'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';

export default function CalculatorRbacDesignDoc() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Permission Scope Matrix">
        <p style={styles.textStyle}>
          Access control is defined through a set of permission scopes mapped to roles within Logto. 
          The application evaluates these scopes during computation requests to determine if the operation is allowed.
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Scope / Permission</th>
              <th style={{ ...styles.thStyle, width: '70%' }}>Mathematical Capabilities and Operations</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>calc:basic</td>
              <td style={styles.tdStyle}>
                Grants access to basic mathematical operations (add, subtract, multiply, divide). 
                This scope is also required for the initial rendering of the calculator keypad.
              </td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>calc:scientific</td>
              <td style={styles.tdStyle}>
                Grants access to advanced scientific functions (sin, cos, tan, log, square root, etc.). 
                This scope is checked prior to evaluating trigonometric or logarithmic nodes.
              </td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="Role-Assignment Mechanics">
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
      </SectionWrap>
    </div>
  );
}
