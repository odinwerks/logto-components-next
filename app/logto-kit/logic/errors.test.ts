import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('sanitize', () => {
  it('returns fixed fallback code regardless of runtime environment', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { sanitize } = await import('./errors');
    const err = new Error('upstream: email already registered');
    const result = sanitize(err, { fallback: 'VERIFICATION_FAILED' });
    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe('VERIFICATION_FAILED');
  });

  it('immediately returns ValidationError and preserves message', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { sanitize } = await import('./errors');
    const { ValidationError } = await import('./validation');
    const valErr = new ValidationError('Custom validation error message');
    const result = sanitize(valErr, { fallback: 'INTERNAL_ERROR' });
    expect(result).toBe(valErr);
    expect(result.message).toBe('Custom validation error message');
  });
});

describe('throwOnApiError from errors.ts', () => {
  it('does not throw for 2xx responses', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response('OK', { status: 200 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).resolves.toBeUndefined();
  });

  it('throws for 4xx responses', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response('Not Found', { status: 404 });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toThrow();
  });

  it('throws for 5xx responses', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response('Server Error', { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow();
  });

  it('throws fallback code for non-auth responses', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response('Not Found', { status: 404 });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'FETCH_FAILED',
    });
  });

  it('maps 401 responses to UNAUTHORIZED when no upstream message', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(JSON.stringify({ code: 'auth.unauthorized' }), {
      status: 401,
    });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it('maps 403 responses to UNAUTHORIZED when no upstream message', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(JSON.stringify({ code: 'auth.forbidden' }), {
      status: 403,
    });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it.each(['production', 'development', 'test'] as const)(
    'passes upstream message verbatim when exposeMessage=true in %s',
    async nodeEnv => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      const { throwOnApiError } = await import('./errors');
      const upstreamMessage = `Sensitive ${nodeEnv} diagnostics`;
      const res = new Response(
        JSON.stringify({ code: 'user.invalid_password', message: upstreamMessage }),
        { status: 400 },
      );

      const thrown: Error = await throwOnApiError(res, 'UPDATE_FAILED', 'logto-api', true).then(
        () => {
          throw new Error('Expected throwOnApiError to reject for non-OK response');
        },
        err => err as Error,
      );
      // Upstream `message` field is passed through only when exposeMessage=true
      expect(thrown).toMatchObject({
        name: 'SanitizedError',
        message: upstreamMessage,
      });
    },
  );

  it('never leaks plain-text upstream details', async () => {
    const { throwOnApiError } = await import('./errors');
    const upstreamDetail = 'SQLSTATE 23505 duplicate key value';
    const res = new Response(upstreamDetail, { status: 500 });

    const thrown: Error = await throwOnApiError(res, 'INTERNAL_ERROR').then(
      () => {
        throw new Error('Expected throwOnApiError to reject for non-OK response');
      },
      err => err as Error,
    );
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'INTERNAL_ERROR',
    });
    expect(thrown.message).not.toContain(upstreamDetail);
  });

  it('falls back to safeCode when upstream response has no message field', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(
      JSON.stringify({ code: 'some.unknown_code' }),
      { status: 400 },
    );

    const thrown: Error = await throwOnApiError(res, 'UPDATE_FAILED').then(
      () => {
        throw new Error('Expected throwOnApiError to reject');
      },
      err => err as Error,
    );
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'UPDATE_FAILED',
    });
  });

  it('falls back to safeCode for non-JSON upstream responses', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response('plain text error', { status: 400 });

    const thrown: Error = await throwOnApiError(res, 'VERIFICATION_FAILED').then(
      () => {
        throw new Error('Expected throwOnApiError to reject');
      },
      err => err as Error,
    );
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'VERIFICATION_FAILED',
    });
  });

  it('does NOT expose upstream message by default (exposeMessage=false)', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(
      JSON.stringify({ code: 'user.invalid_password', message: 'Password too short' }),
      { status: 400 },
    );

    const thrown: Error = await throwOnApiError(res, 'UPDATE_FAILED').then(
      () => { throw new Error('Expected throwOnApiError to reject'); },
      err => err as Error,
    );
    // Default: upstream message is NOT exposed; safeCode is used instead
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'UPDATE_FAILED',
    });
  });

  it('exposes upstream message when exposeMessage=true', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(
      JSON.stringify({ code: 'user.invalid_password', message: 'Password too short' }),
      { status: 400 },
    );

    const thrown: Error = await throwOnApiError(res, 'UPDATE_FAILED', 'test-op', true).then(
      () => { throw new Error('Expected throwOnApiError to reject'); },
      err => err as Error,
    );
    // exposeMessage=true: upstream message IS exposed
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'Password too short',
    });
  });

  it('exposeMessage=false still maps 401 to UNAUTHORIZED', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(
      JSON.stringify({ code: 'auth.unauthorized', message: 'Token expired' }),
      { status: 401 },
    );

    const thrown: Error = await throwOnApiError(res, 'FETCH_FAILED').then(
      () => { throw new Error('Expected throwOnApiError to reject'); },
      err => err as Error,
    );
    expect(thrown).toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });
});

describe('safeAction', () => {
  it('preserves ValidationError in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { safeAction } = await import('./actions/safe');
    const { ValidationError } = await import('./validation');
    
    const valErr = new ValidationError('Invalid phone format');
    const result = await safeAction(async () => {
      throw valErr;
    });
    expect(result).toEqual({ ok: false, error: 'Invalid phone format' });
  });

  it('preserves SanitizedError in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { safeAction } = await import('./actions/safe');
    const { plainCode } = await import('./errors');
    
    const sanitizedErr = plainCode('UNAUTHORIZED');
    const result = await safeAction(async () => {
      throw sanitizedErr;
    });
    expect(result).toEqual({ ok: false, error: 'UNAUTHORIZED' });
  });

  it('sanitizes standard errors to INTERNAL_ERROR in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { safeAction } = await import('./actions/safe');
    
    const stdErr = new Error('Database connection failed');
    const result = await safeAction(async () => {
      throw stdErr;
    });
    expect(result).toEqual({ ok: false, error: 'INTERNAL_ERROR' });
  });
});

describe('isAuthError', () => {
  it('handles falsy or empty inputs', async () => {
    const { isAuthError } = await import('./errors');
    expect(isAuthError(undefined)).toBe(false);
    expect(isAuthError(null)).toBe(false);
    expect(isAuthError('')).toBe(false);
  });

  it('detects custom error properties on plain objects', async () => {
    const { isAuthError } = await import('./errors');
    expect(isAuthError({ status: 401 })).toBe(true);
    expect(isAuthError({ status: 403 })).toBe(true);
    expect(isAuthError({ code: 'UNAUTHORIZED' })).toBe(true);
    expect(isAuthError({ status: 200 })).toBe(false);
  });

  it('detects special auth error states in Error objects', async () => {
    const { isAuthError } = await import('./errors');
    
    const sanitizedAuthErr = new Error('UNAUTHORIZED');
    sanitizedAuthErr.name = 'SanitizedError';
    expect(isAuthError(sanitizedAuthErr)).toBe(true);

    const normalErrWithUNAUTHORIZED = new Error('UNAUTHORIZED');
    expect(isAuthError(normalErrWithUNAUTHORIZED)).toBe(false);

    expect(isAuthError(new Error('needsAuth'))).toBe(true);
    expect(isAuthError(new Error('No access token available for Account API'))).toBe(true);
    expect(isAuthError(new Error('Cookies can only be modified in a Server Action or Route Handler'))).toBe(true);
    expect(isAuthError(new Error('Generic Error'))).toBe(false);
  });

  it('detects auth errors by error.name (LogtoClientError / AuthError)', async () => {
    const { isAuthError } = await import('./errors');

    const logtoErr = new Error('some logto message');
    logtoErr.name = 'LogtoClientError';
    expect(isAuthError(logtoErr)).toBe(true);

    const authErr = new Error('some auth message');
    authErr.name = 'AuthError';
    expect(isAuthError(authErr)).toBe(true);

    const otherErr = new Error('some other message');
    otherErr.name = 'OtherError';
    expect(isAuthError(otherErr)).toBe(false);
  });
});

describe('isInvalidGrantError', () => {
  it('handles falsy inputs', async () => {
    const { isInvalidGrantError } = await import('./errors');
    expect(isInvalidGrantError(undefined)).toBe(false);
    expect(isInvalidGrantError(null)).toBe(false);
    expect(isInvalidGrantError('')).toBe(false);
  });

  it('returns true for object with code containing invalid_grant', async () => {
    const { isInvalidGrantError } = await import('./errors');
    expect(isInvalidGrantError({ code: 'oidc.invalid_grant' })).toBe(true);
    expect(isInvalidGrantError({ code: 'some.invalid_grant.other' })).toBe(true);
  });

  it('returns true for Error with message containing invalid_grant', async () => {
    const { isInvalidGrantError } = await import('./errors');
    // The fallback message check catches any Error whose message literally contains 'invalid_grant'
    expect(isInvalidGrantError(new Error('oidc.invalid_grant error'))).toBe(true);
    // "Grant request is invalid." does NOT contain 'invalid_grant' — detection relies on the code property
    expect(isInvalidGrantError(new Error('Grant request is invalid.'))).toBe(false);
  });

  it('returns false for non-Grant errors', async () => {
    const { isInvalidGrantError } = await import('./errors');
    expect(isInvalidGrantError(new Error('Generic failure'))).toBe(false);
    expect(isInvalidGrantError({ code: 'oidc.other_error' })).toBe(false);
    expect(isInvalidGrantError({ status: 401 })).toBe(false);
  });

  it('returns false for non-object/non-Error types', async () => {
    const { isInvalidGrantError } = await import('./errors');
    expect(isInvalidGrantError(42)).toBe(false);
    expect(isInvalidGrantError(true)).toBe(false);
  });
});

describe('isTransientError', () => {
  it('handles falsy or empty inputs', async () => {
    const { isTransientError } = await import('./errors');
    expect(isTransientError(undefined)).toBe(false);
    expect(isTransientError(null)).toBe(false);
    expect(isTransientError('')).toBe(false);
  });

  it('detects transient numeric status and code on plain objects', async () => {
    const { isTransientError } = await import('./errors');
    expect(isTransientError({ status: 429 })).toBe(true);
    expect(isTransientError({ statusCode: 500 })).toBe(true);
    expect(isTransientError({ status: 503 })).toBe(true);
    expect(isTransientError({ status: 400 })).toBe(false);

    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
    expect(isTransientError({ code: 'EPIPE' })).toBe(true);
    expect(isTransientError({ code: 'ENOTFOUND' })).toBe(true);
    expect(isTransientError({ code: 'EADDRINUSE' })).toBe(true);
    expect(isTransientError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isTransientError({ code: 'SOME_OTHER_CODE' })).toBe(false);
  });

  it('detects transient messages or patterns in Error objects', async () => {
    const { isTransientError } = await import('./errors');
    expect(isTransientError(new Error('fetch failed'))).toBe(true);
    expect(isTransientError(new Error('Request timed out'))).toBe(true);

    expect(isTransientError(new Error('HTTP status 429'))).toBe(true);
    expect(isTransientError(new Error('Internal server error (500)'))).toBe(true);
    expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true);
    expect(isTransientError(new Error('Error code: ECONNREFUSED'))).toBe(true);
    expect(isTransientError(new Error('ETIMEDOUT connection'))).toBe(true);
    
    expect(isTransientError(new Error('Something else'))).toBe(false);
  });
});
