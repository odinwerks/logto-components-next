import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Module Mocks - hoisted above all imports
// ============================================================================

vi.mock('./management-request', () => ({
  makeManagementFetch: vi.fn(),
}));

vi.mock('../errors', () => ({
  throwOnApiError: vi.fn().mockResolvedValue(undefined),
  plainCode: vi.fn((code: string) => {
    const e = new Error(code);
    e.name = 'SanitizedError';
    return e;
  }),
  sanitize: vi.fn((_err: unknown, opts: { fallback: string }) => {
    const e = new Error(opts.fallback);
    e.name = 'SanitizedError';
    return e;
  }),
}));

vi.mock('./tokens', () => ({
  getTokenForServerAction: vi.fn().mockResolvedValue('mock-access-token'),
}));

vi.mock('../utils', () => ({
  getCleanEndpoint: vi.fn().mockReturnValue('https://logto.example.com'),
  introspectToken: vi.fn().mockResolvedValue({ sub: 'user-test-123', active: true }),
}));

vi.mock('../guards', () => ({
  assertSafeLogtoId: vi.fn(),
  assertSafeUserId: vi.fn(),
}));

vi.mock('../../config', () => ({
  getManagementApiToken: vi.fn().mockResolvedValue('mock-m2m-token'),
}));

vi.mock('./verification-cookie', () => ({
  requireVerifiedIdentity: vi.fn().mockResolvedValue(undefined),
}));

// Mock the distributed-state primitives: PAT tests exercise request shapes,
// not lock/limiter backends (those have their own dedicated tests). The
// limiter mock is hoisted so individual tests can override `check`.
const { mockLimiterCheck, mockLimiterReset, mockLockAcquire, mockLockRelease } = vi.hoisted(() => ({
  mockLimiterCheck: vi.fn<(key: string) => Promise<boolean>>().mockResolvedValue(true),
  mockLimiterReset: vi.fn<(key: string) => Promise<void>>().mockResolvedValue(undefined),
  mockLockAcquire: vi.fn<(key: string) => Promise<() => Promise<void>>>(),
  mockLockRelease: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
}));

vi.mock('../../../lib/distributed-state', () => ({
  createLockManager: () => ({
    acquire: (key: string) => mockLockAcquire(key),
  }),
  createRateLimiter: () => ({
    check: (key: string) => mockLimiterCheck(key),
    reset: (key: string) => mockLimiterReset(key),
  }),
}));

vi.mock('./helpers', () => ({
  auditSafe: vi.fn(),
}));

vi.mock('../debug', () => ({
  debugLog: vi.fn(),
}));

vi.mock('../log', () => ({
  warn: vi.fn(),
  logEvent: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
    raw: {},
  },
}));

// ============================================================================
// Imports of mocked modules
// ============================================================================

import { makeManagementFetch } from './management-request';
import { requireVerifiedIdentity } from './verification-cookie';
import { getManagementApiToken } from '../../config';
import { getCleanEndpoint, introspectToken } from '../utils';
import { getTokenForServerAction } from './tokens';
import { auditSafe } from './helpers';
import { debugLog } from '../debug';
import { assertSafeLogtoId } from '../guards';
import { logEvent, warn } from '../log';

// ============================================================================
// Helpers
// ============================================================================

const VERIFICATION_HEADER = { 'logto-verification-id': 'verification-record-1' };

function mockOkResponse(body: unknown, status = 200): Response {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    statusText: 'OK',
  } as unknown as Response;
}

/** 2xx response whose body cannot be parsed as JSON. */
function mockOkBadJsonResponse(status = 200): Response {
  return {
    ok: true,
    status,
    json: () => Promise.reject(new Error('invalid json')),
    text: () => Promise.resolve('not-json'),
    statusText: 'OK',
  } as unknown as Response;
}

function mockErrorResponse(status = 400): Response {
  return {
    ok: false,
    status,
    statusText: 'Bad Request',
    text: () => Promise.resolve('Bad Request'),
  } as unknown as Response;
}

const UPSTREAM_LIST = [
  { tenantId: 't1', userId: 'user-test-123', name: 'ci-token', value: 'pat_secret_a', createdAt: 1_700_000_000_000, expiresAt: null },
  { tenantId: 't1', userId: 'user-test-123', name: 'legacy', value: 'pat_secret_b', createdAt: 1_600_000_000_000, expiresAt: 1_700_000_000_000 },
];

describe('PAT server actions (Management API)', () => {
  beforeEach(() => {
    vi.stubEnv('PAT_ENABLED', 'true');
    vi.clearAllMocks();
    vi.mocked(makeManagementFetch).mockReset();
    vi.mocked(getManagementApiToken).mockResolvedValue('mock-m2m-token');
    vi.mocked(getCleanEndpoint).mockReturnValue('https://logto.example.com');
    vi.mocked(getTokenForServerAction).mockResolvedValue('mock-access-token');
    vi.mocked(introspectToken).mockResolvedValue({ sub: 'user-test-123', active: true });
    vi.mocked(requireVerifiedIdentity).mockResolvedValue(undefined);
    mockLimiterCheck.mockResolvedValue(true);
    mockLockAcquire.mockResolvedValue(mockLockRelease);
    mockLockRelease.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('PAT_ENABLED hard lock', () => {
    it.each([
      {
        action: 'getPatTokens',
        invoke: async () => (await import('./pat')).getPatTokens('verification-record-1'),
      },
      {
        action: 'createPatToken',
        invoke: async () => (await import('./pat')).createPatToken(
          'ci-token',
          Date.now() + 60_000,
          'verification-record-1',
        ),
      },
      {
        action: 'renamePatToken',
        invoke: async () => (await import('./pat')).renamePatToken(
          'ci-token',
          'renamed-token',
          'verification-record-1',
        ),
      },
      {
        action: 'deletePatToken',
        invoke: async () => (await import('./pat')).deletePatToken(
          'ci-token',
          'verification-record-1',
        ),
      },
    ])('denies $action before any protected work or seal consumption', async ({ invoke }) => {
      vi.stubEnv('PAT_ENABLED', 'false');

      await expect(invoke()).resolves.toEqual({ ok: false, error: 'PAT_DISABLED' });

      expect(getTokenForServerAction).not.toHaveBeenCalled();
      expect(introspectToken).not.toHaveBeenCalled();
      expect(getManagementApiToken).not.toHaveBeenCalled();
      expect(getCleanEndpoint).not.toHaveBeenCalled();
      expect(assertSafeLogtoId).not.toHaveBeenCalled();
      expect(mockLockAcquire).not.toHaveBeenCalled();
      expect(mockLockRelease).not.toHaveBeenCalled();
      expect(mockLimiterCheck).not.toHaveBeenCalled();
      expect(mockLimiterReset).not.toHaveBeenCalled();
      expect(requireVerifiedIdentity).not.toHaveBeenCalled();
      expect(makeManagementFetch).not.toHaveBeenCalled();
    });

    it.each([
      {
        action: 'createPatToken',
        invoke: async () => (await import('./pat')).createPatToken(
          '   ',
          Number.NaN,
          '../invalid-verification-id',
        ),
      },
      {
        action: 'renamePatToken',
        invoke: async () => (await import('./pat')).renamePatToken(
          '',
          '   ',
          '../invalid-verification-id',
        ),
      },
      {
        action: 'deletePatToken',
        invoke: async () => (await import('./pat')).deletePatToken(
          '',
          '../invalid-verification-id',
        ),
      },
    ])('lets the disabled gate win before malformed $action input', async ({ invoke }) => {
      vi.stubEnv('PAT_ENABLED', 'false');

      await expect(invoke()).resolves.toEqual({ ok: false, error: 'PAT_DISABLED' });
      expect(assertSafeLogtoId).not.toHaveBeenCalled();
      expect(requireVerifiedIdentity).not.toHaveBeenCalled();
      expect(makeManagementFetch).not.toHaveBeenCalled();
    });
  });

  describe('getPatTokens', () => {
    it('lists tokens via the M2M Management API and masks token values', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(UPSTREAM_LIST));

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual([
        { name: 'ci-token', createdAt: 1_700_000_000_000, expiresAt: null },
        { name: 'legacy', createdAt: 1_600_000_000_000, expiresAt: 1_700_000_000_000 },
      ]);
      // The upstream `value` must never reach the client.
      expect(JSON.stringify(result.data)).not.toContain('pat_secret');

      // Read-only purpose scope; the seal is NOT consumed by listing.
      expect(requireVerifiedIdentity).toHaveBeenCalledTimes(1);
      expect(requireVerifiedIdentity).toHaveBeenCalledWith('verification-record-1', { purpose: 'view' });
      expect(makeManagementFetch).toHaveBeenCalledWith(
        'https://logto.example.com/api/users/user-test-123/personal-access-tokens',
        expect.objectContaining({
          method: 'GET',
          token: 'mock-m2m-token',
          extraHeaders: VERIFICATION_HEADER,
        }),
      );
    });

    it('fails closed with UNAUTHORIZED when the Management API returns 403', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(403));

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('UNAUTHORIZED');
    });

    it('fails with PAT_FETCH_FAILED on non-array responses', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({ not: 'an array' }));

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_FETCH_FAILED');
    });

    it('fails with PAT_FETCH_FAILED when the list body is not parseable JSON', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkBadJsonResponse());

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_FETCH_FAILED');
    });

    it('fails the whole list with PAT_FETCH_FAILED when any entry is malformed (fail closed)', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(
        mockOkResponse([...UPSTREAM_LIST, { tenantId: 't1', userId: 'user-test-123', name: 42 }]),
      );

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_FETCH_FAILED');
    });

    it('fails closed on non-finite or fractional timestamp metadata', async () => {
      const { getPatTokens } = await import('./pat');

      for (const malformed of [
        { name: 'nan-created', createdAt: Number.NaN, expiresAt: null },
        { name: 'infinite-expiry', createdAt: 1_700_000_000_000, expiresAt: Infinity },
        { name: 'fractional-created', createdAt: 1_700_000_000_000.5, expiresAt: null },
      ]) {
        vi.mocked(makeManagementFetch).mockResolvedValueOnce(mockOkResponse([malformed]));
        const result = await getPatTokens('verification-record-1');
        expect(result).toEqual({ ok: false, error: 'PAT_FETCH_FAILED' });
      }
    });

    it('derives, validates, and URL-encodes userId without accepting client identity input', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(introspectToken).mockResolvedValue({ sub: 'user/derived', active: true });
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse([]));

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(true);
      expect(assertSafeLogtoId).toHaveBeenCalledWith('verification-record-1', 'verificationRecordId');
      expect(assertSafeLogtoId).toHaveBeenCalledWith('user/derived', 'userId');
      expect(makeManagementFetch).toHaveBeenCalledWith(
        'https://logto.example.com/api/users/user%2Fderived/personal-access-tokens',
        expect.any(Object),
      );
    });

    it('never returns or logs values received from the list endpoint', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(UPSTREAM_LIST));

      const result = await getPatTokens('verification-record-1');
      const observable = JSON.stringify({
        result,
        debug: vi.mocked(debugLog).mock.calls,
        warnings: vi.mocked(warn).mock.calls,
        structured: vi.mocked(logEvent.info).mock.calls,
      });

      expect(observable).not.toContain('pat_secret_a');
      expect(observable).not.toContain('pat_secret_b');
    });

    it('rejects when introspection is inactive (no userId derived from client input)', async () => {
      const { getPatTokens } = await import('./pat');
      vi.mocked(introspectToken).mockResolvedValue({ sub: undefined, active: false });

      const result = await getPatTokens('verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('UNAUTHENTICATED');
      expect(makeManagementFetch).not.toHaveBeenCalled();
    });
  });

  describe('createPatToken', () => {
    const created = {
      tenantId: 't1',
      userId: 'user-test-123',
      name: 'ci-token',
      value: 'pat_generated_value',
      createdAt: 1_700_000_000_000,
      expiresAt: null,
    };

    it('POSTs { name, expiresAt } and returns the one-time value', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(created, 201));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({
        token: { name: 'ci-token', createdAt: 1_700_000_000_000, expiresAt: null },
        value: 'pat_generated_value',
      });

      // Single-use, purpose-scoped seal: consumed on read.
      expect(requireVerifiedIdentity).toHaveBeenCalledTimes(1);
      expect(requireVerifiedIdentity).toHaveBeenCalledWith('verification-record-1', {
        purpose: 'pat.create',
        consume: true,
      });
      expect(makeManagementFetch).toHaveBeenCalledWith(
        'https://logto.example.com/api/users/user-test-123/personal-access-tokens',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-m2m-token',
          body: { name: 'ci-token', expiresAt: null },
          extraHeaders: VERIFICATION_HEADER,
        }),
      );
      expect(auditSafe).toHaveBeenCalledWith('user-test-123', 'pat.create', 'ci-token');
      expect(logEvent.info).toHaveBeenCalled();
      expect(mockLockAcquire.mock.invocationCallOrder[0])
        .toBeLessThan(mockLimiterCheck.mock.invocationCallOrder[0]);
      expect(mockLimiterCheck.mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(requireVerifiedIdentity).mock.invocationCallOrder[0]);
    });

    it('trims the newly-entered name before sending it upstream', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(
        mockOkResponse({ ...created, name: 'x' }, 201),
      );

      const result = await createPatToken('   x   ', null, 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(makeManagementFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: { name: 'x', expiresAt: null } }),
      );
    });

    it('maps the Logto 422 duplicate-name conflict to PAT_NAME_IN_USE', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(422));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_NAME_IN_USE');
    });

    it('rejects empty names and over-long names with validation errors', async () => {
      const { createPatToken } = await import('./pat');

      const empty = await createPatToken('   ', null, 'verification-record-1');
      expect(empty.ok).toBe(false);
      if (empty.ok) return;
      expect(empty.error).toBe('INVALID_PAT_NAME');

      const tooLong = await createPatToken('x'.repeat(257), null, 'verification-record-1');
      expect(tooLong.ok).toBe(false);
      if (tooLong.ok) return;
      expect(tooLong.error).toBe('PAT_NAME_TOO_LONG');

      expect(makeManagementFetch).not.toHaveBeenCalled();
    });

    it('rejects expiries that are not in the future', async () => {
      const { createPatToken } = await import('./pat');

      const past = await createPatToken('ci-token', Date.now() - 1000, 'verification-record-1');
      expect(past.ok).toBe(false);
      if (past.ok) return;
      expect(past.error).toBe('INVALID_PAT_EXPIRY');

      const nonInteger = await createPatToken('ci-token', 1234.5, 'verification-record-1');
      expect(nonInteger.ok).toBe(false);
      if (nonInteger.ok) return;
      expect(nonInteger.error).toBe('INVALID_PAT_EXPIRY');

      expect(makeManagementFetch).not.toHaveBeenCalled();
    });

    it('rejects an undefined expiry (never-expiring must be explicit null)', async () => {
      const { createPatToken } = await import('./pat');

      const result = await createPatToken(
        'ci-token',
        undefined as unknown as null,
        'verification-record-1',
      );

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('INVALID_PAT_EXPIRY');
      expect(makeManagementFetch).not.toHaveBeenCalled();
    });

    it('accepts a future expiry timestamp', async () => {
      const { createPatToken } = await import('./pat');
      const future = Date.now() + 30 * 86_400_000;
      vi.mocked(makeManagementFetch).mockResolvedValue(
        mockOkResponse({ ...created, expiresAt: future }, 201),
      );

      const result = await createPatToken('ci-token', future, 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(makeManagementFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: { name: 'ci-token', expiresAt: future } }),
      );
    });

    it('rejects with RATE_LIMITED when the per-user creation quota is exhausted', async () => {
      const { createPatToken } = await import('./pat');
      mockLimiterCheck.mockResolvedValue(false);

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('RATE_LIMITED');
      // The limiter gates BEFORE any upstream request; the single-use seal is
      // not consumed by a throttled attempt.
      expect(makeManagementFetch).not.toHaveBeenCalled();
      expect(requireVerifiedIdentity).not.toHaveBeenCalled();
    });

    it('waits for lock ownership before checking quota or consuming verification', async () => {
      const { createPatToken } = await import('./pat');
      let grantLock!: (release: () => Promise<void>) => void;
      mockLockAcquire.mockImplementationOnce(
        () => new Promise((resolve) => { grantLock = resolve; }),
      );
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(created, 201));

      const pending = createPatToken('ci-token', null, 'verification-record-1');
      await vi.waitFor(() => expect(mockLockAcquire).toHaveBeenCalledWith('user-test-123'));
      expect(mockLimiterCheck).not.toHaveBeenCalled();
      expect(requireVerifiedIdentity).not.toHaveBeenCalled();

      grantLock(mockLockRelease);
      await expect(pending).resolves.toMatchObject({ ok: true });
      expect(mockLimiterCheck).toHaveBeenCalledWith('user-test-123');
      expect(requireVerifiedIdentity).toHaveBeenCalledWith('verification-record-1', {
        purpose: 'pat.create',
        consume: true,
      });
    });

    it('never resets the rate-limit quota on upstream failures (failed attempts stay charged)', async () => {
      const { createPatToken } = await import('./pat');
      const { warn } = await import('../log');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(500));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_CREATE_FAILED');
      expect(warn).toHaveBeenCalled();
      expect(mockLimiterReset).not.toHaveBeenCalled();
    });

    it('fails with PAT_CREATE_FAILED when the create body is not parseable JSON', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkBadJsonResponse(201));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_CREATE_FAILED');
    });

    it('synthesizes the token shape when metadata is malformed but the value is present (value never lost)', async () => {
      const { createPatToken } = await import('./pat');
      const { warn } = await import('../log');
      // Value present, name/createdAt/expiresAt missing/malformed.
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({ value: 'pat_ok' }, 201));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.value).toBe('pat_ok');
      expect(result.data.token.name).toBe('ci-token');
      expect(result.data.token.expiresAt).toBeNull();
      expect(typeof result.data.token.createdAt).toBe('number');
      expect(warn).toHaveBeenCalled();
    });

    it('fails with PAT_CREATE_FAILED when the create response has no value', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(
        mockOkResponse({ ...created, value: '' }, 201),
      );

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_CREATE_FAILED');
    });

    it('still returns the committed token when post-commit logging throws', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(created, 201));
      vi.mocked(logEvent.info).mockImplementationOnce(() => {
        throw new Error('logger down');
      });

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data).toEqual({
        token: { name: 'ci-token', createdAt: 1_700_000_000_000, expiresAt: null },
        value: 'pat_generated_value',
      });
    });

    it('still returns success when the post-commit audit throws', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(created, 201));
      vi.mocked(auditSafe).mockImplementationOnce(() => {
        throw new Error('audit sink down');
      });

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(true);
    });

    it('does not lose the committed one-time value when lock release fails', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(created, 201));
      mockLockRelease.mockRejectedValueOnce(new Error('release failed'));

      const result = await createPatToken('ci-token', null, 'verification-record-1');

      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.value).toBe('pat_generated_value');
    });
  });

  describe('renamePatToken', () => {
    it('PATCHes { currentName, name } to the body variant endpoint', async () => {
      const { renamePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({}, 200));

      const result = await renamePatToken('old-name', 'new name', 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(requireVerifiedIdentity).toHaveBeenCalledTimes(1);
      expect(requireVerifiedIdentity).toHaveBeenCalledWith('verification-record-1', {
        purpose: 'pat.rename',
        consume: true,
      });
      expect(makeManagementFetch).toHaveBeenCalledWith(
        'https://logto.example.com/api/users/user-test-123/personal-access-tokens',
        expect.objectContaining({
          method: 'PATCH',
          token: 'mock-m2m-token',
          body: { currentName: 'old-name', name: 'new name' },
          extraHeaders: VERIFICATION_HEADER,
        }),
      );
      expect(auditSafe).toHaveBeenCalledWith('user-test-123', 'pat.rename', 'old-name');
      expect(mockLockAcquire.mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(requireVerifiedIdentity).mock.invocationCallOrder[0]);
    });

    it('forwards the stored currentName verbatim while trimming the new name', async () => {
      const { renamePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({}, 200));

      const result = await renamePatToken(' deploy ', '  prod deploy  ', 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(makeManagementFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: { currentName: ' deploy ', name: 'prod deploy' },
        }),
      );
    });

    it('maps the 422 duplicate-name conflict to PAT_NAME_IN_USE', async () => {
      const { renamePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(422));

      const result = await renamePatToken('old-name', 'new-name', 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_NAME_IN_USE');
    });

    it('still returns success when post-commit logging throws', async () => {
      const { renamePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({}, 200));
      vi.mocked(logEvent.info).mockImplementationOnce(() => {
        throw new Error('logger down');
      });

      const result = await renamePatToken('old-name', 'new-name', 'verification-record-1');

      expect(result.ok).toBe(true);
    });

    it('still returns success when the post-commit audit throws', async () => {
      const { renamePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse({}, 200));
      vi.mocked(auditSafe).mockImplementationOnce(() => {
        throw new Error('audit sink down');
      });

      const result = await renamePatToken('old-name', 'new-name', 'verification-record-1');

      expect(result.ok).toBe(true);
    });
  });

  describe('deletePatToken', () => {
    it('POSTs { name } to the body-variant delete endpoint (name never in URL)', async () => {
      const { deletePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(null, 204));

      const result = await deletePatToken('ci-token', 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(requireVerifiedIdentity).toHaveBeenCalledTimes(1);
      expect(requireVerifiedIdentity).toHaveBeenCalledWith('verification-record-1', {
        purpose: 'pat.delete',
        consume: true,
      });
      expect(makeManagementFetch).toHaveBeenCalledWith(
        'https://logto.example.com/api/users/user-test-123/personal-access-tokens/delete',
        expect.objectContaining({
          method: 'POST',
          token: 'mock-m2m-token',
          body: { name: 'ci-token' },
          extraHeaders: VERIFICATION_HEADER,
        }),
      );
      expect(auditSafe).toHaveBeenCalledWith('user-test-123', 'pat.delete', 'ci-token');
      expect(mockLockAcquire.mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(requireVerifiedIdentity).mock.invocationCallOrder[0]);
    });

    it('forwards the stored name verbatim (whitespace preserved, no trim)', async () => {
      const { deletePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(null, 204));

      const result = await deletePatToken(' deploy ', 'verification-record-1');

      expect(result.ok).toBe(true);
      expect(makeManagementFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: { name: ' deploy ' } }),
      );
    });

    it('fails with PAT_DELETE_FAILED on upstream errors', async () => {
      const { deletePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(500));

      const result = await deletePatToken('ci-token', 'verification-record-1');

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('PAT_DELETE_FAILED');
    });

    it('still returns success when post-commit logging throws', async () => {
      const { deletePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(null, 204));
      vi.mocked(logEvent.info).mockImplementationOnce(() => {
        throw new Error('logger down');
      });

      const result = await deletePatToken('ci-token', 'verification-record-1');

      expect(result.ok).toBe(true);
    });

    it('still returns success when the post-commit audit throws', async () => {
      const { deletePatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockOkResponse(null, 204));
      vi.mocked(auditSafe).mockImplementationOnce(() => {
        throw new Error('audit sink down');
      });

      const result = await deletePatToken('ci-token', 'verification-record-1');

      expect(result.ok).toBe(true);
    });
  });

  describe('rate limiter invariant', () => {
    it('never calls limiter reset for any PAT action (failed attempts stay charged)', async () => {
      const { createPatToken } = await import('./pat');
      vi.mocked(makeManagementFetch).mockResolvedValue(mockErrorResponse(500));

      await createPatToken('ci-token', null, 'verification-record-1');

      expect(mockLimiterReset).not.toHaveBeenCalled();
    });
  });
});
