import { createHash } from 'node:crypto';
import { wrapSession, type SessionData } from '@logto/node';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────

/**
 * In-memory sessionStore mock backed by a real Map so get/set/clear behave
 * like actual storage. Tests can inspect/seed the Map directly.
 */
const sessionMap = new Map<string, string>();

vi.mock('../../lib/distributed-state', () => ({
  sessionStore: {
    get: vi.fn(async (sessionId: string) => sessionMap.get(sessionId) ?? null),
    set: vi.fn(async (sessionId: string, data: string, _ttlSeconds: number) => {
      sessionMap.set(sessionId, data);
    }),
    clear: vi.fn(async (sessionId: string) => {
      sessionMap.delete(sessionId);
    }),
  },
}));

const warnMock = vi.hoisted(() => vi.fn());

vi.mock('./log', () => ({
  warn: warnMock,
}));

import { sessionStore } from '../../lib/distributed-state';
import {
  createLogtoSessionWrapper,
  deleteSessionByCookieValue,
  LOGTO_SESSION_TTL_SECONDS,
} from './session-wrapper';

const sessionStoreMock = vi.mocked(sessionStore);

// ── Helpers ───────────────────────────────────────────────────────────────

const SESSION_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Legacy cookie encryption secret (any string; wrapSession hashes it). */
const TEST_SECRET = 'test-cookie-secret';

/** sha256 hex — mirrors the deterministic legacy session ID derivation. */
function legacySessionId(cookieValue: string): string {
  return createHash('sha256').update(cookieValue).digest('hex');
}

beforeEach(() => {
  sessionMap.clear();
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('createLogtoSessionWrapper', () => {
  it('unwrap("") returns {} and a subsequent wrap generates a NEW UUID and stores the data', async () => {
    const wrapper = createLogtoSessionWrapper();

    expect(await wrapper.unwrap('', TEST_SECRET)).toEqual({});

    const data: SessionData = { idToken: 'id-1', refreshToken: 'refresh-1' };
    const id = await wrapper.wrap(data, TEST_SECRET);

    expect(id).toMatch(SESSION_ID_REGEX);
    expect(sessionStoreMock.set).toHaveBeenCalledWith(
      id,
      JSON.stringify(data),
      LOGTO_SESSION_TTL_SECONDS,
    );
    expect(JSON.parse(sessionMap.get(id)!)).toEqual(data);
  });

  it('round-trips new-format data: wrap → UUID → fresh instance unwrap returns the same data', async () => {
    const data: SessionData = {
      idToken: 'id-2',
      refreshToken: 'refresh-2',
      accessToken: 'access-2',
    } as SessionData;

    const id = await createLogtoSessionWrapper().wrap(data, TEST_SECRET);
    expect(id).toMatch(SESSION_ID_REGEX);

    // Simulate a subsequent request with a fresh per-request wrapper instance.
    const nextRequest = createLogtoSessionWrapper();
    expect(await nextRequest.unwrap(id, TEST_SECRET)).toEqual(data);
  });

  it('keeps the session ID stable: after unwrap(UUID), wrap returns the SAME UUID', async () => {
    const data: SessionData = { idToken: 'id-3', refreshToken: 'refresh-3' };
    const id = await createLogtoSessionWrapper().wrap(data, TEST_SECRET);

    // Fresh request: unwrap reads the cookie (the UUID), then wrap must reuse
    // it — RSC contexts cannot write cookies, so a new ID would orphan data.
    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(id, TEST_SECRET)).toEqual(data);

    const refreshed: SessionData = { idToken: 'id-3b', refreshToken: 'refresh-3b' };
    expect(await wrapper.wrap(refreshed, TEST_SECRET)).toBe(id);
    expect(JSON.parse(sessionMap.get(id)!)).toEqual(refreshed);
  });

  it('treats garbage (no ".", not a UUID) as no session and does NOT pin a session ID', async () => {
    const wrapper = createLogtoSessionWrapper();

    expect(await wrapper.unwrap('not-a-uuid-garbage', TEST_SECRET)).toEqual({});

    // sessionId was never set, so wrap generates a fresh UUID.
    const id = await wrapper.wrap({ idToken: 'id-4' }, TEST_SECRET);
    expect(id).toMatch(SESSION_ID_REGEX);
  });

  it('returns {} when the store holds corrupt JSON for a valid UUID', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    sessionMap.set(id, '{not valid json');

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(id, TEST_SECRET)).toEqual({});
  });

  it('migrates legacy encrypted cookies: decrypts, pins a deterministic ID, and persists on wrap', async () => {
    const legacyData: SessionData = { idToken: 'x', refreshToken: 'y' };
    const legacyValue = await wrapSession(legacyData, TEST_SECRET);
    // Legacy format is an encrypted `ciphertext.iv` blob.
    expect(legacyValue).toContain('.');

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(legacyValue, TEST_SECRET)).toEqual(legacyData);

    // First wrap in a cookie-writable context persists under the deterministic
    // sha256-of-blob key and returns it (rewriting the cookie to the plain ID).
    const expectedId = legacySessionId(legacyValue);
    expect(expectedId).toMatch(/^[0-9a-f]{64}$/);
    expect(await wrapper.wrap(legacyData, TEST_SECRET)).toBe(expectedId);
    expect(JSON.parse(sessionMap.get(expectedId)!)).toEqual(legacyData);

    // Idempotent: a second wrapper instance reading the same legacy cookie
    // decrypts successfully and pins the same ID.
    const secondRequest = createLogtoSessionWrapper();
    expect(await secondRequest.unwrap(legacyValue, TEST_SECRET)).toEqual(legacyData);
    expect(await secondRequest.wrap(legacyData, TEST_SECRET)).toBe(expectedId);
  });

  it('treats legacy-shaped garbage (contains "." but undecryptable) as no session', async () => {
    const wrapper = createLogtoSessionWrapper();

    // unwrapSession() from @logto/node swallows decryption failures and
    // returns {} internally, so the wrapper's warn branch is defensive only —
    // it is NOT reached for decryption failures with the current SDK.
    expect(await wrapper.unwrap('bm90.bm90-an-iv', TEST_SECRET)).toEqual({});
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('wrap with all-empty data clears the store and returns the known session ID', async () => {
    const data: SessionData = { idToken: 'id-5', refreshToken: 'refresh-5' };
    const id = await createLogtoSessionWrapper().wrap(data, TEST_SECRET);
    expect(sessionMap.has(id)).toBe(true);

    // Sign-out path: destroyed session (every value null/empty).
    const wrapper = createLogtoSessionWrapper();
    await wrapper.unwrap(id, TEST_SECRET);
    const returnedId = await wrapper.wrap(
      { refreshToken: null } as unknown as SessionData,
      TEST_SECRET,
    );

    expect(returnedId).toBe(id);
    expect(sessionStoreMock.clear).toHaveBeenCalledWith(id);
    expect(sessionMap.has(id)).toBe(false);
  });

  it('returns {} on a Redis miss for a valid UUID but retains the ID for wrap', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    expect(sessionMap.has(id)).toBe(false);

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(id, TEST_SECRET)).toEqual({});

    // sessionId is retained: wrap reuses the same ID instead of generating one.
    const data: SessionData = { idToken: 'id-6' };
    expect(await wrapper.wrap(data, TEST_SECRET)).toBe(id);
    expect(JSON.parse(sessionMap.get(id)!)).toEqual(data);
  });

  it('ROUND-TRIP REGRESSION: legacy blob → unwrap → wrap(64-hex) → fresh wrapper unwraps the same data', async () => {
    // This is the bug that escaped: a migrated session must be readable by the
    // NEXT request once the cookie holds the plain 64-hex session ID.
    const data: SessionData = {
      idToken: 'rt-id',
      refreshToken: 'rt-refresh',
      accessToken: 'rt-access',
    } as SessionData;
    const blob = await wrapSession(data, TEST_SECRET);
    expect(blob).toContain('.');

    // Request 1: legacy cookie arrives; the wrapper migrates it.
    const wrapperA = createLogtoSessionWrapper();
    expect(await wrapperA.unwrap(blob, TEST_SECRET)).toEqual(data);

    // wrap() must return a 64-hex session ID (sha256 of the blob), which the
    // SDK rewrites into the cookie.
    const id = await wrapperA.wrap(data, TEST_SECRET);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).toBe(legacySessionId(blob));

    // Request 2: the cookie now holds the bare 64-hex ID. A FRESH per-request
    // wrapper must read the migrated data back from the store.
    const wrapperB = createLogtoSessionWrapper();
    expect(await wrapperB.unwrap(id, TEST_SECRET)).toEqual(data);
  });

  it('unwraps a bare 64-hex cookie value by reading from the store', async () => {
    const id = 'a'.repeat(64);
    const data: SessionData = { idToken: 'hex-id', refreshToken: 'hex-refresh' };
    sessionMap.set(id, JSON.stringify(data));

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(id, TEST_SECRET)).toEqual(data);
    expect(sessionStoreMock.get).toHaveBeenCalledWith(id);

    // The 64-hex ID is pinned, so wrap() reuses it.
    expect(await wrapper.wrap(data, TEST_SECRET)).toBe(id);
  });

  it('prefers stored data over the legacy blob when both exist (Redis-first migration)', async () => {
    const blobData: SessionData = { idToken: 'stale-id', refreshToken: 'stale-refresh' };
    const blob = await wrapSession(blobData, TEST_SECRET);

    // A previous request already migrated this session and a refresh wrote
    // NEWER data to the store. The store is authoritative over the stale blob.
    const storedData: SessionData = { idToken: 'fresh-id', refreshToken: 'fresh-refresh' };
    const derivedId = legacySessionId(blob);
    sessionMap.set(derivedId, JSON.stringify(storedData));

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(blob, TEST_SECRET)).toEqual(storedData);

    // The deterministic ID is still pinned for the subsequent wrap.
    expect(await wrapper.wrap(storedData, TEST_SECRET)).toBe(derivedId);
  });

  it('eagerly writes a legacy blob into the store on unwrap when the store is empty', async () => {
    const data: SessionData = { idToken: 'mig-id', refreshToken: 'mig-refresh' };
    const blob = await wrapSession(data, TEST_SECRET);
    const derivedId = legacySessionId(blob);
    expect(sessionMap.has(derivedId)).toBe(false);

    const wrapper = createLogtoSessionWrapper();
    expect(await wrapper.unwrap(blob, TEST_SECRET)).toEqual(data);

    // Server-side migration completed during unwrap itself: the store now
    // holds the data even if the cookie is never rewritten (RSC no-write path).
    expect(sessionStoreMock.set).toHaveBeenCalledWith(
      derivedId,
      JSON.stringify(data),
      LOGTO_SESSION_TTL_SECONDS,
    );
    expect(JSON.parse(sessionMap.get(derivedId)!)).toEqual(data);
  });
});

describe('deleteSessionByCookieValue', () => {
  it('clears the stored session for a dashed-UUID cookie value', async () => {
    const id = '123e4567-e89b-42d3-a456-426614174000';
    sessionMap.set(id, JSON.stringify({ idToken: 'x' }));

    await deleteSessionByCookieValue(id);

    expect(sessionStoreMock.clear).toHaveBeenCalledWith(id);
    expect(sessionMap.has(id)).toBe(false);
  });

  it('clears the stored session for a 64-hex cookie value', async () => {
    const id = 'b'.repeat(64);
    sessionMap.set(id, JSON.stringify({ idToken: 'x' }));

    await deleteSessionByCookieValue(id);

    expect(sessionStoreMock.clear).toHaveBeenCalledWith(id);
    expect(sessionMap.has(id)).toBe(false);
  });

  it('clears the derived sha256 key for a legacy blob cookie value', async () => {
    const blob = await wrapSession({ idToken: 'legacy' }, TEST_SECRET);
    const derivedId = legacySessionId(blob);
    sessionMap.set(derivedId, JSON.stringify({ idToken: 'legacy' }));

    await deleteSessionByCookieValue(blob);

    expect(sessionStoreMock.clear).toHaveBeenCalledWith(derivedId);
    expect(sessionMap.has(derivedId)).toBe(false);
  });

  it('no-ops on undefined, empty, and garbage values', async () => {
    await deleteSessionByCookieValue(undefined);
    await deleteSessionByCookieValue('');
    await deleteSessionByCookieValue('garbage-without-a-dot');

    expect(sessionStoreMock.clear).not.toHaveBeenCalled();
  });
});
