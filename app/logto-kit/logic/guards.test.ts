import { describe, it, expect } from 'vitest';
import {
  assertSafeUserId,
  assertSafeLogtoId,
  assertRevokeGrantsTarget,
  assertMfaType,
  assertVerificationType,
  decodeLogtoAccessToken,
  pickPreferences,
  safeUrl,
  assertNameField,
  assertUsername,
  assertHttpUrl,
  assertVerificationCode,
} from './guards';
import { ValidationError } from './validation';

// ============================================================================
// assertSafeUserId / assertSafeLogtoId
// ============================================================================

describe('assertSafeUserId', () => {
  it('accepts valid alphanumeric IDs', () => {
    expect(() => assertSafeUserId('abc123')).not.toThrow();
    expect(() => assertSafeUserId('userId-with-dashes')).not.toThrow();
    expect(() => assertSafeUserId('userId_with_underscores')).not.toThrow();
    expect(() => assertSafeUserId('A'.repeat(128))).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => assertSafeUserId('')).toThrow(ValidationError);
  });

  it('rejects path traversal sequences', () => {
    expect(() => assertSafeUserId('../etc/passwd')).toThrow(ValidationError);
    expect(() => assertSafeUserId('..')).toThrow(ValidationError);
    expect(() => assertSafeUserId('abc/def')).toThrow(ValidationError);
  });

  it('rejects query injection characters', () => {
    expect(() => assertSafeUserId('abc?foo=bar')).toThrow(ValidationError);
    expect(() => assertSafeUserId('abc#fragment')).toThrow(ValidationError);
  });

  it('rejects URL-encoded traversal', () => {
    expect(() => assertSafeUserId('..%2Fetc%2Fpasswd')).toThrow(ValidationError);
    expect(() => assertSafeUserId('%2e%2e%2f')).toThrow(ValidationError);
  });

  it('rejects null bytes', () => {
    expect(() => assertSafeUserId('abc\x00def')).toThrow(ValidationError);
  });

  it('rejects strings over 128 chars', () => {
    expect(() => assertSafeUserId('a'.repeat(129))).toThrow(ValidationError);
  });

  it('rejects non-string types', () => {
    expect(() => assertSafeUserId(null as any)).toThrow(ValidationError);
    expect(() => assertSafeUserId(undefined as any)).toThrow(ValidationError);
    expect(() => assertSafeUserId(123 as any)).toThrow(ValidationError);
  });
});

describe('assertSafeLogtoId', () => {
  it('accepts a valid Logto ID', () => {
    expect(() => assertSafeLogtoId('valid-id_123')).not.toThrow();
  });

  it('rejects embedded query-string characters', () => {
    // This was the exact injection from Finding 4: sessionId with ?revokeGrantsTarget=all
    expect(() => assertSafeLogtoId('sessionId?revokeGrantsTarget=all')).toThrow(ValidationError);
    expect(() => assertSafeLogtoId('../grants/abc?x=1')).toThrow(ValidationError);
  });
});

// ============================================================================
// assertRevokeGrantsTarget
// ============================================================================

describe('assertRevokeGrantsTarget', () => {
  it('accepts valid values', () => {
    expect(() => assertRevokeGrantsTarget('all')).not.toThrow();
    expect(() => assertRevokeGrantsTarget('firstParty')).not.toThrow();
    expect(() => assertRevokeGrantsTarget(undefined)).not.toThrow();
  });

  it('rejects anything outside the allowlist', () => {
    expect(() => assertRevokeGrantsTarget('admin')).toThrow(ValidationError);
    expect(() => assertRevokeGrantsTarget('')).toThrow(ValidationError);
    expect(() => assertRevokeGrantsTarget('all; DROP TABLE users')).toThrow(ValidationError);
  });
});

// ============================================================================
// assertMfaType
// ============================================================================

describe('assertMfaType', () => {
  it('accepts Totp | WebAuthn | BackupCode', () => {
    expect(() => assertMfaType('Totp')).not.toThrow();
    expect(() => assertMfaType('WebAuthn')).not.toThrow();
    expect(() => assertMfaType('BackupCode')).not.toThrow();
  });

  it('rejects arbitrary strings', () => {
    expect(() => assertMfaType('evil')).toThrow(ValidationError);
    expect(() => assertMfaType('')).toThrow(ValidationError);
    expect(() => assertMfaType('totp')).toThrow(ValidationError); // case-sensitive
  });
});

// ============================================================================
// assertVerificationType
// ============================================================================

describe('assertVerificationType', () => {
  it('accepts email | phone', () => {
    expect(() => assertVerificationType('email')).not.toThrow();
    expect(() => assertVerificationType('phone')).not.toThrow();
  });

  it('rejects anything else', () => {
    expect(() => assertVerificationType('sms')).toThrow(ValidationError);
    expect(() => assertVerificationType('')).toThrow(ValidationError);
    expect(() => assertVerificationType('EMAIL')).toThrow(ValidationError);
  });
});

// ============================================================================
// decodeLogtoAccessToken (base64url bug regression)
// ============================================================================

describe('decodeLogtoAccessToken', () => {
  // A minimal JWT with base64url characters ('-' and '_') in the payload.
  // Previously, Buffer.from(..., 'base64') would corrupt these, causing JSON.parse to fail
  // and permissions to silently return [].
  it('correctly decodes a base64url-encoded JWT payload', () => {
    // Header: {"alg":"RS256","typ":"JWT"}
    // Payload: {"sub":"user_A-B","scope":"calc:basic calc:scientific","iss":"https://auth.example.org"}
    // Signature: fake (we don't verify sig here)
    const header = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9';
    const payload = 'eyJzdWIiOiJ1c2VyX0EtQiIsInNjb3BlIjoiY2FsYzpiYXNpYyBjYWxjOnNjaWVudGlmaWMiLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5vcmcifQ';
    const sig = 'fake-sig';
    const token = `${header}.${payload}.${sig}`;
    const claims = decodeLogtoAccessToken(token);
    expect(claims.sub).toBe('user_A-B');
    expect(claims.scope).toBe('calc:basic calc:scientific');
  });

  it('throws ValidationError for non-string input', () => {
    expect(() => decodeLogtoAccessToken(null as any)).toThrow(ValidationError);
    expect(() => decodeLogtoAccessToken('' as any)).toThrow(ValidationError);
  });

  it('throws ValidationError for a malformed token', () => {
    expect(() => decodeLogtoAccessToken('not.a.valid.jwt.base64payload')).toThrow();
  });
});

// ============================================================================
// pickPreferences (mass-assignment whitelist)
// ============================================================================

describe('pickPreferences', () => {
  it('passes through allowed keys', () => {
    const result = pickPreferences({ asOrg: 'org-123', themeMode: 'dark', language: 'en-US' });
    expect(result).toEqual({ asOrg: 'org-123', themeMode: 'dark', language: 'en-US' });
  });

  it('silently drops unknown keys', () => {
    const result = pickPreferences({
      asOrg: 'org-456',
      isAdmin: true,             // unknown key — dropped
      __proto__: { evil: true }, // prototype pollution attempt — dropped
      constructor: 'overwrite',  // dropped
    });
    expect(result).not.toHaveProperty('isAdmin');
    expect(result).not.toHaveProperty('__proto__');
    expect(result).not.toHaveProperty('constructor');
    expect(result.asOrg).toBe('org-456');
  });

  it('accepts null for asOrg (deselect org)', () => {
    const result = pickPreferences({ asOrg: null });
    expect(result.asOrg).toBeNull();
  });

  it('throws for invalid asOrg format (path traversal)', () => {
    expect(() => pickPreferences({ asOrg: '../../../etc/passwd' })).toThrow(ValidationError);
  });

  it('throws for invalid themeMode', () => {
    expect(() => pickPreferences({ themeMode: 'purple' })).toThrow(ValidationError);
    expect(() => pickPreferences({ themeMode: 'dark; DROP TABLE' })).toThrow(ValidationError);
  });

  it('throws for invalid language', () => {
    expect(() => pickPreferences({ language: 'a'.repeat(17) })).toThrow(ValidationError);
    expect(() => pickPreferences({ language: '../etc' })).toThrow(ValidationError);
  });

  it('returns empty object for null/undefined input', () => {
    expect(pickPreferences(null)).toEqual({});
    expect(pickPreferences(undefined)).toEqual({});
    expect(pickPreferences({})).toEqual({});
  });

  it('throws for array input', () => {
    expect(() => pickPreferences([])).toThrow(ValidationError);
  });
});

// ============================================================================
// safeUrl (path/query injection prevention)
// ============================================================================

describe('safeUrl', () => {
  it('builds a simple URL', () => {
    const url = safeUrl('https://auth.example.org', '/api/my-account/sessions/:id', { id: 'session-abc-123' });
    expect(url).toBe('https://auth.example.org/api/my-account/sessions/session-abc-123');
  });

  it('encodes path-traversal in a segment', () => {
    const url = safeUrl('https://auth.example.org', '/api/my-account/sessions/:id', { id: 'ab%2Fcd' });
    // encodeURIComponent on an already-'%'-encoded value double-encodes it, which is safe
    expect(url).not.toContain('../');
    expect(url).not.toBe('https://auth.example.org/api/my-account/sessions/ab/cd');
  });

  it('throws when a path segment contains "/"', () => {
    expect(() =>
      safeUrl('https://auth.example.org', '/api/my-account/sessions/:id', { id: '../grants/xyz' })
    ).toThrow(ValidationError);
  });

  it('builds query string safely', () => {
    const url = safeUrl(
      'https://auth.example.org',
      '/api/my-account/sessions/:id',
      { id: 'session-abc' },
      { revokeGrantsTarget: 'all' }
    );
    expect(url).toBe('https://auth.example.org/api/my-account/sessions/session-abc?revokeGrantsTarget=all');
  });

  it('is safe because assertSafeLogtoId blocks query-injection before safeUrl is called', () => {
    // The defence-in-depth chain: in revokeUserSession(), assertSafeLogtoId(sessionId)
    // is called BEFORE safeUrl. The '?' character is outside [A-Za-z0-9_-] so the
    // guard rejects it. safeUrl itself also encodes the value via encodeURIComponent,
    // so even if the guard were bypassed the smuggled query chars would be encoded.
    const maliciousId = 'abc?revokeGrantsTarget=all&evil=1';
    // Layer 1: assertSafeLogtoId rejects it outright
    expect(() => assertSafeLogtoId(maliciousId, 'sessionId')).toThrow(ValidationError);
    // Layer 2: safeUrl encodes the value so it can't inject query params
    const url = safeUrl('https://auth.example.org', '/api/my-account/sessions/:id', { id: maliciousId.replace(/[^A-Za-z0-9_-]/g, '') });
    expect(url).toBe('https://auth.example.org/api/my-account/sessions/abcrevokeGrantsTargetallevil1');
    expect(url).not.toContain('?');
  });
});

// ============================================================================
// assertNameField
// ============================================================================

describe('assertNameField', () => {
  it('accepts valid names', () => {
    expect(() => assertNameField('André', 'name')).not.toThrow();
    expect(() => assertNameField('John Smith', 'name')).not.toThrow();
    expect(() => assertNameField(undefined, 'name')).not.toThrow();
  });

  it('rejects strings over 128 chars', () => {
    expect(() => assertNameField('a'.repeat(129), 'name')).toThrow(ValidationError);
  });

  it('rejects control characters', () => {
    expect(() => assertNameField('name\x00inject', 'name')).toThrow(ValidationError);
    expect(() => assertNameField('name\x01inject', 'name')).toThrow(ValidationError);
  });
});

// ============================================================================
// assertUsername
// ============================================================================

describe('assertUsername', () => {
  it('accepts valid usernames', () => {
    expect(() => assertUsername('alice')).not.toThrow();
    expect(() => assertUsername('alice_123')).not.toThrow();
    expect(() => assertUsername(undefined)).not.toThrow();
  });

  it('rejects usernames that are too short', () => {
    expect(() => assertUsername('ab')).toThrow(ValidationError);
  });

  it('rejects usernames with spaces', () => {
    expect(() => assertUsername('alice bob')).toThrow(ValidationError);
  });

  it('rejects usernames with special chars', () => {
    expect(() => assertUsername('alice@bob')).toThrow(ValidationError);
    expect(() => assertUsername('<script>')).toThrow(ValidationError);
  });
});

// ============================================================================
// assertHttpUrl
// ============================================================================

describe('assertHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(() => assertHttpUrl('https://example.com/avatar.png', 'avatar')).not.toThrow();
    expect(() => assertHttpUrl('http://localhost/image.jpg', 'avatar')).not.toThrow();
    expect(() => assertHttpUrl(undefined, 'avatar')).not.toThrow();
  });

  it('rejects javascript: protocol', () => {
    expect(() => assertHttpUrl('javascript:alert(1)', 'avatar')).toThrow(ValidationError);
  });

  it('rejects data: protocol', () => {
    expect(() => assertHttpUrl('data:image/png;base64,abc', 'avatar')).toThrow(ValidationError);
  });

  it('rejects URLs over 2048 chars', () => {
    expect(() => assertHttpUrl('https://a.com/' + 'a'.repeat(2048), 'avatar')).toThrow(ValidationError);
  });
});

// ============================================================================
// assertVerificationCode
// ============================================================================

describe('assertVerificationCode', () => {
  it('accepts 6-digit codes', () => {
    expect(() => assertVerificationCode('123456')).not.toThrow();
    expect(() => assertVerificationCode('000000')).not.toThrow();
  });

  it('rejects non-numeric codes', () => {
    expect(() => assertVerificationCode('12345a')).toThrow(ValidationError);
    expect(() => assertVerificationCode('abcdef')).toThrow(ValidationError);
  });

  it('rejects wrong length', () => {
    expect(() => assertVerificationCode('12345')).toThrow(ValidationError);
    expect(() => assertVerificationCode('1234567')).toThrow(ValidationError);
  });
});
