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

  it('derives from defaultLang WITHOUT writing sessionStorage (Phase 6 race fix: read-only syncer)', () => {
    // Phase 6: LangSync is now a READ-ONLY syncer. When no stored lang
    // exists, it applies `defaultLang` to the DOM attribute but does NOT
    // call `sessionStorage.setItem` — `PreferencesProvider` is the single
    // owner of `lang-mode` writes and will persist the canonical initial
    // value on its own mount effect. This eliminates the mount-time race
    // where both components wrote the key and "last writer wins" could
    // clobber the server-derived default with a DOM-derived one.
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync defaultLang="ka" />);

    expect(document.documentElement.lang).toBe('ka');
    expect(sessionStorage.getItem).toHaveBeenCalledWith('lang-mode');
    // The key behavior change: setItem is NOT called.
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('derives from document.documentElement.lang WITHOUT writing sessionStorage (Phase 6 read-only)', () => {
    // When neither a stored lang nor a defaultLang prop is provided, the
    // component falls back to the existing DOM attribute — again WITHOUT
    // persisting. `PreferencesProvider` owns the write.
    document.documentElement.lang = 'uk';
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync />);

    expect(document.documentElement.lang).toBe('uk');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
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

  it('falls back when stored lang is an empty string', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('');

    render(<LangSync defaultLang="ja" />);

    // Empty string stored → fall through to defaultLang
    expect(document.documentElement.lang).toBe('ja');
  });

  it('falls back when defaultLang is an empty string', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    // Set DOM lang to a known value before render
    document.documentElement.lang = 'fr';
    render(<LangSync defaultLang="" />);

    // Empty defaultLang → fall through to document.documentElement.lang
    expect(document.documentElement.lang).toBe('fr');
  });

  it('falls back to en when document.documentElement.lang is an empty string', () => {
    document.documentElement.lang = '';
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync />);

    // All sources empty/absent → fall back to 'en'
    expect(document.documentElement.lang).toBe('en');
  });

  it('does not crash when sessionStorage throws SecurityError', () => {
    // Phase 6: LangSync is now a read-only syncer using the shared
    // `createStorageHelpers` (which swallows SecurityError and returns null).
    // When storage is unavailable, the component falls back to `defaultLang`
    // (or the existing DOM attribute) so screen readers still get the right
    // language — the storage error is absorbed and never surfaces to the
    // user. The previous assertion (`document.documentElement.lang` stays
    // 'en') reflected the old try/catch-in-component behavior where the
    // throw prevented the assignment; with the helper, the throw is
    // absorbed and the fallback assignment proceeds.
    vi.mocked(sessionStorage.getItem).mockImplementation(() => {
      throw new Error('SecurityError: Sandbox restriction');
    });
    vi.mocked(sessionStorage.setItem).mockImplementation(() => {
      throw new Error('SecurityError: Sandbox restriction');
    });

    expect(() => {
      render(<LangSync defaultLang="ka" />);
    }).not.toThrow();

    // Storage threw → helper returned null → component fell back to
    // `defaultLang='ka'` and applied it to the DOM attribute. The
    // important guarantee is that the render did not crash.
    expect(document.documentElement.lang).toBe('ka');
    // And the component never attempted to write (read-only contract).
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });
});