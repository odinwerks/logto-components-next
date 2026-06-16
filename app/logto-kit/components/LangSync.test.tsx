import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { LangSync } from './LangSync';

describe('LangSync', () => {
  beforeEach(() => {
    // Reset document.documentElement.lang
    document.documentElement.lang = 'en';
    // Clear and mock sessionStorage
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncs lang-mode from sessionStorage to document.documentElement.lang', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('uk');

    render(<LangSync />);

    expect(document.documentElement.lang).toBe('uk');
    expect(sessionStorage.getItem).toHaveBeenCalledWith('lang-mode');
  });

  it('derives from defaultLang and sets sessionStorage when no stored lang is found', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync defaultLang="ka" />);

    expect(document.documentElement.lang).toBe('ka');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('lang-mode', 'ka');
  });

  it('derives from document.documentElement.lang when no stored lang or defaultLang is found', () => {
    document.documentElement.lang = 'uk';
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync />);

    expect(document.documentElement.lang).toBe('uk');
    expect(sessionStorage.setItem).toHaveBeenCalledWith('lang-mode', 'uk');
  });

  it('handles preferences-changed events', () => {
    let mockLang = 'uk';
    vi.mocked(sessionStorage.getItem).mockImplementation(() => mockLang);

    render(<LangSync />);
    expect(document.documentElement.lang).toBe('uk');

    // Trigger event with updated storage
    mockLang = 'ka';
    act(() => {
      window.dispatchEvent(new Event('preferences-changed'));
    });

    expect(document.documentElement.lang).toBe('ka');
  });

  it('does not crash when sessionStorage throws SecurityError', () => {
    vi.mocked(sessionStorage.getItem).mockImplementation(() => {
      throw new Error('SecurityError: Sandbox restriction');
    });
    vi.mocked(sessionStorage.setItem).mockImplementation(() => {
      throw new Error('SecurityError: Sandbox restriction');
    });

    expect(() => {
      render(<LangSync defaultLang="ka" />);
    }).not.toThrow();

    // document.documentElement.lang is untouched or still correct
    expect(document.documentElement.lang).toBe('en');
  });
});