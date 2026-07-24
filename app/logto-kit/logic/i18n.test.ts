import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to control process.env, so reset modules before each test
beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
});

describe('getSupportedLangs', () => {
  it('returns [defaultLang] when LANG_AVAILABLE is empty', async () => {
    vi.stubEnv('LANG_AVAILABLE', '');
    vi.stubEnv('LANG_MAIN', 'en-US');
    const { getSupportedLangs } = await import('./i18n');
    expect(getSupportedLangs()).toEqual(['en-US']);
  });

  it('returns [defaultLang] when LANG_AVAILABLE is not set', async () => {
    vi.stubEnv('LANG_AVAILABLE', undefined);
    vi.stubEnv('LANG_MAIN', '');
    const { getSupportedLangs } = await import('./i18n');
    // Default fallback is first AVAILABLE_LOCALES entry = 'en-US'
    expect(getSupportedLangs()).toEqual(['en-US']);
  });

  it('filters LANG_AVAILABLE to only AVAILABLE_LOCALES codes', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,de-DE,ka-GE,fr-FR');
    const { getSupportedLangs } = await import('./i18n');
    expect(getSupportedLangs()).toEqual(['en-US', 'ka-GE']);
  });

  it('preserves LANG_AVAILABLE order', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'ka-GE,en-US,uk-UA');
    const { getSupportedLangs } = await import('./i18n');
    expect(getSupportedLangs()).toEqual(['ka-GE', 'en-US', 'uk-UA']);
  });

  it('falls back to default when no LANG_AVAILABLE codes are valid', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'de-DE,fr-FR');
    vi.stubEnv('LANG_MAIN', 'en-US');
    const { getSupportedLangs } = await import('./i18n');
    expect(getSupportedLangs()).toEqual(['en-US']);
  });
});

describe('getDefaultLang', () => {
  it('returns LANG_MAIN when valid and in LANG_AVAILABLE', async () => {
    vi.stubEnv('LANG_MAIN', 'ka-GE');
    vi.stubEnv('LANG_AVAILABLE', 'ka-GE,en-US');
    const { getDefaultLang } = await import('./i18n');
    expect(getDefaultLang()).toBe('ka-GE');
  });

  it('returns LANG_MAIN when valid and LANG_AVAILABLE is not set', async () => {
    vi.stubEnv('LANG_MAIN', 'ka-GE');
    vi.stubEnv('LANG_AVAILABLE', '');
    const { getDefaultLang } = await import('./i18n');
    expect(getDefaultLang()).toBe('ka-GE');
  });

  // BUG-072: LANG_MAIN valid per AVAILABLE_LOCALES but NOT in LANG_AVAILABLE
  it('does NOT return LANG_MAIN when it is not in LANG_AVAILABLE (BUG-072)', async () => {
    vi.stubEnv('LANG_MAIN', 'uk-UA');
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE'); // uk-UA excluded
    const { getDefaultLang } = await import('./i18n');
    // Should fall through to first LANG_AVAILABLE code
    expect(getDefaultLang()).toBe('en-US');
  });

  it('falls back to first LANG_AVAILABLE code when LANG_MAIN is invalid', async () => {
    vi.stubEnv('LANG_MAIN', 'de-DE');
    vi.stubEnv('LANG_AVAILABLE', 'ka-GE,en-US');
    const { getDefaultLang } = await import('./i18n');
    expect(getDefaultLang()).toBe('ka-GE');
  });

  it('falls back to AVAILABLE_LOCALES[0] when nothing is set', async () => {
    vi.stubEnv('LANG_MAIN', '');
    vi.stubEnv('LANG_AVAILABLE', '');
    const { getDefaultLang } = await import('./i18n');
    expect(getDefaultLang()).toBe('en-US');
  });

  it('falls back to AVAILABLE_LOCALES[0] when LANG_MAIN is not in AVAILABLE_LOCALES nor LANG_AVAILABLE', async () => {
    vi.stubEnv('LANG_MAIN', 'de-DE');
    vi.stubEnv('LANG_AVAILABLE', 'de-DE,fr-FR'); // all invalid against AVAILABLE_LOCALES
    const { getDefaultLang } = await import('./i18n');
    expect(getDefaultLang()).toBe('en-US');
  });

  // BUG-072: verify getDefaultLang result is always in getSupportedLangs()
  it('result is always in getSupportedLangs() (BUG-072 regression)', async () => {
    // Scenario that originally triggered BUG-072:
    // LANG_MAIN=uk-UA (valid per AVAILABLE_LOCALES) but LANG_AVAILABLE=en-US,ka-GE
    vi.stubEnv('LANG_MAIN', 'uk-UA');
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE');
    const { getDefaultLang, getSupportedLangs } = await import('./i18n');
    const defaultLang = getDefaultLang();
    const supported = getSupportedLangs();
    expect(supported).toContain(defaultLang);
  });
});

describe('isValidLang', () => {
  it('returns true for supported langs', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE,uk-UA');
    const { isValidLang } = await import('./i18n');
    expect(isValidLang('en-US')).toBe(true);
    expect(isValidLang('ka-GE')).toBe(true);
    expect(isValidLang('uk-UA')).toBe(true);
  });

  it('returns false for unsupported langs', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US');
    const { isValidLang } = await import('./i18n');
    expect(isValidLang('de-DE')).toBe(false);
    expect(isValidLang('fr-FR')).toBe(false);
  });
});

describe('getNextLang', () => {
  it('cycles through supported langs', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE,uk-UA');
    const { getNextLang } = await import('./i18n');
    expect(getNextLang('en-US')).toBe('ka-GE');
    expect(getNextLang('ka-GE')).toBe('uk-UA');
    expect(getNextLang('uk-UA')).toBe('en-US');
  });

  it('returns first lang for unknown input', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE');
    const { getNextLang } = await import('./i18n');
    expect(getNextLang('de-DE')).toBe('en-US');
  });
});

describe('resolveLang', () => {
  it('returns default for null/undefined', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US');
    const { resolveLang } = await import('./i18n');
    expect(resolveLang(null)).toBe('en-US');
    expect(resolveLang(undefined)).toBe('en-US');
    expect(resolveLang('')).toBe('en-US');
  });

  it('returns the lang if valid', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE');
    const { resolveLang } = await import('./i18n');
    expect(resolveLang('ka-GE')).toBe('ka-GE');
  });

  it('returns default for invalid lang', async () => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US');
    vi.stubEnv('LANG_MAIN', 'en-US');
    const { resolveLang } = await import('./i18n');
    expect(resolveLang('de-DE')).toBe('en-US');
  });
});
