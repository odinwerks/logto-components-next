import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the calc actions so we can trigger a load failure.
// The mock is set up at the module level but individual function behaviors
// are controlled per-test via globalThis.__calcActionError.
vi.mock('./calc-actions', () => ({
  getCalcAdd: vi.fn().mockImplementation(() => {
    const globalRecord = globalThis as unknown as Record<string, unknown>;
    if (globalRecord.__calcActionError) {
      throw globalRecord.__calcActionError;
    }
    return { requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) };
  }),
  getCalcSubtract: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcMultiply: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcDivide: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcModulo: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcPower: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcSin: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcCos: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcTan: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcAsin: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcAcos: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcAtan: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcLn: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcLog: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcLog2: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcSqrt: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcFact: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcAbs: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcInv: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcExp10: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
  getCalcExp: vi.fn().mockResolvedValue({ requiredOrgId: 'org', requiredRoleId: 'role', requiredPermId: 'perm', handler: async () => ({}) }),
}));

describe('action-registry failure caching', () => {
  const globalRecord = globalThis as unknown as Record<string, unknown>;

  beforeEach(() => {
    // Reset module state between tests so _actionsCache, _actionsError, and
    // _loadingPromise are cleared. We re-import dynamically in each test.
    vi.resetModules();
    delete globalRecord.__calcActionError;
  });

  afterEach(() => {
    delete globalRecord.__calcActionError;
  });

  it('caches FATAL failures permanently and does not retry on subsequent requests', async () => {
    // IMPROPER_SETUP_ERROR is a fatal config error (matches validateActionConfig output)
    const fatalError = new Error('IMPROPER_SETUP_ERROR: Action "calc/add" is missing required fields: requiredOrgId');
    globalRecord.__calcActionError = fatalError;

    const { getAction } = await import('./index');
    const { getCalcAdd } = await import('./calc-actions');

    // First call: should call getCalcAdd and throw the error
    await expect(getAction('calc/add')).rejects.toThrow('IMPROPER_SETUP_ERROR');
    expect(vi.mocked(getCalcAdd)).toHaveBeenCalledTimes(1);

    // Reset calls of mock to verify we don't call it again
    vi.mocked(getCalcAdd).mockClear();

    // Remove the error - if it retries, it would succeed now.
    // But since this was fatal, it should STILL throw the cached error and NOT call getCalcAdd again!
    delete globalRecord.__calcActionError;

    await expect(getAction('calc/add')).rejects.toThrow('IMPROPER_SETUP_ERROR');
    expect(vi.mocked(getCalcAdd)).not.toHaveBeenCalled();
  });

  it('does NOT cache transient errors — retries on next call', async () => {
    // TypeError with 'fetch' in message is classified as transient
    const transientError = new TypeError('fetch failed: network error');
    globalRecord.__calcActionError = transientError;

    const { getAction } = await import('./index');
    const { getCalcAdd } = await import('./calc-actions');

    // First call: should throw the transient error
    await expect(getAction('calc/add')).rejects.toThrow('fetch failed');
    expect(vi.mocked(getCalcAdd)).toHaveBeenCalledTimes(1);

    vi.mocked(getCalcAdd).mockClear();

    // Remove the error — transient means the registry does NOT cache this failure.
    // Next call should retry and succeed.
    delete globalRecord.__calcActionError;

    const action = await getAction('calc/add');
    expect(action).toBeDefined();
    // getCalcAdd was called again (because no cached error blocked it)
    expect(vi.mocked(getCalcAdd)).toHaveBeenCalledTimes(1);
  });

  it('concurrent callers coalesce onto a single loadActions invocation', async () => {
    // Fresh imports to get clean module state
    const { getAction: getActionFresh } = await import('./index');
    const { getCalcAdd: getCalcAddMock } = await import('./calc-actions');

    // Reset mock call counts to start clean
    vi.mocked(getCalcAddMock).mockClear();

    // Issue 10 concurrent getAction() calls
    const results = await Promise.all(
      Array.from({ length: 10 }, () => getActionFresh('calc/add')),
    );

    // All 10 calls should resolve to the same action config
    for (const result of results) {
      expect(result).toBeDefined();
    }

    // Despite 10 concurrent calls, getCalcAdd should have been called only ONCE
    // (all 10 callers coalesced onto the single in-flight _loadingPromise)
    expect(vi.mocked(getCalcAddMock)).toHaveBeenCalledTimes(1);
  });
});
