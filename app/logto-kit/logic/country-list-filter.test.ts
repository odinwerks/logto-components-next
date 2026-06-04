import { describe, it, expect } from 'vitest';
import { parseCountryList, detectCountryFromE164, isCountryAllowed, assertPhoneCountryAllowed } from './country-list-filter';

describe('parseCountryList', () => {
  it('should split on comma and trim values', () => {
    expect(parseCountryList('1, 44, 995')).toEqual(['1', '44', '995']);
  });

  it('should strip plus prefix', () => {
    expect(parseCountryList('+1, +44, +995')).toEqual(['1', '44', '995']);
  });

  it('should filter only numeric digit strings', () => {
    expect(parseCountryList('1, abc, +44, 12a, 995')).toEqual(['1', '44', '995']);
  });

  it('should deduplicate values', () => {
    expect(parseCountryList('1, 44, 1, 995, 44')).toEqual(['1', '44', '995']);
  });

  it('should handle undefined or empty strings gracefully', () => {
    expect(parseCountryList(undefined)).toEqual([]);
    expect(parseCountryList('')).toEqual([]);
    expect(parseCountryList('   ')).toEqual([]);
  });
});

describe('detectCountryFromE164', () => {
  it('should extract digits from the phone number and find the country ISO', () => {
    expect(detectCountryFromE164('+14155552671')).toBe('US'); // US (code: 1)
    expect(detectCountryFromE164('+380501234567')).toBe('UA'); // UA (code: 380)
    expect(detectCountryFromE164('447123456789')).toBe('GB'); // GB (code: 44)
  });

  it('should use longest-prefix match for nested codes', () => {
    // Georgia is +995, Azerbaijan is +994, etc. They are nested under +9 if we did simple startsWith, or +995 vs +99
    // Wait, let's see if there are other nested ones, e.g. USA (+1) vs Bahamas (+1242)
    // USA/Canada is code: '1'. Bahamas is code: '1242'.
    expect(detectCountryFromE164('+995599123456')).toBe('GE'); // Georgia (+995) should match before any +9 prefix
    expect(detectCountryFromE164('+12423022000')).toBe('BS'); // Bahamas (+1242) should match before USA (+1)
  });

  it('should return null if no country prefix is found or phone is invalid', () => {
    expect(detectCountryFromE164('')).toBeNull();
    expect(detectCountryFromE164('abc')).toBeNull();
    expect(detectCountryFromE164('+00000000000')).toBeNull();
  });
});

describe('isCountryAllowed', () => {
  it('should always return true if mode is none', () => {
    const filter = { mode: 'none' as const, codes: ['1', '44'] };
    expect(isCountryAllowed('1', filter)).toBe(true);
    expect(isCountryAllowed('995', filter)).toBe(true);
  });

  it('should handle allow mode correctly', () => {
    const filter = { mode: 'allow' as const, codes: ['1', '44'] };
    expect(isCountryAllowed('1', filter)).toBe(true);
    expect(isCountryAllowed('44', filter)).toBe(true);
    expect(isCountryAllowed('995', filter)).toBe(false);
  });

  it('should handle block mode correctly', () => {
    const filter = { mode: 'block' as const, codes: ['1', '44'] };
    expect(isCountryAllowed('1', filter)).toBe(false);
    expect(isCountryAllowed('44', filter)).toBe(false);
    expect(isCountryAllowed('995', filter)).toBe(true);
  });
});

describe('assertPhoneCountryAllowed', () => {
  it('should pass if phone is empty or has no digits', () => {
    expect(() => assertPhoneCountryAllowed('', { mode: 'allow', codes: ['995'] })).not.toThrow();
    expect(() => assertPhoneCountryAllowed('abc', { mode: 'allow', codes: ['995'] })).not.toThrow();
  });

  it('should allow phone if mode is allow and country is allowed', () => {
    expect(() => assertPhoneCountryAllowed('+995599123456', { mode: 'allow', codes: ['995'] })).not.toThrow();
  });

  it('should throw ValidationError if mode is allow and country is not allowed', () => {
    expect(() => assertPhoneCountryAllowed('+995599123456', { mode: 'allow', codes: ['1'] })).toThrow();
  });

  it('should throw ValidationError if mode is allow and country is not detected', () => {
    expect(() => assertPhoneCountryAllowed('+000599123456', { mode: 'allow', codes: ['1'] })).toThrow();
  });

  it('should allow phone if mode is block and country is not blocked', () => {
    expect(() => assertPhoneCountryAllowed('+995599123456', { mode: 'block', codes: ['1'] })).not.toThrow();
  });

  it('should throw ValidationError if mode is block and country is blocked', () => {
    expect(() => assertPhoneCountryAllowed('+995599123456', { mode: 'block', codes: ['995'] })).toThrow();
  });
});
