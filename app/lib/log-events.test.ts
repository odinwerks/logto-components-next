import { describe, it, expect } from 'vitest';
import { LOG_EVENTS, type LogEvent } from './log-events';

describe('log-events', () => {
  it('exports all expected event constants', () => {
    expect(LOG_EVENTS.AUTH_SIGN_IN).toBe('AUTH_SIGN_IN');
    expect(LOG_EVENTS.AUTH_SIGN_OUT).toBe('AUTH_SIGN_OUT');
    expect(LOG_EVENTS.AUTH_TOKEN_ERROR).toBe('AUTH_TOKEN_ERROR');
    expect(LOG_EVENTS.AUTH_COOKIE_WIPE).toBe('AUTH_COOKIE_WIPE');
    expect(LOG_EVENTS.AUTH_STALE_COOKIE).toBe('AUTH_STALE_COOKIE');
    expect(LOG_EVENTS.RBAC_PERMISSION_DENIED).toBe('RBAC_PERMISSION_DENIED');
    expect(LOG_EVENTS.RBAC_ORG_VALIDATION).toBe('RBAC_ORG_VALIDATION');
    expect(LOG_EVENTS.API_REQUEST).toBe('API_REQUEST');
    expect(LOG_EVENTS.API_ERROR).toBe('API_ERROR');
    expect(LOG_EVENTS.API_PROTECTED_ACTION).toBe('API_PROTECTED_ACTION');
    expect(LOG_EVENTS.API_THROTTLED).toBe('API_THROTTLED');
    expect(LOG_EVENTS.MFA_ENROLL).toBe('MFA_ENROLL');
    expect(LOG_EVENTS.MFA_REMOVE).toBe('MFA_REMOVE');
    expect(LOG_EVENTS.MFA_TOTP_REPLACE).toBe('MFA_TOTP_REPLACE');
    expect(LOG_EVENTS.MFA_BACKUP_CODES_GENERATE).toBe('MFA_BACKUP_CODES_GENERATE');
    expect(LOG_EVENTS.MFA_WEBAUTHN_RENAME).toBe('MFA_WEBAUTHN_RENAME');
    expect(LOG_EVENTS.PASSWORD_CHANGE).toBe('PASSWORD_CHANGE');
    expect(LOG_EVENTS.AVATAR_UPLOAD).toBe('AVATAR_UPLOAD');
    expect(LOG_EVENTS.ACCOUNT_DELETE).toBe('ACCOUNT_DELETE');
    expect(LOG_EVENTS.SESSION_REVOKE).toBe('SESSION_REVOKE');
    expect(LOG_EVENTS.SESSION_HEARTBEAT).toBe('SESSION_HEARTBEAT');
    expect(LOG_EVENTS.VERIFICATION_PASSWORD).toBe('VERIFICATION_PASSWORD');
    expect(LOG_EVENTS.VERIFICATION_EMAIL).toBe('VERIFICATION_EMAIL');
    expect(LOG_EVENTS.VERIFICATION_PHONE).toBe('VERIFICATION_PHONE');
    expect(LOG_EVENTS.USER_PROFILE_UPDATE).toBe('USER_PROFILE_UPDATE');
    expect(LOG_EVENTS.USER_CUSTOM_DATA_UPDATE).toBe('USER_CUSTOM_DATA_UPDATE');
    expect(LOG_EVENTS.CONFIG_ERROR).toBe('CONFIG_ERROR');
    expect(LOG_EVENTS.GENERIC_LOG).toBe('GENERIC_LOG');
  });

  it('does NOT export removed dead events', () => {
    // AUTH_TOKEN_REFRESH removed — SDK owns refresh; no hook exists.
    expect(LOG_EVENTS).not.toHaveProperty('AUTH_TOKEN_REFRESH');
    // RBAC_PERMISSION_CHECK removed — we log denials, not successful checks.
    expect(LOG_EVENTS).not.toHaveProperty('RBAC_PERMISSION_CHECK');
  });

  it('has the correct number of events', () => {
    // Net: 28 (original) - 2 (removed) + 2 (added: API_THROTTLED, MFA_WEBAUTHN_RENAME)
    // + 3 (added: PAT_CREATE, PAT_RENAME, PAT_DELETE) = 31.
    const eventKeys = Object.keys(LOG_EVENTS);
    expect(eventKeys.length).toBe(31);
  });

  it('LogEvent type includes all events', () => {
    // This test verifies the type is correct at compile time.
    // If this compiles, the type is correct.
    const events: LogEvent[] = Object.values(LOG_EVENTS);
    expect(events.length).toBe(31);
  });
});
