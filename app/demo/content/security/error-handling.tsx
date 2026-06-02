'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { useThemeMode } from "../../../logto-kit/components/providers/preferences";
import { slugify } from "../../components/SectionComponents";

export default function SecurityErrorHandlingDoc() {
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
      <h2 id={slugify("Error Sanitization System")} style={{ ...h2Style, marginTop: 0 }}>Error Sanitization System</h2>
      <p style={styles.textStyle}>
        Production applications must avoid exposing raw server exceptions to the client. Direct exposure of stack traces, database schema details, or upstream API error logs can lead to information disclosure or assist attackers with user enumeration.
      </p>
      <p style={styles.textStyle}>
        The system implements an error sanitization layer that intercepts all unhandled errors at the server action and route boundaries. When an error occurs in production:
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li>The raw error details, including stack traces and database errors, are written only to the secure server logs.</li>
        <li>The error is sanitized and replaced with a fixed error code (representing a Safe Error Code).</li>
        <li>If the PLAIN_ERRORS environment variable is set to true (typically in local development), the sanitization layer is bypassed, allowing full error details to be passed to the client for debugging.</li>
      </ul>

      <h2 id={slugify("Safe Error Codes")} style={h2Style}>Safe Error Codes</h2>
      <p style={styles.textStyle}>
        Standardized error codes are returned to the client in production. The following table describes the primary error codes used across secure route handlers and server actions:
      </p>
      <table style={customTableStyle}>
        <thead>
          <tr>
            <th style={{ ...customThStyle, width: '40%' }}>Error Code</th>
            <th style={{ ...customThStyle, width: '60%' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={customTdPropStyle}>VERIFICATION_FAILED</td>
            <td style={customTdStyle}>The email or phone verification code is invalid or has expired.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>AUTHORIZATION_FAILED</td>
            <td style={customTdStyle}>The token or credentials lack the necessary scope or role.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UPDATE_FAILED</td>
            <td style={customTdStyle}>The resource update operation was rejected or failed on the server.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UPLOAD_FAILED</td>
            <td style={customTdStyle}>General error code for file uploads that failed on the server.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UPLOAD_TOO_LARGE</td>
            <td style={customTdStyle}>The uploaded file size exceeds the configured maximum upload limit.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UPLOAD_INVALID_TYPE</td>
            <td style={customTdStyle}>The uploaded file's MIME type or magic bytes did not match the allowed profile.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UPLOAD_RATE_LIMITED</td>
            <td style={customTdStyle}>The file upload frequency exceeded safety thresholds.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>DELETE_FAILED</td>
            <td style={customTdStyle}>Deletion of a resource (e.g., user profile, session, or MFA factor) was rejected or failed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>FETCH_FAILED</td>
            <td style={customTdStyle}>An internal call to retrieve upstream resources could not be completed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>SESSION_REVOKE_FAILED</td>
            <td style={customTdStyle}>A session revocation request failed or was rejected.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>GRANT_REVOKE_FAILED</td>
            <td style={customTdStyle}>Revoking an application grant failed or was rejected.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>MFA_ENROLL_FAILED</td>
            <td style={customTdStyle}>Enrolling a new Multi-Factor Authentication factor (e.g., Totp, WebAuthn) failed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>MFA_REMOVE_FAILED</td>
            <td style={customTdStyle}>Removing a Multi-Factor Authentication factor failed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>BACKUP_CODES_FAILED</td>
            <td style={customTdStyle}>Generating, retrieving, or verifying MFA backup codes failed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>PASSWORD_UPDATE_FAILED</td>
            <td style={customTdStyle}>Updating the user's password failed validation or upstream checks.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>EMAIL_UPDATE_FAILED</td>
            <td style={customTdStyle}>Updating the user's email address failed validation or upstream checks.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>PHONE_UPDATE_FAILED</td>
            <td style={customTdStyle}>Updating the user's phone number failed validation or upstream checks.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INVALID_INPUT</td>
            <td style={customTdStyle}>The provided parameters failed validation constraints at the entry boundary.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>FORBIDDEN_ORIGIN</td>
            <td style={customTdStyle}>The origin header failed cross-origin validation checks.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>UNAUTHORIZED</td>
            <td style={customTdStyle}>The request lacks valid authentication credentials or session tokens.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>MISSING_VERIFICATION</td>
            <td style={customTdStyle}>The action requires a verification step that has not been completed.</td>
          </tr>
          <tr>
            <td style={customTdPropStyle}>INTERNAL_ERROR</td>
            <td style={customTdStyle}>An unexpected server-side error occurred and details were suppressed.</td>
          </tr>
        </tbody>
      </table>

      <h2 id={slugify("The safeAction Wrapper and Types")} style={h2Style}>The safeAction Wrapper and Types</h2>
      <p style={styles.textStyle}>
        All server actions that run in the user session are wrapped in a generic safeAction utility. This utility ensures that errors are caught, registered with the telemetry system via captureMessage, and sanitized before crossing the client-server boundary.
      </p>
      <p style={styles.textStyle}>
        The communication between client components and wrapped server actions uses two strict TypeScript interfaces:
      </p>
      <CodeBlock
        title="Safe Action TypeScript Interfaces"
        code={`// Represents the result of an operation that does not return data
export type ActionResult = { ok: true } | { ok: false; error: string };

// Represents the result of an operation that returns data on success
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };`}
      />
      <p style={styles.textStyle}>
        The wrapper intercepts unhandled exceptions, logs them internally, and converts them to the standardized error format:
      </p>
      <CodeBlock
        title="safeAction Implementation"
        code={`export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    // Preserve pre-sanitized errors (e.g. name='SanitizedError') so intentional codes survive
    if (!isDev && err instanceof Error && err.name === 'SanitizedError') {
      return { ok: false, error: captureMessage(err) };
    }
    // Sanitize before extracting message to prevent upstream API detail leakage
    const safe = isDev ? err : sanitize(err, { fallback: 'INTERNAL_ERROR' });
    return { ok: false, error: captureMessage(safe) };
  }
}`}
      />

      <h2 id={slugify("Upstream API Error Extraction")} style={h2Style}>Upstream API Error Extraction</h2>
      <p style={styles.textStyle}>
        When interacting with the Logto Management API or other identity provider endpoints, responses may fail with specific validation messages. Simple network error catching would result in generic error codes that degrade the user experience.
      </p>
      <p style={styles.textStyle}>
        To provide meaningful errors while maintaining security, the system inspects upstream failure bodies in the throwOnApiError helper. It attempts to parse the response as JSON to extract nested Logto error messages first (specifically checking parsed.message) before falling back to generic codes.
      </p>
      <CodeBlock
        title="Upstream Error Extraction"
        code={`export async function throwOnApiError(
  res: Response,
  fallback: ErrorCode,
  operation = 'logto-api',
): Promise<void> {
  if (res.ok) return;

  let detail = '';
  try {
    detail = await res.text();
  } catch {
    detail = res.statusText;
  }

  // Log full raw upstream details server-side for operators
  warn(\`[\${operation}] HTTP \${res.status}: \${detail.substring(0, 1000)}\`);

  // Extract Logto's user-facing message from JSON body
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      const err = new Error(parsed.message.trim());
      err.name = 'SanitizedError';
      throw err; // Thrown as a sanitized error to bypass generic replacement
    }
  } catch (parseErr) {
    if (parseErr instanceof Error && parseErr.name === 'SanitizedError') {
      throw parseErr;
    }
  }

  // Fallback to development detailed error or production safe code
  if (plainErrors) {
    throw new Error(\`\${fallback} \${res.status}: \${detail}\`);
  }

  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  throw safe;
}`}
      />
    </div>
  );
}
