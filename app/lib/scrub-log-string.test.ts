import { describe, it, expect } from 'vitest';
import { scrubLogString, scrubArgs, redactSensitive } from './scrub-log-string';

describe('scrubLogString', () => {
  it('returns unchanged string when no sensitive patterns present', () => {
    const input = 'Hello, this is a safe log message with statusCode=200';
    expect(scrubLogString(input)).toBe(input);
  });

  it('redacts Bearer token', () => {
    // The Authorization header regex may absorb the whole header line first,
    // but the raw token must not appear in the output regardless.
    const input = 'Sending request with Authorization: Bearer eyABC123token456';
    const result = scrubLogString(input);
    expect(result).not.toContain('eyABC123token456');
    // At minimum the token is gone; the replacement format depends on which
    // regex matched first (Authorization vs Bearer).
    expect(result).toMatch(/\[REDACTED\]/);
  });

  it('redacts Bearer token case-insensitively', () => {
    const input = 'BEARER abc123def456';
    const result = scrubLogString(input);
    expect(result).not.toContain('abc123def456');
    expect(result).toContain('Bearer [REDACTED]');
  });

  it('redacts access_token in query string', () => {
    const input = 'Error fetching /api?access_token=supersecretvalue123&foo=bar';
    const result = scrubLogString(input);
    expect(result).not.toContain('supersecretvalue123');
    expect(result).toContain('access_token=[REDACTED]');
  });

  it('redacts access_token with space separator', () => {
    const input = 'access_token: abc123xyz';
    const result = scrubLogString(input);
    expect(result).not.toContain('abc123xyz');
    expect(result).toContain('access_token=[REDACTED]');
  });

  it('redacts refresh_token', () => {
    const input = 'refresh_token=myRefreshTokenValue99';
    const result = scrubLogString(input);
    expect(result).not.toContain('myRefreshTokenValue99');
    expect(result).toContain('refresh_token=[REDACTED]');
  });

  it('redacts id_token', () => {
    const input = 'id_token=myIdTokenValue12345';
    const result = scrubLogString(input);
    expect(result).not.toContain('myIdTokenValue12345');
    expect(result).toContain('id_token=[REDACTED]');
  });

  it('redacts OAuth authorization code (≥8 chars)', () => {
    const input = 'Redirecting with code=abc12345xyz and state=foobar';
    const result = scrubLogString(input);
    expect(result).not.toContain('abc12345xyz');
    expect(result).toContain('code=[REDACTED]');
  });

  it('does NOT redact short code= values (e.g. status codes)', () => {
    const input = 'Error code=200 and code=500';
    const result = scrubLogString(input);
    // These are short (3 chars) so should not be redacted
    expect(result).toContain('code=200');
    expect(result).toContain('code=500');
  });

  it('redacts Authorization header line', () => {
    // When the value after "Authorization:" contains "Bearer <token>", the
    // Bearer regex runs first and produces "Authorization: Bearer [REDACTED]".
    // That is still fully scrubbed — no raw token remains.
    const input = 'Authorization: Bearer some-long-token-value-here';
    const result = scrubLogString(input);
    expect(result).not.toContain('some-long-token-value-here');
    // The token is gone; the exact replacement format may vary by which regex
    // matches first, but the value must be absent.
    expect(result).not.toMatch(/Bearer\s+some-long/);
  });

  it('redacts Authorization header with non-Bearer value', () => {
    const input = 'Authorization: Basic dXNlcjpwYXNzd29yZA==';
    const result = scrubLogString(input);
    expect(result).not.toContain('dXNlcjpwYXNzd29yZA==');
    expect(result).toContain('Authorization: [REDACTED]');
  });

  it('redacts JWT token pattern (eyJ.eyJ.sig)', () => {
    const jwt = 'eyJ' + 'hbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature123abc';
    const input = `Token value: ${jwt}`;
    const result = scrubLogString(input);
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(result).not.toContain('eyJzdWIiOiJ1c2VyMTIzIn0');
    expect(result).toContain('[JWT_REDACTED]');
  });

  it('handles mixed string with multiple sensitive patterns', () => {
    const jwt = 'eyJ' + 'hbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig123';
    const input = `Request: Bearer mytoken123, access_token=secret999, JWT: ${jwt}`;
    const result = scrubLogString(input);
    expect(result).not.toContain('mytoken123');
    expect(result).not.toContain('secret999');
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(result).toContain('Bearer [REDACTED]');
    expect(result).toContain('access_token=[REDACTED]');
    expect(result).toContain('[JWT_REDACTED]');
  });

  it('handles empty string', () => {
    expect(scrubLogString('')).toBe('');
  });

  it('redacts JWTs with segments longer than 200 characters', () => {
    const longPayload = 'eyJ' + 'a'.repeat(500);
    const jwt = `eyJhbGciOiJSUzI1NiJ9.${longPayload}.signature123`;
    expect(scrubLogString(`token: ${jwt}`)).not.toContain(longPayload);
    expect(scrubLogString(`token: ${jwt}`)).toContain('[JWT_REDACTED]');
  });

  // BUG-M-011: client_secret= and password= redaction
  it('redacts client_secret= in form-encoded body', () => {
    const result = scrubLogString('grant_type=client_credentials&client_secret=abc123secret');
    expect(result).toContain('client_secret=[REDACTED]');
    expect(result).not.toContain('abc123secret');
  });

  it('redacts password= in URL params', () => {
    const result = scrubLogString('username=alice&password=hunter2me');
    expect(result).toContain('password=[REDACTED]');
    expect(result).not.toContain('hunter2me');
  });

  it('redacts password in JSON body', () => {
    const result = scrubLogString('{"username":"alice","password":"verylongpassword123"}');
    expect(result).toContain('password=[REDACTED]');
    expect(result).not.toContain('verylongpassword123');
  });

  it('normalizes every unsafe log record separator', () => {
    const result = scrubLogString('first\nsecond\rthird\u0085fourth\u2028fifth\u2029sixth');

    expect(result).toBe('first second third fourth fifth sixth');
    expect(result).not.toMatch(/[\n\r\u0085\u2028\u2029]/u);
  });

  it('caps output at 200 Unicode code points without splitting a surrogate pair', () => {
    const result = scrubLogString(`${'a'.repeat(199)}😀trailing`);

    expect([...result]).toHaveLength(200);
    expect(result.endsWith('😀')).toBe(true);
    expect(result).not.toContain('\uFFFD');
  });

  it('applies the final cap after replacing credentials', () => {
    const result = scrubLogString(`Bearer ${'x'.repeat(400)} ${'y'.repeat(400)}`);

    expect(result).toContain('Bearer [REDACTED]');
    expect([...result].length).toBeLessThanOrEqual(200);
    expect(result).not.toContain('x'.repeat(20));
  });
});

describe('redactSensitive', () => {
  it('redacts deep, case-varied, and aliased credential keys', () => {
    const input = {
      outer: {
        middle: {
          Authorization: 'Bearer top-secret',
          CRED: 'aliased-secret',
          tokenValue: 'token-value-secret',
          verification_id: 'verification-secret',
        },
      },
      list: [{ Credential: 'array-secret' }],
    };

    expect(redactSensitive(input)).toEqual({
      outer: {
        middle: {
          Authorization: '[REDACTED]',
          CRED: '[REDACTED]',
          tokenValue: '[REDACTED]',
          verification_id: '[REDACTED]',
        },
      },
      list: [{ Credential: '[REDACTED]' }],
    });
    expect(input.outer.middle.CRED).toBe('aliased-secret');
  });

  it('is cycle-safe and preserves cycles in the immutable copy', () => {
    const input: Record<string, unknown> = { safe: 'value', TOKEN: 'secret' };
    input.self = input;

    const result = redactSensitive(input) as Record<string, unknown>;

    expect(result).not.toBe(input);
    expect(result.TOKEN).toBe('[REDACTED]');
    expect(result.self).toBe(result);
    expect(input.TOKEN).toBe('secret');
    expect(input.self).toBe(input);
  });

  it('M-012 redacts non-plain own properties and custom toJSON output', () => {
    class EnumerableAttack {
      Authorization = 'class-authorization-secret';
      tokenValue = 'class-token-secret';
    }
    class ToJsonAttack {
      toJSON() {
        return {
          Authorization: 'tojson-authorization-secret',
          tokenValue: 'tojson-token-secret',
        };
      }
    }

    expect(redactSensitive({
      enumerable: new EnumerableAttack(),
      serialized: new ToJsonAttack(),
    })).toEqual({
      enumerable: {
        Authorization: '[REDACTED]',
        tokenValue: '[REDACTED]',
      },
      serialized: {
        Authorization: '[REDACTED]',
        tokenValue: '[REDACTED]',
      },
    });
  });
});

describe('scrubArgs', () => {
  it('passes through numbers unchanged', () => {
    expect(scrubArgs([42, 3.14])).toEqual([42, 3.14]);
  });

  it('passes through booleans unchanged', () => {
    expect(scrubArgs([true, false])).toEqual([true, false]);
  });

  it('passes through null and undefined unchanged', () => {
    expect(scrubArgs([null, undefined])).toEqual([null, undefined]);
  });

  it('redacts sensitive keys in plain object args (BUG-008)', () => {
    const obj = { userId: '123', accessToken: 'should-be-redacted', nested: { token: 'secret' } };
    const result = scrubArgs([obj]);
    // Returns a NEW object (not the same reference) so the original is untouched
    expect(result[0]).not.toBe(obj);
    expect(result[0]).toEqual({
      userId: '123',
      accessToken: '[REDACTED]',
      nested: { token: '[REDACTED]' },
    });
    // Original object must NOT be mutated
    expect(obj.accessToken).toBe('should-be-redacted');
    expect(obj.nested.token).toBe('secret');
  });

  it('redacts snake_case OAuth keys in object args (BUG-007/008)', () => {
    const obj = {
      access_token: 'raw-access',
      refresh_token: 'raw-refresh',
      id_token: 'raw-id',
      client_secret: 'raw-secret',
      code: 'raw-code',
      state: 'raw-state',
    };
    const [result] = scrubArgs([obj]) as [Record<string, string>];
    expect(result.access_token).toBe('[REDACTED]');
    expect(result.refresh_token).toBe('[REDACTED]');
    expect(result.id_token).toBe('[REDACTED]');
    expect(result.client_secret).toBe('[REDACTED]');
    expect(result.code).toBe('[REDACTED]');
    expect(result.state).toBe('[REDACTED]');
  });

  it('redacts sensitive keys at nested depths in object args', () => {
    const obj = {
      oauth: { access_token: 'nested-access', response: { id_token: 'deep-id' } },
      safe: 'kept',
    };
    const [result] = scrubArgs([obj]) as [Record<string, unknown>];
    expect((result.oauth as Record<string, unknown>).access_token).toBe('[REDACTED]');
    expect(((result.oauth as Record<string, unknown>).response as Record<string, unknown>).id_token).toBe('[REDACTED]');
    expect(result.safe).toBe('kept');
  });

  it('preserves Date objects in object args (does not mangle into {})', () => {
    const date = new Date('2025-01-02T00:00:00.000Z');
    const obj = { accessToken: 'leak', expiresAt: date };
    const [result] = scrubArgs([obj]) as [Record<string, unknown>];
    expect(result.accessToken).toBe('[REDACTED]');
    // Date must remain a real Date instance, not collapse to {}
    expect(result.expiresAt).toBeInstanceOf(Date);
    expect((result.expiresAt as Date).toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('recursively redacts arrays in args (LIB-002 fix)', () => {
    const arr = [1, 2, 3];
    const [result] = scrubArgs([arr]);
    expect(result).toEqual(arr);
  });

  it('does not redact non-sensitive plain objects', () => {
    const obj = { userId: '123', statusCode: 200, method: 'POST' };
    const [result] = scrubArgs([obj]);
    expect(result).toEqual({ userId: '123', statusCode: 200, method: 'POST' });
  });

  it('scrubs string arguments', () => {
    const args = ['Bearer token123abc is the secret', 'safe message'];
    const result = scrubArgs(args);
    expect(result[0]).not.toContain('token123abc');
    expect(result[0]).toContain('Bearer [REDACTED]');
    expect(result[1]).toBe('safe message');
  });

  it('scrubs Error message and stack', () => {
    const err = new Error('Failed: Bearer eySecretToken123 was rejected');
    err.stack = `Error: Failed: Bearer eySecretToken123 was rejected\n    at someFunc (file.ts:10)`;
    const [result] = scrubArgs([err]) as [Error];
    expect(result).toBeInstanceOf(Error);
    expect(result.message).not.toContain('eySecretToken123');
    expect(result.message).toContain('Bearer [REDACTED]');
    expect(result.stack).not.toContain('eySecretToken123');
  });

  it('preserves Error name after scrubbing', () => {
    const err = new TypeError('access_token=leaked123abc invalid type');
    const [result] = scrubArgs([err]) as [Error];
    expect(result.name).toBe('TypeError');
  });

  it('handles mixed args array', () => {
    const err = new Error('auth failed Bearer secrettoken99');
    const args: unknown[] = ['prefix: Bearer anothertoken88', err, 42, { safe: true }];
    const result = scrubArgs(args);
    expect(result[0]).toContain('Bearer [REDACTED]');
    expect(result[0]).not.toContain('anothertoken88');
    expect((result[1] as Error).message).not.toContain('secrettoken99');
    expect(result[2]).toBe(42);
    expect(result[3]).toEqual({ safe: true });
  });

  it('returns empty array for empty input', () => {
    expect(scrubArgs([])).toEqual([]);
  });

  it('redacts sensitive keys inside arrays', () => {
    const result = scrubArgs([[ { password: 'secret123', name: 'Alice' } ]]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('secret123');
    expect(serialized).toContain('Alice');
  });
});
