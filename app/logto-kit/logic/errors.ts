/**
 * ============================================================================
 * Error types and sanitisation helpers
 * ============================================================================
 *
 * Errors returned to the client use Logto's human-readable `message` field
 * when available (safe to expose — Account API responses are user-facing).
 * When no upstream message exists, deterministic error codes are used instead.
 *
 * Raw upstream text outside the `message` field (DB constraint names, upstream
 * service URLs, request IDs) is never exposed to clients.
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

const AUTH_HTTP_STATUSES = new Set([401, 403]);

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

  if (err instanceof Error && err.name === 'ValidationError') {
    return err;
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
 * Throws a client-safe Error if the response is not OK.
 *
 * Behavior:
 * - Parses upstream JSON payload for code + message.
 * - Logs only HTTP status and upstream code to server logs (never the message).
 * - Passes Logto's human-readable `message` to the client verbatim.
 * - Falls back to the deterministic error code when no upstream message exists.
 *
 * @param res       The fetch Response.
 * @param fallback  Error code used for non-auth failures.
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

  // Parse Logto payload first so we can log only the code (not the message).
  let upstreamCode: string | undefined;
  let upstreamMessage: string | undefined;
  try {
    const parsed = JSON.parse(detail);
    if (typeof parsed?.code === 'string' && parsed.code.trim()) {
      upstreamCode = parsed.code.trim();
    }
    if (typeof parsed?.message === 'string' && parsed.message.trim()) {
      upstreamMessage = parsed.message.trim();
    }
  } catch {
    // Non-JSON payloads are expected for some upstream failures.
  }

  // Log only status + code to server logs. Never log the upstream message.
  if (typeof console !== 'undefined') {
    warn(`[${operation}] HTTP ${res.status}${upstreamCode ? ` (${upstreamCode})` : ''}`);
  }

  const safeCode: ErrorCode = AUTH_HTTP_STATUSES.has(res.status)
    ? 'UNAUTHORIZED'
    : fallback;

  // Pass Logto's human-readable message to the client.
  // Logto's Account API responses are user-facing and safe to expose.
  // Fall back to safeCode only when no upstream message is available.
  const errorMessage = upstreamMessage ?? safeCode;

  const safe = new Error(errorMessage);
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

export function isAuthError(error: unknown): boolean {
  if (!error) return false;

  // Check custom error properties on any object
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj.status === 401 || obj.status === 403 || obj.code === 'UNAUTHORIZED') {
      return true;
    }
  }

  if (error instanceof Error) {
    if (error.name === 'SanitizedError' && error.message === 'UNAUTHORIZED') {
      return true;
    }
    if (error.message === 'needsAuth' || error.message === 'No access token available for Account API') {
      return true;
    }
    if (error.message.startsWith('Cookies can only be modified')) {
      return true;
    }
  }

  return false;
}

export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  // Check custom/numeric status/code properties
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    
    // Check status or statusCode properties for 429 or 5xx
    const status = typeof obj.status === 'number' ? obj.status : undefined;
    const statusCode = typeof obj.statusCode === 'number' ? obj.statusCode : undefined;
    const s = status ?? statusCode;
    if (s !== undefined && (s === 429 || (s >= 500 && s < 600))) {
      return true;
    }

    // Check system error codes in code property
    if (typeof obj.code === 'string') {
      const sysCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE', 'ENOTFOUND', 'EADDRINUSE', 'ECONNABORTED'];
      if (sysCodes.includes(obj.code)) {
        return true;
      }
    }
  }

  if (error instanceof Error) {
    // Exact messages
    if (error.message === 'fetch failed' || error.message === 'Request timed out') {
      return true;
    }

    // HTTP status indicators with word boundaries (e.g. \b429\b, \b500\b, etc.)
    if (/\b(429|5\d{2})\b/.test(error.message)) {
      return true;
    }

    // System error codes with word boundaries
    if (/\b(ECONNREFUSED|ETIMEDOUT|ECONNRESET|EPIPE|ENOTFOUND|EADDRINUSE|ECONNABORTED)\b/.test(error.message)) {
      return true;
    }
  }

  return false;
}
