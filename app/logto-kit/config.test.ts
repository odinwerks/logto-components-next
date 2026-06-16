import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('config resolution', () => {
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

    // CFG-BUG-004: IPv6 loopback exemptions
    it('allows HTTP [::1] LOGTO_INTROSPECTION_URL in production (IPv6 loopback)', async () => {
      process.env.LOGTO_INTROSPECTION_URL = 'http://[::1]:3001/oidc/introspect';
      process.env.APP_ID = 'client-id-123';
      process.env.APP_SECRET = 'super-secret-value';
      process.env.ENDPOINT = 'https://logto.example.com';
      process.env.BASE_URL = 'https://app.example.com';
      process.env.COOKIE_SECRET = 'cookie-secret';

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
    it('should default to mode none when no country lists are provided', async () => {
      delete process.env.COUNTRY_CODE_ALLOW_LIST;
      delete process.env.COUNTRY_CODE_BLOCK_LIST;
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('none');
      expect(filter.codes).toEqual([]);
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

    it('should throw a descriptive Configuration Error at runtime if both are provided', async () => {
      process.env.COUNTRY_CODE_ALLOW_LIST = '1';
      process.env.COUNTRY_CODE_BLOCK_LIST = '44';
      await expect(import('./config')).rejects.toThrow(
        /COUNTRY_CODE_ALLOW_LIST and COUNTRY_CODE_BLOCK_LIST are set/i
      );
    });

    it('should not throw and should fall back to allow list during build time if both are provided', async () => {
      vi.stubEnv('npm_lifecycle_event', 'build');
      process.env.COUNTRY_CODE_ALLOW_LIST = '1';
      process.env.COUNTRY_CODE_BLOCK_LIST = '44';
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('allow');
      expect(filter.codes).toEqual(['1']);
    });

    it('should not throw if both are set but one or both parse to empty lists', async () => {
      process.env.COUNTRY_CODE_ALLOW_LIST = 'abc'; // empty list of digits
      process.env.COUNTRY_CODE_BLOCK_LIST = '44';
      const { getCountryFilter } = await import('./config');
      const filter = getCountryFilter();
      expect(filter.mode).toBe('block');
      expect(filter.codes).toEqual(['44']);
    });
  });
});

// BUG-020: M2M token not cached
describe('getManagementApiToken caching', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('APP_SECRET', 'dummy-app-secret');
    vi.stubEnv('APP_ID', 'test-app-id');
    vi.stubEnv('ENDPOINT', 'https://logto.example.com');
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('COOKIE_SECRET', 'cookie-secret');
    vi.stubEnv('LOGTO_M2M_APP_ID', 'm2m-app-id');
    vi.stubEnv('LOGTO_M2M_APP_SECRET', 'm2m-app-secret');
    vi.stubEnv('NODE_ENV', 'development');

    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'test-token-abc', expires_in: 3600 }),
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('returns cached token on second call without making another HTTP request', async () => {
    const { getManagementApiToken } = await import('./config');

    const token1 = await getManagementApiToken();
    expect(token1).toBe('test-token-abc');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const token2 = await getManagementApiToken();
    expect(token2).toBe('test-token-abc');
    // Should NOT have made another fetch call - token is cached
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('fetches a new token after the cache TTL expires', async () => {
    const { getManagementApiToken } = await import('./config');

    // First call - fetches and caches
    const token1 = await getManagementApiToken();
    expect(token1).toBe('test-token-abc');
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Advance time past the new dynamic TTL ((3600 - 60) * 1000)
    vi.useFakeTimers();
    vi.advanceTimersByTime((3600 - 60) * 1000 + 1);

    // Update the mock to return a different token for the second fetch
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'new-token-xyz', expires_in: 3600 }),
    } as Response);

    const token2 = await getManagementApiToken();
    expect(token2).toBe('new-token-xyz');
    // Should have made another fetch call because cache expired
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

// API-A05: M2M token failure triggers exponential backoff, not a retry storm
describe('getManagementApiToken exponential backoff (API-A05)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('APP_SECRET', 'dummy-app-secret');
    vi.stubEnv('APP_ID', 'test-app-id');
    vi.stubEnv('ENDPOINT', 'https://logto.example.com');
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('COOKIE_SECRET', 'cookie-secret');
    vi.stubEnv('LOGTO_M2M_APP_ID', 'm2m-app-id');
    vi.stubEnv('LOGTO_M2M_APP_SECRET', 'm2m-app-secret');
    vi.stubEnv('NODE_ENV', 'development');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('applies a backoff delay on second call after first failure', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      // First call: fails
      .mockResolvedValueOnce({ ok: false, text: async () => 'Internal Server Error', status: 500 } as unknown as Response)
      // Second call: succeeds
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'recovered-token' }) } as Response);

    const { getManagementApiToken } = await import('./config');

    // First call — fails, increments retry count
    await expect(getManagementApiToken()).rejects.toThrow('Management API token request failed');

    // Second call — should wait for backoff delay before fetching
    // We set timers to advance past the expected delay
    const secondCallPromise = getManagementApiToken();
    // Advance timers past the base delay (500ms * 2^1 = 1000ms)
    vi.advanceTimersByTime(1100);
    const token = await secondCallPromise;

    expect(token).toBe('recovered-token');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('resets backoff counter after a successful token fetch', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValueOnce({ ok: false, text: async () => 'error', status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'token-after-retry' }) } as Response)
      // Third call — should NOT wait (counter reset), immediate fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'fresh-token' }) } as Response);

    const { getManagementApiToken } = await import('./config');

    // First call fails
    await expect(getManagementApiToken()).rejects.toThrow();

    // Second call succeeds (advance timer past backoff)
    const secondCallPromise = getManagementApiToken();
    vi.advanceTimersByTime(2000);
    await secondCallPromise;

    // Expire the cache so we need a new token
    vi.advanceTimersByTime((3600 - 60) * 1000 + 1);

    // Third call — no backoff expected (counter was reset to 0 after success)
    // If no delay applied, it resolves immediately without timer advance
    const thirdToken = await getManagementApiToken();
    expect(thirdToken).toBe('fresh-token');
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});

// HIGH-2: M2M Token Circuit Breaker
describe('getManagementApiToken circuit breaker (HIGH-2)', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('APP_SECRET', 'dummy-app-secret');
    vi.stubEnv('APP_ID', 'test-app-id');
    vi.stubEnv('ENDPOINT', 'https://logto.example.com');
    vi.stubEnv('BASE_URL', 'https://app.example.com');
    vi.stubEnv('COOKIE_SECRET', 'cookie-secret');
    vi.stubEnv('LOGTO_M2M_APP_ID', 'm2m-app-id');
    vi.stubEnv('LOGTO_M2M_APP_SECRET', 'm2m-app-secret');
    vi.stubEnv('NODE_ENV', 'development');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('circuit opens after 5 consecutive failures and rejects immediately without waiting', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, text: async () => 'server error', status: 500 } as unknown as Response);

    const { getManagementApiToken } = await import('./config');

    // Trigger 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      const p = getManagementApiToken();
      // Advance timers to skip any backoff delays
      vi.advanceTimersByTime(60_000);
      await expect(p).rejects.toThrow('Management API token request failed');
    }

    // Fetch was called for each of the 5 failures
    expect(fetchSpy.mock.calls.length).toBeGreaterThanOrEqual(5);

    // 6th call: circuit is open — must throw M2M_TOKEN_CIRCUIT_OPEN without calling fetch
    const callsBeforeCircuit = fetchSpy.mock.calls.length;
    await expect(getManagementApiToken()).rejects.toThrow('M2M_TOKEN_CIRCUIT_OPEN');
    // No additional fetch call should be made
    expect(fetchSpy.mock.calls.length).toBe(callsBeforeCircuit);
  });

  it('circuit closes and allows a probe after reset window', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
      .mockResolvedValue({ ok: false, text: async () => 'server error', status: 500 } as unknown as Response);

    const { getManagementApiToken } = await import('./config');

    // Trigger 5 failures to open the circuit
    for (let i = 0; i < 5; i++) {
      const p = getManagementApiToken();
      vi.advanceTimersByTime(60_000);
      await expect(p).rejects.toThrow();
    }

    // Confirm circuit is open
    await expect(getManagementApiToken()).rejects.toThrow('M2M_TOKEN_CIRCUIT_OPEN');

    // Now mock fetch to succeed
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'recovered-token', expires_in: 3600 }),
    } as Response);

    // Advance past the reset window (30s)
    vi.advanceTimersByTime(30_001);

    // Probe should be allowed and succeed
    const token = await getManagementApiToken();
    expect(token).toBe('recovered-token');
  });

  it('waiter cap rejects the 26th concurrent caller immediately', async () => {
    // Make the fetch hang indefinitely so all callers pile up on pendingTokenPromise.
    vi.spyOn(global, 'fetch').mockReturnValue(new Promise(() => {}));

    const { getManagementApiToken } = await import('./config');

    // Calls work as follows:
    //   Call 1: sees pendingTokenPromise=null, creates it, becomes the "owner"
    //   Calls 2-26: see pendingTokenPromise!=null, become waiters 1-25 (m2mPendingWaiters 1..25)
    //   Call 27: becomes waiter 26, m2mPendingWaiters increments to 26 > 25, rejects immediately
    //
    // We need 27 total calls: 1 owner + 25 allowed waiters + 1 rejected waiter.
    const promises: Promise<string>[] = [];
    for (let i = 0; i < 27; i++) {
      promises.push(getManagementApiToken());
    }

    // The 27th call (index 26) should be rejected immediately with M2M_TOKEN_OVERLOADED.
    // We don't need to flush timers — the rejection happens synchronously in the
    // increment/check branch before any await.
    await expect(promises[26]).rejects.toThrow('M2M_TOKEN_OVERLOADED');
  }, 10_000);

  it('successful token fetch resets circuit and retry count', async () => {
    vi.spyOn(global, 'fetch')
      // 3 failures first
      .mockResolvedValueOnce({ ok: false, text: async () => 'err', status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, text: async () => 'err', status: 500 } as unknown as Response)
      .mockResolvedValueOnce({ ok: false, text: async () => 'err', status: 500 } as unknown as Response)
      // Then success
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'reset-token', expires_in: 3600 }),
      } as Response)
      // After cache expires: another success (no backoff expected, counter was reset)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'second-token', expires_in: 3600 }),
      } as Response);

    const { getManagementApiToken } = await import('./config');

    // 3 failures
    for (let i = 0; i < 3; i++) {
      const p = getManagementApiToken();
      vi.advanceTimersByTime(60_000);
      await expect(p).rejects.toThrow();
    }

    // Success (advance past backoff)
    const p = getManagementApiToken();
    vi.advanceTimersByTime(60_000);
    const token = await p;
    expect(token).toBe('reset-token');

    // Expire the cache
    vi.advanceTimersByTime((3600 - 60) * 1000 + 1);

    // Next call: no backoff (retry count reset), no circuit open, succeeds immediately
    const nextToken = await getManagementApiToken();
    expect(nextToken).toBe('second-token');
  });
});
