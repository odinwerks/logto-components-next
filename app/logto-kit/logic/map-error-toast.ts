/**
 * ============================================================================
 * Pure error-code-to-human-readable-message mapper
 * ============================================================================
 *
 * Client-safe, no React dependency. Called by the toast context and testable
 * without rendering a provider.
 *
 * Fallback chain (5 tiers):
 *   1. `silent` verbosity → '' (suppress toast entirely)
 *   2. `specific` verbosity → t.errors[code] (exact match)
 *      2a. If not found, try `.` → `_` conversion for Logto dot-notation codes
 *   3. `generic` verbosity OR precise key missing →
 *      t.errors[CATEGORY_GENERIC_CODE[category]]
 *   4. Missing key → t.errors.ERROR
 *   5. No translation at all → return code verbatim (last resort)
 */

import type { Translations } from '../locales';
import {
  ERROR_CODES,
  CATEGORY_GENERIC_CODE,
  SILENT_CODE,
  lookupErrorCodeKey,
  type Verbosity,
  getClientVerbosity,
} from './error-codes';
import { isSilentClientCode } from './verbosity';

/**
 * Pure function (no React dependency). Maps an error code to a human-readable
 * message using the `errors` i18n namespace.
 *
 * @param code       The error code string from an API response `error` field
 * @param t          Translations object (en-US, etc.)
 * @param verbosity  Deployment-level verbosity ('specific' | 'generic' | 'silent').
 *                   If undefined, reads NEXT_PUBLIC_ERROR_VERBOSITY at call time.
 * @returns Human-readable message, or '' for silent, or raw code as last resort
 */
export function createMapErrorToast(
  code: string,
  t: Translations,
  verbosity?: Verbosity,
): string {
  // ERROR is the deliberate server-to-client suppression signal emitted by
  // ERROR_VERBOSITY=silent. It must work even when the public env is unset.
  if (isSilentClientCode(code)) return '';

  const v = verbosity ?? getClientVerbosity();

  // ── Tier 1: silent verbosity → suppress toast ──────────────────────────
  if (v === 'silent') return '';

  // ── Tier 2: specific verbosity → precise code lookup ───────────────────
  if (!v || v === 'specific') {
    const message = lookupErrorsKey(code, t.errors);
    if (message !== undefined) return message;
    // Fall through to generic if precise key is missing
  }

  // ── Tier 3: generic verbosity (or precise key missing) → category-generic
  const entryKey = lookupErrorCodeKey(code);
  if (entryKey) {
    const entry = ERROR_CODES[entryKey];
    const genericCode = CATEGORY_GENERIC_CODE[entry.category];
    const message = lookupErrorsKey(genericCode, t.errors);
    if (message !== undefined) return message;
    // Fall through to ERROR if category-generic key is missing
  }

  // ── Tier 4: ultimate fallback → ERROR ──────────────────────────────────
  const errorMessage = lookupErrorsKey(SILENT_CODE, t.errors);
  if (errorMessage !== undefined) return errorMessage;

  // ── Tier 5: no translation at all → raw code (legacy behavior) ─────────
  return code;
}

/**
 * Alias for `createMapErrorToast` — the canonical client-safe
 * error-code-to-message mapper. Kept as a direct alias (no duplicated logic).
 */
export const mapErrorCode = createMapErrorToast;

/**
 * Looks up a code string in the errors translations object. Tries the raw
 * string first, then the dot-to-underscore variant (for Logto dot-notation
 * codes like `session.invalid_credentials` → `session_invalid_credentials`).
 * Returns the message string if found, or undefined.
 */
function lookupErrorsKey(
  code: string,
  errors: Translations['errors'],
): string | undefined {
  // Try the raw key first (works for SCREAMING_SNAKE_CASE and snake_case)
  const rawKey = code as keyof Translations['errors'];
  if (Object.hasOwn(errors, rawKey)) return errors[rawKey];

  // Try dot-to-underscore conversion for Logto dot-notation codes
  // (e.g. `session.invalid_credentials` → `session_invalid_credentials`)
  if (code.includes('.')) {
    const underscoreKey = code.replace(/\./g, '_') as keyof Translations['errors'];
    if (Object.hasOwn(errors, underscoreKey)) return errors[underscoreKey];
  }

  return undefined;
}
