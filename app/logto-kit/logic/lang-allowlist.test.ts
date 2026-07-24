import { describe, it, expect, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('getLangAllowlist', () => {
  it('returns default langs when LANG_AVAILABLE is not set', async () => {
    vi.stubEnv('LANG_AVAILABLE', undefined);
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.has('en-US')).toBe(true);
    expect(result.has('ka-GE')).toBe(true);
    expect(result.has('uk-UA')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('parses LANG_AVAILABLE env var', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.has('en-US')).toBe(true);
    expect(result.has('ka-GE')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('trims whitespace from entries', async () => {
    vi.stubEnv('LANG_AVAILABLE', ' en-US , ka-GE , uk-UA ');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.has('en-US')).toBe(true);
    expect(result.has('ka-GE')).toBe(true);
    expect(result.has('uk-UA')).toBe(true);
    expect(result.size).toBe(3);
  });

  it('handles malformed LANG_AVAILABLE (commas only) by falling back to defaults', async () => {
    vi.stubEnv('LANG_AVAILABLE', ',,  ,');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.has('en-US')).toBe(true);
    expect(result.size).toBe(3);
  });

  // BUG-073: ensure codes not in AVAILABLE_LOCALES are filtered out
  it('filters out codes not in AVAILABLE_LOCALES (BUG-073)', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,de-DE,fr-FR,ka-GE');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    // de-DE and fr-FR should be filtered out
    expect(result.has('en-US')).toBe(true);
    expect(result.has('ka-GE')).toBe(true);
    expect(result.has('de-DE')).toBe(false);
    expect(result.has('fr-FR')).toBe(false);
    expect(result.size).toBe(2);
  });

  it('falls back to defaults when all LANG_AVAILABLE codes are invalid', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'de-DE,fr-FR');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.has('en-US')).toBe(true);
    expect(result.has('ka-GE')).toBe(true);
    expect(result.has('uk-UA')).toBe(true);
    expect(result.has('de-DE')).toBe(false);
    expect(result.has('fr-FR')).toBe(false);
    expect(result.size).toBe(3);
  });

  it('returns non-empty Set always', async () => {
    vi.stubEnv('LANG_AVAILABLE', '');
    const { getLangAllowlist } = await import('./lang-allowlist');
    const result = getLangAllowlist();
    expect(result.size).toBeGreaterThan(0);
  });
});
