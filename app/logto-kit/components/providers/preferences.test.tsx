import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
      <PreferencesProvider initialTheme="light">
        <TestComponent />
      </PreferencesProvider>
    );

    // It should respect sessionStorage and initialize to 'dark', not 'light'
    expect(renderedTheme).toBe('dark');
  });

  it('does not overwrite cached theme in sessionStorage on mount', () => {
    sessionStorage.setItem('theme-mode', 'dark');

    render(
      <PreferencesProvider initialTheme="light">
        <div>Test</div>
      </PreferencesProvider>
    );

    // Since the write-on-mount useEffect is removed, the cached 'dark' should NOT be overwritten
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');
  });

  it('listens for preferences-changed events and updates lang and org state dynamically', () => {
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

    // It should have reactive update
    expect(renderedLang).toBe('fr');
    expect(renderedOrg).toBe('org_2');

    // Also support CustomEvent detail
    act(() => {
      window.dispatchEvent(new CustomEvent('preferences-changed', {
        detail: { lang: 'es', asOrg: 'org_3' }
      }));
    });

    expect(renderedLang).toBe('es');
    expect(renderedOrg).toBe('org_3');
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

  it('reconciles storage values post-hydration cleanly on client mount', () => {
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
      <PreferencesProvider initialTheme="dark" initialLang="en" initialOrgId="org_default">
        <TestComponent />
      </PreferencesProvider>
    );

    // Post-mount (after layout effects), it should reconcile and have updated to the storage values
    expect(renderedTheme).toBe('light');
    expect(renderedLang).toBe('fr');
    expect(renderedOrg).toBe('org_stored');
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
    const lastCallPayload = (calls[calls.length - 1] as unknown[])[0] as { Preferences: { theme: string; lang: string } };
    expect(lastCallPayload.Preferences.theme).toBe('light');
  });
});
