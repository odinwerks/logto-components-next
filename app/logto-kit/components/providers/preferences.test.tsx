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

  it('rolls back to last-confirmed org when latest persistence fails (CAN-STATE-002)', async () => {
    // Scenario: A (org_2) succeeds, then B (org_3) fails. The rollback target
    // is the LAST SERVER-CONFIRMED value ('org_2' after A accepts), not the
    // captured `prev` ref snapshot. Resolves proceed in natural network
    // order (older write first) so the older success confirms its value
    // before the newer failure rolls back to it.
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

    // Older write succeeds first → server confirms 'org_2'. The seq gate
    // suppresses the UI update (a newer optimistic 'org_3' is in flight),
    // but the last-confirmed baseline advances to 'org_2'.
    await act(async () => {
      pending[0].resolve({ ok: true });
      await Promise.resolve();
    });
    // UI still reflects the newest optimistic selection ('org_3').
    expect(screen.getByTestId('org-value').textContent).toBe('org_3');

    // Latest write fails → roll back UI + storage to the last-confirmed
    // value ('org_2'), NOT to the captured `prev` (= 'org_2' snapshot
    // from the moment of the second setAsOrg call). The end state happens
    // to match the legacy expectation here, but the rollback source is now
    // server-authoritative.
    await act(async () => {
      pending[1].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
  });

  it('CAN-STATE-002: double-failed org writes roll back to last-confirmed, not intermediate optimistic', async () => {
    // Scenario: initial = 'org_1' (server-confirmed). User issues A
    // (setAsOrg 'org_2') then B (setAsOrg 'org_3') before A's persist
    // returns. BOTH persists FAIL.
    //
    // Buggy code (captured `prev` rollback):
    //   1. A optimistic: asOrgRef='org_2', persistOrg captures prev='org_1'.
    //   2. B optimistic: asOrgRef='org_3', persistOrg captures prev='org_2'.
    //   3. B fails (seq 2 newest): seq gate passes → roll back to prev='org_2'.
    //      BUG: 'org_2' is an UNCONFIRMED optimistic value — the server never
    //      accepted it (A's persist also fails). The server's actual state is
    //      still 'org_1' (initial).
    //   4. A fails (seq 1 stale): seq gate discards → no rollback.
    //   Final UI state: 'org_2' (WRONG — server still has 'org_1').
    //
    // Fixed code (last-confirmed baseline rollback):
    //   3. B fails: seq gate passes → roll back to lastConfirmedOrgRef (still
    //      the initial 'org_1' because no persist has succeeded yet). UI='org_1'.
    //   4. A fails: seq gate discards → no rollback.
    //   Final UI state: 'org_1' (CORRECT — matches server's last-confirmed).
    const pending: { resolve: (r: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn((_cd: Record<string, unknown>) => {
      return new Promise<ActionResult>((resolve) => pending.push({ resolve }));
    });
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
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');

    act(() => {
      setAsOrg?.('org_3');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');

    expect(onUpdateCustomData).toHaveBeenCalledTimes(2);
    expect(pending.length).toBe(2);

    // Newest (B: 'org_3') fails first → rollback to last-confirmed 'org_1'.
    await act(async () => {
      pending[1].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_1');
    expect(sessionStorage.getItem('org-mode')).toBe('org_1');

    // Older (A: 'org_2') fails second → seq gate discards; UI stays at the
    // last-confirmed baseline ('org_1'), NOT the intermediate 'org_2'.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_1');
    expect(sessionStorage.getItem('org-mode')).toBe('org_1');
  });

  it('CAN-STATE-002: double-failed theme writes roll back to last-confirmed, not intermediate optimistic', async () => {
    // Scenario: initial = 'dark' (server-confirmed). User toggles to 'light'
    // (A), then to 'dark' (B) before A's persist returns. BOTH persists FAIL.
    //
    // Buggy code (captured `prev` rollback):
    //   1. A optimistic: themeRef='light', persistTheme captures prev='dark'.
    //   2. B optimistic: themeRef='dark', persistTheme captures prev='light'.
    //   3. B fails (seq 2 newest): seq gate passes → roll back to prev='light'.
    //      BUG: 'light' is the UNCONFIRMED optimistic value from step 1 — the
    //      server never accepted it (A's persist also fails). The server's
    //      actual state is still 'dark' (initial).
    //   4. A fails (seq 1 stale): seq gate discards.
    //   Final UI state: 'light' (WRONG — server still has 'dark').
    //
    // Fixed code (last-confirmed baseline rollback):
    //   3. B fails: roll back to lastConfirmedThemeRef (initial 'dark' — no
    //      successful persist has occurred). UI='dark'.
    //   4. A fails: seq gate discards.
    //   Final UI state: 'dark' (CORRECT — matches server's last-confirmed).
    const pending: { resolve: (r: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn((_cd: Record<string, unknown>) => {
      return new Promise<ActionResult>((resolve) => pending.push({ resolve }));
    });
    let setMode: ((m: 'dark' | 'light') => void) | null = null;
    let capturedTheme: 'dark' | 'light' | undefined;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      capturedTheme = theme.mode;
      return null;
    }

    render(
      <PreferencesProvider initialTheme="dark" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );
    expect(capturedTheme).toBe('dark');

    act(() => {
      setMode?.('light');
    });
    expect(capturedTheme).toBe('light');
    expect(sessionStorage.getItem('theme-mode')).toBe('light');

    act(() => {
      setMode?.('dark');
    });
    expect(capturedTheme).toBe('dark');
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');

    expect(onUpdateCustomData).toHaveBeenCalledTimes(2);
    expect(pending.length).toBe(2);

    // Newest (B: 'dark') fails first → rollback to last-confirmed 'dark'
    // (initial). UI was already showing 'dark' optimistically, so visually
    // nothing changes — but storage has been forced back to 'dark' and the
    // rollback source is now server-authoritative.
    await act(async () => {
      pending[1].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(capturedTheme).toBe('dark');
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');

    // Older (A: 'light') fails second → seq gate discards; UI stays at the
    // last-confirmed baseline ('dark'), NOT the buggy intermediate 'light'.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(capturedTheme).toBe('dark');
    expect(sessionStorage.getItem('theme-mode')).toBe('dark');
  });

  it('CAN-STATE-002: double-failed lang writes roll back to last-confirmed, not intermediate optimistic', async () => {
    // Scenario: initial lang = 'en' (server-confirmed). User selects 'fr' (A),
    // then 'de' (B) before A's persist returns. BOTH persists FAIL.
    //
    // Buggy code (captured `prev` rollback):
    //   B (seq 2) fails first → rollback to prev='fr' (intermediate optimistic
    //   from A which the server never actually accepted). UI='fr' (WRONG).
    //   A (seq 1) fails second → discarded by seq gate.
    //
    // Fixed code (last-confirmed baseline rollback):
    //   B fails → rollback to lastConfirmedLangRef='en' (initial). UI='en'.
    //   A fails → discarded by seq gate.
    //   Final UI state: 'en' (CORRECT — matches the server's last-confirmed).
    const pending: { resolve: (r: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn((_cd: Record<string, unknown>) => {
      return new Promise<ActionResult>((resolve) => pending.push({ resolve }));
    });
    let setLang: ((l: string) => void) | null = null;
    let capturedLang: string | undefined;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      capturedLang = lang.lang;
      return null;
    }

    render(
      <PreferencesProvider initialLang="en" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );
    expect(capturedLang).toBe('en');

    act(() => {
      setLang?.('fr');
    });
    expect(capturedLang).toBe('fr');
    expect(sessionStorage.getItem('lang-mode')).toBe('fr');

    act(() => {
      setLang?.('de');
    });
    expect(capturedLang).toBe('de');
    expect(sessionStorage.getItem('lang-mode')).toBe('de');

    expect(onUpdateCustomData).toHaveBeenCalledTimes(2);
    expect(pending.length).toBe(2);

    // Newest (B: 'de') fails first → rollback to last-confirmed 'en'.
    await act(async () => {
      pending[1].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(capturedLang).toBe('en');
    expect(sessionStorage.getItem('lang-mode')).toBe('en');

    // Older (A: 'fr') fails second → seq gate discards; UI stays at last-
    // confirmed ('en'), NOT the buggy intermediate 'fr'.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });
    expect(capturedLang).toBe('en');
    expect(sessionStorage.getItem('lang-mode')).toBe('en');
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

    // Repeated replacement until no more matches — the CodeQL-preferred pattern
    // for stripping nested/multi-character HTML comments.
    let cleanHtml = html;
    while (/<!--[\s\S]*?-->/g.test(cleanHtml)) {
      cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');
    }

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

  it('BUG-028: subsequent server initialOrgId change overrides a divergent cached org', () => {
    // On the initial mount the cached user selection wins (one-shot sync). But if the
    // server later provides a different `initialOrgId` (e.g. switched org in another
    // tab/session), the cached value should not pin the UI to a stale org.
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_server">
        <TestComponent />
      </PreferencesProvider>
    );

    // Initial mount: cached preference wins (BUG-001 invariant preserved).
    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');

    // Server later disagrees with the cached value — should update to server's value.
    rerender(
      <PreferencesProvider initialOrgId="org_new">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_new');
    expect(sessionStorage.getItem('org-mode')).toBe('org_new');
  });

  it('BUG-028: server initialOrgId matching cached org triggers no override', () => {
    // When the cached value and the server prop agree, the divergence guard
    // short-circuits so no spurious state churn occurs.
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_user">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');

    // Same value again — nothing should change.
    rerender(
      <PreferencesProvider initialOrgId="org_user">
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

  it('BUG-084: setLang does not change identity when onLangChange prop changes', () => {
    // When onLangChange is an inline callback that changes every render,
    // setLang must remain stable (ref-backed) to prevent unnecessary re-renders
    // in child components.
    let capturedSetLang: ((lang: string) => void) | null = null;
    let capturedSetLangAfterRerender: ((lang: string) => void) | null = null;

    const onUpdateCustomData = vi.fn(() => Promise.resolve({ ok: true } as ActionResult));

    function TestComponent() {
      const { setLang } = useLangMode();
      if (!capturedSetLang) {
        capturedSetLang = setLang;
      } else {
        capturedSetLangAfterRerender = setLang;
      }
      return null;
    }

    const onLangChange = vi.fn();

    const { rerender } = render(
      <PreferencesProvider
        initialLang="en"
        onUpdateCustomData={onUpdateCustomData}
        onLangChange={onLangChange}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    // Rerender with a new onLangChange callback (simulating inline function)
    const newOnLangChange = vi.fn();
    rerender(
      <PreferencesProvider
        initialLang="en"
        onUpdateCustomData={onUpdateCustomData}
        onLangChange={newOnLangChange}
      >
        <TestComponent />
      </PreferencesProvider>
    );

    // setLang should be the same function reference (stable identity)
    expect(capturedSetLang).not.toBeNull();
    expect(capturedSetLang).toBe(capturedSetLangAfterRerender);

    // Calling setLang should invoke the latest onLangChange (from ref)
    act(() => {
      capturedSetLang?.('fr');
    });
    expect(newOnLangChange).toHaveBeenCalled();
    // Old callback should NOT be called
    expect(onLangChange).not.toHaveBeenCalled();
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

// ============================================================================
// CAN-STATE-001: distinguish authoritative personal null (`initialOrgId === null`)
// from an unavailable server value (`initialOrgId === undefined`). The server's
// authoritative `null` MUST clear a stale cached org; `undefined` MUST fall back
// to the cached value; a non-null string defers to the cache on initial mount
// (BUG-001) and overrides on re-render divergence (BUG-028).
// ============================================================================

describe('CAN-STATE-001: authoritative server null clears cached org (undefined unavailable vs null personal)', () => {
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

  it('authoritative null on mount clears a stale cached org (CAN-STATE-001a)', () => {
    // The user previously selected `org_1` (cached in sessionStorage). The
    // server now explicitly reports personal mode (`asOrg: null`). The cached
    // org MUST NOT override the server's authoritative null — both React state
    // and sessionStorage must be cleared so the stale org cannot resurrect.
    sessionStorage.setItem('org-mode', 'org_1');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    render(
      <PreferencesProvider initialOrgId={null}>
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBeNull();
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('undefined (server unavailable) on mount preserves a cached org (CAN-STATE-001b)', () => {
    // The server provides no authoritative value (`undefined` — e.g. the user
    // is unauthenticated, or the Preferences key has no `asOrg` field). The
    // cached user selection MUST be preserved (BUG-001 invariant: cached wins
    // when the server value is unavailable).
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    render(
      <PreferencesProvider initialOrgId={undefined}>
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');
  });

  it('authoritative string on mount is used when no cached org exists (CAN-STATE-001c)', () => {
    // No cached org; the server provides an authoritative org id. The server's
    // string becomes the cached value (cache "updated" from empty to string);
    // there is no cached value to defer to.
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

    expect(capturedOrg).toBe('org_server');
    expect(sessionStorage.getItem('org-mode')).toBe('org_server');
  });

  it('cached org still wins over an authoritative non-null string on initial mount (BUG-001 invariant)', () => {
    // When BOTH a cached org and a non-null server string exist on initial
    // mount, the cached user selection wins (BUG-001). The CAN-STATE-001 fix
    // only lets the server's `null` (personal mode) override the cache on
    // initial mount; a non-null string still defers to the cache here (the
    // divergence check on re-render handles a stale cached string vs a newer
    // server string — BUG-028).
    sessionStorage.setItem('org-mode', 'org_cached');

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

    expect(capturedOrg).toBe('org_cached');
    expect(sessionStorage.getItem('org-mode')).toBe('org_cached');
  });

  it('authoritative null on re-render clears a stale cached org (CAN-STATE-001 divergence)', () => {
    // Initial mount: cached org matches the server string → no churn. The
    // server then re-renders with authoritative `null` (the user switched to
    // personal mode in another tab/session, and the server now reports
    // `asOrg: null`). The cached org MUST be cleared on the re-render.
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_user">
        <TestComponent />
      </PreferencesProvider>
    );

    // Initial mount: cached value matches server (no churn).
    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');

    // Server switches to authoritative personal mode.
    rerender(
      <PreferencesProvider initialOrgId={null}>
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBeNull();
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('undefined on re-render preserves a cached org (server unavailable)', () => {
    // Server first reports a string, then becomes unavailable (`undefined`).
    // The cached/last-known org MUST be preserved — `undefined` MUST NOT
    // trigger a spurious clear (only the authoritative `null` clears).
    sessionStorage.setItem('org-mode', 'org_user');

    let capturedOrg: string | null | undefined;

    function TestComponent() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_user">
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');

    // Server goes unavailable — cached must survive.
    rerender(
      <PreferencesProvider initialOrgId={undefined}>
        <TestComponent />
      </PreferencesProvider>
    );

    expect(capturedOrg).toBe('org_user');
    expect(sessionStorage.getItem('org-mode')).toBe('org_user');
  });
});

// ============================================================================
// CAN-STATE-003: a pending non-null org write followed by personal mode
// (null) MUST NOT later fail and restore the earlier org locally/storage.
// The null transition MUST increment the org mutation sequence (invalidating
// any in-flight older non-null write) and advance the last-confirmed baseline
// to null — because `setActiveOrg(null)` (the canonical null writer, awaited
// by every caller before setAsOrg(null)) has already persisted null
// server-side. The customData PATCH for null is still skipped (no duplicate
// PATCH — BUG-L06).
// ============================================================================

describe('CAN-STATE-003: personal-mode transition invalidates older org write failure', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
      clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
    });
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query) => ({
      matches: false, media: query, onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('CAN-STATE-003a: pending non-null org write failing AFTER null switch does NOT restore old org', async () => {
    // Scenario: user is in org_1 (server-confirmed). User selects org_2
    // (PATCH in flight, not yet resolved), then switches to personal mode
    // (setAsOrg(null)). The pending org_2 PATCH then FAILS.
    //
    // Buggy code (null returns before incrementing the org mutation seq):
    //   1. setAsOrg('org_2'): seq=1, PATCH org_2 in flight. Local='org_2'.
    //   2. setAsOrg(null): persistOrg(null) returns BEFORE incrementing seq.
    //      counter stays 1. setActiveOrg(null) persisted null server-side.
    //      Local=null. lastConfirmedOrgRef still='org_1' (NOT advanced).
    //   3. org_2 PATCH fails: seq(1)===counter(1) → seq gate passes →
    //      rollback to lastConfirmedOrgRef='org_1'. BUG: restores 'org_1',
    //      clobbering personal mode the server holds as null.
    //
    // Fixed code (increment seq for null + advance baseline to null):
    //   2. setAsOrg(null): seq=2 (counter incremented), baseline→null, no PATCH.
    //   3. org_2 PATCH fails: seq(1)!==counter(2) → seq gate discards → NO
    //      rollback. UI stays null (personal mode).
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

    // 1. User selects org_2 — PATCH in flight (not yet resolved).
    act(() => {
      setAsOrg?.('org_2');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    // 2. User switches to personal mode. persistOrg(null) must NOT send a
    //    PATCH (setActiveOrg(null) is the canonical null writer — no
    //    duplicate PATCH). It MUST increment the seq so the pending org_2
    //    write is invalidated.
    act(() => {
      setAsOrg?.(null);
    });
    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
    // No additional PATCH was sent for the null transition.
    expect(onUpdateCustomData).toHaveBeenCalledTimes(1);

    // 3. The pending org_2 PATCH now FAILS. With the bug, the failure handler
    //    sees seq(1)===counter(1) and rolls back to lastConfirmedOrgRef
    //    ('org_1'), clobbering personal mode. With the fix, seq(1)!==
    //    counter(2) so the failure is discarded — UI stays in personal mode.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('CAN-STATE-003a: null still invalidates a pending write when persistence is unavailable', async () => {
    // A pending write retains the callback that created it, even if a later
    // provider render no longer supplies onUpdateCustomData. The null
    // transition must therefore advance the sequence before checking the
    // current callback; otherwise the pending write can still roll back over
    // personal mode when it rejects.
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setAsOrg?.('org_2');
    });
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    // Simulate a parent transition that removes the optional persistence
    // callback while the original request remains in flight.
    rerender(
      <PreferencesProvider initialOrgId="org_1">
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setAsOrg?.(null);
    });
    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
    // The null transition must not add a customData PATCH.
    expect(onUpdateCustomData).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('CAN-STATE-003a: authoritative server null also invalidates a pending write', async () => {
    // The server-null reconciliation path performs no PATCH because null was
    // already persisted by setActiveOrg(null). It is nevertheless a newer
    // org transition and must invalidate an older client PATCH before that
    // request can reject and restore its prior confirmed baseline.
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setAsOrg?.('org_2');
    });
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    // Router/server reconciliation after the canonical null write.
    rerender(
      <PreferencesProvider initialOrgId={null} onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );
    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
    expect(onUpdateCustomData).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('CAN-STATE-003a: authoritative server org also invalidates a pending write', async () => {
    // This is the non-null counterpart: any authoritative reconciliation is
    // a newer org mutation, not merely a local state update. An older failed
    // request must not restore the pre-reconciliation baseline.
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    act(() => {
      setAsOrg?.('org_2');
    });
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    rerender(
      <PreferencesProvider initialOrgId="org_3" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );
    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');
    expect(onUpdateCustomData).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');
  });

  it('CAN-STATE-003a: matching authoritative server org invalidates a pending write', async () => {
    // The server can authoritatively confirm the same value that is already
    // optimistic in local state/storage. This is still a newer reconciliation:
    // it must advance the sequence and confirmed baseline so the old request
    // cannot roll the confirmed value back when it subsequently fails.
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    const { rerender } = render(
      <PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );

    // S0 -> optimistic org_2, with its PATCH still pending.
    act(() => {
      setAsOrg?.('org_2');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    // The server rerenders with that same org_2, authoritatively confirming
    // it. No additional customData PATCH should be initiated.
    rerender(
      <PreferencesProvider initialOrgId="org_2" onUpdateCustomData={onUpdateCustomData}>
        <TestComponent />
      </PreferencesProvider>
    );
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
    expect(onUpdateCustomData).toHaveBeenCalledTimes(1);

    // The superseded optimistic request fails. It must not roll state/storage
    // back to org_1 now that the server has authoritatively confirmed org_2.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
  });

  it('CAN-STATE-003b: after null switch, a later non-null write failing rolls back to null (not old org)', async () => {
    // Scenario: user is in org_1 (server-confirmed). Switches to personal
    // mode (setAsOrg(null) — setActiveOrg(null) persists null server-side).
    // Then selects org_2 (PATCH in flight) which FAILS.
    //
    // The rollback target must be null (the last-confirmed server value
    // after the null switch), NOT org_1 (the pre-null confirmed org).
    // Without advancing the baseline on the null switch, lastConfirmedOrgRef
    // would still hold 'org_1' and the failure would restore it — clobbering
    // personal mode.
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

    // 1. Switch to personal mode. No PATCH (setActiveOrg(null) is the writer).
    act(() => {
      setAsOrg?.(null);
    });
    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
    expect(onUpdateCustomData).not.toHaveBeenCalled();

    // 2. Select org_2 — PATCH in flight.
    act(() => {
      setAsOrg?.('org_2');
    });
    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
    expect(pending.map(({ orgId }) => orgId)).toEqual(['org_2']);

    // 3. org_2 PATCH fails → roll back to last-confirmed (null, the personal
    //    mode the server holds), NOT org_1.
    await act(async () => {
      pending[0].resolve({ ok: false, error: 'network_error' });
      await Promise.resolve();
    });

    expect(screen.getByTestId('org-value').textContent).toBe('null');
    expect(sessionStorage.getItem('org-mode')).toBeNull();
  });

  it('CAN-STATE-003c: null switch sends no duplicate PATCH (BUG-L06 preserved)', async () => {
    // The fix advances the seq + baseline for null but must NOT reintroduce
    // a redundant customData PATCH. setActiveOrg(null) is the single null
    // persistence writer; persistOrg(null) only coordinates local state +
    // invalidates older writes.
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

    // Switch directly to personal mode from org_1.
    act(() => {
      setAsOrg?.(null);
    });
    expect(screen.getByTestId('org-value').textContent).toBe('null');
    // Zero PATCHes — the null transition never reaches onUpdateCustomData.
    expect(onUpdateCustomData).not.toHaveBeenCalled();
    expect(pending).toEqual([]);
  });
});

// ============================================================================
// CAN-STATE-002: a superseded write can still be the most recent successful
// server state when the newer write fails. Also, every local transition must
// invalidate an older request even after the persistence callback disappears.
// ============================================================================
describe('CAN-STATE-002: deferred confirmation and callback removal', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
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

  it('converges theme to an older success after the newer write fails', async () => {
    const pending: { resolve: (result: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn(() => new Promise<ActionResult>((resolve) => pending.push({ resolve })));
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return <div data-testid="theme-value">{theme.mode}</div>;
    }

    render(<PreferencesProvider initialTheme="dark" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setMode?.('light'); setMode?.('dark'); });

    await act(async () => { pending[1].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });
    expect(screen.getByTestId('theme-value').textContent).toBe('dark');
    await act(async () => { pending[0].resolve({ ok: true }); await Promise.resolve(); });

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(sessionStorage.getItem('theme-mode')).toBe('light');
  });

  it('converges lang to an older success after the newer write fails', async () => {
    const pending: { resolve: (result: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn(() => new Promise<ActionResult>((resolve) => pending.push({ resolve })));
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      return <div data-testid="lang-value">{lang.lang}</div>;
    }

    render(<PreferencesProvider initialLang="en" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setLang?.('fr'); setLang?.('de'); });

    await act(async () => { pending[1].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });
    expect(screen.getByTestId('lang-value').textContent).toBe('en');
    await act(async () => { pending[0].resolve({ ok: true }); await Promise.resolve(); });

    expect(screen.getByTestId('lang-value').textContent).toBe('fr');
    expect(sessionStorage.getItem('lang-mode')).toBe('fr');
  });

  it('converges a non-null org to an older success after the newer write fails', async () => {
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    render(<PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setAsOrg?.('org_2'); setAsOrg?.('org_3'); });

    await act(async () => { pending[1].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });
    expect(screen.getByTestId('org-value').textContent).toBe('org_1');
    await act(async () => { pending[0].resolve({ ok: true }); await Promise.resolve(); });

    expect(screen.getByTestId('org-value').textContent).toBe('org_2');
    expect(sessionStorage.getItem('org-mode')).toBe('org_2');
  });

  it('keeps a newer local theme when an older request fails after the callback is removed', async () => {
    const pending: { resolve: (result: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn(() => new Promise<ActionResult>((resolve) => pending.push({ resolve })));
    let setMode: ((mode: 'dark' | 'light') => void) | null = null;

    function TestComponent() {
      const theme = useThemeMode();
      setMode = theme.setMode;
      return <div data-testid="theme-value">{theme.mode}</div>;
    }

    const { rerender } = render(<PreferencesProvider initialTheme="dark" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setMode?.('light'); });
    rerender(<PreferencesProvider initialTheme="dark"><TestComponent /></PreferencesProvider>);
    act(() => { setMode?.('light'); });
    await act(async () => { pending[0].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });

    expect(screen.getByTestId('theme-value').textContent).toBe('light');
    expect(sessionStorage.getItem('theme-mode')).toBe('light');
  });

  it('keeps a newer local lang when an older request fails after the callback is removed', async () => {
    const pending: { resolve: (result: ActionResult) => void }[] = [];
    const onUpdateCustomData = vi.fn(() => new Promise<ActionResult>((resolve) => pending.push({ resolve })));
    let setLang: ((lang: string) => void) | null = null;

    function TestComponent() {
      const lang = useLangMode();
      setLang = lang.setLang;
      return <div data-testid="lang-value">{lang.lang}</div>;
    }

    const { rerender } = render(<PreferencesProvider initialLang="en" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setLang?.('fr'); });
    rerender(<PreferencesProvider initialLang="en"><TestComponent /></PreferencesProvider>);
    act(() => { setLang?.('de'); });
    await act(async () => { pending[0].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });

    expect(screen.getByTestId('lang-value').textContent).toBe('de');
    expect(sessionStorage.getItem('lang-mode')).toBe('de');
  });

  it('keeps a newer local non-null org when an older request fails after the callback is removed', async () => {
    const { onUpdateCustomData, pending } = createOrgPersistMock();
    let setAsOrg: ((orgId: string | null) => void) | null = null;

    function TestComponent() {
      const org = useOrgMode();
      setAsOrg = org.setAsOrg;
      return <div data-testid="org-value">{org.asOrg ?? 'null'}</div>;
    }

    const { rerender } = render(<PreferencesProvider initialOrgId="org_1" onUpdateCustomData={onUpdateCustomData}><TestComponent /></PreferencesProvider>);
    act(() => { setAsOrg?.('org_2'); });
    rerender(<PreferencesProvider initialOrgId="org_1"><TestComponent /></PreferencesProvider>);
    act(() => { setAsOrg?.('org_3'); });
    await act(async () => { pending[0].resolve({ ok: false, error: 'network_error' }); await Promise.resolve(); });

    expect(screen.getByTestId('org-value').textContent).toBe('org_3');
    expect(sessionStorage.getItem('org-mode')).toBe('org_3');
  });
});
