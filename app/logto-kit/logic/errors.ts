/**
 * ============================================================================
 * Error types & NODE_ENV-aware sanitisation
 * ============================================================================
 *
 * In production, errors returned to the client are fixed codes — never raw
 * upstream text, never user-controlled values. This prevents:
 *
 *   - User enumeration via differentiated error messages ("unknown email"
 *     vs "already verified").
 *   - Internal detail disclosure (DB constraint names, upstream service
 *     URLs, request IDs).
 *
 * In development, errors pass through the full upstream text so devs can
 * see what actually went wrong without spelunking through server logs.
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
  | 'INTERNAL_ERROR';

// ============================================================================
// Truncation helper
// ============================================================================

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}…`;
}

// ============================================================================
// Primary API: sanitize(err, { fallback })
// ============================================================================

/**
 * Returns an `Error` safe to throw across the server-action boundary.
 *
 * In development: preserves original error messages (truncated to 400 chars).
 * In production: replaces the message with a fixed error code.
 *
 * The `operation`/`status` properties of LogtoApiError are always stripped
 * from the thrown error's message — they live in server logs only.
 *
 * @param err       The caught error.
 * @param fallback  The error code to use in production.
 */
export function sanitize(err: unknown, options: { fallback: ErrorCode }): Error {
  const fallback = options.fallback;

  // Dev mode: preserve full context to aid debugging.
  if (isDev) {
    if (err instanceof Error) {
      return new Error(truncate(`${fallback}: ${err.message}`, 400));
    }
    return new Error(truncate(`${fallback}: ${String(err)}`, 400));
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
 * @param fallback  Error code used when `isDev === false`.
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

  // Always log server-side regardless of env.
  if (typeof console !== 'undefined') {
    console.warn(
      `[${operation}] HTTP ${res.status}: ${truncate(detail, 400)}`,
    );
  }

  if (isDev) {
    throw new Error(
      `${fallback} ${res.status}: ${truncate(detail, 300)}`,
    );
  }

  const safe = new Error(fallback);
  safe.name = 'SanitizedError';
  throw safe;
}

// ============================================================================
// Legacy helper — retained for callers that already import it.
// New code should prefer `sanitize()` + `throwOnApiError()` above.
// ============================================================================

/**
 * @deprecated Use `sanitize()` instead.
 */
export function sanitizeLogtoError(errorText: string | null | undefined): string {
  if (!errorText) return 'Unknown error';
  return String(errorText)
    .replace(/https?:\/\/\S+/g, '[URL]')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/\+[1-9]\d{1,14}/g, '[PHONE]')
    .replace(/[A-Za-z0-9_-]{20,}/g, '[TOKEN]')
    .slice(0, 200);
}
