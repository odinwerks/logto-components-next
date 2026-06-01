'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { SectionWrap } from '../../components/SectionComponents';
import LiveCalculator from './live-calculator';

export default function CalculatorLiveDemoDoc() {
  const styles = useDocStyles();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Interactive Live Demonstration">
        <p style={styles.textStyle}>
          The interactive calculator below is embedded directly into the documentation. 
          Use this interface to observe role-based access control and organizational boundaries in real time.
        </p>
        <div style={{ padding: '8px 0' }}>
          <LiveCalculator />
        </div>
      </SectionWrap>

      <SectionWrap label="How to Test and Verify Permissions">
        <p style={styles.textStyle}>
          You can test and observe the changes in authorization by toggling the organization settings:
        </p>
        <ol style={{ ...styles.textStyle, marginLeft: '1.25rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>Switch Organization:</strong> Use the workspace selector in the sidebar to change your active organization context.
          </li>
          <li>
            <strong>Observe Role and Scope Mapping:</strong> Switching the organization changes your current user's role and permission mapping in Logto.
          </li>
          <li>
            <strong>Observe Interface Changes:</strong> The client application detects scope changes, dynamically enabling or disabling buttons on the calculator keypad in real time.
          </li>
          <li>
            <strong>Backend Enforcement:</strong> If you try to execute a function without the correct permission, the server endpoint refuses to compute, returning an error response.
          </li>
        </ol>
        <div style={styles.noteStyle}>
          <strong style={styles.strongNoteStyle}>Test Scenarios:</strong> Switch to an organization where you only have basic math permissions to verify that scientific buttons are disabled or reject computations. Switch to an organization with scientific permissions to permit the complete set of trigonometric and logarithmic functions.
        </div>
      </SectionWrap>
    </div>
  );
}
