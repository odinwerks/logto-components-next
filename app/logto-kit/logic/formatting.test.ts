import { describe, it, expect } from 'vitest';
import { formatPhone } from './formatting';

describe('formatPhone', () => {
  it('returns raw string if falsy or empty', () => {
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null as unknown as string)).toBeNull();
  });

  it('formats US numbers correctly', () => {
    expect(formatPhone('+12065550100')).toBe('+1 206 555 0100');
  });

  it('formats German numbers correctly', () => {
    // Short German numbers
    expect(formatPhone('+491')).toBe('+49 1');
    expect(formatPhone('+4912')).toBe('+49 12');
    expect(formatPhone('+49123')).toBe('+49 123');

    // Medium German numbers (up to 7 total digits, i.e., 5 remaining digits)
    expect(formatPhone('+491761')).toBe('+49 176 1');
    expect(formatPhone('+4917612')).toBe('+49 176 12');
    expect(formatPhone('+49176123')).toBe('+49 176 123');

    // Longer German numbers (should group the local part from the right)
    expect(formatPhone('+4917612345')).toBe('+49 176 12 345');
    expect(formatPhone('+4917612345678')).toBe('+49 176 12 345 678');
  });

  it('falls back to grouping from the right for unknown countries', () => {
    expect(formatPhone('+9991234567890')).toBe('+9 991 234 567 890');
  });
});
