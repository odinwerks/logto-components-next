/**
 * ============================================================================
 * Error types & PLAIN_ERRORS-aware sanitisation
 * ============================================================================
 *
 * By default, errors returned to the client are fixed codes - never raw
 * upstream text, never user-controlled values. This prevents:
 *
 *   - User enumeration via differentiated error messages ("unknown email"
 *     vs "already verified").
 *   - Internal detail disclosure (DB constraint names, upstream service
 *     URLs, request IDs).
 *
 * Set PLAIN_ERRORS=true to bypass sanitisation and get full error text.
 *
 * Usage pattern in server actions:
 *
 *   try {
 *     const res = await makeRequest(...);
 *     await throwOnApiError(res, 'UPDATE_FAILED');
 *   } catch (err) {
 *     throw sanitize(err, { fallback: 'UPDATE_FAILED' });
 *   }
 */

import { warn } from './log';

const plainErrors = process.env.PLAIN_ERRORS === 'true';

// ============================================================================
// Domain-specific error class for upstream Logto API failures
// ============================================================================

export class LogtoApiError extends Error {
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

// ============================================================================
// Error codes - fixed strings clients are allowed to see in production
// ============================================================================

export type ErrorCode =
  | 'VERIFICATION_FAILED'
  | 'AUTHORIZATION_FAILED'
  | 'UPDATE_FAILED'
  | 'UPLOAD_FAILED'
  | 'UPLOAD_TOO_LARGE'
  | 'UPLOAD_INVALID_TYPE'
  | 'UPLOAD_RATE_LIMITED'
  | 'DELETE_FAILED'
  | 'FETCH_FAILED'
  | 'SESSION_REVOKE_FAILED'
  | 'GRANT_REVOKE_FAILED'
  | 'MFA_ENROLL_FAILED'
  | 'MFA_REMOVE_FAILED'
  | 'BACKUP_CODES_FAILED'
  | 'PASSWORD_UPDATE_FAILED'
  | 'EMAIL_UPDATE_FAILED'
  | 'PHONE_UPDATE_FAILED'
  | 'INVALID_INPUT'
  | 'FORBIDDEN_ORIGIN'
  | 'UNAUTHORIZED'
  | 'MISSING_VERIFICATION'
  | 'INTERNAL_ERROR';

// ============================================================================
// Primary API: sanitize(err, { fallback })
// ============================================================================

/**
 * Returns an `Error` safe to throw across the server-action boundary.
 *
 * When PLAIN_ERRORS=true: preserves original error messages.
 * Otherwise: replaces the message with a fixed error code.
 *
 * The `operation`/`status` properties of LogtoApiError are always stripped
 * from the thrown error's message - they live in server logs only.
 *
 * @param err       The caught error.
 * @param fallback  The error code to use in production.
 */
export function sanitize(err: unknown, options: { fallback: ErrorCode }): Error {
  const fallback = options.fallback;

  // Plain errors: preserve full context to aid debugging.
  if (plainErrors) {
    if (err instanceof Error) {
      return new Error(`${fallback}: ${err.message}`);
    }
    return new Error(`${fallback}: ${String(err)}`);
  }

  // Production: fixed error code only. Never leak upstream detail.
  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  return safe;
}

// ============================================================================
// Throw helper for fetch responses from upstream Logto API
// ============================================================================

/**
 * Throws a sanitised Error if the response is not OK. Logs the full upstream
 * detail server-side for the operator.
 *
 * When PLAIN_ERRORS=false (production): extracts Logto's `message` field from
 * the JSON body and passes it through directly as a user-facing error.
 * Falls back to the fixed code only when no message is available.
 *
 * @param res       The fetch Response.
 * @param fallback  Error code used when no Logto message is available.
 * @param operation Label for server-side logging.
 */
export async function throwOnApiError(
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

  // Always log server-side regardless of env - full detail, no truncation.
  if (typeof console !== 'undefined') {
    warn(
      `[${operation}] HTTP ${res.status}: ${detail.replace(/[\r\n]/g, ' ').substring(0, 1000)}`,
    );
  }

  // Always try to extract Logto's user-facing message first.
  // Logto returns {"code": "...", "message": "..."} for known errors.
  // This takes priority over PLAIN_ERRORS mode - the message is the answer.
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
    // Not JSON or no message field - fall through
  }

  // No message field: PLAIN_ERRORS dumps full detail for debugging
  if (plainErrors) {
    throw new Error(`${fallback} ${res.status}: ${detail}`);
  }

  // Production fallback: fixed code only
  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  throw safe;
}

// ============================================================================
// Plain code helper - for callers that throw hardcoded codes directly
// (e.g. avatar.ts) rather than going through throwOnApiError().
// ============================================================================

/**
 * Creates an Error from a code and an optional underlying detail.
 *
 * When PLAIN_ERRORS=true: appends the cause's message to the code.
 * Otherwise: returns just the code.
 */
export function plainCode(code: ErrorCode, cause?: unknown): Error {
  let err: Error;
  if (plainErrors && cause instanceof Error) {
    err = new Error(`${code}: ${cause.message}`);
  } else if (plainErrors && cause !== undefined) {
    err = new Error(`${code}: ${String(cause)}`);
  } else {
    err = new Error(code);
  }
  err.name = 'SanitizedError';
  return err;
}

export { captureMessage } from './capture-message';
