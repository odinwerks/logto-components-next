import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config resolution', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      APP_SECRET: 'dummy-app-secret',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
