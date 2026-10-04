'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function CalculatorApiAuthorizationDoc() {
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
      <h2 id={slugify("Session Transport and Executor")} style={{ ...h2Style, marginTop: 0 }}>Session Transport and Executor</h2>
      <p style={styles.textStyle}>
        The calculator sends each operation to <code style={styles.codeSmStyle}>POST /api/protected</code>.
        The session route is a transport adapter, not the role-and-permission implementation. It checks the request origin, retrieves and introspects the session token, applies route-side limits, and validates the selected organization for the registered action before it calls the shared executor.
      </p>
      <CodeBlock
        title="Calculator request and response envelope"
        code={`const response = await fetch('/api/protected', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  // The browser sends its same-origin session cookie automatically.
  body: JSON.stringify({ action: 'calc/add', payload: { a: 10, b: 20 } }),
});

// Success: { error: null, data: { answer: 30 } }
// Denial:  { error: 'PERMISSION_DENIED', data: null }
const result = await response.json();`}
      />
      <p style={styles.textStyle}>
        The browser sends only <code style={styles.codeSmStyle}>action</code> and <code style={styles.codeSmStyle}>payload</code>.
        It does not send a token, principal, organization, role, or permission context.
      </p>

      <h2 id={slugify("Credential-Free Executor")} style={h2Style}>Credential-Free Executor</h2>
      <p style={styles.textStyle}>
        After authentication, the route passes a server-derived principal to <code style={styles.codeSmStyle}>executeProtectedAction()</code>.
        The executor receives no credentials. It validates the registered action and its <code style={styles.codeSmStyle}>credentialModes</code>, then applies live organization RBAC through <code style={styles.codeSmStyle}>fetchOrgRolePermissions()</code> before invoking the handler.
      </p>
      <CodeBlock
        title="Executor contract"
        code={`const result = await executeProtectedAction({
  action,
  payload,
  context: { principal: { sub: authenticatedSubject, mode: 'session' } },
});

return NextResponse.json(
  result.ok
    ? { error: null, data: result.data }
    : { error: result.error, data: null },
  { status: result.ok ? 200 : result.status },
);`}
      />
      <p style={styles.textStyle}>
        Action policy controls which authenticated modes can execute an operation. <code style={styles.codeSmStyle}>credentialModes</code> defaults to <code style={styles.codeSmStyle}>[&apos;session&apos;]</code>.
        <code style={styles.codeSmStyle}>permissionBinding</code> defaults to <code style={styles.codeSmStyle}>union</code>, which accepts a permission on any assigned role; <code style={styles.codeSmStyle}>required-role</code> binds permissions to the required role.
      </p>

      <h2 id={slugify("Session Route Limits")} style={h2Style}>Session Route Limits</h2>
      <p style={styles.textStyle}>
        The calculator uses only the browser session adapter at <code style={styles.codeSmStyle}>POST /api/protected</code>.
        The adapter checks the session cookie and same-origin CSRF policy before it calls the executor.
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>The session adapter applies the shared per-user limit of 60 requests per 60-second window and returns <code style={styles.codeSmStyle}>Retry-After</code> when the limit is reached.</li>
        <li>The adapter caps the request body at 1 MiB before JSON parsing.</li>
      </ul>

      <h2 id={slugify("API Error Codes Mapping")} style={h2Style}>API Error Codes Mapping</h2>
      <p style={styles.textStyle}>
        The adapters preserve HTTP status codes and return a fixed error code with <code style={styles.codeSmStyle}>data: null</code>.
        They do not return executor exceptions or upstream response details.
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '15%' }}>Status</th>
            <th style={{ ...customThStyle, width: '35%' }}>Error Code</th>
            <th style={{ ...customThStyle, width: '50%' }}>Description and Triggers</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>400</td>
            <td style={customTdPropStyle}>INVALID_PAYLOAD</td>
            <td style={customTdStyle}>
              The executor rejected an operation payload or handler input.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>401</td>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>
              The session adapter did not establish an active session.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={customTdStyle}>
              Live organization lookup did not establish membership for the required organization.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>ROLE_DENIED</td>
            <td style={customTdStyle}>
              The user does not hold the role required by the action policy.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>403</td>
            <td style={customTdPropStyle}>PERMISSION_DENIED</td>
            <td style={customTdStyle}>
              The live role permissions do not satisfy the action policy.
            </td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>404</td>
            <td style={customTdPropStyle}>NOT_FOUND</td>
            <td style={customTdStyle}>The action handler could not find the requested resource.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>413</td>
            <td style={customTdPropStyle}>PAYLOAD_TOO_LARGE</td>
            <td style={customTdStyle}>The route-side body limit is 1 MiB.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>429</td>
            <td style={customTdPropStyle}>RATE_LIMITED</td>
            <td style={customTdStyle}>The shared per-user request limit was reached. The response includes <code>Retry-After</code>.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>503</td>
            <td style={customTdPropStyle}>SERVICE_UNAVAILABLE</td>
            <td style={customTdStyle}>A required shared dependency could not provide service.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>500</td>
            <td style={customTdPropStyle}>INTERNAL_ERROR</td>
            <td style={customTdStyle}>
              An unexpected server or handler exception occurred during execution.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
