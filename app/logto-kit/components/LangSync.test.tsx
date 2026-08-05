import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { LangSync } from './LangSync';

describe('LangSync', () => {
  beforeEach(() => {
    vi.stubEnv('LANG_AVAILABLE', 'en-US,ka-GE,uk-UA');
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
    vi.mocked(sessionStorage.getItem).mockReturnValue('uk-UA');

    render(<LangSync />);

    expect(document.documentElement.lang).toBe('uk-UA');
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

    render(<LangSync defaultLang="ka-GE" />);

    expect(document.documentElement.lang).toBe('ka-GE');
    expect(sessionStorage.getItem).toHaveBeenCalledWith('lang-mode');
    // The key behavior change: setItem is NOT called.
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('derives from document.documentElement.lang WITHOUT writing sessionStorage (Phase 6 read-only)', () => {
    // When neither a stored lang nor a defaultLang prop is provided, the
    // component falls back to the existing DOM attribute — again WITHOUT
    // persisting. `PreferencesProvider` owns the write.
    document.documentElement.lang = 'uk-UA';
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync />);

    expect(document.documentElement.lang).toBe('uk-UA');
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('handles preferences-changed events', () => {
    let mockLang = 'uk-UA';
    vi.mocked(sessionStorage.getItem).mockImplementation(() => mockLang);

    render(<LangSync />);
    expect(document.documentElement.lang).toBe('uk-UA');

    // Trigger event with updated storage
    mockLang = 'ka-GE';
    act(() => {
      window.dispatchEvent(new Event('preferences-changed'));
    });

    expect(document.documentElement.lang).toBe('ka-GE');
  });

  it('falls back when stored lang is an empty string', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('');

    render(<LangSync defaultLang="ka-GE" />);

    // Empty string stored → fall through to defaultLang
    expect(document.documentElement.lang).toBe('ka-GE');
  });

  it('falls back when defaultLang is an empty string', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    // Set DOM lang to a known value before render
    document.documentElement.lang = 'uk-UA';
    render(<LangSync defaultLang="" />);

    // Empty defaultLang → fall through to document.documentElement.lang
    expect(document.documentElement.lang).toBe('uk-UA');
  });

  it('falls back to en when document.documentElement.lang is an empty string', () => {
    document.documentElement.lang = '';
    vi.mocked(sessionStorage.getItem).mockReturnValue(null);

    render(<LangSync />);

    // All sources empty/absent → fall back to 'en'
    expect(document.documentElement.lang).toBe('en-US');
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
      render(<LangSync defaultLang="ka-GE" />);
    }).not.toThrow();

    // Storage threw → helper returned null → component fell back to
    // `defaultLang='ka'` and applied it to the DOM attribute. The
    // important guarantee is that the render did not crash.
    expect(document.documentElement.lang).toBe('ka-GE');
    // And the component never attempted to write (read-only contract).
    expect(sessionStorage.setItem).not.toHaveBeenCalled();
  });

  it('rejects unsupported stored, default, and DOM locales', () => {
    vi.mocked(sessionStorage.getItem).mockReturnValue('not-a-locale');
    document.documentElement.lang = 'also-invalid';
    render(<LangSync defaultLang="invalid" />);
    expect(document.documentElement.lang).toBe('en-US');
  });
});
