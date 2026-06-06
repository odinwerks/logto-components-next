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
        The app avoids leaking raw internal exceptions to the client in production. This includes stack traces, infrastructure details, and low-level upstream failures.
      </p>
      <p style={styles.textStyle}>
        Error handling is split across helpers. <code style={styles.codeSmStyle}>safeAction</code> wraps server actions. <code style={styles.codeSmStyle}>sanitize</code> and <code style={styles.codeSmStyle}>throwOnApiError</code> shape what messages cross the boundary.
      </p>
      <ul style={{ ...styles.textStyle, paddingLeft: '20px', listStyleType: 'disc' }}>
        <li><code style={styles.codeSmStyle}>throwOnApiError</code> logs upstream response details server-side and may extract <code style={styles.codeSmStyle}>message</code> from known Logto JSON errors.</li>
        <li><code style={styles.codeSmStyle}>safeAction</code> returns <code style={styles.codeSmStyle}>{`{ ok: false, error }`}</code> and preserves pre-sanitized errors in production.</li>
        <li><code style={styles.codeSmStyle}>sanitize</code> keeps fixed fallback codes for non-Logto failures, while Logto API failures surface the upstream <code style={styles.codeSmStyle}>message</code> field.</li>
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
        Most session-bound server actions are wrapped in <code style={styles.codeSmStyle}>safeAction</code>. The wrapper catches exceptions and returns a typed result payload.
      </p>
      <p style={styles.textStyle}>
        Client components consume two result types:
      </p>
      <CodeBlock
        title="Safe Action TypeScript Interfaces"
        code={`// Represents the result of an operation that does not return data
export type ActionResult = { ok: true } | { ok: false; error: string };

// Represents the result of an operation that returns data on success
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };`}
      />
      <p style={styles.textStyle}>Current wrapper behavior:</p>
      <CodeBlock
        title="safeAction Implementation"
        code={`export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    // Keep pre-sanitized errors in production
    if (!isDev && err instanceof Error && err.name === 'SanitizedError') {
      return { ok: false, error: captureMessage(err) };
    }
    // In dev: return raw error message. In production: sanitize with INTERNAL_ERROR fallback.
    const safe = isDev ? err : sanitize(err, { fallback: 'INTERNAL_ERROR' });
    return { ok: false, error: captureMessage(safe) };
  }
}`}
      />

      <h2 id={slugify("Upstream API Error Extraction")} style={h2Style}>Upstream API Error Extraction</h2>
      <p style={styles.textStyle}>
        Upstream identity endpoints often return useful JSON error payloads. The helper tries to keep those user-safe messages when possible.
      </p>
      <p style={styles.textStyle}>
        <code style={styles.codeSmStyle}>throwOnApiError</code> reads the response body, logs details server-side, returns Logto&apos;s <code style={styles.codeSmStyle}>message</code> field when present, and falls back to a generic client-safe message when missing.
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

  // Log upstream detail on server
  warn(\`[\${operation}] HTTP \${res.status}: \${detail}\`);

  // Try to use Logto's message
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      const err = new Error(parsed.message.trim());
      err.name = 'SanitizedError';
      throw err;
    }
  } catch (parseErr) {
    if (parseErr instanceof Error && parseErr.name === 'SanitizedError') {
      throw parseErr;
    }
  }

  // Fallback behavior
  const safe = new Error('Request failed.');
  safe.name = 'SanitizedError';
  throw safe;
}`}
      />
    </div>
  );
}
