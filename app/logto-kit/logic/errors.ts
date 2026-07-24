/**
 * ============================================================================
 * Error types and sanitisation helpers
 * ============================================================================
 *
 * Errors returned to the client carry a deterministic error CODE drawn from
 * the `ERROR_CODES` registry in `./error-codes`. The code is mapped to a
 * localized message by the i18n layer (`errors.*` namespace). The raw upstream
 * English `message` from Logto is NEVER sent to the client — it is logged
 * server-side only (full `code` + `message` via `logEvent`).
 *
 * Raw upstream text outside the `code`/`message` fields (DB constraint names,
 * upstream service URLs, request IDs) is never exposed to clients.
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
import { logEvent } from './log';
import { LOG_EVENTS } from '../../lib/log-events';
import type { ErrorCode } from './error-codes';
import { lookupErrorCodeKey } from './error-codes';
import { resolveClientCode } from './verbosity';

export type { ErrorCode };

const AUTH_HTTP_STATUSES = new Set([401, 403]);

// ============================================================================
// Primary API: sanitize(err, { fallback })
// ============================================================================

/**
 * Returns an `Error` safe to throw across the server-action boundary.
 *
 * The thrown error's message is always the fixed `fallback` code (in
 * production). Upstream operation/status details are never exposed to clients
 * — they live in server logs only (via `logEvent` in `throwOnApiError`).
 *
 * Stamps `.code` on the SanitizedError (mirroring `plainCode()` and
 * `throwOnApiError()`) so `safeAction`'s preserve branch can resolve it via
 * `resolveClientCode(err.code, captureMessage(err))`. Without `.code`,
 * `resolveClientCode` skips the registry lookup and returns the raw fallback
 * at `specific` verbosity, bypassing `exposeToClient:false` / generic-verbosity
 * collapsing (BUG-023). Protected codes (e.g. INTROSPECTION_ERROR) used as a
 * sanitize fallback would otherwise leak to the client.
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
  // Stamp `.code` so safeAction's preserve branch can resolve it via
  // resolveClientCode(err.code, ...) and apply exposeToClient/verbosity
  // collapsing. Mirrors plainCode() and throwOnApiError(). (BUG-023)
  (safe as Error & { code?: string }).code = fallback;
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
 * - Logs the full upstream `code` AND `message` to server logs via `logEvent`
 *   (they are client-safe words — Logto designs them to be user-facing; the
 *   full English message is valuable for operators and safe server-side).
 *   Also logs the legacy `[op] HTTP <status> (code)` line via `warn()`.
 * - Determines the client-facing CODE:
 *     • If the upstream Logto `code` is in the registry (by code value, e.g.
 *       `session.invalid_credentials`), that code is passed to the client so
 *       the i18n layer can map it to a localized message.
 *     • Otherwise, falls back to the dashboard `safeCode` (`UNAUTHORIZED` for
 *       401/403, else the caller-provided `fallback`).
 * - The raw upstream English `message` is NEVER sent to the client. The
 *   `exposeMessage` parameter is kept for backward-compat signature stability
 *   but is deprecated — the client always receives a code, not a message.
 * - Verbosity resolution (`resolveClientCode`) is applied to the code.
 * - Stamps `.code` on the thrown Error so `safeAction` can resolve it.
 *
 * @param res            The fetch Response.
 * @param fallback       Error code used for non-auth failures when the
 *                       upstream code is not a recognised Logto code.
 * @param operation      Label for server-side logging.
 * @param exposeMessage  Deprecated. Kept for signature stability; the client
 *                       always receives a code now (the i18n layer maps it).
 *                       Default false.
 */
export async function throwOnApiError(
  res: Response,
  fallback: ErrorCode,
  operation = 'logto-api',
  exposeMessage = false,
): Promise<void> {
  if (res.ok) return;

  let detail = '';
  try {
    detail = await res.text();
  } catch {
    detail = res.statusText;
  }

  // Parse Logto payload first so we can log the code + message.
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

  // Log status + code via the legacy unstructured line (preserved for parity).
  if (typeof console !== 'undefined') {
    warn(`[${operation}] HTTP ${res.status}${upstreamCode ? ` (${upstreamCode})` : ''}`);
  }

  // NEW: structured log with the full upstream code + message (client-safe
  // words — Logto designs them to be user-facing). The `requestId` is
  // auto-merged by logEvent from requestContext. Field name `upstreamCode`
  // (not `code`) avoids Pino's `code` redact path.
  logEvent.warn(
    LOG_EVENTS.API_ERROR,
    `[${operation}] HTTP ${res.status}${upstreamCode ? ` (${upstreamCode})` : ''}`,
    {
      status: res.status,
      upstreamCode,
      upstreamMessage,
      fallback,
    },
  );

  const safeCode: ErrorCode = AUTH_HTTP_STATUSES.has(res.status)
    ? 'UNAUTHORIZED'
    : fallback;

  // Determine the client-facing code. If the upstream Logto code is in the
  // registry (by code value), pass it through so the i18n layer can map it.
  // Otherwise, fall back to the dashboard safeCode.
  const recognisedKey = upstreamCode ? lookupErrorCodeKey(upstreamCode) : undefined;
  const clientCode: string = recognisedKey && upstreamCode ? upstreamCode : safeCode;

  // Apply verbosity resolution. At `specific` (default) this returns the
  // clientCode itself; at `generic`/`silent` it collapses appropriately.
  const resolvedCode = resolveClientCode(clientCode, clientCode);

  // `exposeMessage` is deprecated — the client always receives a code now.
  // Kept in the signature for backward compatibility; intentionally unused.
  void exposeMessage;

  const safe = new Error(resolvedCode);
  safe.name = 'SanitizedError';
  // Stamp the precise code for safeAction to resolve non-throwOnApiError paths.
  (safe as Error & { code?: string }).code = clientCode;
  throw safe;
}

// ============================================================================
// Plain code helper - for callers that throw hardcoded codes directly
// (e.g. avatar.ts) rather than going through throwOnApiError().
// ============================================================================

/**
 * Creates an Error from a code and an optional underlying detail.
 *
 * Returns a sanitized fixed code error with `.code` stamped so `safeAction`
 * can resolve it via `resolveClientCode`.
 */
export function plainCode(code: ErrorCode, cause?: unknown): Error {
  // `cause` is intentionally ignored for client-safe output.
  void cause;
  const err = new Error(code); // message stays the PRECISE code (unchanged)
  err.name = 'SanitizedError';
  (err as Error & { code?: string }).code = code; // stamp for safeAction
  return err;
}

export { captureMessage } from './capture-message';

export function isAuthError(error: unknown): boolean {
  if (!error) return false;

  // Check custom error properties on any object
  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj.status === 401 || obj.status === 403 || obj.code === 'UNAUTHORIZED' || obj.code === 'UNAUTHENTICATED') {
      return true;
    }
  }

  if (error instanceof Error) {
    if (error.name === 'SanitizedError' && (error.message === 'UNAUTHORIZED' || error.message === 'UNAUTHENTICATED')) {
      return true;
    }
    // Check by error name first (more reliable than message matching)
    if (error.name === 'LogtoClientError' || error.name === 'AuthError') {
      return true;
    }
    // Fallback string matching for legacy/sdk errors
    if (error.message === 'needsAuth' || error.message === 'No access token available for Account API') {
      return true;
    }
    if (error.message.startsWith('Cookies can only be modified')) {
      return true;
    }
  }

  return false;
}

/**
 * Detects OIDC `invalid_grant` errors from Logto's token endpoint.
 *
 * When Logto invalidates a grant server-side (e.g., session revoked from another
 * device), the SDK's token refresh returns an error with `code: 'oidc.invalid_grant'`
 * and message "Grant request is invalid." This detector catches those errors so the
 * proxy can redirect to a clean wipe rather than a generic sign-in.
 */
export function isInvalidGrantError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    // Tight match: exact 'oidc.invalid_grant' or any '*.invalid_grant' suffix.
    // Avoids false positives from unrelated codes that happen to contain the substring.
    if (obj.code === 'oidc.invalid_grant' || (typeof obj.code === 'string' && obj.code.endsWith('.invalid_grant'))) {
      return true;
    }
  }

  if (error instanceof Error) {
    // Anchored pattern: matches "error: invalid_grant" or "error=invalid_grant"
    // Avoids false positives from error messages that mention invalid_grant
    // in other contexts (e.g. "detected invalid_grant upstream in debug context").
    if (/\berror[=:]\s*invalid_grant\b/i.test(error.message)) {
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

    // HTTP status indicators: only match when preceded by HTTP-specific context.
    // E.g. "HTTP 500", "HTTP status 500", "status: 429", "status 429",
    //      "returned 503", "response 503" — NOT "SHA-512" or "processed 500 records".
    if (/\b(?:HTTP(?:\s+\w+)?|status|returned|response)[:\s]+(?:429|5\d{2})\b/i.test(error.message)) {
      return true;
    }
    // Also match "with status NNN" pattern
    if (/\bwith\s+status\s+(?:429|5\d{2})\b/i.test(error.message)) {
      return true;
    }

    // System error codes with word boundaries
    if (/\b(ECONNREFUSED|ETIMEDOUT|ECONNRESET|EPIPE|ENOTFOUND|EADDRINUSE|ECONNABORTED)\b/.test(error.message)) {
      return true;
    }
  }

  return false;
}
