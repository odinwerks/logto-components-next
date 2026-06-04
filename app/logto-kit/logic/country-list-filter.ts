import { COUNTRY_CODES } from './country-codes';
import { ValidationError } from './validation';

const SORTED_COUNTRY_CODES = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

/**
 * Parses a comma-separated list of country dial codes.
 * Removes leading/trailing whitespace, strips plus sign prefix, filters out non-numeric entries,
 * and deduplicates the resulting list.
 */
export function parseCountryList(val: string | undefined): string[] {
  if (!val) return [];
  const parts = val.split(',');
  const result: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    const cleaned = part.trim().replace(/^\+/, '');
    if (/^\d+$/.test(cleaned)) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        result.push(cleaned);
      }
    }
  }

  return result;
}

/**
 * Detects the country ISO-2 code from an E.164 phone number.
 * Finds the country with the longest matching prefix code.
 */
export function detectCountryFromE164(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  for (const country of SORTED_COUNTRY_CODES) {
    if (digits.startsWith(country.code)) {
      return country.iso;
    }
  }

  return null;
}

/**
 * Implements allowance/blocking logic based on the filter mode and dial codes set.
 */
export function isCountryAllowed(
  dialCode: string,
  filter: { mode: 'allow' | 'block' | 'none'; codes: string[] }
): boolean {
  if (filter.mode === 'none') {
    return true;
  }
  if (filter.mode === 'allow') {
    return filter.codes.includes(dialCode);
  }
  if (filter.mode === 'block') {
    return !filter.codes.includes(dialCode);
  }
  return true;
}

export function assertPhoneCountryAllowed(
  phone: string,
  filter: { mode: 'allow' | 'block' | 'none'; codes: string[] }
): void {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return; // let downstream validation handle empty

  const ccIso = detectCountryFromE164(digits);
  const cc = ccIso ? COUNTRY_CODES.find(c => c.iso === ccIso)?.code || null : null;

  if (filter.mode === 'allow') {
    // Fail-closed: unmapped country codes are rejected under allowlist mode.
    if (!cc || !filter.codes.includes(cc)) {
      throw new ValidationError('PHONE_COUNTRY_NOT_ALLOWED', 'phone');
    }
  } else if (filter.mode === 'block') {
    if (cc && filter.codes.includes(cc)) {
      throw new ValidationError('PHONE_COUNTRY_NOT_ALLOWED', 'phone');
    }
  }
}
