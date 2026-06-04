import { describe, it, expect } from 'vitest';
import { COUNTRY_CODES, getFlagEmoji } from './country-codes';

describe('COUNTRY_CODES', () => {
  it('should be a readonly array of at least 120 elements', () => {
    expect(COUNTRY_CODES.length).toBeGreaterThanOrEqual(120);
    expect(Object.isFrozen(COUNTRY_CODES)).toBe(true);
  });

  it('should have valid country entries', () => {
    COUNTRY_CODES.forEach((country) => {
      expect(country).toHaveProperty('code');
      expect(country).toHaveProperty('iso');
      expect(country).toHaveProperty('name');
      expect(typeof country.code).toBe('string');
      expect(typeof country.iso).toBe('string');
      expect(typeof country.name).toBe('string');
      expect(country.iso.length).toBe(2);
    });
  });

  it('should contain specific major countries', () => {
    const findByIso = (iso: string) => COUNTRY_CODES.find(c => c.iso === iso);
    
    expect(findByIso('US')).toEqual({ code: '1', iso: 'US', name: 'United States / Canada' });
    expect(findByIso('GE')).toEqual({ code: '995', iso: 'GE', name: 'Georgia' });
    expect(findByIso('UA')).toEqual({ code: '380', iso: 'UA', name: 'Ukraine' });
    expect(findByIso('GB')).toEqual({ code: '44', iso: 'GB', name: 'United Kingdom' });
    expect(findByIso('DE')).toEqual({ code: '49', iso: 'DE', name: 'Germany' });
    expect(findByIso('FR')).toEqual({ code: '33', iso: 'FR', name: 'France' });
    expect(findByIso('KZ')).toEqual({ code: '77', iso: 'KZ', name: 'Kazakhstan' });
  });
});

describe('getFlagEmoji', () => {
  it('should dynamically convert ISO-2 to regional indicator symbols', () => {
    expect(getFlagEmoji('US')).toBe('🇺🇸');
    expect(getFlagEmoji('GE')).toBe('🇬🇪');
    expect(getFlagEmoji('UA')).toBe('🇺🇦');
    expect(getFlagEmoji('GB')).toBe('🇬🇧');
  });

  it('should handle lowercase ISO codes', () => {
    expect(getFlagEmoji('us')).toBe('🇺🇸');
    expect(getFlagEmoji('ge')).toBe('🇬🇪');
  });

  it('should return fallback 🌐 for invalid or non-2-character codes', () => {
    expect(getFlagEmoji('')).toBe('🌐');
    expect(getFlagEmoji('USA')).toBe('🌐');
    expect(getFlagEmoji('1')).toBe('🌐');
    expect(getFlagEmoji('A')).toBe('🌐');
  });
});
