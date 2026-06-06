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

  it('with PLAIN_ERRORS=true: returns error with code prefix + original message', async () => {
    vi.stubEnv('PLAIN_ERRORS', 'true');
    const { sanitize } = await import('./errors');
    const err = new Error('upstream: email already registered');
    const result = sanitize(err, { fallback: 'VERIFICATION_FAILED' });
    expect(result.message).toContain('VERIFICATION_FAILED');
    expect(result.message).toContain('upstream: email already registered');
  });

  it('with PLAIN_ERRORS=false: returns only the error code', async () => {
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { sanitize } = await import('./errors');
    const err = new Error('upstream: account locked out for email@example.com');
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
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.backup_code_already_in_use', message: 'Backup code is already in use.' });
    const res = new Response(body, { status: 422 });
    await expect(throwOnApiError(res, 'BACKUP_CODES_FAILED')).rejects.toThrow('Backup code is already in use.');
  });

  it('falls back to code when no message field', async () => {
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const res = new Response('Not Found', { status: 404 });
    await expect(throwOnApiError(res, 'FETCH_FAILED')).rejects.toThrow('FETCH_FAILED');
  });

  it('falls back to code when message is empty', async () => {
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'some_error', message: '' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('UPDATE_FAILED');
  });

  it('does not leak 5xx message in production (isDev=false, PLAIN_ERRORS=false)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'internal_error', message: 'Database trace details leak.' });
    const res = new Response(body, { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow('INTERNAL_ERROR');
    // Ensure the raw error message is NOT thrown
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.not.toThrow('Database trace details leak.');
  });

  it('allows 5xx message in development (isDev=true)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'internal_error', message: 'Database trace details leak.' });
    const res = new Response(body, { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow('Database trace details leak.');
  });

  it('allows 5xx message when PLAIN_ERRORS is true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAIN_ERRORS', 'true');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'internal_error', message: 'Database trace details leak.' });
    const res = new Response(body, { status: 500 });
    await expect(throwOnApiError(res, 'INTERNAL_ERROR')).rejects.toThrow('Database trace details leak.');
  });

  it('does not leak 4xx message in production when PLAIN_ERRORS=false', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.invalid_password', message: 'Invalid password.' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('UPDATE_FAILED');
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.not.toThrow('Invalid password.');
  });

  it('allows 4xx message in development mode', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('PLAIN_ERRORS', 'false');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.invalid_password', message: 'Invalid password.' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('Invalid password.');
  });

  it('allows 4xx message in production when PLAIN_ERRORS=true', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PLAIN_ERRORS', 'true');
    const { throwOnApiError } = await import('./errors');
    const body = JSON.stringify({ code: 'user.invalid_password', message: 'Invalid password.' });
    const res = new Response(body, { status: 400 });
    await expect(throwOnApiError(res, 'UPDATE_FAILED')).rejects.toThrow('Invalid password.');
  });
});
