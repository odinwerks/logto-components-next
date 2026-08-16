import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Hoisted mock state (vi.mock factories run before top-level code, so shared
// state used inside the factory must be created with vi.hoisted).
// ============================================================================

const hoisted = vi.hoisted(() => {
  const cookieStore = new Map<string, string>();
  const setSpy = vi.fn((name: string, value: string, _opts?: Record<string, unknown>) => {
    cookieStore.set(name, value);
  });
  const getSpy = vi.fn((name: string) =>
    cookieStore.has(name) ? { name, value: cookieStore.get(name)! } : undefined,
  );
  return { cookieStore, setSpy, getSpy };
});

// Write process.env.NODE_ENV without tripping TS's readonly typing on env.
const setNodeEnv = (v: string) => {
  (process.env as Record<string, string | undefined>).NODE_ENV = v;
};

// Mock next/headers cookies() with an in-memory store.
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: hoisted.getSpy,
    set: hoisted.setSpy,
  })),
}));

// Mock helpers so we can assert assertVerificationNotExpired is invoked with
// the server-sealed expiresAt (and control whether it throws).
vi.mock('./helpers', () => ({
  assertVerificationNotExpired: vi.fn(),
}));

// Mock tokens and utils for requireVerifiedIdentity session introspection
// (CAN-ACT-002). Hoisted so we can control the mock return value per test.
const hoistedIntrospect = vi.hoisted(() => ({
  mockIntrospectToken: vi.fn(async () => ({
    active: true,
    sub: 'user-A-123',
    client_id: 'test-client',
    token_type: 'Bearer',
    scope: 'all',
    exp: Date.now() / 1000 + 3600,
    iat: Date.now() / 1000,
  })),
}));

const hoistedConsumeLimiter = vi.hoisted(() => {
  const state = {
    check: vi.fn<(key: string) => Promise<boolean>>().mockResolvedValue(true),
    reset: vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined),
    options: undefined as { name: string; windowMs: number; max: number } | undefined,
    create: vi.fn(),
  };
  state.create.mockImplementation((options) => {
    state.options = options;
    return { check: state.check, reset: state.reset };
  });
  return state;
});

vi.mock('../../../lib/distributed-state', () => ({
  createRateLimiter: hoistedConsumeLimiter.create,
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn(async () => 'mock-token'),
}));

vi.mock('../utils', () => ({
  introspectToken: vi.fn(hoistedIntrospect.mockIntrospectToken),
}));

// Mock guards: assertSafeLogtoId is a no-op (format validation is tested
// elsewhere). We want to exercise the recordId-binding logic here.
vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
}));

// Mock errors: plainCode returns a SanitizedError carrying the code as the
// message, matching the production safeAction surfacing contract.
vi.mock('../errors', () => ({
  plainCode: vi.fn((code: string) => {
    const e = new Error(code);
    e.name = 'SanitizedError';
    return e;
  }),
}));

import { cookies } from 'next/headers';
import { assertVerificationNotExpired } from './helpers';
import { plainCode } from '../errors';
import { LOGTO_VERIFICATION_MAX_FUTURE_MS } from '../constants';
import {
  sealVerificationCookie,
  readVerificationCookie,
  clearVerificationCookie,
  requireVerifiedIdentity,
  VERIFICATION_COOKIE_NAME,
  VERIFICATION_COOKIE_MAX_AGE_SECONDS,
} from './verification-cookie';

const TEST_SECRET = 'test-verification-secret-0123456789';

describe('verification-cookie sealing', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    hoisted.setSpy.mockClear();
    hoisted.getSpy.mockClear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
    delete process.env.COOKIE_SECRET;
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
  });

  it('sets an httpOnly, sameSite=strict, path=/, maxAge=15min cookie', async () => {
    await sealVerificationCookie('rec_abc', Date.now() + 600_000, 'user-A-123');

    expect(hoisted.setSpy).toHaveBeenCalledTimes(1);
    const call = hoisted.setSpy.mock.calls[0];
    const name = call[0] as string;
    const value = call[1] as string;
    const opts = call[2] as Record<string, unknown>;
    expect(name).toBe(VERIFICATION_COOKIE_NAME);
    expect(typeof value).toBe('string');
    expect(value.includes('.')).toBe(true);
    expect(opts).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: VERIFICATION_COOKIE_MAX_AGE_SECONDS,
    });
    // secure follows NODE_ENV (test → false)
    expect(opts.secure).toBe(false);
  });

  it('is secure in production', async () => {
    const original = process.env.NODE_ENV;
    setNodeEnv('production');
    try {
      await sealVerificationCookie('rec_abc', Date.now() + 600_000, 'user-A-123');
      const opts = hoisted.setSpy.mock.calls[0][2] as Record<string, unknown>;
      expect(opts.secure).toBe(true);
    } finally {
      setNodeEnv(original ?? 'test');
    }
  });

  it('rejects a non-finite expiresAt', async () => {
    await expect(sealVerificationCookie('rec_abc', Number.NaN, 'user-A-123')).rejects.toThrow(
      'VERIFICATION_FAILED',
    );
    expect(hoisted.setSpy).not.toHaveBeenCalled();
  });

  it('rejects an empty recordId', async () => {
    await expect(sealVerificationCookie('', Date.now() + 600_000, 'user-A-123')).rejects.toThrow(
      'VERIFICATION_FAILED',
    );
  });

  it('rejects an empty sub', async () => {
    await expect(sealVerificationCookie('rec_abc', Date.now() + 600_000, '')).rejects.toThrow(
      'VERIFICATION_FAILED',
    );
  });
});

describe('verification-cookie round-trip', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
    delete process.env.COOKIE_SECRET;
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
  });

  it('seal then read returns the same { recordId, expiresAt, sub }', async () => {
    const expiresAt = Date.now() + 600_000;
    await sealVerificationCookie('rec_roundtrip', expiresAt, 'user-A-123');
    const sealed = await readVerificationCookie();
    expect(sealed).toEqual({ recordId: 'rec_roundtrip', expiresAt, sub: 'user-A-123' });
  });

  it('keeps earlier valid seals available when another flow verifies later', async () => {
    const expiresA = Date.now() + 600_000;
    const expiresB = Date.now() + 700_000;
    await sealVerificationCookie('rec_A', expiresA, 'user-A-123');
    await sealVerificationCookie('rec_B', expiresB, 'user-A-123');

    await expect(requireVerifiedIdentity('rec_A')).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresA);
    await expect(requireVerifiedIdentity('rec_B')).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresB);
  });

  it('returns null when no cookie is present', async () => {
    const sealed = await readVerificationCookie();
    expect(sealed).toBeNull();
  });

  it('returns null for a tampered signature', async () => {
    await sealVerificationCookie('rec_tamper', Date.now() + 600_000, 'user-A-123');
    const value = hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME)!;
    // Flip the last character of the signature to break the HMAC.
    const [b64, sig] = [value.slice(0, value.lastIndexOf('.')), value.slice(value.lastIndexOf('.') + 1)];
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, `${b64}.${tamperedSig}`);

    const sealed = await readVerificationCookie();
    expect(sealed).toBeNull();
  });

  it('returns null for a malformed cookie value (no dot)', async () => {
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, 'nodothere');
    expect(await readVerificationCookie()).toBeNull();
  });

  it('returns null for malformed JSON payload', async () => {
    // Build a valid HMAC over a non-JSON base64url payload (v2 signing domain).
    const key = Buffer.from(TEST_SECRET, 'utf8');
    const b64 = Buffer.from('not-json').toString('base64url');
    const crypto = await import('node:crypto');
    const sig = Buffer.from(
      crypto.createHmac('sha256', key).update(`logto-verification-cookie-v2.${b64}`).digest(),
    ).toString('base64url');
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, `${b64}.${sig}`);
    expect(await readVerificationCookie()).toBeNull();
  });
});

describe('requireVerifiedIdentity', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
    delete process.env.COOKIE_SECRET;
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
    // Re-establish the default introspection mock (cleared by vi.clearAllMocks)
    hoistedIntrospect.mockIntrospectToken.mockResolvedValue({
      active: true,
      sub: 'user-A-123',
      client_id: 'test-client',
      token_type: 'Bearer',
      scope: 'all',
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    });
  });

  it('throws VERIFICATION_EXPIRED when no cookie is present', async () => {
    await expect(requireVerifiedIdentity('rec_missing')).rejects.toThrow(
      'VERIFICATION_EXPIRED',
    );
    expect(plainCode).toHaveBeenCalledWith('VERIFICATION_EXPIRED');
  });

  it('throws VERIFICATION_EXPIRED when the sealed recordId does not match', async () => {
    await sealVerificationCookie('rec_A', Date.now() + 600_000, 'user-A-123');
    await expect(requireVerifiedIdentity('rec_B')).rejects.toThrow('VERIFICATION_EXPIRED');
  });

  it('throws VERIFICATION_EXPIRED when the sealed sub does not match the current session (CAN-ACT-002)', async () => {
    // Seal with user-A but the mocked introspection returns user-B.
    hoistedIntrospect.mockIntrospectToken.mockResolvedValueOnce({
      active: true,
      sub: 'user-B-456',
      client_id: 'test-client',
      token_type: 'Bearer',
      scope: 'all',
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    });
    await sealVerificationCookie('rec_sub_mismatch', Date.now() + 600_000, 'user-A-123');
    await expect(requireVerifiedIdentity('rec_sub_mismatch')).rejects.toThrow('VERIFICATION_EXPIRED');
  });

  it('resolves and runs the staleness check on the sealed expiresAt when bound', async () => {
    const expiresAt = Date.now() + 123_456;
    await sealVerificationCookie('rec_bound', expiresAt, 'user-A-123');
    await expect(requireVerifiedIdentity('rec_bound')).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresAt);
  });

  it('propagates VERIFICATION_EXPIRED when the staleness check rejects', async () => {
    await sealVerificationCookie('rec_expired', Date.now() - 20_000, 'user-A-123');
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => {
      // Mimic the real helper throwing a ValidationError carrying the code.
      const e = new Error('VERIFICATION_EXPIRED');
      e.name = 'ValidationError';
      throw e;
    });
    await expect(requireVerifiedIdentity('rec_expired')).rejects.toThrow(
      'VERIFICATION_EXPIRED',
    );
  });

  it('reads the cookie via cookies() (server-side only)', async () => {
    await sealVerificationCookie('rec_check', Date.now() + 600_000, 'user-A-123');
    await requireVerifiedIdentity('rec_check');
    expect(cookies).toHaveBeenCalled();
  });
});

describe('clearVerificationCookie', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
  });

  it('sets an empty cookie with maxAge 0 on path /', async () => {
    await clearVerificationCookie();
    expect(hoisted.setSpy).toHaveBeenCalledWith(
      VERIFICATION_COOKIE_NAME,
      '',
      { maxAge: 0, path: '/' },
    );
  });
});

describe('verification-cookie secret resolution', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    vi.clearAllMocks();
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
  });

  it('falls back to COOKIE_SECRET when LOGTO_VERIFICATION_COOKIE_SECRET is unset', async () => {
    delete process.env.LOGTO_VERIFICATION_COOKIE_SECRET;
    process.env.COOKIE_SECRET = 'fallback-cookie-secret-1234';
    await sealVerificationCookie('rec_fallback', Date.now() + 600_000, 'user-A-123');
    const sealed = await readVerificationCookie();
    expect(sealed).toEqual({ recordId: 'rec_fallback', expiresAt: expect.any(Number), sub: 'user-A-123' });
  });

  it('uses a dev fallback key in non-production when no secret is set', async () => {
    delete process.env.LOGTO_VERIFICATION_COOKIE_SECRET;
    delete process.env.COOKIE_SECRET;
    const original = process.env.NODE_ENV;
    setNodeEnv('test');
    try {
      await sealVerificationCookie('rec_dev', Date.now() + 600_000, 'user-A-123');
      const sealed = await readVerificationCookie();
      expect(sealed).not.toBeNull();
      expect(sealed?.recordId).toBe('rec_dev');
      expect(sealed?.sub).toBe('user-A-123');
    } finally {
      setNodeEnv(original ?? 'test');
    }
  });

  it('readVerificationCookie returns null in production when no secret is set', async () => {
    delete process.env.LOGTO_VERIFICATION_COOKIE_SECRET;
    delete process.env.COOKIE_SECRET;
    const original = process.env.NODE_ENV;
    setNodeEnv('production');
    try {
      // Pre-seed a cookie so the read reaches the key-resolution step.
      hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, 'aaa.bbb');
      const sealed = await readVerificationCookie();
      expect(sealed).toBeNull();
    } finally {
      setNodeEnv(original ?? 'test');
    }
  });
});

// ============================================================================
// v3 Purpose-Scoped Seals + Consumption (PAT remediation)
// ============================================================================

describe('verification-cookie purpose scoping (v3)', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    hoisted.setSpy.mockClear();
    hoisted.getSpy.mockClear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
    delete process.env.COOKIE_SECRET;
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
    hoistedIntrospect.mockIntrospectToken.mockResolvedValue({
      active: true,
      sub: 'user-A-123',
      client_id: 'test-client',
      token_type: 'Bearer',
      scope: 'all',
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    });
  });

  /** Decodes the stored cookie payload (HMAC not re-verified here). */
  const decodeCookiePayload = (): { v?: number; seals?: Array<Record<string, unknown>> } => {
    const value = hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME)!;
    const b64 = value.slice(0, value.lastIndexOf('.'));
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  };

  /** Builds and stores a v2-shaped cookie (no purpose field) with a valid HMAC. */
  const setV2Cookie = async (entries: Array<{ r: string; e: number; s: string }>) => {
    const crypto = await import('node:crypto');
    const key = Buffer.from(TEST_SECRET, 'utf8');
    const b64 = Buffer.from(JSON.stringify({ v: 2, seals: entries })).toString('base64url');
    const sig = Buffer.from(
      crypto.createHmac('sha256', key).update(`logto-verification-cookie-v2.${b64}`).digest(),
    ).toString('base64url');
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, `${b64}.${sig}`);
  };

  it('seals a v3 payload carrying the purpose and round-trips it', async () => {
    const expiresAt = Date.now() + 600_000;
    await sealVerificationCookie('rec_pat', expiresAt, 'user-A-123', 'pat.create');

    const payload = decodeCookiePayload();
    expect(payload.v).toBe(3);
    expect(payload.seals).toEqual([
      { r: 'rec_pat', e: expiresAt, s: 'user-A-123', p: 'pat.create' },
    ]);

    await expect(
      requireVerifiedIdentity('rec_pat', { purpose: 'pat.create' }),
    ).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresAt);
  });

  it('purpose-less requireVerifiedIdentity accepts a v3 seal (default mode ignores purpose)', async () => {
    await sealVerificationCookie('rec_view', Date.now() + 600_000, 'user-A-123', 'view');
    await expect(requireVerifiedIdentity('rec_view')).resolves.toBeUndefined();

    // Even a non-'view' purpose is ignored by the legacy no-opts mode.
    await sealVerificationCookie('rec_scoped', Date.now() + 600_000, 'user-A-123', 'pat.rename');
    await expect(requireVerifiedIdentity('rec_scoped')).resolves.toBeUndefined();
  });

  it('purpose-bound call accepts a matching purpose', async () => {
    await sealVerificationCookie('rec_match', Date.now() + 600_000, 'user-A-123', 'pat.delete');
    await expect(
      requireVerifiedIdentity('rec_match', { purpose: 'pat.delete' }),
    ).resolves.toBeUndefined();
  });

  it('purpose-bound call rejects a mismatched purpose with VERIFICATION_EXPIRED', async () => {
    await sealVerificationCookie('rec_mismatch', Date.now() + 600_000, 'user-A-123', 'pat.create');
    await expect(
      requireVerifiedIdentity('rec_mismatch', { purpose: 'pat.delete' }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
    expect(plainCode).toHaveBeenCalledWith('VERIFICATION_EXPIRED');
    expect(assertVerificationNotExpired).toHaveBeenCalled();
  });

  it('purpose-bound call rejects a seal with no purpose (v3 view) with VERIFICATION_EXPIRED', async () => {
    await sealVerificationCookie('rec_unscoped', Date.now() + 600_000, 'user-A-123', 'view');
    await expect(
      requireVerifiedIdentity('rec_unscoped', { purpose: 'pat.create' }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
    expect(plainCode).toHaveBeenCalledWith('VERIFICATION_EXPIRED');
  });

  it('accepts a v2-shaped seal (no p) in default mode and rejects it when purpose-bound', async () => {
    const expiresAt = Date.now() + 600_000;
    await setV2Cookie([{ r: 'rec_v2', e: expiresAt, s: 'user-A-123' }]);

    // Default mode: v2 seals remain valid (purpose-unscoped).
    await expect(requireVerifiedIdentity('rec_v2')).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresAt);

    // Purpose-bound mode: no `p` cannot satisfy a strict purpose requirement.
    await expect(
      requireVerifiedIdentity('rec_v2', { purpose: 'view' }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
  });

  it('a tampered purpose-scoped seal fails closed', async () => {
    await sealVerificationCookie('rec_tamper_p', Date.now() + 600_000, 'user-A-123', 'pat.create');
    const value = hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME)!;
    const [b64, sig] = [value.slice(0, value.lastIndexOf('.')), value.slice(value.lastIndexOf('.') + 1)];
    const tamperedSig = sig.slice(0, -1) + (sig.endsWith('A') ? 'B' : 'A');
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, `${b64}.${tamperedSig}`);

    await expect(
      requireVerifiedIdentity('rec_tamper_p', { purpose: 'pat.create' }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
    await expect(requireVerifiedIdentity('rec_tamper_p')).rejects.toThrow('VERIFICATION_EXPIRED');
  });
});

describe('requireVerifiedIdentity consumption', () => {
  beforeEach(() => {
    hoisted.cookieStore.clear();
    hoisted.setSpy.mockClear();
    hoisted.getSpy.mockClear();
    vi.clearAllMocks();
    process.env.LOGTO_VERIFICATION_COOKIE_SECRET = TEST_SECRET;
    delete process.env.COOKIE_SECRET;
    vi.mocked(assertVerificationNotExpired).mockImplementation(() => undefined);
    hoistedConsumeLimiter.check.mockResolvedValue(true);
    hoistedIntrospect.mockIntrospectToken.mockResolvedValue({
      active: true,
      sub: 'user-A-123',
      client_id: 'test-client',
      token_type: 'Bearer',
      scope: 'all',
      exp: Date.now() / 1000 + 3600,
      iat: Date.now() / 1000,
    });
  });

  it('configures a one-shot claim for the maximum accepted verification horizon', () => {
    expect(hoistedConsumeLimiter.options).toEqual({
      name: 'verification-record-consume',
      windowMs: LOGTO_VERIFICATION_MAX_FUTURE_MS,
      max: 1,
    });
  });

  it('consume removes exactly the matched entry and preserves the others', async () => {
    await sealVerificationCookie('rec_keep_view', Date.now() + 600_000, 'user-A-123', 'view');
    await sealVerificationCookie('rec_consume', Date.now() + 600_000, 'user-A-123', 'pat.create');
    await sealVerificationCookie('rec_keep_rename', Date.now() + 600_000, 'user-A-123', 'pat.rename');

    // Consume the middle entry.
    await expect(
      requireVerifiedIdentity('rec_consume', { purpose: 'pat.create', consume: true }),
    ).resolves.toBeUndefined();
    expect(hoistedConsumeLimiter.check).toHaveBeenCalledWith('rec_consume');

    // The consumed seal is gone — sequential replay is blocked.
    await expect(
      requireVerifiedIdentity('rec_consume', { purpose: 'pat.create' }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');

    // The other entries survive with their original purpose scopes intact.
    await expect(requireVerifiedIdentity('rec_keep_view')).resolves.toBeUndefined();
    await expect(
      requireVerifiedIdentity('rec_keep_rename', { purpose: 'pat.rename' }),
    ).resolves.toBeUndefined();

    // The rewrite preserved the writer's cookie attributes.
    const rewriteCall = hoisted.setSpy.mock.calls.find(
      ([name]) => name === VERIFICATION_COOKIE_NAME,
    );
    expect(rewriteCall).toBeDefined();
    expect(rewriteCall![2]).toMatchObject({
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
      maxAge: VERIFICATION_COOKIE_MAX_AGE_SECONDS,
    });
  });

  it('keeps the bounded-seal retention on the consume rewrite', async () => {
    const future = () => Date.now() + 600_000;
    for (const id of ['rec_r1', 'rec_r2', 'rec_r3', 'rec_r4']) {
      await sealVerificationCookie(id, future(), 'user-A-123', 'view');
    }
    expect(
      hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME),
    ).toBeDefined();

    await expect(requireVerifiedIdentity('rec_r2', { consume: true })).resolves.toBeUndefined();

    // Consumed entry removed; the remaining three stay verifiable.
    for (const id of ['rec_r1', 'rec_r3', 'rec_r4']) {
      await expect(requireVerifiedIdentity(id)).resolves.toBeUndefined();
    }
    await expect(requireVerifiedIdentity('rec_r2')).rejects.toThrow('VERIFICATION_EXPIRED');
  });

  it('fails closed when the consume cookie rewrite fails', async () => {
    await sealVerificationCookie('rec_write_fail', Date.now() + 600_000, 'user-A-123', 'pat.create');
    const originalCookie = hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME)!;
    // Make the next cookie write blow up; the atomic claim must remain spent.
    hoisted.setSpy.mockImplementationOnce(() => {
      throw new Error('cookie store unavailable');
    });

    await expect(
      requireVerifiedIdentity('rec_write_fail', { purpose: 'pat.create', consume: true }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
    expect(plainCode).toHaveBeenCalledWith('VERIFICATION_EXPIRED');
    expect(hoistedConsumeLimiter.check).toHaveBeenCalledTimes(1);

    // Even with the same original request-cookie snapshot, a retry cannot use
    // the claimed record. Consumption never calls reset/refund.
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, originalCookie);
    hoistedConsumeLimiter.check.mockResolvedValueOnce(false);
    await expect(
      requireVerifiedIdentity('rec_write_fail', { purpose: 'pat.create', consume: true }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');
    expect(hoistedConsumeLimiter.reset).not.toHaveBeenCalled();
  });

  it('default and purpose-only calls do not check the claim limiter or rewrite the cookie', async () => {
    await sealVerificationCookie('rec_no_consume', Date.now() + 600_000, 'user-A-123', 'view');
    const writesBefore = hoisted.setSpy.mock.calls.length;
    await expect(requireVerifiedIdentity('rec_no_consume')).resolves.toBeUndefined();
    await expect(
      requireVerifiedIdentity('rec_no_consume', { purpose: 'view' }),
    ).resolves.toBeUndefined();
    expect(hoistedConsumeLimiter.check).not.toHaveBeenCalled();
    expect(hoisted.setSpy.mock.calls.length).toBe(writesBefore);
  });

  it('rejects a concurrent replay carrying the same original sealed-cookie snapshot', async () => {
    await sealVerificationCookie(
      'rec_concurrent',
      Date.now() + 600_000,
      'user-A-123',
      'pat.rename',
    );
    const originalCookie = hoisted.cookieStore.get(VERIFICATION_COOKIE_NAME)!;
    hoistedConsumeLimiter.check
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await expect(
      requireVerifiedIdentity('rec_concurrent', { purpose: 'pat.rename', consume: true }),
    ).resolves.toBeUndefined();

    // Simulate a second already-dispatched request with the exact Cookie header
    // snapshot from before the first response rewrote the browser cookie.
    hoisted.cookieStore.set(VERIFICATION_COOKIE_NAME, originalCookie);
    await expect(
      requireVerifiedIdentity('rec_concurrent', { purpose: 'pat.rename', consume: true }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');

    expect(hoistedConsumeLimiter.check).toHaveBeenNthCalledWith(1, 'rec_concurrent');
    expect(hoistedConsumeLimiter.check).toHaveBeenNthCalledWith(2, 'rec_concurrent');
    expect(hoisted.setSpy).toHaveBeenCalledTimes(2); // initial seal + first consume only
  });

  it('fails closed when the claim backend rejects', async () => {
    await sealVerificationCookie(
      'rec_claim_error',
      Date.now() + 600_000,
      'user-A-123',
      'pat.delete',
    );
    const writesBefore = hoisted.setSpy.mock.calls.length;
    hoistedConsumeLimiter.check.mockRejectedValueOnce(new Error('claim backend unavailable'));

    await expect(
      requireVerifiedIdentity('rec_claim_error', { purpose: 'pat.delete', consume: true }),
    ).rejects.toThrow('VERIFICATION_EXPIRED');

    expect(hoisted.setSpy).toHaveBeenCalledTimes(writesBefore);
    expect(hoistedConsumeLimiter.reset).not.toHaveBeenCalled();
  });
});
