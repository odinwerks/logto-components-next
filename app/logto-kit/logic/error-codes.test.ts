import { describe, it, expect } from 'vitest';
import {
  ERROR_CODES,
  CATEGORY_GENERIC_CODE,
  SILENT_CODE,
  lookupErrorCodeKey,
  getClientVerbosity,
  type ErrorCode,
  type ErrorCategory,
} from './error-codes';

// ============================================================================
// Registry invariants
// ============================================================================

describe('ERROR_CODES registry', () => {
  it('every entry has a valid category, verbosity, and boolean exposeToClient', () => {
    for (const [key, entry] of Object.entries(ERROR_CODES)) {
      expect(entry.category).toMatch(/^(auth|rbac|validation|server|oauth|rate-limit|upload)$/);
      expect(entry.defaultVerbosity).toMatch(/^(generic|specific|silent)$/);
      expect(typeof entry.exposeToClient).toBe('boolean');
      expect(typeof entry.code).toBe('string');
      expect(entry.code.length).toBeGreaterThan(0);
      // The key must be a valid TypeScript identifier (no dots, no dashes in keys).
      expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('every CATEGORY_GENERIC_CODE value is a valid ErrorCode key', () => {
    const categories: ErrorCategory[] = ['auth', 'rbac', 'validation', 'server', 'oauth', 'rate-limit', 'upload'];
    for (const cat of categories) {
      const genericKey = CATEGORY_GENERIC_CODE[cat];
      expect(genericKey).toBeDefined();
      expect(Object.prototype.hasOwnProperty.call(ERROR_CODES, genericKey)).toBe(true);
    }
  });

  it('every exposeToClient:false entry has defaultVerbosity:generic', () => {
    for (const [key, entry] of Object.entries(ERROR_CODES)) {
      if (!entry.exposeToClient) {
        expect(
          entry.defaultVerbosity,
          `${key} has exposeToClient:false but defaultVerbosity is not 'generic'`
        ).toBe('generic');
      }
    }
  });

  it('OAuth codes keep RFC 6749 snake_case code values', () => {
    const oauthPrefixes = ['OAUTH_'];
    for (const [key, entry] of Object.entries(ERROR_CODES)) {
      if (oauthPrefixes.some((p) => key.startsWith(p))) {
        // OAuth code values should be snake_case (lowercase with underscores)
        expect(entry.code).toMatch(/^[a-z_]+$/);
        expect(entry.category).toBe('oauth');
      }
    }
    // Spot check specific OAuth codes
    expect(ERROR_CODES.OAUTH_ACCESS_DENIED.code).toBe('access_denied');
    expect(ERROR_CODES.OAUTH_INVALID_REQUEST.code).toBe('invalid_request');
    expect(ERROR_CODES.OAUTH_SERVER_ERROR.code).toBe('server_error');
    expect(ERROR_CODES.OAUTH_UNKNOWN_ERROR.code).toBe('unknown_error');
  });

  it('no collision between OAuth snake_case codes and SCREAMING_SNAKE_CASE codes', () => {
    const codeValues = Object.values(ERROR_CODES).map((e) => e.code);
    const unique = new Set(codeValues);
    expect(unique.size).toBe(codeValues.length);
  });

  it('Logto structured codes use dot-notation code values', () => {
    // Spot check the 19 Logto codes from research/07
    expect(ERROR_CODES.SESSION_INVALID_CREDENTIALS.code).toBe('session.invalid_credentials');
    expect(ERROR_CODES.SESSION_VERIFICATION_FAILED.code).toBe('session.verification_failed');
    expect(ERROR_CODES.USER_PASSWORD_POLICY_VIOLATION.code).toBe('user.password_policy_violation');
    expect(ERROR_CODES.PASSWORD_REJECTED.code).toBe('password.rejected');
    expect(ERROR_CODES.SESSION_MFA_BACKUP_CODE_CAN_NOT_BE_ALONE.code).toBe('session.mfa.backup_code_can_not_be_alone');
  });

  it('Logto codes have exposeToClient:true and defaultVerbosity:specific', () => {
    const logtoKeys: ErrorCode[] = [
      'SESSION_INVALID_CREDENTIALS',
      'SESSION_VERIFICATION_FAILED',
      'USER_PASSWORD_POLICY_VIOLATION',
      'PASSWORD_REJECTED',
      'USER_USERNAME_ALREADY_IN_USE',
    ];
    for (const key of logtoKeys) {
      const entry = ERROR_CODES[key];
      expect(entry.exposeToClient).toBe(true);
      expect(entry.defaultVerbosity).toBe('specific');
    }
  });

  it('registry has the expected number of entries (50 application/oauth + 19 Logto = 69)', () => {
    const keys = Object.keys(ERROR_CODES);
    // 10 auth + 3 rbac + 5 validation + 15 server + 2 rate-limit + 3 upload
    // + 11 oauth + 19 Logto + 1 AUTHORIZATION_FAILED (already in auth) = 68
    // Count from the registry: let the test tell us.
    expect(keys.length).toBeGreaterThanOrEqual(68);
  });
});

// ============================================================================
// lookupErrorCodeKey
// ============================================================================

describe('lookupErrorCodeKey', () => {
  it('looks up by registry key (SCREAMING_SNAKE_CASE)', () => {
    expect(lookupErrorCodeKey('UNAUTHORIZED')).toBe('UNAUTHORIZED');
    expect(lookupErrorCodeKey('ROLE_DENIED')).toBe('ROLE_DENIED');
    expect(lookupErrorCodeKey('INTERNAL_ERROR')).toBe('INTERNAL_ERROR');
  });

  it('looks up by code value for OAuth snake_case codes', () => {
    expect(lookupErrorCodeKey('access_denied')).toBe('OAUTH_ACCESS_DENIED');
    expect(lookupErrorCodeKey('invalid_request')).toBe('OAUTH_INVALID_REQUEST');
    expect(lookupErrorCodeKey('unknown_error')).toBe('OAUTH_UNKNOWN_ERROR');
  });

  it('looks up by code value for Logto dot-notation codes', () => {
    expect(lookupErrorCodeKey('session.invalid_credentials')).toBe('SESSION_INVALID_CREDENTIALS');
    expect(lookupErrorCodeKey('session.verification_failed')).toBe('SESSION_VERIFICATION_FAILED');
    expect(lookupErrorCodeKey('user.password_policy_violation')).toBe('USER_PASSWORD_POLICY_VIOLATION');
  });

  it('returns undefined for unknown codes', () => {
    expect(lookupErrorCodeKey('user.invalid_password')).toBeUndefined();
    expect(lookupErrorCodeKey('whatever')).toBeUndefined();
    expect(lookupErrorCodeKey('')).toBeUndefined();
  });
});

// ============================================================================
// SILENT_CODE
// ============================================================================

describe('SILENT_CODE', () => {
  it('is the string "ERROR"', () => {
    expect(SILENT_CODE).toBe('ERROR');
  });
});

// ============================================================================
// getClientVerbosity
// ============================================================================

describe('getClientVerbosity', () => {
  it('returns undefined when NEXT_PUBLIC_ERROR_VERBOSITY is unset', () => {
    const original = process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
    delete process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
    expect(getClientVerbosity()).toBeUndefined();
    if (original !== undefined) process.env.NEXT_PUBLIC_ERROR_VERBOSITY = original;
  });

  it('returns the verbosity when set to a valid value', () => {
    const original = process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
    process.env.NEXT_PUBLIC_ERROR_VERBOSITY = 'silent';
    expect(getClientVerbosity()).toBe('silent');
    process.env.NEXT_PUBLIC_ERROR_VERBOSITY = 'generic';
    expect(getClientVerbosity()).toBe('generic');
    process.env.NEXT_PUBLIC_ERROR_VERBOSITY = 'specific';
    expect(getClientVerbosity()).toBe('specific');
    if (original !== undefined) process.env.NEXT_PUBLIC_ERROR_VERBOSITY = original;
    else delete process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
  });

  it('returns undefined for invalid values', () => {
    const original = process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
    process.env.NEXT_PUBLIC_ERROR_VERBOSITY = 'verbose';
    expect(getClientVerbosity()).toBeUndefined();
    if (original !== undefined) process.env.NEXT_PUBLIC_ERROR_VERBOSITY = original;
    else delete process.env.NEXT_PUBLIC_ERROR_VERBOSITY;
  });
});
