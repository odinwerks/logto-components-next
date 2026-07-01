import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './preferences';
import type { ActionResult } from '../../logic/actions/safe';

type PendingOrgPersist = {
  orgId: string | null;
  resolve: (result: ActionResult) => void;
};

function createOrgPersistMock() {
  const pending: PendingOrgPersist[] = [];
  const onUpdateCustomData = vi.fn((customData: Record<string, unknown>) => {
    const preferences = customData.Preferences as { asOrg: string | null };
    return new Promise<ActionResult>((resolve) => {
      pending.push({ orgId: preferences.asOrg, resolve });
    });
  });

  return { onUpdateCustomData, pending };
}

describe('PreferencesProvider & useThemeMode (BUG-001)', () => {
  beforeEach(() => {
    // Clear and mock sessionStorage
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });

    // Mock window.matchMedia
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // Deprecated
      removeListener: vi.fn(), // Deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets a lang-mode cookie when setLang is called', async () => {
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      return null;
    }

    render(
      <PreferencesProvider initialLang="en" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setLang?.('ka-GE');
    });

    await waitFor(() => expect(onUpdateCustomData).toHaveBeenCalled());

    expect(cookieSpy).toHaveBeenCalled();
    const cookieCall = cookieSpy.mock.calls.find(([value]) =>
      String(value).startsWith('lang-mode=ka-GE')
    );
    expect(cookieCall).toBeDefined();
    expect(String(cookieCall?.[0])).toContain('max-age=31536000');
  });

  it('sets a lang-mode cookie when cached lang is synced on mount', () => {
    const cookieSpy = vi.spyOn(document, 'cookie', 'set');
    sessionStorage.setItem('lang-mode', 'fr');

    function TestComponent() {
      const { lang } = useLangMode();
      return <div>Lang: {lang}</div>;
    }

    render(
      <PreferencesProvider initialLang="en">
        <TestComponent />
      </PreferencesProvider>
    );

    const cookieCall = cookieSpy.mock.calls.find(([value]) =>
      String(value).startsWith('lang-mode=')
    );
    expect(cookieCall).toBeDefined();
    expect(String(cookieCall?.[0])).toContain('lang-mode=fr');
  });

  it('initializes theme state directly to cached theme in sessionStorage on reload', () => {
    // Simulate cached theme in sessionStorage
    sessionStorage.setItem('theme-mode', 'dark');

    let renderedTheme: 'dark' | 'light' | undefined;
    
    function TestComponent() {
      const theme = useThemeMode();
      renderedTheme = theme.mode;
      return <div>Theme: {theme.mode}</div>;
    }

    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );

    // It should respect sessionStorage and initialize to 'dark' by fallback when initialTheme is omitted
    expect(renderedTheme).toBe('dark');
  });

  it('does not overwrite cached theme in sessionStorage on mount when initialTheme is omitted', () => {
    sessionStorage.setItem('theme-mode', 'dark');

    render(
      <PreferencesProvider>
        <div>Test</div>
      </PreferencesProvider>
    );

    // Since initialTheme is omitted, the cached 'dark' should NOT be overwritten
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');
  });

  it('listens for preferences-changed events and updates lang state dynamically', () => {
    let renderedLang: string | undefined;
    let renderedOrg: string | null | undefined;
    
    function TestComponent() {
      const { lang } = useLangMode();
      const { asOrg } = useOrgMode();
      renderedLang = lang;
      renderedOrg = asOrg;
      return <div>Lang: {lang}, Org: {asOrg}</div>;
    }

    render(
      <PreferencesProvider initialLang="en" initialOrgId="org_1">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(renderedLang).toBe('en');
    expect(renderedOrg).toBe('org_1');

    // Now, let's update lang and org in storage and dispatch the event
    sessionStorage.setItem('lang-mode', 'fr');
    sessionStorage.setItem('org-mode', 'org_2');

    act(() => {
      window.dispatchEvent(new Event('preferences-changed'));
    });

    // It should have reactive update for lang, but NOT for org (BUG-M-011)
    expect(renderedLang).toBe('fr');
    expect(renderedOrg).toBe('org_1');

    // Also support CustomEvent detail
    act(() => {
      window.dispatchEvent(new CustomEvent('preferences-changed', {
        detail: { lang: 'es', asOrg: 'org_3' }
      }));
    });

    expect(renderedLang).toBe('es');
    expect(renderedOrg).toBe('org_1');
  });

  it('keeps newest org selection when older persistence fails out of order', async () => {
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    expect(screen.getByTestId('org-value').textContent).toBe('org_1');

    act(() => {
      setAsOrg?.('org_2');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');

    act(() => {
      setAsOrg?.('org_3');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');

    expect(onUpdateCustomData).toHaveBeenCalledTimes(2);
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2', 'org_3']);

    await act(async () => {
      pending[1].resolve({ ok: true });
      await Promise.resolve();
    });

    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');
  });

  it('rolls back to previous org when latest persistence fails', async () => {
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setAsOrg?.('org_2');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');

    act(() => {
      setAsOrg?.('org_3');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_3');

    await act(async () => {
      pending[1].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');

    await act(async () => {
      pending[0].resolve({ ok: true });
      await Promise.resolve();
    });
  });

  it('prevents hydration drift by rendering props defaults first (even when storage is present)', () => {
    sessionStorage.setItem('theme-mode', 'light');
    sessionStorage.setItem('lang-mode', 'fr');
    sessionStorage.setItem('org-mode', 'org_stored');

    function TestComponent() {
      const theme = useThemeMode();
      const lang = useLangMode();
      const org = useOrgMode();
      return (
        <div>
          Theme: {theme.mode}, Lang: {lang.lang}, Org: {org.asOrg}
        </div>
      );
    }

    const html = renderToString(
      <PreferencesProvider initialTheme="dark" initialLang="en" initialOrgId="org_default">
        <TestComponent />
      </PreferencesProvider>
    );

    const cleanHtml = html.replace(/<!--.*?-->/g, '');

    // Initial render / SSR should strictly match the props/defaults first
    expect(cleanHtml).toContain('Theme: dark');
    expect(cleanHtml).toContain('Lang: en');
    expect(cleanHtml).toContain('Org: org_default');
  });

  it('reconciles storage values post-hydration: cached values win over server initial props on mount', () => {
    sessionStorage.setItem('theme-mode', 'light');
    sessionStorage.setItem('lang-mode', 'fr');
    sessionStorage.setItem('org-mode', 'org_stored');

    let renderedTheme: string | undefined;
    let renderedLang: string | undefined;
    let renderedOrg: string | null | undefined;

    function TestComponent() {
      const theme = useThemeMode();
      const lang = useLangMode();
      const org = useOrgMode();
      renderedTheme = theme.mode;
      renderedLang = lang.lang;
      renderedOrg = org.asOrg;
      return null;
    }

    render(
      <PreferencesProvider initialLang="en" initialOrgId="org_default">
        <TestComponent />
      </PreferencesProvider>
    );

    // Fix (BUG-001/H1): cached user selections win over server-provided initial props.
    // Theme has no initial prop, so sessionStorage 'light' wins over default 'dark'.
    // Lang and org: cached values win over the server props ('fr' beats 'en', 'org_stored' beats 'org_default').
    expect(renderedTheme).toBe('light');
    expect(renderedLang).toBe('fr');       // cached wins over server prop
    expect(renderedOrg).toBe('org_stored'); // cached wins over server prop
  });

  it('updates themeRef.current synchronously when setMode is called to prevent silent data corruption', () => {
    const onUpdateCustomData = vi.fn((_customData: Record<string, unknown>) => Promise.resolve({ ok: true } as ActionResult));
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      const lang = useLangMode();
      setMode = theme.setMode;
      setLang = lang.setLang;
      return null;
    }

    render(
      <PreferencesProvider initialTheme="dark" initialLang="en" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    // Call setMode and setLang synchronously in a single act block
    act(() => {
      setMode?.('light');
      setLang?.('fr');
    });

    expect(onUpdateCustomData).toHaveBeenCalled();
    const calls = onUpdateCustomData.mock.calls;
    // After split writes, setMode sends { Preferences: { theme } } and
    // setLang sends { Preferences: { lang } } as separate calls.
    // The first call must be for theme (themeRef.current is updated synchronously).
    const themeCallPayload = (calls[0] as unknown[])[0] as { Preferences: { theme: string } };
    expect(themeCallPayload.Preferences.theme).toBe('light');
  });

  it('ignores invalid theme values from sessionStorage (BUG-L16)', () => {
    // Simulate corrupted/unexpected theme value in sessionStorage
    sessionStorage.setItem('theme-mode', 'purple');

    let renderedTheme: 'dark' | 'light' | undefined;

    function TestComponent() {
      const theme = useThemeMode();
      renderedTheme = theme.mode;
      return <div>Theme: {theme.mode}</div>;
    }

    render(
      <PreferencesProvider>
        <TestComponent />
      </PreferencesProvider>
    );

    // Invalid cached theme should be ignored; component defaults to 'dark'
    expect(renderedTheme).toBe('dark');
  });

  it('accepts only "dark" or "light" from sessionStorage — rejects arbitrary strings (BUG-L16)', () => {
    const invalidValues = ['purple', 'auto', 'system', '1', 'Dark', 'DARK'];
    for (const invalid of invalidValues) {
      sessionStorage.setItem('theme-mode', invalid);

      let renderedTheme: 'dark' | 'light' | undefined;

      function TestComponent() {
        const theme = useThemeMode();
        renderedTheme = theme.mode;
        return null;
      }

      const { unmount } = render(
        <PreferencesProvider>
          <TestComponent />
        </PreferencesProvider>
      );

      // All invalid values should fall back to the default 'dark'
      expect(renderedTheme, `Expected default 'dark' for invalid stored theme "${invalid}"`).toBe('dark');
      unmount();
    }
  });

  // ============================================================================
  // BUG-001 / H1 regression: cached user preference must win over server initial prop
  // ============================================================================

  it('BUG-001: cached lang wins over initialLang server prop on mount', () => {
    // User previously set lang to 'fr'; on remount server provides initialLang='en'.
    // The cached 'fr' must survive.
    sessionStorage.setItem('lang-mode', 'fr');

    let capturedLang: string | undefined;

    function TestComponent() {
      const { lang } = useLangMode();
      capturedLang = lang;
      return null;
    }

    render(
      <PreferencesProvider initialLang="en">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedLang).toBe('fr');
    expect(sessionStorage.getItem('lang-mode')).toBe('fr');
  });

  it('BUG-001: cached org wins over initialOrgId server prop on mount', () => {
    // User switched to 'org_user'; on remount server provides initialOrgId='org_server'.
    // The cached 'org_user' must survive.
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    render(
      <PreferencesProvider initialOrgId="org_server">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');
  });

  it('BUG-001: cached theme wins over initialTheme server prop on mount', () => {
    // User switched to 'light'; on remount server provides initialTheme='dark'.
    // The cached 'light' must survive.
    sessionStorage.setItem('theme-mode', 'light');

    let capturedTheme: 'dark' | 'light' | undefined;

    function TestComponent() {
      const theme = useThemeMode();
      capturedTheme = theme.mode;
      return null;
    }

    render(
      <PreferencesProvider initialTheme="dark">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedTheme).toBe('light');
    expect(sessionStorage.getItem('theme-mode')).toBe('light');
  });

  it('BUG-001: server initialLang is used as fallback when no cached value exists', () => {
    // No cached lang — server prop should be used as the initial value.
    let capturedLang: string | undefined;

    function TestComponent() {
      const { lang } = useLangMode();
      capturedLang = lang;
      return null;
    }

    render(
      <PreferencesProvider initialLang="de">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedLang).toBe('de');
    expect(sessionStorage.getItem('lang-mode')).toBe('de');
  });
});

describe('PreferencesProvider persist error callbacks', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('calls onPersistError with theme message when persistTheme fails', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: false, error: 'network_error' } as ActionResult));
    const onPersistError = vi.fn();
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        onUpdateCustomData={onUpdateCustomData}
        onPersistError={onPersistError}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setMode?.('light');
      await Promise.resolve();
    });

    expect(onPersistError).toHaveBeenCalledWith('Failed to save theme preference');
  });

  it('calls onPersistError with lang message when persistLang fails', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: false, error: 'network_error' } as ActionResult));
    const onPersistError = vi.fn();
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      return null;
    }

    render(
      <PreferencesProvider
        initialLang="en"
        onUpdateCustomData={onUpdateCustomData}
        onPersistError={onPersistError}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setLang?.('fr');
      await Promise.resolve();
    });

    expect(onPersistError).toHaveBeenCalledWith('Failed to save language preference');
  });

  it('calls onPersistError with org message when persistOrg fails', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: false, error: 'network_error' } as ActionResult));
    const onPersistError = vi.fn();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return null;
    }

    render(
      <PreferencesProvider
        initialOrgId="org_1"
        onUpdateCustomData={onUpdateCustomData}
        onPersistError={onPersistError}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setAsOrg?.('org_2');
      await Promise.resolve();
    });

    expect(onPersistError).toHaveBeenCalledWith('Failed to save organization preference');
  });

  it('calls onPersistError when persistTheme throws', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.reject(new Error('Network failure')));
    const onPersistError = vi.fn();
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        onUpdateCustomData={onUpdateCustomData}
        onPersistError={onPersistError}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setMode?.('light');
      await Promise.resolve();
    });

    expect(onPersistError).toHaveBeenCalledWith('Failed to save theme preference');
  });

  it('does not call onPersistError when persist succeeds', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    const onPersistError = vi.fn();
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        onUpdateCustomData={onUpdateCustomData}
        onPersistError={onPersistError}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setMode?.('light');
      await Promise.resolve();
    });

    expect(onPersistError).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Split preference writes — each persister sends only its own field
// ============================================================================

describe('split preference writes — each persister sends only its own field', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] || null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('persistTheme sends only { Preferences: { theme } }', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        initialLang="en-US"
        initialOrgId="org_1"
        onUpdateCustomData={onUpdateCustomData}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setMode?.('light');
      await Promise.resolve();
    });

    await waitFor(() => expect(onUpdateCustomData).toHaveBeenCalled());
    const payload = (onUpdateCustomData.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    const prefs = payload.Preferences as Record<string, unknown>;
    expect(Object.keys(prefs)).toEqual(['theme']);
    expect(prefs.theme).toBe('light');
    expect(prefs).not.toHaveProperty('lang');
    expect(prefs).not.toHaveProperty('asOrg');
  });

  it('persistLang sends only { Preferences: { lang } }', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        initialLang="en-US"
        initialOrgId="org_1"
        onUpdateCustomData={onUpdateCustomData}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setLang?.('ka-GE');
      await Promise.resolve();
    });

    await waitFor(() => expect(onUpdateCustomData).toHaveBeenCalled());
    const payload = (onUpdateCustomData.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    const prefs = payload.Preferences as Record<string, unknown>;
    expect(Object.keys(prefs)).toEqual(['lang']);
    expect(prefs.lang).toBe('ka-GE');
    expect(prefs).not.toHaveProperty('theme');
    expect(prefs).not.toHaveProperty('asOrg');
  });

  it('persistOrg sends only { Preferences: { asOrg } }', async () => {
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        initialLang="en-US"
        initialOrgId="org_1"
        onUpdateCustomData={onUpdateCustomData}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setAsOrg?.('org_2');
      await Promise.resolve();
    });

    await waitFor(() => expect(onUpdateCustomData).toHaveBeenCalled());
    const payload = (onUpdateCustomData.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    const prefs = payload.Preferences as Record<string, unknown>;
    expect(Object.keys(prefs)).toEqual(['asOrg']);
    expect(prefs.asOrg).toBe('org_2');
    expect(prefs).not.toHaveProperty('theme');
    expect(prefs).not.toHaveProperty('lang');
  });

  it('stale lang does not block a theme write (split-write isolation)', async () => {
    // This is the key regression test: if lang were still bundled, a stale/invalid lang
    // value could cause pickPreferences to reject the entire payload including the valid theme.
    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return null;
    }

    render(
      <PreferencesProvider
        initialTheme="dark"
        initialLang="ka-GE"
        initialOrgId={null}
        onUpdateCustomData={onUpdateCustomData}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    await act(async () => {
      setMode?.('light');
      await Promise.resolve();
    });

    await waitFor(() => expect(onUpdateCustomData).toHaveBeenCalled());
    // Theme write must succeed and contain ONLY the theme field — no lang leakage
    const payload = (onUpdateCustomData.mock.calls as unknown[][])[0][0] as Record<string, unknown>;
    const prefs = payload.Preferences as Record<string, unknown>;
    expect(prefs).not.toHaveProperty('lang');
    expect(prefs.theme).toBe('light');
  });
});
