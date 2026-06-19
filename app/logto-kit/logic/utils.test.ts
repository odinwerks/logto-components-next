import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

describe('introspectToken', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('passes an AbortSignal.timeout signal to the fetch call', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token');

    expect(result).toEqual({ active: true });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://example.com/introspect',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      })
    );
  });

  // BUG-H03: audience check fails open when client_id absent
  it('throws TOKEN_AUDIENCE_MISMATCH when appId is provided and client_id is absent (BUG-H03)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123' }), { status: 200 })
      // Note: no client_id in response
    );

    const { introspectToken } = await import('./utils');
    await expect(introspectToken('some-token', 'client-id-123')).rejects.toThrow('TOKEN_AUDIENCE_MISMATCH');
  });

  it('throws TOKEN_AUDIENCE_MISMATCH when appId is provided and client_id mismatches (BUG-H03)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'other-app-id' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    await expect(introspectToken('some-token', 'client-id-123')).rejects.toThrow('TOKEN_AUDIENCE_MISMATCH');
  });

  it('does not throw when appId is provided and client_id matches (BUG-H03)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'client-id-123' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token', 'client-id-123');
    expect(result.client_id).toBe('client-id-123');
  });

  it('does not check client_id when appId is not provided (backward compat)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123' }), { status: 200 })
      // No client_id — should NOT throw when appId is not supplied
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token'); // no appId
    expect(result).toEqual({ active: true, sub: 'user-123' });
  });

  // API-A03: client credentials must be in Basic Auth header, not the POST body
  it('sends client credentials in the Authorization header (Basic Auth), not in the body', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    await introspectToken('my-token');

    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Record<string, string>;

    // Authorization header must be present and use Basic scheme
    expect(headers['Authorization']).toBeDefined();
    expect(headers['Authorization']).toMatch(/^Basic /);

    // Decode and verify it encodes clientId:clientSecret
    const encoded = headers['Authorization'].replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe('client-id-123:super-secret-value');

    // client_id and client_secret must NOT appear in the request body
    const body = options?.body as string;
    expect(body).not.toContain('client_id');
    expect(body).not.toContain('client_secret');
    // Only the token parameter should be in the body
    expect(body).toContain('token=my-token');
  });

  it('encodes client credentials with special characters correctly', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client+with/special=chars');
    vi.stubEnv('APP_SECRET', 'secret:with@special!chars');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    await introspectToken('token');

    const [, options] = fetchSpy.mock.calls[0];
    const headers = options?.headers as Record<string, string>;
    const encoded = headers['Authorization'].replace('Basic ', '');
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decoded).toBe('client+with/special=chars:secret:with@special!chars');
  });

  describe('missing configuration', () => {
    it('throws when LOGTO_INTROSPECTION_URL is missing', async () => {
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', 'super-secret-value');

      const { introspectToken } = await import('./utils');
      await expect(introspectToken('some-token')).rejects.toThrow(
        'Logto introspection not configured'
      );
    });

    it('throws when APP_ID is missing', async () => {
      vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
      vi.stubEnv('APP_SECRET', 'super-secret-value');

      const { introspectToken } = await import('./utils');
      await expect(introspectToken('some-token')).rejects.toThrow(
        'Logto introspection not configured'
      );
    });

    it('throws when APP_SECRET is missing', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('npm_lifecycle_event', 'build');
      vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', '');

      const { introspectToken } = await import('./utils');
      await expect(introspectToken('some-token')).rejects.toThrow(
        'Logto introspection not configured'
      );
    });
  });
});

describe('Logto Config Scopes', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('preserves spaces in SCOPES environment variable to avoid squashing scopes', async () => {
    vi.stubEnv('APP_ID', 'test-app-id');
    vi.stubEnv('APP_SECRET', 'test-app-secret');
    vi.stubEnv('ENDPOINT', 'https://test.logto.app');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');
    vi.stubEnv('SCOPES', 'openid offline_access profile');

    const { getLogtoConfig } = await import('../config');
    const config = getLogtoConfig();

    // With aggressive trimming, 'openid offline_access profile' gets squashed to 'openidoffline_accessprofile'
    // With correct trimming, it should parse to ['openid', 'offline_access', 'profile']
    expect(config.scopes).toEqual(['openid', 'offline_access', 'profile']);
  });
});

describe('getCleanEndpoint', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('cleans endpoint with a single trailing slash', async () => {
    vi.stubEnv('ENDPOINT', 'https://test.logto.app/');
    vi.stubEnv('APP_SECRET', 'test-app-secret');
    const { getCleanEndpoint } = await import('./utils');
    expect(getCleanEndpoint()).toBe('https://test.logto.app');
  });

  it('cleans endpoint with multiple trailing slashes', async () => {
    vi.stubEnv('ENDPOINT', 'https://test.logto.app///');
    vi.stubEnv('APP_SECRET', 'test-app-secret');
    const { getCleanEndpoint } = await import('./utils');
    expect(getCleanEndpoint()).toBe('https://test.logto.app');
  });

  it('leaves endpoint without trailing slash as-is', async () => {
    vi.stubEnv('ENDPOINT', 'https://test.logto.app');
    vi.stubEnv('APP_SECRET', 'test-app-secret');
    const { getCleanEndpoint } = await import('./utils');
    expect(getCleanEndpoint()).toBe('https://test.logto.app');
  });
});
