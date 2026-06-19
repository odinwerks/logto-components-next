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

  // BUG-H02/H03: audience check fails open when client_id absent
  it('throws UNAUTHORIZED when assertAudience is true and client_id is absent (fail-closed BUG-H02)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123' }), { status: 200 })
      // Note: no client_id in response
    );

    const { introspectToken } = await import('./utils');
    await expect(introspectToken('some-token', { assertAudience: true })).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it('throws UNAUTHORIZED when assertAudience is true and client_id mismatches (BUG-H03)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'other-app-id' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    await expect(introspectToken('some-token', { assertAudience: true })).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it('does not throw when assertAudience is true and client_id matches (BUG-H03)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'client-id-123' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token', { assertAudience: true });
    expect(result.client_id).toBe('client-id-123');
  });

  it('does not check client_id when assertAudience is not provided (backward compat)', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'client-id-123');
    vi.stubEnv('APP_SECRET', 'super-secret-value');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123' }), { status: 200 })
      // No client_id — should NOT throw when assertAudience is not supplied
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token'); // no options
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
    it('throws when LOGTO_INTROSPECTION_URL is missing and ENDPOINT is placeholder (both effectively unavailable)', async () => {
      // LOGTO_INTROSPECTION_URL is optional — when missing, the URL is derived from ENDPOINT.
      // When ENDPOINT is also not set, it falls back to 'https://placeholder.logto.app'.
      // APP_ID/APP_SECRET must also be build-placeholders to trigger the guard.
      // In practice, when the full config is unconfigured, we get build-placeholder values
      // which trigger the guard.
      vi.stubEnv('APP_ID', '');   // not set → resolves to build-placeholder
      // No APP_SECRET set → build-placeholder in production build
      // But we need to test the guard in a way that doesn't hit the network.
      // The simplest path: stub APP_ID as empty (it gets assigned 'build-placeholder')
      // so the `clientId === 'build-placeholder'` guard triggers.
      vi.stubEnv('APP_SECRET', 'real-secret');

      const { introspectToken } = await import('./utils');
      await expect(introspectToken('some-token')).rejects.toThrow(
        'Logto introspection not configured'
      );
    });

    it('falls back to endpoint-derived URL when LOGTO_INTROSPECTION_URL is unset but ENDPOINT is set', async () => {
      // LOGTO_INTROSPECTION_URL is optional per .env.example.
      // When unset, introspection URL should be derived as ${ENDPOINT}/oidc/token/introspection.
      vi.stubEnv('ENDPOINT', 'https://logto.example.com');
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', 'super-secret-value');
      // No LOGTO_INTROSPECTION_URL

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ active: true }), { status: 200 })
      );

      const { introspectToken } = await import('./utils');
      const result = await introspectToken('some-token');

      expect(result).toEqual({ active: true });
      // The derived URL must include the OIDC introspection path
      const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toBe('https://logto.example.com/oidc/token/introspection');
    });

    it('falls back to endpoint-derived URL, stripping trailing slashes', async () => {
      vi.stubEnv('ENDPOINT', 'https://logto.example.com///');
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', 'super-secret-value');
      // No LOGTO_INTROSPECTION_URL

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ active: true }), { status: 200 })
      );

      const { introspectToken } = await import('./utils');
      await introspectToken('some-token');

      const [calledUrl] = fetchSpy.mock.calls[0] as [string, ...unknown[]];
      expect(calledUrl).toBe('https://logto.example.com/oidc/token/introspection');
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

  // BUG-M-016: assertAudience option tests
  it('throws UNAUTHORIZED when client_id does not match appId with assertAudience: true', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'my-app-id');
    vi.stubEnv('APP_SECRET', 'my-app-secret');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'other-app-id' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    await expect(introspectToken('some-token', { assertAudience: true })).rejects.toMatchObject({
      name: 'SanitizedError',
      message: 'UNAUTHORIZED',
    });
  });

  it('does not throw when assertAudience is false (default) even with mismatched client_id', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'my-app-id');
    vi.stubEnv('APP_SECRET', 'my-app-secret');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'other-app-id' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    // No assertAudience → no mismatch check → should succeed
    const result = await introspectToken('some-token');
    expect(result.active).toBe(true);
  });

  it('does not throw when assertAudience is true and client_id matches appId', async () => {
    vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
    vi.stubEnv('APP_ID', 'my-app-id');
    vi.stubEnv('APP_SECRET', 'my-app-secret');
    vi.stubEnv('ENDPOINT', 'https://example.com');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('COOKIE_SECRET', 'test-cookie-secret');

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ active: true, sub: 'user-123', client_id: 'my-app-id' }), { status: 200 })
    );

    const { introspectToken } = await import('./utils');
    const result = await introspectToken('some-token', { assertAudience: true });
    expect(result.active).toBe(true);
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
