import { describe, expect, it } from 'vitest';
import { enUS } from '../en-US';
import { kaGE } from '../ka-GE';
import { ukUA } from '../uk-UA';

const locales = { enUS, kaGE, ukUA } as const;
const requiredKeys = ['verifyToActionDesc', 'createDesc'] as const;
const removedKeys = [
  'copyNowWarning',
  'usageTitle',
  'usageDesc',
  'usageEndpointPlaceholder',
  'usageAppIdPlaceholder',
] as const;

describe('dev locale namespace parity', () => {
  it('keeps identical, non-empty keys across every locale', () => {
    const expectedKeys = Object.keys(enUS.dev).sort();

    for (const [localeName, locale] of Object.entries(locales)) {
      expect(Object.keys(locale.dev).sort(), localeName).toEqual(expectedKeys);
      for (const [key, value] of Object.entries(locale.dev)) {
        expect(value.trim(), `${localeName}.dev.${key}`).not.toBe('');
      }
    }
  });

  it('contains the new modal copy and omits removed result copy', () => {
    for (const [localeName, locale] of Object.entries(locales)) {
      const dev = locale.dev as Record<string, string>;
      for (const key of requiredKeys) {
        expect(dev[key]?.trim(), `${localeName}.dev.${key}`).toBeTruthy();
      }
      for (const key of removedKeys) {
        expect(dev, `${localeName}.dev.${key}`).not.toHaveProperty(key);
      }
    }
  });
});
