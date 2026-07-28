import { describe, it, expect } from 'vitest';
import { enUS } from '../en-US';
import { ukUA } from '../uk-UA';
import { kaGE } from '../ka-GE';

// The full expected set of `errors` keys — must match across all three locales.
// These are the code values the client can receive, matching the ERROR_CODES registry.
const EXPECTED_ERROR_KEYS = [
  // ── auth ──
  'UNAUTHENTICATED', 'UNAUTHORIZED', 'FORBIDDEN_ORIGIN',
  'VERIFICATION_FAILED', 'VERIFICATION_EXPIRED', 'VERIFICATION_REQUIRED',
  'MISSING_VERIFICATION',

  // ── rbac ──
  'ROLE_DENIED', 'PERMISSION_DENIED', 'ORG_NOT_MEMBER',

  // ── validation ──
  'INVALID_INPUT', 'MISSING_FIELDS', 'INVALID_PAYLOAD',
  'PAYLOAD_TOO_LARGE', 'PHONE_COUNTRY_NOT_ALLOWED',

  // ── server ──
  'INTERNAL_ERROR', 'FETCH_FAILED', 'UPDATE_FAILED', 'DELETE_FAILED',
  'SERVICE_UNAVAILABLE', 'MFA_ENROLL_FAILED', 'MFA_REMOVE_FAILED',
  'BACKUP_CODES_FAILED', 'BACKUP_CODES_SINGLETON_CONFLICT', 'PASSWORD_UPDATE_FAILED', 'EMAIL_UPDATE_FAILED',
  'PHONE_UPDATE_FAILED', 'SESSION_REVOKE_FAILED', 'GRANT_REVOKE_FAILED',

  // ── rate-limit ──
  'RATE_LIMITED', 'UPLOAD_RATE_LIMITED',

  // ── upload ──
  'UPLOAD_FAILED', 'UPLOAD_TOO_LARGE', 'UPLOAD_INVALID_TYPE',

  // ── oauth (snake_case per RFC 6749) ──
  'access_denied', 'invalid_request', 'unauthorized_client',
  'unsupported_response_type', 'invalid_scope', 'server_error',
  'temporarily_unavailable', 'interaction_required', 'login_required',
  'consent_required', 'unknown_error', 'OAUTH_UNKNOWN_ERROR',

  // ── silent / ultimate fallback ──
  'ERROR',

  // ── Logto structured API codes (dot-notation → underscore in key) ──
  'session_invalid_credentials', 'session_verification_failed',
  'session_identifier_not_found', 'session_identity_conflict',
  'session_verification_session_not_found', 'user_user_not_exist',
  'guard_invalid_target', 'password_expired', 'password_rejected',
  'session_mfa_backup_code_can_not_be_alone',
  'session_mfa_mfa_factor_not_enabled',
  'session_mfa_pending_info_not_found',
  'session_mfa_webauthn_verification_failed',
  'session_not_supported_for_forgot_password',
  'user_missing_profile', 'user_password_policy_violation',
  'user_same_password', 'user_totp_already_in_use',
  'user_username_already_in_use',
];

describe('Locale error-keys parity', () => {
  it('all three locales have identical errors keys', () => {
    const enKeys = Object.keys(enUS.errors).sort();
    const ukKeys = Object.keys(ukUA.errors).sort();
    const kaKeys = Object.keys(kaGE.errors).sort();

    expect(ukKeys).toEqual(enKeys);
    expect(kaKeys).toEqual(enKeys);
  });

  it('en-US errors keys match the expected closed set', () => {
    const enKeys = Object.keys(enUS.errors).sort();
    const expected = [...EXPECTED_ERROR_KEYS].sort();

    expect(enKeys).toEqual(expected);
  });

  it('all en-US error messages are non-empty strings', () => {
    for (const [key, value] of Object.entries(enUS.errors)) {
      expect(value, `enUS.errors.${key} should be a non-empty string`).toMatch(/.+/);
    }
  });

  it('all uk-UA error messages are non-empty strings', () => {
    for (const [key, value] of Object.entries(ukUA.errors)) {
      expect(value, `ukUA.errors.${key} should be a non-empty string`).toMatch(/.+/);
    }
  });

  it('all ka-GE error messages are non-empty strings', () => {
    for (const [key, value] of Object.entries(kaGE.errors)) {
      expect(value, `kaGE.errors.${key} should be a non-empty string`).toMatch(/.+/);
    }
  });
});
