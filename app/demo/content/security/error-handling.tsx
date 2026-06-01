'use client';

import { useDocStyles } from "../../components/useDocStyles";
import CodeBlock from "../../components/SyntaxBlock";
import { SectionWrap } from "../../components/SectionComponents";

export default function SecurityErrorHandlingDoc() {
  const styles = useDocStyles();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <SectionWrap label="Error Sanitization System">
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
      </SectionWrap>

      <SectionWrap label="Safe Error Codes">
        <p style={styles.textStyle}>
          Standardized error codes are returned to the client in production. The following table describes the primary error codes used across secure route handlers and server actions:
        </p>
        <table style={styles.tableStyle}>
          <thead>
            <tr>
              <th style={{ ...styles.thStyle, width: '40%' }}>Error Code</th>
              <th style={{ ...styles.thStyle, width: '60%' }}>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.tdPropStyle}>VERIFICATION_FAILED</td>
              <td style={styles.tdStyle}>The email or phone verification code is invalid or has expired.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>AUTHORIZATION_FAILED</td>
              <td style={styles.tdStyle}>The token or credentials lack the necessary scope or role.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>UPDATE_FAILED</td>
              <td style={styles.tdStyle}>The resource update operation was rejected or failed on the server.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>UPLOAD_FAILED</td>
              <td style={styles.tdStyle}>The file upload was rejected (e.g., due to invalid magic bytes or size limits).</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>FETCH_FAILED</td>
              <td style={styles.tdStyle}>An internal call to retrieve upstream resources could not be completed.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>INVALID_INPUT</td>
              <td style={styles.tdStyle}>The provided parameters failed validation constraints at the entry boundary.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>FORBIDDEN_ORIGIN</td>
              <td style={styles.tdStyle}>The origin header failed cross-origin validation checks.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>UNAUTHORIZED</td>
              <td style={styles.tdStyle}>The request lacks valid authentication credentials or session tokens.</td>
            </tr>
            <tr>
              <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
              <td style={styles.tdStyle}>An unexpected server-side error occurred and details were suppressed.</td>
            </tr>
          </tbody>
        </table>
      </SectionWrap>

      <SectionWrap label="The safeAction Wrapper and Types">
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
      </SectionWrap>

      <SectionWrap label="Upstream API Error Extraction">
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
      </SectionWrap>
    </div>
  );
}
