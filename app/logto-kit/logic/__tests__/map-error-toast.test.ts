import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMapErrorToast } from '../map-error-toast';
import { enUS } from '../../locales/en-US';

const t = enUS;

describe('createMapErrorToast', () => {
  // ── Default (specific) verbosity ──────────────────────────────────────────

  it('maps a known application code at specific verbosity', () => {
    expect(createMapErrorToast('ROLE_DENIED', t, 'specific')).toBe(t.errors.ROLE_DENIED);
  });

  it('maps PERMISSION_DENIED at specific verbosity', () => {
    expect(createMapErrorToast('PERMISSION_DENIED', t, 'specific')).toBe(t.errors.PERMISSION_DENIED);
  });

  it('maps UNAUTHORIZED at specific verbosity', () => {
    expect(createMapErrorToast('UNAUTHORIZED', t, 'specific')).toBe(t.errors.UNAUTHORIZED);
  });

  it('maps PHONE_COUNTRY_NOT_ALLOWED at specific verbosity (regression)', () => {
    expect(createMapErrorToast('PHONE_COUNTRY_NOT_ALLOWED', t, 'specific')).toBe(t.errors.PHONE_COUNTRY_NOT_ALLOWED);
  });

  it('maps INTERNAL_ERROR at specific verbosity', () => {
    expect(createMapErrorToast('INTERNAL_ERROR', t, 'specific')).toBe(t.errors.INTERNAL_ERROR);
  });

  // ── OAuth codes ───────────────────────────────────────────────────────────

  it('maps a known OAuth code (access_denied)', () => {
    expect(createMapErrorToast('access_denied', t, 'specific')).toBe(t.errors.access_denied);
  });

  it('maps server_error OAuth code', () => {
    expect(createMapErrorToast('server_error', t, 'specific')).toBe(t.errors.server_error);
  });

  it('maps login_required OAuth code', () => {
    expect(createMapErrorToast('login_required', t, 'specific')).toBe(t.errors.login_required);
  });

  // ── Logto dot-notation codes (. → _ lookup) ──────────────────────────────

  it('maps session.invalid_credentials via dot-to-underscore', () => {
    expect(createMapErrorToast('session.invalid_credentials', t, 'specific')).toBe(t.errors.session_invalid_credentials);
  });

  it('maps user.password_policy_violation via dot-to-underscore', () => {
    expect(createMapErrorToast('user.password_policy_violation', t, 'specific')).toBe(t.errors.user_password_policy_violation);
  });

  it('maps session.mfa.backup_code_can_not_be_alone via dot-to-underscore', () => {
    expect(createMapErrorToast('session.mfa.backup_code_can_not_be_alone', t, 'specific')).toBe(t.errors.session_mfa_backup_code_can_not_be_alone);
  });

  // ── Generic verbosity ─────────────────────────────────────────────────────

  it('maps auth code to UNAUTHORIZED at generic verbosity', () => {
    expect(createMapErrorToast('VERIFICATION_FAILED', t, 'generic')).toBe(t.errors.UNAUTHORIZED);
  });

  it('maps rbac code to PERMISSION_DENIED at generic verbosity', () => {
    expect(createMapErrorToast('ROLE_DENIED', t, 'generic')).toBe(t.errors.PERMISSION_DENIED);
  });

  it('maps validation code to INVALID_INPUT at generic verbosity', () => {
    expect(createMapErrorToast('MISSING_FIELDS', t, 'generic')).toBe(t.errors.INVALID_INPUT);
  });

  it('maps server code to INTERNAL_ERROR at generic verbosity', () => {
    expect(createMapErrorToast('FETCH_FAILED', t, 'generic')).toBe(t.errors.INTERNAL_ERROR);
  });

  it('maps oauth code to OAUTH_UNKNOWN_ERROR at generic verbosity', () => {
    expect(createMapErrorToast('access_denied', t, 'generic')).toBe(t.errors.OAUTH_UNKNOWN_ERROR);
  });

  it('maps rate-limit code to RATE_LIMITED at generic verbosity', () => {
    expect(createMapErrorToast('UPLOAD_RATE_LIMITED', t, 'generic')).toBe(t.errors.RATE_LIMITED);
  });

  it('maps upload code to UPLOAD_FAILED at generic verbosity', () => {
    expect(createMapErrorToast('UPLOAD_TOO_LARGE', t, 'generic')).toBe(t.errors.UPLOAD_FAILED);
  });

  it('maps Logto dot-notation code to category-generic at generic verbosity', () => {
    // session.invalid_credentials is category 'auth' → generic = UNAUTHORIZED
    expect(createMapErrorToast('session.invalid_credentials', t, 'generic')).toBe(t.errors.UNAUTHORIZED);
  });

  // ── Silent verbosity ──────────────────────────────────────────────────────

  it('returns empty string at silent verbosity', () => {
    expect(createMapErrorToast('ROLE_DENIED', t, 'silent')).toBe('');
  });

  it('suppresses the deliberate server silent code without public verbosity', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', '');
    expect(createMapErrorToast('ERROR', t)).toBe('');
  });

  it('returns empty string at silent verbosity for any code', () => {
    expect(createMapErrorToast('access_denied', t, 'silent')).toBe('');
    expect(createMapErrorToast('INTERNAL_ERROR', t, 'silent')).toBe('');
    expect(createMapErrorToast('session.invalid_credentials', t, 'silent')).toBe('');
  });

  // ── Unknown / unregistered codes ──────────────────────────────────────────

  it('falls back to ERROR for unknown codes at specific verbosity', () => {
    expect(createMapErrorToast('SOME_UNKNOWN_CODE', t, 'specific')).toBe(t.errors.ERROR);
  });

  it('falls back to ERROR for unknown codes at generic verbosity', () => {
    expect(createMapErrorToast('SOME_UNKNOWN_CODE', t, 'generic')).toBe(t.errors.ERROR);
  });

  // ── Ultimate fallback: raw code ───────────────────────────────────────────

  it('returns raw code when errors.ERROR is missing', () => {
    const noErrors = { ...t, errors: { ...t.errors, ERROR: undefined as unknown as string } };
    // Fallback chain: specific → not found → generic → lookup ERROR_CODES → not found → ERROR → ERROR not found → raw code
    expect(createMapErrorToast('SOME_UNKNOWN_CODE', noErrors, 'specific')).toBe('SOME_UNKNOWN_CODE');
  });

  it('does not use dot-to-underscore when raw key is present', () => {
    // INTERNAL_ERROR is a raw key that matches directly — no underscore conversion
    expect(createMapErrorToast('INTERNAL_ERROR', t, 'specific')).toBe(t.errors.INTERNAL_ERROR);
  });

  // ── Default verbosity (unset) ─────────────────────────────────────────────

  it('behaves as specific when no verbosity is passed (default)', () => {
    // Without explicit verbosity, uses getClientVerbosity() which returns undefined → specific
    expect(createMapErrorToast('ROLE_DENIED', t)).toBe(t.errors.ROLE_DENIED);
  });
});

// ── NEXT_PUBLIC_ERROR_VERBOSITY integration ──────────────────────────────────

describe('createMapErrorToast - env integration', () => {
  // Use en-US for all tests
  const translations = enUS;

  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads NEXT_PUBLIC_ERROR_VERBOSITY when no explicit verbosity', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', 'generic');
    // With generic env, ROLE_DENIED should map to PERMISSION_DENIED
    expect(createMapErrorToast('ROLE_DENIED', translations)).toBe(translations.errors.PERMISSION_DENIED);
  });

  it('reads NEXT_PUBLIC_ERROR_VERBOSITY=silent', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', 'silent');
    expect(createMapErrorToast('ROLE_DENIED', translations)).toBe('');
  });

  it('does not leak prototype properties via `in` operator (BUG-047)', () => {
    // A normal plain object inherits constructor, toString, etc. from Object.prototype.
    // The old `in` operator would match these; hasOwn must not.
    const emptyErrors = {} as (typeof t)['errors'];

    // 'constructor' is on Object.prototype — must NOT be matched
    const result = createMapErrorToast('constructor', { ...t, errors: emptyErrors }, 'specific');
    // Falls through: specific miss → generic miss → ERROR miss → raw code
    expect(result).toBe('constructor');
  });

  it('explicit verbosity overrides env', () => {
    vi.stubEnv('NEXT_PUBLIC_ERROR_VERBOSITY', 'silent');
    // Explicit 'specific' should override env 'silent'
    expect(createMapErrorToast('ROLE_DENIED', translations, 'specific')).toBe(translations.errors.ROLE_DENIED);
  });
});
