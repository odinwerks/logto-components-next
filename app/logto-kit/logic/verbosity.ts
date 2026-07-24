/**
 * ============================================================================
 * Verbosity control for client-facing error detail
 * ============================================================================
 *
 * Controls what string reaches the client `error` field, independent of
 * `LOG_LEVEL` (which controls Pino/server-side verbosity). Safe to import in
 * both server and client contexts.
 *
 * The server ALWAYS logs the precise code (and, for Logto structured errors,
 * the full `code` + English `message`) via `logEvent` regardless of this
 * setting. Verbosity only affects the string placed in the client response.
 *
 *   ERROR_VERBOSITY=silent   → client sees 'ERROR' (toasts suppressed)
 *   ERROR_VERBOSITY=generic  → client sees the category-generic code
 *   ERROR_VERBOSITY=specific → client sees the precise code (default)
 *
 * `exposeToClient: false` codes are always forced to the category-generic
 * code (or `'ERROR'` at silent) — they never leak, regardless of verbosity.
 */
import {
  ERROR_CODES,
  CATEGORY_GENERIC_CODE,
  SILENT_CODE,
  lookupErrorCodeKey,
  type ErrorCode,
  type Verbosity,
} from './error-codes';

/**
 * Global deployment verbosity for user-facing error detail.
 * Reads `ERROR_VERBOSITY` env. If unset, returns undefined so per-code
 * `defaultVerbosity` applies (see `resolveClientCode`).
 *
 * INDEPENDENT of `LOG_LEVEL` (which controls Pino/server-side verbosity).
 * The server ALWAYS logs the precise code via logEvent regardless of this.
 *
 * Client-safe: returns `undefined` when `process.env` is unavailable
 * (e.g. in browser bundles), so per-code defaults apply.
 */
export function getGlobalVerbosity(): Verbosity | undefined {
  if (typeof process === 'undefined' || !process.env) return undefined;
  const v = process.env.ERROR_VERBOSITY;
  if (v === 'generic' || v === 'specific' || v === 'silent') return v;
  return undefined;
}

/**
 * Resolves the registry entry for a code that may be either a registry KEY
 * (e.g. `'UNAUTHORIZED'`) or a code VALUE (e.g. `'access_denied'`,
 * `'session.invalid_credentials'`).
 */
function lookupEntry(code: string): { key: ErrorCode; entry: (typeof ERROR_CODES)[ErrorCode] } | undefined {
  const key = lookupErrorCodeKey(code);
  if (!key) return undefined;
  return { key, entry: ERROR_CODES[key] };
}

/**
 * Resolves the string to place in the client-bound `error` field.
 *
 * @param preciseCode  The registry code (key OR value) from err.code or the
 *                     thrown message.
 * @param displayValue What captureMessage(err) would return — the precise code
 *                     OR, for exposeMessage=true paths, Logto's upstream message.
 * @param verbosity    Override verbosity; defaults to global env then per-code.
 * @returns The client-facing string.
 *
 * - specific → displayValue (precise code or upstream msg)
 * - generic  → category-generic code (hides precise code AND upstream msg)
 * - silent   → SILENT_CODE ('ERROR')
 *
 * exposeToClient:false codes are forced to category-generic (or 'ERROR' at
 * silent) regardless of verbosity — they never leak.
 */
export function resolveClientCode(
  preciseCode: string | undefined,
  displayValue: string,
  verbosity?: Verbosity,
): string {
  const lookedUp = preciseCode ? lookupEntry(preciseCode) : undefined;

  // Not a registry code (e.g. upstream message passthrough at specific).
  if (!lookedUp) {
    const v = verbosity ?? getGlobalVerbosity() ?? 'specific';
    return v === 'silent' ? SILENT_CODE : displayValue;
  }

  const { entry } = lookedUp;
  const v = verbosity ?? getGlobalVerbosity() ?? entry.defaultVerbosity;
  if (v === 'silent') return SILENT_CODE;
  if (v === 'generic' || !entry.exposeToClient) {
    return CATEGORY_GENERIC_CODE[entry.category];
  }
  return displayValue; // specific + exposeToClient:true
}

/**
 * Server-side helper kept for the plan contract. At `specific` it reproduces
 * the legacy behavior: `exposeMessage ? (upstreamMessage ?? safeCode) : safeCode`.
 *
 * NOTE: `throwOnApiError` no longer uses this for the client message — per the
 * task requirement, the client always receives a CODE (either the Logto code
 * if recognised, or the safeCode), never the raw upstream English message.
 * The i18n layer maps the code to a localized message. This function is
 * exported for compatibility and for any caller that explicitly opts into the
 * legacy message-passthrough behavior.
 */
export function resolveClientMessage(
  safeCode: ErrorCode,
  upstreamMessage: string | undefined,
  exposeMessage: boolean,
  verbosity?: Verbosity,
): string {
  const entry = ERROR_CODES[safeCode];
  const v = verbosity ?? getGlobalVerbosity() ?? entry.defaultVerbosity;
  if (v === 'silent') return SILENT_CODE;
  if (v === 'generic' || !entry.exposeToClient) {
    return CATEGORY_GENERIC_CODE[entry.category];
  }
  // specific
  return exposeMessage ? (upstreamMessage ?? safeCode) : safeCode;
}
