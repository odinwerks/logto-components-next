'use client';

import { useDocStyles } from '../../components/useDocStyles';
import CodeBlock from '../../components/SyntaxBlock';
import { SectionWrap } from '../../components/SectionComponents';

export default function ApiProtectedDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Server-Side Security Boundary">
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
    // Authorization header fallback is checked if session cookie is missing
    'Authorization': 'Bearer <access_token>' 
  },
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
      </SectionWrap>

      <SectionWrap label="Server-Side API Claim Validation">
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
      </SectionWrap>

      <SectionWrap label="API Error Codes">
        <p style={styles.textStyle}>
          The backend route rejects invalid or unauthorized requests with standardized HTTP status codes and fixed error strings:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '30%' }}>Error Code</th>
              <th style={{ ...styles.thStyle, width: '15%' }}>Status</th>
              <th style={{ ...styles.thStyle, width: '55%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>MISSING_FIELDS</td>
              <td style={styles.tdStyle}>400</td>
              <td style={styles.tdStyle}>The action name is missing from the request body.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>TOKEN_INVALID</td>
              <td style={styles.tdStyle}>401 / 400</td>
              <td style={styles.tdStyle}>The access token is expired, inactive, or the user ID format is invalid.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>INTROSPECTION_ERROR</td>
              <td style={styles.tdStyle}>401</td>
              <td style={styles.tdStyle}>Failed to complete token introspection with the OIDC server.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>UNAUTHORIZED</td>
              <td style={styles.tdStyle}>401</td>
              <td style={styles.tdStyle}>No authenticated session or bearer token was provided.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>ACTION_NOT_FOUND</td>
              <td style={styles.tdStyle}>404</td>
              <td style={styles.tdStyle}>The requested action is not registered in the system.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>ORG_NOT_MEMBER</td>
              <td style={styles.tdStyle}>403</td>
              <td style={styles.tdStyle}>The user is not a member of the required organization.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>ROLE_DENIED</td>
              <td style={styles.tdStyle}>403</td>
              <td style={styles.tdStyle}>The user lacks one or more required organization roles.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>PERMISSION_DENIED</td>
              <td style={styles.tdStyle}>403</td>
              <td style={styles.tdStyle}>The user lacks one or more required permissions.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>INVALID_PAYLOAD</td>
              <td style={styles.tdStyle}>400</td>
              <td style={styles.tdStyle}>The action handler rejected the payload structure or type.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>IMPROPER_SETUP_ERROR</td>
              <td style={styles.tdStyle}>500</td>
              <td style={styles.tdStyle}>The action configuration lacks required organization, role, or permission keys.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
              <td style={styles.tdStyle}>500</td>
              <td style={styles.tdStyle}>An unexpected server error occurred during processing.</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="The safeAction Wrapper">
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
      </SectionWrap>
    </div>
  );
}
