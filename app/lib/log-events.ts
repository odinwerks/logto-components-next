/**
 * Typed event registry for structured logging.
 *
 * All log events this application cares about are defined here as constants.
 * The `LogEvent` type is a union of all event strings, providing compile-time
 * safety when logging.
 */

export const LOG_EVENTS = {
  // Authentication
  AUTH_SIGN_IN: 'AUTH_SIGN_IN',
  AUTH_SIGN_OUT: 'AUTH_SIGN_OUT',
  AUTH_TOKEN_ERROR: 'AUTH_TOKEN_ERROR',
  AUTH_COOKIE_WIPE: 'AUTH_COOKIE_WIPE',
  AUTH_STALE_COOKIE: 'AUTH_STALE_COOKIE',
  // NOTE: AUTH_TOKEN_REFRESH removed — SDK owns refresh; no hook exists.

  // RBAC
  RBAC_PERMISSION_DENIED: 'RBAC_PERMISSION_DENIED',
  RBAC_ORG_VALIDATION: 'RBAC_ORG_VALIDATION',
  // NOTE: RBAC_PERMISSION_CHECK removed — we log denials, not successful
  // checks; high signal/noise.

  // API
  API_REQUEST: 'API_REQUEST',
  API_ERROR: 'API_ERROR',
  API_PROTECTED_ACTION: 'API_PROTECTED_ACTION',
  API_THROTTLED: 'API_THROTTLED',

  // MFA
  MFA_ENROLL: 'MFA_ENROLL',
  MFA_REMOVE: 'MFA_REMOVE',
  MFA_TOTP_REPLACE: 'MFA_TOTP_REPLACE',
  MFA_BACKUP_CODES_GENERATE: 'MFA_BACKUP_CODES_GENERATE',
  MFA_WEBAUTHN_RENAME: 'MFA_WEBAUTHN_RENAME',

  // Password
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',

  // Avatar
  AVATAR_UPLOAD: 'AVATAR_UPLOAD',

  // Account
  ACCOUNT_DELETE: 'ACCOUNT_DELETE',

  // Sessions
  SESSION_REVOKE: 'SESSION_REVOKE',
  SESSION_HEARTBEAT: 'SESSION_HEARTBEAT',

  // Personal access tokens
  PAT_CREATE: 'PAT_CREATE',
  PAT_RENAME: 'PAT_RENAME',
  PAT_DELETE: 'PAT_DELETE',

  // Verification
  VERIFICATION_PASSWORD: 'VERIFICATION_PASSWORD',
  VERIFICATION_EMAIL: 'VERIFICATION_EMAIL',
  VERIFICATION_PHONE: 'VERIFICATION_PHONE',

  // User data
  USER_PROFILE_UPDATE: 'USER_PROFILE_UPDATE',
  USER_CUSTOM_DATA_UPDATE: 'USER_CUSTOM_DATA_UPDATE',

  // Configuration
  CONFIG_ERROR: 'CONFIG_ERROR',

  // Generic - catchall for unstructured console-style logs
  GENERIC_LOG: 'GENERIC_LOG',
} as const;

/**
 * Union type of all valid log event strings.
 * Use this type for the `event` field in log entries.
 */
export type LogEvent = (typeof LOG_EVENTS)[keyof typeof LOG_EVENTS];
