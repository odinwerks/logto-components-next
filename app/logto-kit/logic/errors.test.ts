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

  it('extracts Logto message field from JSON body', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.backup_code_already_in_use', message: 'Backup code is already in use.' });
    const res = new Response(body, { status: 422 });
    await expect(throwOnApiError(res, 'BACKUP_CODES_FAILED')).rejects.toThrow('Backup code is already in use.');
  });

  it('falls back to a generic message when no message field exists', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { throwOnApiError } = await import('./errors');
    const res = new Response('Not Found', { status: 404 });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toThrow('Request failed.');
  });

  it('falls back to a generic message when message is empty', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'some_error', message: '' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('Request failed.');
  });

  it('returns Logto message for 5xx in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'internal_error', message: 'Database trace details leak.' });
    const res = new Response(body, { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow('Database trace details leak.');
  });

  it('returns Logto message for 5xx in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'internal_error', message: 'Database trace details leak.' });
    const res = new Response(body, { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow('Database trace details leak.');
  });

  it('returns Logto message for 4xx in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.invalid_password', message: 'Invalid password.' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('Invalid password.');
  });

  it('returns Logto message for 4xx in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.invalid_password', message: 'Invalid password.' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('Invalid password.');
  });
});
