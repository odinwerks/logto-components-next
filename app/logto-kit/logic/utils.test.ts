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
      vi.stubEnv('LOGTO_INTROSPECTION_URL', 'https://example.com/introspect');
      vi.stubEnv('APP_ID', 'client-id-123');

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
