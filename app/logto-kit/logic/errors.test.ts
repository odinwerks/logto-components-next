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

  it('maps 401 responses to UNAUTHORIZED', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(JSON.stringify({ code: 'auth.unauthorized', message: 'Unauthorized request details' }), {
      status: 401,
    });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it('maps 403 responses to UNAUTHORIZED', async () => {
    const { throwOnApiError } = await import('./errors');
    const res = new Response(JSON.stringify({ code: 'auth.forbidden', message: 'Forbidden details' }), {
      status: 403,
    });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it.each(['production', 'development', 'test'] as const)(
    'never leaks upstream details in %s',
    async nodeEnv => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      const { throwOnApiError } = await import('./errors');
      const upstreamMessage = `Sensitive ${nodeEnv} diagnostics`;
      const res = new Response(
        JSON.stringify({ code: 'user.invalid_password', message: upstreamMessage }),
        { status: 400 },
      );

      const thrown: Error = await throwOnApiError(res, 'UPDATE_FAILED').then(
        () => {
          throw new Error('Expected throwOnApiError to reject for non-OK response');
        },
        err => err as Error,
      );
      expect(thrown).toMatchObject({
        name: 'SanitizedError',
        message: 'UPDATE_FAILED',
      });
      expect(thrown.message).not.toContain(upstreamMessage);
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
