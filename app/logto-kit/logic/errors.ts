/**
 * ============================================================================
 * Error types & PLAIN_ERRORS-aware sanitisation
 * ============================================================================
 *
 * By default, errors returned to the client are fixed codes — never raw
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

import { isDev } from './dev-mode';
import { warn } from './log';

const plainErrors = isDev && process.env.PLAIN_ERRORS === 'true';

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
// Error codes — fixed strings clients are allowed to see in production
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
 * from the thrown error's message — they live in server logs only.
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
 * @param res       The fetch Response.
 * @param fallback  Error code used when PLAIN_ERRORS is not 'true'.
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

  // Always log server-side regardless of env — full detail, no truncation.
  if (typeof console !== 'undefined') {
    warn(
      `[${operation}] HTTP ${res.status}: ${detail}`,
    );
  }

  if (plainErrors) {
    throw new Error(
      `${fallback} ${res.status}: ${detail}`,
    );
  }

  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  throw safe;
}

// ============================================================================
// Plain code helper — for callers that throw hardcoded codes directly
// (e.g. avatar.ts) rather than going through throwOnApiError().
// ============================================================================

/**
 * Creates an Error from a code and an optional underlying detail.
 *
 * When PLAIN_ERRORS=true: appends the cause's message to the code.
 * Otherwise: returns just the code.
 */
export function plainCode(code: ErrorCode, cause?: unknown): Error {
  if (plainErrors && cause instanceof Error) {
    return new Error(`${code}: ${cause.message}`);
  }
  if (plainErrors && cause !== undefined) {
    return new Error(`${code}: ${String(cause)}`);
  }
  return new Error(code);
}

export { captureMessage } from './capture-message';
