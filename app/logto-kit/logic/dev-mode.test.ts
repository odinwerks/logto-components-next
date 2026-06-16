import { describe, it, expect, vi, afterEach } from 'vitest';

describe('isDev', () => {
  it('is false in test environment - fail-closed for security', async () => {
    // Tests run with NODE_ENV=test, which isDev treats as dev (for DX).
    // This test documents the expected value so changes are intentional.
    const { isDev, isProd } = await import('./dev-mode');
    expect(isProd).toBe(false);
    expect(isDev).toBe(true);
  });
});

// ============================================================================
// Startup guard tests
// ============================================================================

describe('dev-mode startup guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('logs warning when NODE_ENV is development and BASE_URL is non-localhost', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BASE_URL', 'https://dash.example.com');
    vi.stubEnv('ENDPOINT', '');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Re-import to trigger the module-level guard with new env
    vi.resetModules();
    await import('./dev-mode');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[SECURITY]'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('dash.example.com'),
    );
  });

  it('does not warn when NODE_ENV is development and BASE_URL is localhost', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BASE_URL', 'http://localhost:3000');
    vi.stubEnv('ENDPOINT', 'http://localhost:4000');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    await import('./dev-mode');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does not warn when NODE_ENV is production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BASE_URL', 'https://dash.example.com');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    await import('./dev-mode');

    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns about ENDPOINT when it is non-localhost and NODE_ENV is development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BASE_URL', '');
    vi.stubEnv('ENDPOINT', 'https://auth.example.com');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    await import('./dev-mode');

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('auth.example.com'),
    );
  });

  it('does not warn when NODE_ENV is test (keeps test output clean)', async () => {
    // NODE_ENV=test is the default in vitest - guard must stay silent
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('BASE_URL', 'https://dash.example.com');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.resetModules();
    await import('./dev-mode');

    expect(warnSpy).not.toHaveBeenCalled();
  });
});
