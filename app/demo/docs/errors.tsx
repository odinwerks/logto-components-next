'use client';

import CodeBlock from '../components/SyntaxBlock';
import { SectionContainer, Section } from '../components/Section';
import { useDocStyles } from '../components/useDocStyles';
import { SectionHeader, SectionWrap } from '../components/SectionComponents';

// ═══════════════════════════════════════════════════════════════════════════════
// Page 1: Overview
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Overview">
      <p style={styles.textStyle}>
        By default, errors returned to the client are fixed codes - never raw
        upstream text, never user-controlled values. This prevents:
      </p>
      <ul style={{ ...styles.textStyle, marginLeft: '1rem', marginBottom: '0.75rem' }}>
        <li>User enumeration via differentiated messages ("unknown email" vs "already verified")</li>
        <li>Internal detail disclosure (DB constraint names, upstream URLs, request IDs)</li>
      </ul>
      <CodeBlock title="Core architecture" code={`// Every server action returns { ok: true } or { ok: false, error: 'CODE' }
// Never throw across the server-action boundary - always return.

// client usage:
const result = await onUpdatePassword(newPassword, vid);
if (!result.ok) {
  onError(result.error); // displays sanitized error code
}

// Set PLAIN_ERRORS=true in .env to bypass sanitization during development`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Key files:</strong>{' '}
        <code style={styles.codeSmStyle}>logic/errors.ts</code> (sanitization engine),
        <code style={styles.codeSmStyle}>logic/actions/safe.ts</code> (action wrapper),
        <code style={styles.codeSmStyle}>logic/capture-message.ts</code> (message extraction).
      </div>
    </SectionWrap>
  );
}

function SanitizerSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Sanitization engine">
      <p style={styles.textStyle}>
        The <code style={styles.codeStyle}>sanitize()</code> function replaces error messages with
        fixed error codes in production. When <code style={styles.codeStyle}>PLAIN_ERRORS=true</code>,
        the original message is preserved with the code prefix.
      </p>
      <CodeBlock title="sanitize()" code={`export function sanitize(err: unknown, options: { fallback: ErrorCode }): Error {
  const fallback = options.fallback;

  // Plain errors: preserve full context for debugging
  if (plainErrors) {
    if (err instanceof Error) {
      return new Error(\`\${fallback}: \${err.message}\`);
    }
    return new Error(\`\${fallback}: \${String(err)}\`);
  }

  // Production: fixed error code only
  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  return safe;
}`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Usage pattern:</strong>{' '}
        <code style={styles.codeSmStyle}>{`sanitize(err, { fallback: 'UPDATE_FAILED' })`}</code>
        inside catch blocks in server actions. Never expose the raw upstream message.
      </div>
    </SectionWrap>
  );
}

function CaptureSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="captureMessage()">
      <p style={styles.textStyle}>
        Safe error message extraction that works on both sides of the server/client boundary.
        Used internally by <code style={styles.codeStyle}>safeAction</code>.
      </p>
      <CodeBlock title="Interface" code={`export function captureMessage(err: unknown): string {
  if (err instanceof Error) {
    const base = err.message || String(err);
    const digest = (err as Error & { digest?: string }).digest;
    return digest && digest !== base ? \`\${base}\\ndigest: \${digest}\` : base;
  }
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  try { return String(err); } catch { return 'Unknown error'; }
}`} />
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 2: Error Codes
// ═══════════════════════════════════════════════════════════════════════════════

function ErrorCodesSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Error codes">
      <p style={styles.textStyle}>
        All 22 error codes. These are the only strings clients receive in production
        (unless <code style={styles.codeStyle}>PLAIN_ERRORS=true</code>).
      </p>
      <table style={styles.tableStyle}>
        <thead>
          <tr>
            <th style={styles.thStyle}>Code</th>
            <th style={styles.thStyle}>Source</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.tdPropStyle}>VERIFICATION_FAILED</td>
            <td style={styles.tdStyle}>Password or code verification rejected by Logto</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>AUTHORIZATION_FAILED</td>
            <td style={styles.tdStyle}>Token invalid, expired, or insufficient scopes</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UPDATE_FAILED</td>
            <td style={styles.tdStyle}>Generic update failure (profile, customData, etc.)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UPLOAD_FAILED</td>
            <td style={styles.tdStyle}>Avatar upload rejected by storage backend</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UPLOAD_TOO_LARGE</td>
            <td style={styles.tdStyle}>Avatar file exceeds size limit</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UPLOAD_INVALID_TYPE</td>
            <td style={styles.tdStyle}>Avatar MIME type rejected (magic-byte check failed)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UPLOAD_RATE_LIMITED</td>
            <td style={styles.tdStyle}>Too many avatar uploads in a short period</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>DELETE_FAILED</td>
            <td style={styles.tdStyle}>Generic delete failure</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>FETCH_FAILED</td>
            <td style={styles.tdStyle}>API fetch failed (network error or non-OK response)</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>SESSION_REVOKE_FAILED</td>
            <td style={styles.tdStyle}>Logto rejected session revocation</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>GRANT_REVOKE_FAILED</td>
            <td style={styles.tdStyle}>Logto rejected grant revocation</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>MFA_ENROLL_FAILED</td>
            <td style={styles.tdStyle}>MFA factor enrollment rejected</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>MFA_REMOVE_FAILED</td>
            <td style={styles.tdStyle}>MFA factor removal rejected</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>BACKUP_CODES_FAILED</td>
            <td style={styles.tdStyle}>Backup code generation or fetch failed</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>PASSWORD_UPDATE_FAILED</td>
            <td style={styles.tdStyle}>Logto rejected password change</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>EMAIL_UPDATE_FAILED</td>
            <td style={styles.tdStyle}>Logto rejected email update</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>PHONE_UPDATE_FAILED</td>
            <td style={styles.tdStyle}>Logto rejected phone update</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INVALID_INPUT</td>
            <td style={styles.tdStyle}>Guard assertion or validation failed</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>FORBIDDEN_ORIGIN</td>
            <td style={styles.tdStyle}>Origin check failed in route handler</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>UNAUTHORIZED</td>
            <td style={styles.tdStyle}>Not authenticated or session expired</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>MISSING_VERIFICATION</td>
            <td style={styles.tdStyle}>Verification required but not provided</td>
          </tr>
          <tr>
            <td style={styles.tdPropStyle}>INTERNAL_ERROR</td>
            <td style={styles.tdStyle}>Unhandled server error (fallback)</td>
          </tr>
        </tbody>
      </table>
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>ErrorCode type:</strong>{' '}
        Defined in <code style={styles.codeSmStyle}>logic/errors.ts</code> as a TypeScript union.
        Your editor will autocomplete these.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 3: Server Action Pattern
// ═══════════════════════════════════════════════════════════════════════════════

function ActionPatternSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="Server Action Pattern">
      <p style={styles.textStyle}>
        Every server action in the kit follows this pattern. Return types are consistent
        across all 40+ actions - no throwing, always returning.
      </p>
      <CodeBlock title="Return types" code={`// Success/failure without data (e.g., delete, update without return value)
export type ActionResult = { ok: true } | { ok: false; error: string };

// Success/failure with data payload (e.g., fetch operations)
export type DataResult<T> = { ok: true; data: T } | { ok: false; error: string };

// Wrapper that catches and sanitizes errors
export async function safeAction<T>(fn: () => Promise<T>): Promise<DataResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: captureMessage(err) };
  }
}`} />
      <CodeBlock title="Implementation pattern" code={`'use server';

export async function updatePassword(newPassword: string, vid: string): Promise<ActionResult> {
  return safeAction(async () => {
    const res = await makeRequest('/api/my-account/password', {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
      extraHeaders: { 'logto-verification-id': vid },
    });
    await throwOnApiError(res, 'PASSWORD_UPDATE_FAILED');
  });
}`} />
      <CodeBlock title="Client usage" code={`const result = await onUpdatePassword(newPassword, vid);
if (!result.ok) {
  onError(result.error);   // → "PASSWORD_UPDATE_FAILED"
  return;
}
// result.ok is true - continue processing`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Always check .ok:</strong>{' '}
        The type system helps - <code style={styles.codeSmStyle}>result.data</code> only exists
        when <code style={styles.codeSmStyle}>result.ok</code> is true. Narrow with an if-check
        before accessing data.
      </div>
    </SectionWrap>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Page 4: API Error Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function ApiHelpersSection() {
  const styles = useDocStyles();
  return (
    <SectionWrap label="API Error Helpers">
      <p style={styles.textStyle}>
        Helpers for handling upstream Logto API errors consistently.
      </p>
      <CodeBlock title="throwOnApiError()" code={`// Throws a sanitized Error if the response is not OK.
// Logs full upstream detail server-side for operators.

export async function throwOnApiError(
  res: Response,
  fallback: ErrorCode,
  operation = 'logto-api',
): Promise<void> {
  if (res.ok) return;

  let detail = '';
  try { detail = await res.text(); } catch { detail = res.statusText; }

  // Always log server-side
  warn(\`[\${operation}] HTTP \${res.status}: \${detail}\`);

  // If Logto sent a message in the response body, proxy it directly
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      const err = new Error(parsed.message.trim());
      err.name = 'SanitizedError';
      throw err;
    }
  } catch (parseErr) {
    if (parseErr instanceof Error && parseErr.name === 'SanitizedError') throw parseErr;
  }

  if (plainErrors) {
    throw new Error(\`\${fallback} \${res.status}: \${detail}\`);
  }

  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  throw safe;
}`} />
      <CodeBlock title="plainCode()" code={`// For callers that throw hardcoded codes directly.
// When PLAIN_ERRORS=true, appends the cause's message to the code.

export function plainCode(code: ErrorCode, cause?: unknown): Error {
  if (plainErrors && cause instanceof Error) {
    return new Error(\`\${code}: \${cause.message}\`);
  }
  if (plainErrors && cause !== undefined) {
    return new Error(\`\${code}: \${String(cause)}\`);
  }
  return new Error(code);
}`} />
      <CodeBlock title="LogtoApiError" code={`export class LogtoApiError extends Error {
  constructor(
    message: string,
    public operation: string,
    public status: number,
    public response: string,
    public endpoint?: string,
  ) {
    super(message);
    this.name = 'LogtoApiError';
  }
}

// operation/status/response are always stripped from thrown errors
// in production - they exist in server logs only.`} />
      <div style={styles.noteStyle}>
        <strong style={styles.strongNoteStyle}>Full flow:</strong>{' '}
        <code style={styles.codeSmStyle}>makeRequest()</code> → if non-OK, creates {'{'}
        LogtoApiError{'}'} → <code style={styles.codeSmStyle}>safeAction()</code>{' '}
        catches → <code style={styles.codeSmStyle}>captureMessage()</code> extracts safe text{' '}
        → returns {'{'}ok: false, error{','} 'CODE'{'}'} → client checks <code style={styles.codeSmStyle}>.ok</code>.
      </div>
    </SectionWrap>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ErrorsDoc() {
  const styles = useDocStyles();
  return (
    <SectionContainer>
      {/* Page 1: Overview */}
      <Section id={1}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={styles.colLeftStyle}>
            <OverviewSection />
          </div>
          <div style={styles.colLeftStyle}>
            <SanitizerSection />
            <CaptureSection />
          </div>
        </div>
      </Section>

      {/* Page 2: Error Codes */}
      <Section id={2}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <ErrorCodesSection />
          </div>
        </div>
      </Section>

      {/* Page 3: Server Action Pattern */}
      <Section id={3}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <ActionPatternSection />
          </div>
        </div>
      </Section>

      {/* Page 4: API Error Helpers */}
      <Section id={4}>
        <div style={{ ...styles.twoColLayoutStyle, minHeight: '100%', padding: '16px' }}>
          <div style={{ ...styles.colLeftStyle, gridColumn: '1 / -1' }}>
            <ApiHelpersSection />
          </div>
        </div>
      </Section>
    </SectionContainer>
  );
}
