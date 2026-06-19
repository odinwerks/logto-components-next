import { describe, it, expect } from 'vitest';
import { scrubLogString, scrubArgs } from './scrub-log-string';

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
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.signature123abc';
    const input = `Token value: ${jwt}`;
    const result = scrubLogString(input);
    expect(result).not.toContain('eyJhbGciOiJSUzI1NiJ9');
    expect(result).not.toContain('eyJzdWIiOiJ1c2VyMTIzIn0');
    expect(result).toContain('[JWT_REDACTED]');
  });

  it('handles mixed string with multiple sensitive patterns', () => {
    const jwt = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig123';
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

  it('passes through plain objects unchanged (Pino handles those)', () => {
    const obj = { userId: '123', accessToken: 'should-not-be-scrubbed-by-scrubArgs' };
    const result = scrubArgs([obj]);
    expect(result[0]).toBe(obj); // same reference
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
});
