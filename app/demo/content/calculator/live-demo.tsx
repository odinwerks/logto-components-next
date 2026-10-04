'use client';

import { useDocStyles } from '../../components/useDocStyles';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';
import LiveCalculator from './live-calculator';

export default function CalculatorLiveDemoDoc() {
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h2 id={slugify("Interactive Live Demonstration")} style={{ ...h2Style, marginTop: 0 }}>Interactive Live Demonstration</h2>
      <p style={styles.textStyle}>
        The interactive calculator below is embedded directly into the documentation. 
        Use this interface to observe the client UI gate and the executor&apos;s live role and permission checks.
      </p>
      <div style={{ padding: '8px 0' }}>
        <LiveCalculator />
      </div>

      <h2 id={slugify("How to Test and Verify Permissions")} style={h2Style}>How to Test and Verify Permissions</h2>
      <p style={styles.textStyle}>
        You can test and observe the changes in authorization by toggling the organization settings:
      </p>
      <ol style={{ ...styles.textStyle, marginLeft: '1.25rem', marginBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <li>
          <strong>Select Organization:</strong> Use the workspace selector in the Organizations tab to select the organization configured by the calculator actions. A different active organization does not change the server policy, and the session adapter rejects the mismatch.
        </li>
        <li>
          <strong>Observe Live RBAC:</strong> The executor loads the user&apos;s current roles and permissions for the configured organization on each protected operation.
        </li>
        <li>
          <strong>Observe Interface Changes:</strong> The client can enable or disable keypad controls from displayed permission data. This is a usability gate, not server authorization.
        </li>
        <li>
          <strong>Server Enforcement:</strong> The route authenticates the request, then the executor independently checks live RBAC before it invokes the operation handler.
        </li>
      </ol>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Test Scenarios:</strong> Use an account with basic math permissions to check the scientific controls. Then submit a protected operation and confirm that the server applies the current action policy even if you bypass the UI gate.
      </div>
    </div>
  );
}
