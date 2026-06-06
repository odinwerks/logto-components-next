/**
 * ============================================================================
 * Error types and sanitisation helpers
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

const GENERIC_LOGTO_ERROR_MESSAGE = 'Request failed.';

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
 * The `operation`/`status` properties of LogtoApiError are always stripped
 * from the thrown error's message - they live in server logs only.
 *
 * @param err       The caught error.
 * @param fallback  The error code to use in production.
 */
export function sanitize(err: unknown, options: { fallback: ErrorCode }): Error {
  const fallback = options.fallback;

  // Production: fixed error code only. Never leak upstream detail.
  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  return safe;
}

// ============================================================================
// Throw helper for fetch responses from upstream Logto API
// ============================================================================

/**
 * Throws a client-safe Error if the response is not OK.
 *
 * Behavior:
 * - Always logs full upstream detail to server logs.
 * - Returns Logto's `message` field to client when present.
 * - Falls back to a generic user-facing message when missing.
 *
 * @param res       The fetch Response.
 * @param fallback  Error code used when no Logto message is available.
 * @param operation Label for server-side logging.
 */
export async function throwOnApiError(
  res: Response,
  _fallback: ErrorCode,
  operation = 'logto-api',
): Promise<void> {
  if (res.ok) return;

  let detail = '';
  try {
    detail = await res.text();
  } catch {
    detail = res.statusText;
  }

  // Always log server-side with full detail.
  if (typeof console !== 'undefined') {
    warn(`[${operation}] HTTP ${res.status}: ${detail}`);
  }

  // Parse Logto's canonical payload shape: { code, message }.
  // `message` is the only client-facing field we propagate.
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

  // No message field: generic user-facing fallback.
  const safe = new Error(GENERIC_LOGTO_ERROR_MESSAGE);
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
 * Returns a sanitized fixed code error.
 */
export function plainCode(code: ErrorCode, cause?: unknown): Error {
  // `cause` is intentionally ignored for client-safe output.
  void cause;
  const err = new Error(code);
  err.name = 'SanitizedError';
  return err;
}

export { captureMessage } from './capture-message';
