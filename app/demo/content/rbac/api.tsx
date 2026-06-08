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
        The <code style={styles.codeStyle}>POST /api/protected</code> route acts as the server-side security boundary for all permission-gated operations. It performs multi-step token verification, role checking, and permission validation before invoking the target handler.
      </p>
      <div style={styles.warningBannerStyle}>
        <strong style={styles.warningBannerStrongStyle}>Security Requirement:</strong> Unlike client-side rendering checks, this backend route enforces strict checks on every request. It derives user and organization context from secure tokens, making it resilient to client-side manipulation.
      </div>
      <CodeBlock
        title="Protected API Request Example"
        code={`// Example of calling the protected API from a client component
const response = await fetch('/api/protected', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  // Same-origin requests use the authenticated session cookie automatically
  body: JSON.stringify({
    action: 'get-calculator-total', // Name of the registered action
    payload: { a: 10, b: 20 }        // Client payload passed to the action
  })
});

const result = await response.json();
if (result.error) {
  handleApiError(result.error); // Handle sanitized error code
} else {
  renderData(result.data);       // Process successful result
}`}
      />

      <h2 id={slugify("Server-Side API Claim Validation")} style={h2Style}>
        Server-Side API Claim Validation
      </h2>
      <p style={styles.textStyle}>
        The API route validates incoming claims using a secure multi-layer sequence:
      </p>
      <p style={styles.textStyle}>
        1. **Active Organization Determination**: The active organization is read and stored client-side via the user custom data preference path (<code style={styles.codeStyle}>customData.Preferences.asOrg</code>). During server action resolution, the backend checks this preference to confirm user context.
      </p>
      <p style={styles.textStyle}>
        2. **Token Introspection**: The endpoint retrieves the user session token and executes token introspection via Logto OIDC endpoints. This validates whether the token is active, unexpired, and associated with a valid user ID.
      </p>
      <p style={styles.textStyle}>
        3. **Management API Verification (M2M)**: If the action requires organization-specific access, the backend utilizes Machine-to-Machine (M2M) credentials to fetch the user organization roles and scopes directly from the Logto Management API. It executes the following endpoints:
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li><code style={styles.codeSmStyle}>GET /api/organizations/{"{orgId}"}/users/{"{userId}"}/roles</code> to confirm active organization membership.</li>
        <li><code style={styles.codeSmStyle}>GET /api/organization-roles/{"{roleId}"}/scopes</code> in parallel for each role to resolve active permission claims.</li>
      </ul>
      <p style={styles.textStyle}>
        4. **Assertion Gating**: If any of the required organization, role, or permission claims are missing, the server halts execution immediately and rejects the request.
      </p>

      <h2 id={slugify("API Error Codes")} style={h2Style}>
        API Error Codes
      </h2>
      <p style={styles.textStyle}>
        The backend route rejects invalid or unauthorized requests with standardized HTTP status codes and fixed error strings:
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
            <td style={customTdPropStyle}>MISSING_FIELDS</td>
            <td style={customTdStyle}>400</td>
            <td style={customTdStyle}>The action name is missing from the request body.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>TOKEN_INVALID</td>
            <td style={customTdStyle}>401 / 400</td>
            <td style={customTdStyle}>The access token is expired, inactive, or the user ID format is invalid.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INTROSPECTION_ERROR</td>
            <td style={customTdStyle}>401</td>
            <td style={customTdStyle}>Failed to complete token introspection with the OIDC server.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>401</td>
            <td style={customTdStyle}>No authenticated session token was provided.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>ACTION_NOT_FOUND</td>
            <td style={customTdStyle}>404</td>
            <td style={customTdStyle}>The requested action is not registered in the system.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>ORG_NOT_MEMBER</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The user is not a member of the required organization.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>ROLE_DENIED</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The user lacks one or more required organization roles.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>PERMISSION_DENIED</td>
            <td style={customTdStyle}>403</td>
            <td style={customTdStyle}>The user lacks one or more required permissions.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INVALID_PAYLOAD</td>
            <td style={customTdStyle}>400</td>
            <td style={customTdStyle}>The action handler rejected the payload structure or type.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>IMPROPER_SETUP_ERROR</td>
            <td style={customTdStyle}>500</td>
            <td style={customTdStyle}>The action configuration lacks required organization, role, or permission keys.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INTERNAL_ERROR</td>
            <td style={customTdStyle}>500</td>
            <td style={customTdStyle}>An unexpected server error occurred during processing.</td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("The safeAction Wrapper")} style={h2Style}>
        The safeAction Wrapper
      </h2>
      <p style={styles.textStyle}>
        All server actions utilize the <code style={styles.codeStyle}>safeAction</code> wrapper. It catches exceptions thrown during execution, sanitizes error messages to prevent internal details from leaking, and returns a standardized result type.
      </p>
      <CodeBlock
        title="safeAction Implementation"
        code={`export type ActionResult = { ok: true } | { ok: false; error: string };
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    // Preserve pre-sanitized exceptions (e.g. UNAUTHORIZED)
    if (!isDev && err instanceof Error && err.name === 'SanitizedError') {
      return { ok: false, error: captureMessage(err) };
    }
    // Sanitize message to prevent upstream database/API detail leaks
    const safe = isDev ? err : sanitize(err, { fallback: 'INTERNAL_ERROR' });
    return { ok: false, error: captureMessage(safe) };
  }
}`}
      />
      <p style={styles.textStyle}>
        By wrapping execution blocks with <code style={styles.codeStyle}>safeAction</code>, standard exceptions are intercepted and converted into standardized JSON structures before execution enters or returns from the action body.
      </p>
    </div>
  );
}
