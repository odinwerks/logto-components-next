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
    await sealVerificationCookie('rec_abc', Date.now() + 600_000);

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
      await sealVerificationCookie('rec_abc', Date.now() + 600_000);
      const opts = hoisted.setSpy.mock.calls[0][2] as Record<string, unknown>;
      expect(opts.secure).toBe(true);
    } finally {
      setNodeEnv(original ?? 'test');
    }
  });

  it('rejects a non-finite expiresAt', async () => {
    await expect(sealVerificationCookie('rec_abc', Number.NaN)).rejects.toThrow(
      'VERIFICATION_FAILED',
    );
    expect(hoisted.setSpy).not.toHaveBeenCalled();
  });

  it('rejects an empty recordId', async () => {
    await expect(sealVerificationCookie('', Date.now() + 600_000)).rejects.toThrow(
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

  it('seal then read returns the same { recordId, expiresAt }', async () => {
    const expiresAt = Date.now() + 600_000;
    await sealVerificationCookie('rec_roundtrip', expiresAt);
    const sealed = await readVerificationCookie();
    expect(sealed).toEqual({ recordId: 'rec_roundtrip', expiresAt });
  });

  it('returns null when no cookie is present', async () => {
    const sealed = await readVerificationCookie();
    expect(sealed).toBeNull();
  });

  it('returns null for a tampered signature', async () => {
    await sealVerificationCookie('rec_tamper', Date.now() + 600_000);
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
    // Build a valid HMAC over a non-JSON base64url payload.
    const key = Buffer.from(TEST_SECRET, 'utf8');
    const b64 = Buffer.from('not-json').toString('base64url');
    const crypto = await import('node:crypto');
    const sig = Buffer.from(
      crypto.createHmac('sha256', key).update(`logto-verification-cookie-v1.${b64}`).digest(),
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
  });

  it('throws VERIFICATION_EXPIRED when no cookie is present', async () => {
    await expect(requireVerifiedIdentity('rec_missing')).rejects.toThrow(
      'VERIFICATION_EXPIRED',
    );
    expect(plainCode).toHaveBeenCalledWith('VERIFICATION_EXPIRED');
  });

  it('throws VERIFICATION_EXPIRED when the sealed recordId does not match', async () => {
    await sealVerificationCookie('rec_A', Date.now() + 600_000);
    await expect(requireVerifiedIdentity('rec_B')).rejects.toThrow('VERIFICATION_EXPIRED');
  });

  it('resolves and runs the staleness check on the sealed expiresAt when bound', async () => {
    const expiresAt = Date.now() + 123_456;
    await sealVerificationCookie('rec_bound', expiresAt);
    await expect(requireVerifiedIdentity('rec_bound')).resolves.toBeUndefined();
    expect(assertVerificationNotExpired).toHaveBeenCalledWith(expiresAt);
  });

  it('propagates VERIFICATION_EXPIRED when the staleness check rejects', async () => {
    await sealVerificationCookie('rec_expired', Date.now() - 20_000);
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
    await sealVerificationCookie('rec_check', Date.now() + 600_000);
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
    await sealVerificationCookie('rec_fallback', Date.now() + 600_000);
    const sealed = await readVerificationCookie();
    expect(sealed).toEqual({ recordId: 'rec_fallback', expiresAt: expect.any(Number) });
  });

  it('uses a dev fallback key in non-production when no secret is set', async () => {
    delete process.env.LOGTO_VERIFICATION_COOKIE_SECRET;
    delete process.env.COOKIE_SECRET;
    const original = process.env.NODE_ENV;
    setNodeEnv('test');
    try {
      await sealVerificationCookie('rec_dev', Date.now() + 600_000);
      const sealed = await readVerificationCookie();
      expect(sealed).not.toBeNull();
      expect(sealed?.recordId).toBe('rec_dev');
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
