/**
 * ============================================================================
 * Error Code Registry — single source of truth
 * ============================================================================
 *
 * Client-safe (no `server-only` import, no `process.env` access except for the
 * `NEXT_PUBLIC_*` verbosity helper at the bottom). Both server modules and the
 * client toast/i18n layer can import this file.
 *
 * Every error code the dashboard can emit — application codes, OAuth callback
 * codes (RFC 6749 snake_case), and structured Logto API codes
 * (`namespace.subcode` dot-notation) — is declared here with:
 *
 *   - `code`:               the stable string that flows to the client `error`
 *                          field and that the i18n `errors.*` namespace maps.
 *   - `category`:           coarse grouping used for generic-verbosity fallback.
 *   - `defaultVerbosity`:   per-code default when `ERROR_VERBOSITY` env is unset.
 *   - `exposeToClient`:     if false, the precise code is server-log-only and
 *                          the category-generic code is sent instead.
 *
 * `ErrorCode` (the registry key union) replaces the hand-maintained union that
 * used to live in `errors.ts`. All call sites that pass string literals are now
 * type-checked against this registry.
 *
 * Logto structured codes (research/07_logto_error_codes.md) are included so
 * `throwOnApiError` can pass the Logto code through to the client when it is
 * recognised. The i18n layer maps the dot-notation string to a localized
 * message (e.g. `session.invalid_credentials` → `errors.session_invalid_credentials`).
 */

// ============================================================================
// Types
// ============================================================================

/** Coarse category used for generic-verbosity fallback and i18n grouping. */
export type ErrorCategory =
  | 'auth' // identity, session, token, origin/CSRF, verification gate
  | 'rbac' // role / permission / org-membership denials
  | 'validation' // malformed client input
  | 'server' // upstream/operation failures, internal errors, not-found config
  | 'oauth' // OAuth callback error codes from the IdP
  | 'rate-limit' // throttling (429)
  | 'upload'; // avatar / file upload constraints

/** Deployment-level user-facing detail. See verbosity.ts. */
export type Verbosity = 'generic' | 'specific' | 'silent';

export interface ErrorCodeEntry {
  /**
   * Stable string that flows to the client `error` field.
   * Application codes: SCREAMING_SNAKE_CASE.
   * OAuth codes: RFC 6749 snake_case (e.g. `access_denied`).
   * Logto codes: dot-notation (e.g. `session.invalid_credentials`).
   */
  readonly code: string;
  readonly category: ErrorCategory;
  /**
   * Per-code default verbosity used when ERROR_VERBOSITY env is unset.
   * Most codes default to 'specific'. Internal/infra codes default to
   * 'generic' so they are hidden even without env configuration.
   */
  readonly defaultVerbosity: Verbosity;
  /**
   * If false, the precise code is server-log-only and NEVER reaches the
   * client `error` field (the category-generic code is sent instead),
   * regardless of verbosity. Stronger than verbosity. Use for codes that
   * reveal infrastructure steps (introspection, misconfiguration).
   */
  readonly exposeToClient: boolean;
}

// ============================================================================
// The registry
// ============================================================================

export const ERROR_CODES = {
  // ── auth ───────────────────────────────────────────────────────────────
  UNAUTHENTICATED: { code: 'UNAUTHENTICATED', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  FORBIDDEN_ORIGIN: { code: 'FORBIDDEN_ORIGIN', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  VERIFICATION_FAILED: { code: 'VERIFICATION_FAILED', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  VERIFICATION_EXPIRED: { code: 'VERIFICATION_EXPIRED', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  VERIFICATION_REQUIRED: { code: 'VERIFICATION_REQUIRED', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  MISSING_VERIFICATION: { code: 'MISSING_VERIFICATION', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  AUTHORIZATION_FAILED: { code: 'AUTHORIZATION_FAILED', category: 'auth', defaultVerbosity: 'generic', exposeToClient: false }, // reserved/legacy
  INTROSPECTION_ERROR: { code: 'INTROSPECTION_ERROR', category: 'auth', defaultVerbosity: 'generic', exposeToClient: false }, // hides infra step
  TOKEN_INVALID: { code: 'TOKEN_INVALID', category: 'auth', defaultVerbosity: 'generic', exposeToClient: false }, // maps to AUTH_ERROR client-side

  // ── rbac ───────────────────────────────────────────────────────────────
  ROLE_DENIED: { code: 'ROLE_DENIED', category: 'rbac', defaultVerbosity: 'specific', exposeToClient: true },
  PERMISSION_DENIED: { code: 'PERMISSION_DENIED', category: 'rbac', defaultVerbosity: 'specific', exposeToClient: true },
  ORG_NOT_MEMBER: { code: 'ORG_NOT_MEMBER', category: 'rbac', defaultVerbosity: 'specific', exposeToClient: true },

  // ── validation ─────────────────────────────────────────────────────────
  INVALID_INPUT: { code: 'INVALID_INPUT', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  MISSING_FIELDS: { code: 'MISSING_FIELDS', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  INVALID_PAYLOAD: { code: 'INVALID_PAYLOAD', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  PAYLOAD_TOO_LARGE: { code: 'PAYLOAD_TOO_LARGE', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  PHONE_COUNTRY_NOT_ALLOWED: { code: 'PHONE_COUNTRY_NOT_ALLOWED', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },

  // ── server (operation/upstream failures + internal) ───────────────────
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', category: 'server', defaultVerbosity: 'generic', exposeToClient: false },
  IMPROPER_SETUP_ERROR: { code: 'IMPROPER_SETUP_ERROR', category: 'server', defaultVerbosity: 'generic', exposeToClient: false }, // hides misconfiguration
  FETCH_FAILED: { code: 'FETCH_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  UPDATE_FAILED: { code: 'UPDATE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  DELETE_FAILED: { code: 'DELETE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  ACTION_NOT_FOUND: { code: 'ACTION_NOT_FOUND', category: 'server', defaultVerbosity: 'generic', exposeToClient: false },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  MFA_ENROLL_FAILED: { code: 'MFA_ENROLL_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  MFA_REMOVE_FAILED: { code: 'MFA_REMOVE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  BACKUP_CODES_FAILED: { code: 'BACKUP_CODES_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  // CAN-ACT-005: Backup codes already exist and the provider offers no
  // documented atomic replacement operation. A blind retry of the identical
  // enroll body cannot succeed (no factor-state change). Fail safely with old
  // codes retained; the user must delete existing backup codes first.
  BACKUP_CODES_SINGLETON_CONFLICT: { code: 'BACKUP_CODES_SINGLETON_CONFLICT', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  PASSWORD_UPDATE_FAILED: { code: 'PASSWORD_UPDATE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  EMAIL_UPDATE_FAILED: { code: 'EMAIL_UPDATE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  PHONE_UPDATE_FAILED: { code: 'PHONE_UPDATE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_REVOKE_FAILED: { code: 'SESSION_REVOKE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  // BUG-016: Bulk revocation that partially succeeded. Distinct from
  // SESSION_REVOKE_FAILED so the client can surface "some sessions could not
  // be revoked" while the per-session audit records for the ones that DID
  // revoke are still written inside the loop.
  SESSION_REVOKE_PARTIAL: { code: 'SESSION_REVOKE_PARTIAL', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },
  GRANT_REVOKE_FAILED: { code: 'GRANT_REVOKE_FAILED', category: 'server', defaultVerbosity: 'specific', exposeToClient: true },

  // ── rate-limit ─────────────────────────────────────────────────────────
  RATE_LIMITED: { code: 'RATE_LIMITED', category: 'rate-limit', defaultVerbosity: 'specific', exposeToClient: true },
  UPLOAD_RATE_LIMITED: { code: 'UPLOAD_RATE_LIMITED', category: 'rate-limit', defaultVerbosity: 'specific', exposeToClient: true },

  // ── upload ─────────────────────────────────────────────────────────────
  UPLOAD_FAILED: { code: 'UPLOAD_FAILED', category: 'upload', defaultVerbosity: 'specific', exposeToClient: true },
  UPLOAD_TOO_LARGE: { code: 'UPLOAD_TOO_LARGE', category: 'upload', defaultVerbosity: 'specific', exposeToClient: true },
  UPLOAD_INVALID_TYPE: { code: 'UPLOAD_INVALID_TYPE', category: 'upload', defaultVerbosity: 'specific', exposeToClient: true },

  // ── oauth (RFC 6749 snake_case, shown via auth-error-banner) ──────────
  // Registry KEY is prefixed `OAUTH_` to avoid collisions with application
  // codes; the `code` value stays RFC 6749 snake_case so the `?auth_error=`
  // query param and `auth-error-banner` are unchanged.
  OAUTH_ACCESS_DENIED: { code: 'access_denied', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_INVALID_REQUEST: { code: 'invalid_request', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_UNAUTHORIZED_CLIENT: { code: 'unauthorized_client', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_UNSUPPORTED_RESPONSE_TYPE: { code: 'unsupported_response_type', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_INVALID_SCOPE: { code: 'invalid_scope', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_SERVER_ERROR: { code: 'server_error', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_TEMPORARILY_UNAVAILABLE: { code: 'temporarily_unavailable', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_INTERACTION_REQUIRED: { code: 'interaction_required', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_LOGIN_REQUIRED: { code: 'login_required', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_CONSENT_REQUIRED: { code: 'consent_required', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },
  OAUTH_UNKNOWN_ERROR: { code: 'unknown_error', category: 'oauth', defaultVerbosity: 'specific', exposeToClient: true },

  // ── Logto structured API codes (research/07_logto_error_codes.md) ────
  // Registry KEY is the dot-notation uppercased with `_` replacing `.` so it
  // is a valid TypeScript identifier. The `code` value stays the Logto
  // dot-notation string so the i18n layer can map it (e.g.
  // `errors.session_invalid_credentials`).
  //
  // These are client-safe words (Logto designs them to be user-facing); the
  // full `code` + English `message` are also logged server-side by
  // `throwOnApiError` so operators see the precise upstream failure.
  SESSION_INVALID_CREDENTIALS: { code: 'session.invalid_credentials', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_VERIFICATION_FAILED: { code: 'session.verification_failed', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_IDENTIFIER_NOT_FOUND: { code: 'session.identifier_not_found', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_IDENTITY_CONFLICT: { code: 'session.identity_conflict', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_VERIFICATION_SESSION_NOT_FOUND: { code: 'session.verification_session_not_found', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  USER_USER_NOT_EXIST: { code: 'user.user_not_exist', category: 'auth', defaultVerbosity: 'specific', exposeToClient: true },
  GUARD_INVALID_TARGET: { code: 'guard.invalid_target', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  PASSWORD_EXPIRED: { code: 'password.expired', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  PASSWORD_REJECTED: { code: 'password.rejected', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_MFA_BACKUP_CODE_CAN_NOT_BE_ALONE: { code: 'session.mfa.backup_code_can_not_be_alone', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_MFA_MFA_FACTOR_NOT_ENABLED: { code: 'session.mfa.mfa_factor_not_enabled', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_MFA_PENDING_INFO_NOT_FOUND: { code: 'session.mfa.pending_info_not_found', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_MFA_WEBAUTHN_VERIFICATION_FAILED: { code: 'session.mfa.webauthn_verification_failed', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  SESSION_NOT_SUPPORTED_FOR_FORGOT_PASSWORD: { code: 'session.not_supported_for_forgot_password', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  USER_MISSING_PROFILE: { code: 'user.missing_profile', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  USER_PASSWORD_POLICY_VIOLATION: { code: 'user.password_policy_violation', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  USER_SAME_PASSWORD: { code: 'user.same_password', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  USER_TOTP_ALREADY_IN_USE: { code: 'user.totp_already_in_use', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
  USER_USERNAME_ALREADY_IN_USE: { code: 'user.username_already_in_use', category: 'validation', defaultVerbosity: 'specific', exposeToClient: true },
} as const satisfies Record<string, ErrorCodeEntry>;

/** Canonical union — replaces the hand-maintained union in errors.ts. */
export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// Category-generic fallback codes
// ============================================================================

/**
 * Generic code emitted for a category at `generic` verbosity (and for
 * `exposeToClient: false` codes). These are themselves registry keys so the
 * i18n layer can map them. `silent` verbosity emits the opaque `'ERROR'`.
 */
export const CATEGORY_GENERIC_CODE: Record<ErrorCategory, ErrorCode> = {
  auth: 'UNAUTHORIZED', // "Sign in required / session expired"
  rbac: 'PERMISSION_DENIED', // "Permission denied" (already a real code)
  validation: 'INVALID_INPUT', // "Invalid input"
  server: 'INTERNAL_ERROR', // "Something went wrong"
  oauth: 'OAUTH_UNKNOWN_ERROR',
  'rate-limit': 'RATE_LIMITED', // "Slow down"
  upload: 'UPLOAD_FAILED', // "Upload failed"
};

/** Opaque code used at `silent` verbosity. */
export const SILENT_CODE = 'ERROR';

// ============================================================================
// Code-value lookup (used by throwOnApiError to recognise Logto codes)
// ============================================================================

/**
 * Reverse map from `code` value → registry key, so `throwOnApiError` can check
 * whether an upstream Logto `code` (dot-notation) is recognised without having
 * to know the SCREAMING_SNAKE_CASE key.
 */
const CODE_VALUE_TO_KEY: ReadonlyMap<string, ErrorCode> = new Map(
  (Object.entries(ERROR_CODES) as Array<[ErrorCode, ErrorCodeEntry]>).map(
    ([key, entry]) => [entry.code, key],
  ),
);

/**
 * Returns the registry key for a given `code` value, or `undefined` if the
 * code is not in the registry. Accepts either a registry key (e.g.
 * `'UNAUTHORIZED'`) or a code value (e.g. `'access_denied'`,
 * `'session.invalid_credentials'`).
 */
export function lookupErrorCodeKey(code: string): ErrorCode | undefined {
  // First try as a key (for SCREAMING_SNAKE_CASE codes where key === code).
  if (Object.prototype.hasOwnProperty.call(ERROR_CODES, code)) {
    return code as ErrorCode;
  }
  // Then try as a code value (for OAuth snake_case and Logto dot-notation).
  return CODE_VALUE_TO_KEY.get(code);
}

// ============================================================================
// Client-safe verbosity helper
// ============================================================================

/**
 * Client-side verbosity for user-facing error detail. Reads
 * `NEXT_PUBLIC_ERROR_VERBOSITY` (inlined at build time by Next.js).
 *
 * Independent of the server-side `getGlobalVerbosity()` (which reads
 * `ERROR_VERBOSITY`). The server applies its own resolution before sending the
 * code to the client; this helper is used by the toast layer to decide whether
 * to suppress a toast entirely at `silent` verbosity.
 *
 * Returns `undefined` when unset so callers can fall back to the per-code
 * `defaultVerbosity` (effectively `specific`).
 */
export function getClientVerbosity(): Verbosity | undefined {
  const v = process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
  if (v === 'generic' || v === 'specific' || v === 'silent') return v;
  return undefined;
}
