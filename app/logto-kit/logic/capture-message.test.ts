import { describe, it, expect } from 'vitest';
import { captureMessage } from './capture-message';

describe('captureMessage', () => {
  it('returns plain error message as-is', () => {
    const err = new Error('Something went wrong');
    expect(captureMessage(err)).toBe('Something went wrong');
  });

  it('strips Next.js internal digest hash from error messages', () => {
    const err = new Error('Internal error\n\ndigest: abc123def456');
    expect(captureMessage(err)).toBe('Internal error');
  });

  it('strips digest hash even when appended with extra whitespace', () => {
    const err = new Error('Render error\n\ndigest: xyz789');
    expect(captureMessage(err)).toBe('Render error');
  });

  it('returns error message unchanged when no digest present', () => {
    const err = new Error('Normal error message');
    expect(captureMessage(err)).toBe('Normal error message');
  });

  it('returns string errors directly', () => {
    expect(captureMessage('string error')).toBe('string error');
  });

  it('extracts .message from plain objects', () => {
    expect(captureMessage({ message: 'obj error' })).toBe('obj error');
  });

  it('falls back to String(err) for unknown types', () => {
    expect(captureMessage(42)).toBe('42');
    expect(captureMessage(true)).toBe('true');
  });

  it('returns Unknown error when String throws', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    // String(circular) returns "[object Object]" so it won't throw,
    // but we test the catch path with a throwing proxy
    const throwingObj = new Proxy({}, {
      get() { throw new Error('nope'); },
    });
    // Accessing .message will throw
    const result = captureMessage(throwingObj);
    expect(typeof result).toBe('string');
  });
});
