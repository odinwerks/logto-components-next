'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { useThemeMode } from '../../../logto-kit/components/providers/preferences';
import { slugify } from '../../components/SectionComponents';

export default function ApiProtectedDoc() {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 id={slugify("Server-Side Security Boundary")} style={{ ...h2Style, marginTop: 0 }}>
        Server-Side Security Boundary
      </h2>
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>POST /api/protected</code> route is the browser session transport adapter. It checks same-origin requests, authenticates the session cookie, applies route-side limits, and passes a server-derived principal to <code style={styles.codeStyle}>executeProtectedAction()</code>.
      </p>
      <div style={styles.warningBannerStyle}>
        <strong style={styles.warningBannerStrongStyle}>Security Requirement:</strong> Client-side gates improve the interface but do not authorize requests. The executor validates the action policy and performs live RBAC for every operation.
      </div>
      <CodeBlock
        title="Session Adapter Request and Response"
        code={`// Example of calling the protected API from a client component
const response = await fetch('/api/protected', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  // The same-origin browser request sends the session cookie automatically.
  // The body carries no token, principal, organization, role, or permission.
  body: JSON.stringify({
    action: 'calc/add', // Name of the registered action
    payload: { a: 10, b: 20 },
  })
});

const result = await response.json();
if (result.error) {
  handleApiError(result.error); // Handle a fixed sanitized code
} else {
  renderData(result.data); // Process the successful result
}`}
      />

      <h2 id={slugify("External Automation Endpoint")} style={h2Style}>
        External Automation Endpoint
      </h2>
      <p style={styles.textStyle}>
        <code style={styles.codeStyle}>POST /api/protected</code> remains the session-cookie endpoint with same-origin CSRF protection. External automation uses the separate <code style={styles.codeStyle}>POST /api/protected/automation</code> adapter with a verified API-resource bearer token. A raw <code style={styles.codeStyle}>pat_...</code> value is not accepted as a bearer token.
      </p>
      <CodeBlock
        title="PAT exchange, then automation request"
        code={`// First exchange the PAT at Logto's /oidc/token endpoint.
// Request resource=PROTECTED_API_RESOURCE and keep the PAT server-side.
const accessToken = await exchangePatAtLogtoTokenEndpoint();

const response = await fetch('/api/protected/automation', {
  method: 'POST',
  headers: {
    Authorization: \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'calc/add', payload: { a: 10, b: 20 } }),
});`}
      />
      <p style={styles.textStyle}>
        The automation adapter verifies the API-resource audience, then passes an <code style={styles.codeStyle}>external</code> principal to the same executor. An action must allow <code style={styles.codeStyle}>external</code> in <code style={styles.codeStyle}>credentialModes</code> before this transport can invoke it. Configure <code style={styles.codeStyle}>PROTECTED_AUTOMATION_ALLOWED_ORIGINS</code> with the intended origin or origins. Prefer the exact OPNform origin, such as <code style={styles.codeStyle}>https://&lt;opnform-origin&gt;</code>, in production. CORS controls browser access and is not authentication.
      </p>

      <h2 id={slugify("Adapter Checks and Live RBAC")} style={h2Style}>
        Adapter Checks and Live RBAC
      </h2>
      <p style={styles.textStyle}>
        Each transport adapter authenticates its own credential before it calls the executor. The executor receives a credential-free context with only the server-derived subject and mode.
      </p>
      <p style={styles.textStyle}>
        1. **Session Adapter:** The route checks same-origin policy, retrieves and introspects the session, validates its application audience, applies the shared request limit, caps the parsed body at 1 MiB, and checks the selected organization for the registered action.
      </p>
      <p style={styles.textStyle}>
        2. **Automation Adapter:** The route checks the configured CORS policy, verifies a signed bearer token for the configured API resource, and rejects raw PAT values. It does not use the session cookie as a fallback.
      </p>
      <p style={styles.textStyle}>
        3. **Executor Policy:** <code style={styles.codeStyle}>executeProtectedAction()</code> resolves the action, validates its policy, and checks that the context mode appears in <code style={styles.codeStyle}>credentialModes</code>. That field defaults to <code style={styles.codeStyle}>session</code>.
      </p>
      <p style={styles.textStyle}>
        4. **Live RBAC:** For organization actions, the executor calls <code style={styles.codeStyle}>fetchOrgRolePermissions()</code> with the configured organization and authenticated subject. It checks required roles and permissions before calling the handler.
      </p>
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>permissionBinding</code> policy defaults to <code style={styles.codeStyle}>union</code>, which checks permissions across the subject&apos;s roles. The <code style={styles.codeStyle}>required-role</code> option binds permissions to the required role. The handler receives its actor and organization from the executor, not from the client payload.
      </p>

      <h2 id={slugify("API Error Codes")} style={h2Style}>
        API Error Codes
      </h2>
      <p style={styles.textStyle}>
        The adapters return a consistent <code style={styles.codeSmStyle}>{'{ error, data }'}</code> envelope. Failures contain a fixed error code and <code style={styles.codeSmStyle}>data: null</code>, not exception details.
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '30%' }}>Error Code</th>
            <th style={{ ...customThStyle, width: '15%' }}>Status</th>
            <th style={{ ...customThStyle, width: '55%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>INVALID_PAYLOAD</td>
            <td style={customTdStyle}>400</td>
            <td style={customTdStyle}>The executor rejected the action payload.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>PAYLOAD_TOO_LARGE</td>
            <td style={customTdStyle}>413</td>
            <td style={customTdStyle}>The request body exceeds the 1 MiB size limit (enforced by reading the actual stream bytes).</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>401</td>
            <td style={customTdStyle}>The session adapter or automation adapter did not establish an active principal.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>FORBIDDEN_ORIGIN</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The request origin failed the applicable same-origin or CORS policy.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>Live organization lookup did not confirm the required membership.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>ROLE_DENIED</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The subject does not hold every role required by the action.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>PERMISSION_DENIED</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The live permissions or allowed context modes do not satisfy the action policy.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>NOT_FOUND</td>
            <td style={customTdStyle}>404</td>
            <td style={customTdStyle}>The action handler could not find the requested resource.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>RATE_LIMITED</td>
            <td style={customTdStyle}>429</td>
            <td style={customTdStyle}>The shared per-user limit of 60 requests per 60 seconds was reached. The response includes <code style={styles.codeSmStyle}>Retry-After</code>.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>SERVICE_UNAVAILABLE</td>
            <td style={customTdStyle}>503</td>
            <td style={customTdStyle}>A required shared dependency could not provide service.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INTERNAL_ERROR</td>
            <td style={customTdStyle}>500</td>
            <td style={customTdStyle}>An unexpected server error occurred during processing.</td>
          </tr>
        </tbody>
      </table>

    </div>
  );
}
