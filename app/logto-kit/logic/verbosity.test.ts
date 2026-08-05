import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getGlobalVerbosity,
  resolveClientCode,
  resolveClientMessage,
  isSilentClientCode,
} from './verbosity';
import { ERROR_CODES, CATEGORY_GENERIC_CODE, SILENT_CODE } from './error-codes';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

// ============================================================================
// getGlobalVerbosity
// ============================================================================

describe('getGlobalVerbosity', () => {
  it('returns undefined when ERROR_VERBOSITY is unset', () => {
    delete process.env.ERROR_VERBOSITY;
    expect(getGlobalVerbosity()).toBeUndefined();
  });

  it('returns the verbosity when set to a valid value', () => {
    vi.stubEnv('ERROR_VERBOSITY', 'silent');
    expect(getGlobalVerbosity()).toBe('silent');
    vi.stubEnv('ERROR_VERBOSITY', 'generic');
    expect(getGlobalVerbosity()).toBe('generic');
    vi.stubEnv('ERROR_VERBOSITY', 'specific');
    expect(getGlobalVerbosity()).toBe('specific');
  });

  it('returns undefined for invalid values', () => {
    vi.stubEnv('ERROR_VERBOSITY', 'verbose');
    expect(getGlobalVerbosity()).toBeUndefined();
  });
});

describe('isSilentClientCode', () => {
  it('recognizes the deliberate server suppression signal', () => {
    expect(isSilentClientCode(SILENT_CODE)).toBe(true);
    expect(isSilentClientCode('INTERNAL_ERROR')).toBe(false);
    expect(isSilentClientCode(undefined)).toBe(false);
  });
});

// ============================================================================
// resolveClientCode
// ============================================================================

describe('resolveClientCode', () => {
  it('returns displayValue at specific verbosity for exposeToClient:true codes', () => {
    expect(resolveClientCode('ROLE_DENIED', 'ROLE_DENIED', 'specific')).toBe('ROLE_DENIED');
    expect(resolveClientCode('UNAUTHORIZED', 'UNAUTHORIZED', 'specific')).toBe('UNAUTHORIZED');
  });

  it('returns category-generic code at generic verbosity', () => {
    expect(resolveClientCode('ROLE_DENIED', 'ROLE_DENIED', 'generic')).toBe(
      CATEGORY_GENERIC_CODE['rbac'],
    );
    expect(resolveClientCode('VERIFICATION_FAILED', 'VERIFICATION_FAILED', 'generic')).toBe(
      CATEGORY_GENERIC_CODE['auth'],
    );
  });

  it('returns SILENT_CODE at silent verbosity', () => {
    expect(resolveClientCode('ROLE_DENIED', 'ROLE_DENIED', 'silent')).toBe(SILENT_CODE);
    expect(resolveClientCode('UNAUTHORIZED', 'UNAUTHORIZED', 'silent')).toBe(SILENT_CODE);
  });

  it('forces exposeToClient:false codes to category-generic even at specific', () => {
    // INTERNAL_ERROR has exposeToClient:false
    expect(resolveClientCode('INTERNAL_ERROR', 'INTERNAL_ERROR', 'specific')).toBe('INTERNAL_ERROR');
    // Wait — INTERNAL_ERROR is the category-generic for server, so it returns itself.
    // Let's use IMPROPER_SETUP_ERROR which is exposeToClient:false and NOT the generic.
    expect(resolveClientCode('IMPROPER_SETUP_ERROR', 'IMPROPER_SETUP_ERROR', 'specific')).toBe(
      CATEGORY_GENERIC_CODE['server'],
    );
    expect(resolveClientCode('TOKEN_INVALID', 'TOKEN_INVALID', 'specific')).toBe(
      CATEGORY_GENERIC_CODE['auth'],
    );
    expect(resolveClientCode('INTROSPECTION_ERROR', 'INTROSPECTION_ERROR', 'specific')).toBe(
      CATEGORY_GENERIC_CODE['auth'],
    );
  });

  it('forces exposeToClient:false codes to SILENT_CODE at silent', () => {
    expect(resolveClientCode('IMPROPER_SETUP_ERROR', 'IMPROPER_SETUP_ERROR', 'silent')).toBe(
      SILENT_CODE,
    );
  });

  it('falls back to per-code defaultVerbosity when no verbosity arg', () => {
    delete process.env.ERROR_VERBOSITY;
    // ROLE_DENIED defaults to 'specific'
    expect(resolveClientCode('ROLE_DENIED', 'ROLE_DENIED')).toBe('ROLE_DENIED');
    // IMPROPER_SETUP_ERROR defaults to 'generic' + exposeToClient:false → generic
    expect(resolveClientCode('IMPROPER_SETUP_ERROR', 'IMPROPER_SETUP_ERROR')).toBe(
      CATEGORY_GENERIC_CODE['server'],
    );
  });

  it('handles Logto dot-notation codes by code value', () => {
    expect(resolveClientCode('session.invalid_credentials', 'session.invalid_credentials', 'specific')).toBe(
      'session.invalid_credentials',
    );
    expect(resolveClientCode('session.invalid_credentials', 'session.invalid_credentials', 'generic')).toBe(
      CATEGORY_GENERIC_CODE['auth'],
    );
    expect(resolveClientCode('session.invalid_credentials', 'session.invalid_credentials', 'silent')).toBe(
      SILENT_CODE,
    );
  });

  it('handles OAuth snake_case codes by code value', () => {
    expect(resolveClientCode('access_denied', 'access_denied', 'specific')).toBe('access_denied');
    expect(resolveClientCode('access_denied', 'access_denied', 'generic')).toBe(
      CATEGORY_GENERIC_CODE['oauth'],
    );
  });

  it('passes through non-registry displayValue at specific', () => {
    // A non-registry string (e.g. upstream message passthrough)
    expect(resolveClientCode(undefined, 'some upstream message', 'specific')).toBe(
      'some upstream message',
    );
    expect(resolveClientCode('not-a-registry-code', 'some upstream message', 'specific')).toBe(
      'some upstream message',
    );
  });

  it('returns SILENT_CODE for non-registry at silent', () => {
    expect(resolveClientCode(undefined, 'some upstream message', 'silent')).toBe(SILENT_CODE);
  });
});

// ============================================================================
// resolveClientMessage (legacy contract — kept for plan compatibility)
// ============================================================================

describe('resolveClientMessage', () => {
  it('at specific: returns exposeMessage ? upstreamMessage ?? safeCode : safeCode (legacy parity)', () => {
    // exposeMessage=false → safeCode
    expect(resolveClientMessage('UPDATE_FAILED', undefined, false, 'specific')).toBe('UPDATE_FAILED');
    expect(resolveClientMessage('UPDATE_FAILED', 'some message', false, 'specific')).toBe('UPDATE_FAILED');
    // exposeMessage=true with message → message
    expect(resolveClientMessage('UPDATE_FAILED', 'Password too short', true, 'specific')).toBe(
      'Password too short',
    );
    // exposeMessage=true without message → safeCode
    expect(resolveClientMessage('UPDATE_FAILED', undefined, true, 'specific')).toBe('UPDATE_FAILED');
  });

  it('at generic: returns category-generic code', () => {
    expect(resolveClientMessage('UPDATE_FAILED', 'some message', true, 'generic')).toBe(
      CATEGORY_GENERIC_CODE['server'],
    );
    expect(resolveClientMessage('ROLE_DENIED', 'some message', false, 'generic')).toBe(
      CATEGORY_GENERIC_CODE['rbac'],
    );
  });

  it('at silent: returns SILENT_CODE', () => {
    expect(resolveClientMessage('UPDATE_FAILED', 'some message', true, 'silent')).toBe(SILENT_CODE);
  });

  it('forces exposeToClient:false codes to category-generic even at specific', () => {
    expect(resolveClientMessage('IMPROPER_SETUP_ERROR', 'some message', true, 'specific')).toBe(
      CATEGORY_GENERIC_CODE['server'],
    );
  });
});

// ============================================================================
// Parity proof: resolveClientCode at 'specific' for exposeToClient:true codes
// returns the code itself (same as current throwOnApiError for safeCode paths)
// ============================================================================

describe('parity proof', () => {
  it('for every exposeToClient:true ErrorCode, resolveClientCode(key, code, "specific") === code', () => {
    for (const [key, entry] of Object.entries(ERROR_CODES)) {
      if (!entry.exposeToClient) continue;
      // Pass the key as preciseCode (for lookup) and entry.code as displayValue
      // (what the client sees). At specific, the displayValue is returned.
      const result = resolveClientCode(key, entry.code, 'specific');
      expect(result, `${key} should resolve to its code value at specific`).toBe(entry.code);
    }
  });
});
