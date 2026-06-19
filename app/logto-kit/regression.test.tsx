/**
 * Focused regression tests for the three suspected root causes.
 * These tests gather evidence WITHOUT fixing anything.
 *
 * Hypotheses being tested:
 *   H1 (preferences.tsx) - server `initialLang`/`initialOrgId` overwrites user's
 *       sessionStorage change on component mount, breaking lang & org switching.
 *   H2 (profile.ts)      - `updateUserCustomData` works correctly when
 *       `introspectToken` returns a valid session (the new auth path is sound).
 *   H3 (helpers.ts)      - A `verificationTimestamp` 30 minutes in the future
 *       is REJECTED by `assertVerificationNotExpired` (11-min future cap).
 *       FIX: The cap has been raised to 30 minutes to tolerate realistic clock skew.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

// ============================================================================
// H1: preferences.tsx — server initialLang overwrites user's cached lang
// ============================================================================

import { PreferencesProvider, useLangMode, useOrgMode } from './components/providers/preferences';

describe('H1 – preferences.tsx: server initialLang overwrites sessionStorage (regression)', () => {
  const LANG_KEY = 'lang-mode';
  const ORG_KEY = 'org-mode';

  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
      removeItem: vi.fn((key: string) => { delete store[key]; }),
    });
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * REGRESSION TEST: User changes lang to "fr" → it is stored in sessionStorage.
   * Component then remounts with initialLang="en" prop from the server.
   *
   * EXPECTED (correct behaviour): lang stays "fr" (user preference).
   * ACTUAL (buggy behaviour):    lang is reset to "en" (server prop overwrites cache).
   *
   * Root cause: lines 144-146 in preferences.tsx:
   *   if (initialLang) {
   *     setStoredLang(initialLang);   // <-- overwrites cached 'fr'
   *     setLangState(initialLang);
   *   }
   * The cached value is never checked when initialLang is provided.
   */
  it('EXPECTED TO FAIL (confirms H1): lang stays "fr" after user changes it, even when component mounts with initialLang="en"', () => {
    // Pre-condition: user had previously selected "fr"
    store[LANG_KEY] = 'fr';

    let capturedLang: string | undefined;

    function Consumer() {
      const { lang } = useLangMode();
      capturedLang = lang;
      return null;
    }

    // Server provides initialLang="en" on mount
    render(
      <PreferencesProvider initialLang="en">
        <Consumer />
      </PreferencesProvider>
    );

    console.log('[H1 evidence] lang after mount with initialLang="en" and cached "fr":', capturedLang);
    console.log('[H1 evidence] sessionStorage[lang-mode] after mount:', store[LANG_KEY]);

    // EXPECTED: 'fr'  — cached user preference survives
    // ACTUAL:   'en'  — server prop overwrites cache → H1 CONFIRMED on failure
    expect(capturedLang).toBe('fr');
    expect(store[LANG_KEY]).toBe('fr');
  });

  /**
   * Complementary control: Without initialLang, cached value IS respected.
   * This documents the working path and contrasts with the broken path above.
   */
  it('PASSES (control): when initialLang is omitted, cached "fr" in sessionStorage is used', () => {
    store[LANG_KEY] = 'fr';

    let capturedLang: string | undefined;

    function Consumer() {
      const { lang } = useLangMode();
      capturedLang = lang;
      return null;
    }

    render(
      <PreferencesProvider>
        <Consumer />
      </PreferencesProvider>
    );

    console.log('[H1 evidence] lang after mount with NO initialLang and cached "fr":', capturedLang);
    expect(capturedLang).toBe('fr');
  });

  /**
   * REGRESSION TEST for org switching: same overwrite bug exists for initialOrgId.
   */
  it('EXPECTED TO FAIL (confirms H1 for org): org stays "org_user" after user switches, even when component mounts with initialOrgId="org_server"', () => {
    store[ORG_KEY] = 'org_user';

    let capturedOrg: string | null | undefined;

    function Consumer() {
      const { asOrg } = useOrgMode();
      capturedOrg = asOrg;
      return null;
    }

    render(
      <PreferencesProvider initialOrgId="org_server">
        <Consumer />
      </PreferencesProvider>
    );

    console.log('[H1 evidence] asOrg after mount with initialOrgId="org_server" and cached "org_user":', capturedOrg);
    console.log('[H1 evidence] sessionStorage[org-mode] after mount:', store[ORG_KEY]);

    // EXPECTED: 'org_user'  — user's last selection survives
    // ACTUAL:   'org_server' — server prop overwrites cache → H1 CONFIRMED on failure
    expect(capturedOrg).toBe('org_user');
    expect(store[ORG_KEY]).toBe('org_user');
  });

  /**
   * Sanity test: The setLang call path itself is not broken (user CAN change lang
   * after mount). This always passes — it is not a regression scenario.
   */
  it('PASSES (sanity): user can change lang after mount and it persists in sessionStorage', () => {
    let capturedSetLang: ((l: string) => void) | undefined;

    function Consumer() {
      const { setLang } = useLangMode();
      capturedSetLang = setLang;
      return null;
    }

    render(
      <PreferencesProvider initialLang="en">
        <Consumer />
      </PreferencesProvider>
    );

    act(() => {
      capturedSetLang?.('fr');
    });

    console.log('[H1 evidence] sessionStorage[lang-mode] after user sets lang to "fr":', store[LANG_KEY]);
    expect(store[LANG_KEY]).toBe('fr');
  });
});

// ============================================================================
// H2: profile.ts — updateUserCustomData works correctly with introspectToken
// ============================================================================

vi.mock('./logic/actions/tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('./logic/utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://logto.example.com'),
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-abc', active: true }),
}));

vi.mock('./config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-mgmt-token'),
}));

vi.mock('./logic/errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  plainCode: vi.fn((code: string) => { const e = new Error(code); e.name = 'SanitizedError'; return e; }),
  sanitize: vi.fn((_: unknown, opts: { fallback: string }) => { const e = new Error(opts.fallback); e.name = 'SanitizedError'; return e; }),
}));

vi.mock('./logic/guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertSafeUserId: vi.fn(),
  assertNameField: vi.fn(),
  assertUsername: vi.fn(),
  assertHttpUrl: vi.fn(),
  pickPreferences: vi.fn((input: unknown) => {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
    const src = input as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of ['asOrg', 'theme', 'lang']) {
      if (Object.prototype.hasOwnProperty.call(src, key)) out[key] = src[key];
    }
    return out;
  }),
}));

vi.mock('./logic/actions/request', () => ({
  makeRequest: vi.fn(),
}));

vi.mock('./logic/actions/shared', () => ({
  patchMyAccount: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./logic/audit', () => ({
  audit: vi.fn().mockResolvedValue(undefined),
}));

// The production code imports from ../../lib/distributed-state
// We mock that path relative to the profile.ts location:
vi.mock('../../lib/distributed-state', () => ({
  createLockManager: vi.fn(() => ({
    acquire: vi.fn().mockResolvedValue(() => {}),
  })),
}));

import { introspectToken } from './logic/utils';
import { getTokenForServerAction } from './logic/actions/tokens';

describe('H2 – profile.ts: updateUserCustomData with introspectToken (the new auth path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-abc', active: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockOkJson(body: unknown): Response {
    return { ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve('') } as unknown as Response;
  }

  function mockErrResponse(status = 500): Response {
    return { ok: false, status, statusText: 'Error', text: () => Promise.resolve('Error') } as unknown as Response;
  }

  /**
   * PASSES: The new introspectToken auth path works when the session is valid.
   * This confirms H2 does NOT break normal preference saving for authenticated users.
   */
  it('PASSES: updateUserCustomData succeeds when introspectToken returns active session', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkJson({ Preferences: { lang: 'en' } }))  // GET
      .mockResolvedValueOnce(mockOkJson({}))                               // PATCH
    );

    const { updateUserCustomData } = await import('./logic/actions/profile');
    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    console.log('[H2 evidence] result with active introspection:', result);
    expect(result.ok).toBe(true);
    expect(introspectToken).toHaveBeenCalledWith('mock-access-token');
  });

  /**
   * PASSES: confirms unauthenticated requests are blocked (inactive token).
   */
  it('PASSES: updateUserCustomData returns { ok: false } when introspectToken returns inactive token', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'user-abc', active: false });
    vi.stubGlobal('fetch', vi.fn());

    const { updateUserCustomData } = await import('./logic/actions/profile');
    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    console.log('[H2 evidence] result with inactive introspection:', result);
    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * PASSES: confirms requests with missing sub are blocked (IDOR guard).
   */
  it('PASSES: updateUserCustomData returns { ok: false } when introspection sub is missing', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: undefined, active: true });
    vi.stubGlobal('fetch', vi.fn());

    const { updateUserCustomData } = await import('./logic/actions/profile');
    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    console.log('[H2 evidence] result with missing sub:', result);
    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * PASSES: GET failure returns { ok: false }, no silent data loss.
   */
  it('PASSES: updateUserCustomData returns { ok: false } when the Management API GET fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(mockErrResponse(503)));

    const { updateUserCustomData } = await import('./logic/actions/profile');
    const result = await updateUserCustomData({ Preferences: { theme: 'dark' } });

    console.log('[H2 evidence] result when GET fails:', result);
    expect(result.ok).toBe(false);
  });

  /**
   * PASSES: the correct user ID from introspection is used in the Logto URL.
   * This is the IDOR-prevention evidence.
   */
  it('PASSES: Management API URL uses the userId from introspectToken, not client input', async () => {
    vi.mocked(introspectToken).mockResolvedValueOnce({ sub: 'server-derived-uid', active: true });

    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(mockOkJson({}))
      .mockResolvedValueOnce(mockOkJson({}))
    );

    const { updateUserCustomData } = await import('./logic/actions/profile');
    await updateUserCustomData({ Preferences: { theme: 'dark' } });

    const fetchMock = vi.mocked(fetch);
    const getUrl = fetchMock.mock.calls[0]![0] as string;
    console.log('[H2 evidence] GET URL used by Management API call:', getUrl);
    expect(getUrl).toContain('/api/users/server-derived-uid/custom-data');
  });
});

// ============================================================================
// H3: helpers.ts — future cap raised from 11 min to 30 min
// ============================================================================

import { assertVerificationNotExpired } from './logic/actions/helpers';
import { LOGTO_VERIFICATION_MAX_FUTURE_MS } from './logic/constants';

describe('H3 – helpers.ts: 30-minute future cap (raised from 11 min) in assertVerificationNotExpired', () => {
  /**
   * POST-FIX: Cap is now 30 minutes. A timestamp 30 minutes in the future
   * should now be ACCEPTED (it was previously rejected with the 11-min cap).
   *
   * The cap is LOGTO_VERIFICATION_MAX_FUTURE_MS = 30 * 60 * 1000 = 1,800,000 ms.
   * 30 minutes = 1,800,000 ms ≤ 1,800,000 ms → ACCEPTED.
   *
   * This fixes users with realistic clock skew (up to 20 min behind server):
   * Logto issues expiresAt = server_now + 10 min; if app is 20 min behind,
   * the timestamp appears 30 min in the future — now within the 30-min cap.
   */
  it('POST-FIX: expiresAt 30 min in future is ACCEPTED (cap raised to 30 min)', () => {
    const thirtyMinFuture = Date.now() + 30 * 60 * 1000;

    console.log('[H3 fix] LOGTO_VERIFICATION_MAX_FUTURE_MS:', LOGTO_VERIFICATION_MAX_FUTURE_MS, 'ms =', LOGTO_VERIFICATION_MAX_FUTURE_MS / 60000, 'min');
    console.log('[H3 fix] 30 min in ms:', 30 * 60 * 1000, '| exceeds cap?', 30 * 60 * 1000 > LOGTO_VERIFICATION_MAX_FUTURE_MS);

    // POST-FIX: was throwing before the cap increase
    expect(() => assertVerificationNotExpired(thirtyMinFuture)).not.toThrow();
  });

  /**
   * Control: 10 min future IS accepted (Logto TTL is 10 min, this is within cap).
   */
  it('PASSES: expiresAt 10 min in future is ACCEPTED (within 30-min cap)', () => {
    const tenMinFuture = Date.now() + 10 * 60 * 1000;
    console.log('[H3 fix] 10 min future — should NOT throw');
    expect(() => assertVerificationNotExpired(tenMinFuture)).not.toThrow();
  });

  /**
   * Boundary: exactly at the new 30-min cap is accepted (1 sec inside).
   */
  it('PASSES: expiresAt at 30 min - 1 sec is ACCEPTED (just inside cap)', () => {
    const justInsideCap = Date.now() + LOGTO_VERIFICATION_MAX_FUTURE_MS - 1000;
    expect(() => assertVerificationNotExpired(justInsideCap)).not.toThrow();
  });

  /**
   * Boundary: just beyond the new 30-min cap is rejected.
   */
  it('CONFIRMS: expiresAt at 30 min + 1 sec is REJECTED (just beyond cap)', () => {
    const justBeyondCap = Date.now() + LOGTO_VERIFICATION_MAX_FUTURE_MS + 1000;
    expect(() => assertVerificationNotExpired(justBeyondCap)).toThrow('VERIFICATION_EXPIRED');
  });

  /**
   * POST-FIX: user with 20-min clock skew behind server CAN now use verification-gated ops.
   *
   * Clock scenario:
   *   - Logto server clock: T
   *   - App clock: T - 20_min (20 minutes behind)
   *   - Logto issues expiresAt = T + 10_min
   *   - App receives expiresAt and computes: expiresAt - app_now = (T + 10) - (T - 20) = 30 min
   *   - Result: app sees a 30-min future timestamp → exactly at cap → ACCEPTED
   */
  it('POST-FIX: user with 20-min clock skew behind server CAN use verification-gated ops', () => {
    const clockSkewMs = 20 * 60 * 1000;   // app is 20 min behind server
    const logtoTtlMs  = 10 * 60 * 1000;   // Logto TTL is 10 min
    const simulatedExpiresAt = Date.now() + clockSkewMs + logtoTtlMs; // = now + 30 min

    const offsetMin = (simulatedExpiresAt - Date.now()) / 60000;
    console.log('[H3 fix] With 20-min clock skew, expiresAt appears', offsetMin, 'min ahead (cap is', LOGTO_VERIFICATION_MAX_FUTURE_MS / 60000, 'min)');

    // With 30-min cap, this now passes (was failing with 11-min cap)
    expect(() => assertVerificationNotExpired(simulatedExpiresAt)).not.toThrow();
  });

  /**
   * Timestamps beyond 30 min are still rejected.
   */
  it('CONFIRMS: expiresAt 35 min in future is REJECTED (beyond 30-min cap)', () => {
    const thirtyFiveMin = Date.now() + 35 * 60 * 1000;
    expect(() => assertVerificationNotExpired(thirtyFiveMin)).toThrow('VERIFICATION_EXPIRED');
  });

  /**
   * Critical boundary: 1 min clock skew is within tolerances (11 min future → accepted).
   */
  it('PASSES: user with 1-min clock skew can still use verification-gated ops', () => {
    const clockSkewMs = 1 * 60 * 1000;    // app is 1 min behind server
    const logtoTtlMs  = 10 * 60 * 1000;   // Logto TTL is 10 min
    const simulatedExpiresAt = Date.now() + clockSkewMs + logtoTtlMs; // = now + 11 min

    const offsetMin = (simulatedExpiresAt - Date.now()) / 60000;
    console.log('[H3 fix] With 1-min clock skew, expiresAt appears', offsetMin, 'min ahead (cap is', LOGTO_VERIFICATION_MAX_FUTURE_MS / 60000, 'min)');

    // now + 11 min is well within the 30-min cap
    expect(() => assertVerificationNotExpired(simulatedExpiresAt)).not.toThrow();
  });
});
