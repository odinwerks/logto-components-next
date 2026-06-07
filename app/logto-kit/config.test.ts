import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config resolution', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('APP_SECRET', 'dummy-app-secret');
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe('HTTPS validation in production', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('npm_lifecycle_event', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('rejects HTTP LOGTO_INTROSPECTION_URL in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'http://evil.example.com/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      await expect(import('./config')).rejects.toThrow(
        'LOGTO_INTROSPECTION_URL must use HTTPS in production'
      );
    });

    it('allows HTTPS LOGTO_INTROSPECTION_URL in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('allows HTTP localhost LOGTO_INTROSPECTION_URL in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'http://localhost:3001/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('allows HTTP 127.0.0.1 LOGTO_INTROSPECTION_URL in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'http://127.0.0.1:3001/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('rejects invalid LOGTO_INTROSPECTION_URL format in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'not-a-valid-url';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      await expect(import('./config')).rejects.toThrow(
        'LOGTO_INTROSPECTION_URL is not a valid URL'
      );
    });

    it('rejects HTTP ENDPOINT in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'http://evil.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      await expect(import('./config')).rejects.toThrow(
        'ENDPOINT must use HTTPS in production'
      );
    });

    it('allows HTTPS ENDPOINT in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('allows placeholder ENDPOINT in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://placeholder.logto.app';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('rejects HTTP LOGTO_M2M_RESOURCE in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';
      process.env.LOGTO_M2M_RESOURCE = 'http://evil.example.com/api';

      await expect(import('./config')).rejects.toThrow(
        'LOGTO_M2M_RESOURCE must use HTTPS in production'
      );
    });

    it('allows HTTPS LOGTO_M2M_RESOURCE in production', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'https://logto.example.com/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';
      process.env.LOGTO_M2M_RESOURCE = 'https://api.example.com';

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('skips HTTPS validation during next build', async () => {
      vi.stubEnv('npm_lifecycle_event', 'build');
      vi.stubEnv('LOGTO_INTROSPECTION_URL', 'http://evil.example.com/introspect');
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', 'super-secret-value');
      vi.stubEnv('ENDPOINT', 'https://logto.example.com');
      vi.stubEnv('BASE_URL', 'https://app.example.com');
      vi.stubEnv('COOKIE_SECRET', 'cookie-secret');

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });

    it('skips HTTPS validation in development', async () => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('LOGTO_INTROSPECTION_URL', 'http://evil.example.com/introspect');
      vi.stubEnv('APP_ID', 'client-id-123');
      vi.stubEnv('APP_SECRET', 'super-secret-value');
      vi.stubEnv('ENDPOINT', 'https://logto.example.com');
      vi.stubEnv('BASE_URL', 'https://app.example.com');
      vi.stubEnv('COOKIE_SECRET', 'cookie-secret');

      const { getLogtoConfig } = await import('./config');
      expect(getLogtoConfig()).toBeDefined();
    });
  });

  describe('backendType', () => {
    it('should default backendType to upstream when BACKEND_TYPE is unset', async () => {
      delete process.env.BACKEND_TYPE;
      delete process.env.NEXT_PUBLIC_BACKEND_TYPE;
      const { getBackendType } = await import('./config');
      expect(getBackendType()).toBe('upstream');
    });

    it('should normalize and use upstream when BACKEND_TYPE is upstream', async () => {
      process.env.BACKEND_TYPE = '  upstream  \n';
      const { getBackendType } = await import('./config');
      expect(getBackendType()).toBe('upstream');
    });

    it('should normalize and use blacktop when BACKEND_TYPE is blacktop', async () => {
      process.env.BACKEND_TYPE = '  blacktop  ';
      const { getBackendType } = await import('./config');
      expect(getBackendType()).toBe('blacktop');
    });

    it('should fall back to upstream when BACKEND_TYPE is invalid', async () => {
      process.env.BACKEND_TYPE = 'invalid';
      const { getBackendType } = await import('./config');
      expect(getBackendType()).toBe('upstream');
    });
  });

  describe('avatarBackend', () => {
    it('uses logto when BACKEND_TYPE=blacktop and PFP_BACKEND=logto', async () => {
      process.env.BACKEND_TYPE = 'blacktop';
      process.env.PFP_BACKEND = 'logto';
      const { getAvatarBackend } = await import('./config');
      expect(getAvatarBackend()).toBe('logto');
    });

    it('uses s3 when BACKEND_TYPE=blacktop and PFP_BACKEND=s3', async () => {
      process.env.BACKEND_TYPE = 'blacktop';
      process.env.PFP_BACKEND = 's3';
      const { getAvatarBackend } = await import('./config');
      expect(getAvatarBackend()).toBe('s3');
    });

    it('forces s3 when BACKEND_TYPE=upstream even if PFP_BACKEND=logto', async () => {
      process.env.BACKEND_TYPE = 'upstream';
      process.env.PFP_BACKEND = 'logto';
      const { getAvatarBackend } = await import('./config');
      expect(getAvatarBackend()).toBe('s3');
    });
  });

  describe('countryFilter', () => {
    it('should set fallback allow list when no country lists are provided', async () => {
      delete process.env.COUNTRY_CODE_ALLOW_LIST;
      delete process.env.COUNTRY_CODE_BLOCK_LIST;
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('allow');
      expect(filter.codes).toEqual(['1', '995']);
    });

    it('should parse allow list when COUNTRY_CODE_ALLOW_LIST is provided', async () => {
      process.env.COUNTRY_CODE_ALLOW_LIST = '1, +44, 995';
      delete process.env.COUNTRY_CODE_BLOCK_LIST;
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('allow');
      expect(filter.codes).toEqual(['1', '44', '995']);
    });

    it('should parse block list when COUNTRY_CODE_BLOCK_LIST is provided', async () => {
      delete process.env.COUNTRY_CODE_ALLOW_LIST;
      process.env.COUNTRY_CODE_BLOCK_LIST = '380, +995';
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('block');
      expect(filter.codes).toEqual(['380', '995']);
    });

    it('should fall back to allow list and warn when both are provided', async () => {
      process.env.COUNTRY_CODE_ALLOW_LIST = '1';
      process.env.COUNTRY_CODE_BLOCK_LIST = '44';
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('allow');
      expect(filter.codes).toEqual(['1']);
    });
  });
});
