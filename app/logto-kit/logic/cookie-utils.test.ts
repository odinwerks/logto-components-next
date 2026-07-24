import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ── Mock the verification-cookie module so we control the name constant ──
vi.mock('./actions/verification-cookie', () => ({
  VERIFICATION_COOKIE_NAME: 'logto-verification-seal',
}));

import {
  isLogtoCookie,
  clearLogtoCookiesFromResponse,
  clearLogtoCookiesFromJar,
} from './cookie-utils';

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build a NextRequest with a given set of cookies. */
function makeRequest(cookies: Record<string, string>): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/test', {
    method: 'POST',
  });
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

/** Collect all Set-Cookie header values from a NextResponse. */
function getSetCookies(res: NextResponse | Response): string[] {
  const out: string[] = [];
  res.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') out.push(value);
  });
  return out;
}

/** Build a mock `cookies()` jar that records `set()` calls. */
function makeMockJar(cookies: Record<string, string>) {
  const store = new Map(Object.entries(cookies));
  const setCalls: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
  return {
    jar: {
      getAll: vi.fn(() =>
        Array.from(store.entries()).map(([name, value]) => ({ name, value })),
      ),
      set: vi.fn((name: string, value: string, opts: Record<string, unknown>) => {
        setCalls.push({ name, value, opts });
        if (value === '' && (opts.maxAge === 0 || opts.maxAge === '0')) {
          store.delete(name);
        }
      }),
      get: vi.fn((name: string) => {
        const value = store.get(name);
        return value === undefined ? undefined : { name, value };
      }),
    },
    setCalls,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('isLogtoCookie', () => {
  it('matches all Logto SDK cookies (logto_ prefix)', () => {
    expect(isLogtoCookie('logto_token')).toBe(true);
    expect(isLogtoCookie('logto_refresh')).toBe(true);
    expect(isLogtoCookie('logto_session')).toBe(true);
    expect(isLogtoCookie('logto_anything_here')).toBe(true);
  });

  it('matches the active-org cookie', () => {
    expect(isLogtoCookie('logto-active-org')).toBe(true);
  });

  it('matches the verification-seal cookie', () => {
    expect(isLogtoCookie('logto-verification-seal')).toBe(true);
  });

  it('rejects unrelated cookies', () => {
    expect(isLogtoCookie('theme-mode')).toBe(false);
    expect(isLogtoCookie('lang-mode')).toBe(false);
    expect(isLogtoCookie('org-mode')).toBe(false);
    // `logto-wipe-nonce` uses a hyphen, not an underscore — it is NOT matched
    // by the `logto_` prefix. The wipe route clears it separately via its own
    // `clearWipeNonce` helper (the nonce is a one-shot, not a session cookie).
    expect(isLogtoCookie('logto-wipe-nonce')).toBe(false);
    expect(isLogtoCookie('next-auth.session-token')).toBe(false);
    expect(isLogtoCookie('')).toBe(false);
  });

  it('handles edge cases', () => {
    // A cookie named exactly "logto_" (empty suffix) still matches.
    expect(isLogtoCookie('logto_')).toBe(true);
    // A cookie that starts with "logto" but not "logto_" does NOT match via
    // the prefix (only `logto-active-org` is special-cased via the exact
    // match for ACTIVE_ORG_COOKIE).
    expect(isLogtoCookie('logto-active-org')).toBe(true);
    expect(isLogtoCookie('logtoother')).toBe(false);
    expect(isLogtoCookie('logto-')).toBe(false);
  });
});

describe('clearLogtoCookiesFromResponse', () => {
  let request: NextRequest;
  let response: NextResponse;

  beforeEach(() => {
    request = makeRequest({
      'logto_token': 'id-token-value',
      'logto_refresh': 'refresh-token-value',
      'logto-active-org': 'org-abc',
      'logto-verification-seal': 'sealed-payload.sig',
      'theme-mode': 'dark',          // should NOT be cleared
      'lang-mode': 'uk',             // should NOT be cleared
    });
    response = NextResponse.json({ ok: true });
  });

  it('sets every matching cookie to empty with maxAge:0 and path:/', () => {
    clearLogtoCookiesFromResponse(request, response);

    const setCookies = getSetCookies(response);
    // 4 matching cookies: logto_token, logto_refresh, logto-active-org, logto-verification-seal
    expect(setCookies.length).toBe(4);

    // Each Set-Cookie should clear the cookie (empty value, maxAge=0, path=/).
    for (const sc of setCookies) {
      expect(sc).toMatch(/=;/);
      expect(sc).toMatch(/Max-Age=0/i);
      expect(sc).toMatch(/Path=\//i);
    }
  });

  it('does NOT clear non-Logto cookies', () => {
    clearLogtoCookiesFromResponse(request, response);

    const setCookies = getSetCookies(response);
    const clearedNames = setCookies.map((sc) => sc.split('=')[0].trim());
    expect(clearedNames).not.toContain('theme-mode');
    expect(clearedNames).not.toContain('lang-mode');
  });

  it('returns the same response instance (chainable)', () => {
    const result = clearLogtoCookiesFromResponse(request, response);
    expect(result).toBe(response);
  });

  it('is a no-op when no Logto cookies are present', () => {
    const emptyReq = makeRequest({ 'theme-mode': 'dark' });
    const res = NextResponse.json({ ok: true });
    clearLogtoCookiesFromResponse(emptyReq, res);
    expect(getSetCookies(res).length).toBe(0);
  });

  it('handles an empty cookie jar gracefully', () => {
    const emptyReq = new NextRequest('http://localhost:3000/api/test', { method: 'POST' });
    const res = NextResponse.json({ ok: true });
    expect(() => clearLogtoCookiesFromResponse(emptyReq, res)).not.toThrow();
    expect(getSetCookies(res).length).toBe(0);
  });

  it('does NOT clear logto-wipe-nonce (hyphenated; cleared separately by wipe route)', () => {
    const req = makeRequest({ 'logto-wipe-nonce': 'abc123' });
    const res = NextResponse.json({ ok: true });
    clearLogtoCookiesFromResponse(req, res);
    const setCookies = getSetCookies(res);
    // logto-wipe-nonce is NOT matched by the `logto_` prefix (hyphen, not
    // underscore). The wipe route clears it via its own clearWipeNonce helper.
    expect(setCookies.some((sc) => sc.startsWith('logto-wipe-nonce='))).toBe(false);
    expect(setCookies.length).toBe(0);
  });
});

describe('clearLogtoCookiesFromJar', () => {
  it('clears every matching cookie via cookieStore.set with maxAge:0 and path:/', async () => {
    const { jar, setCalls } = makeMockJar({
      'logto_token': 'id-token',
      'logto_refresh': 'refresh',
      'logto-active-org': 'org-xyz',
      'logto-verification-seal': 'seal.sig',
      'org-mode': 'org-xyz',  // not a Logto cookie
    });

    await clearLogtoCookiesFromJar(jar as unknown as Awaited<ReturnType<typeof import('next/headers').cookies>>);

    expect(jar.getAll).toHaveBeenCalled();
    // 4 of the 5 cookies match the predicate.
    expect(setCalls.length).toBe(4);

    const clearedNames = setCalls.map((c) => c.name);
    expect(clearedNames).toContain('logto_token');
    expect(clearedNames).toContain('logto_refresh');
    expect(clearedNames).toContain('logto-active-org');
    expect(clearedNames).toContain('logto-verification-seal');
    expect(clearedNames).not.toContain('org-mode');

    // Every set() call uses empty value + maxAge:0 + path:/.
    for (const call of setCalls) {
      expect(call.value).toBe('');
      expect(call.opts.maxAge).toBe(0);
      expect(call.opts.path).toBe('/');
    }
  });

  it('is a no-op when no Logto cookies are present', async () => {
    const { jar, setCalls } = makeMockJar({
      'theme-mode': 'dark',
      'lang-mode': 'uk',
    });

    await clearLogtoCookiesFromJar(jar as unknown as Awaited<ReturnType<typeof import('next/headers').cookies>>);

    expect(setCalls.length).toBe(0);
  });

  it('handles an empty jar gracefully', async () => {
    const { jar, setCalls } = makeMockJar({});

    await expect(
      clearLogtoCookiesFromJar(jar as unknown as Awaited<ReturnType<typeof import('next/headers').cookies>>),
    ).resolves.toBeUndefined();
    expect(setCalls.length).toBe(0);
  });
});
