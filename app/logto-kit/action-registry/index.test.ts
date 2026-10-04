import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the calc actions so we can trigger a load failure.
// The mock is set up at the module level but individual function behaviors
// are controlled per-test via globalThis.__calcActionError.
vi.mock('./calc-actions', () => {
  const createConfig = () => ({
    requiredOrgId: 'org',
    requiredRoleId: 'role',
    requiredPermId: 'perm',
    handler: async () => ({}),
    credentialModes: ['session', 'external'],
    permissionBinding: 'union',
    executorHandled: true,
  });

  return {
    getCalcAdd: vi.fn().mockImplementation(() => {
      const globalRecord = globalThis as unknown as Record<string, unknown>;
      if (globalRecord.__calcActionError) {
        throw globalRecord.__calcActionError;
      }
      return createConfig();
    }),
    getCalcSubtract: vi.fn().mockResolvedValue(createConfig()),
    getCalcMultiply: vi.fn().mockResolvedValue(createConfig()),
    getCalcDivide: vi.fn().mockResolvedValue(createConfig()),
    getCalcModulo: vi.fn().mockResolvedValue(createConfig()),
    getCalcPower: vi.fn().mockResolvedValue(createConfig()),
    getCalcSin: vi.fn().mockResolvedValue(createConfig()),
    getCalcCos: vi.fn().mockResolvedValue(createConfig()),
    getCalcTan: vi.fn().mockResolvedValue(createConfig()),
    getCalcAsin: vi.fn().mockResolvedValue(createConfig()),
    getCalcAcos: vi.fn().mockResolvedValue(createConfig()),
    getCalcAtan: vi.fn().mockResolvedValue(createConfig()),
    getCalcLn: vi.fn().mockResolvedValue(createConfig()),
    getCalcLog: vi.fn().mockResolvedValue(createConfig()),
    getCalcLog2: vi.fn().mockResolvedValue(createConfig()),
    getCalcSqrt: vi.fn().mockResolvedValue(createConfig()),
    getCalcFact: vi.fn().mockResolvedValue(createConfig()),
    getCalcAbs: vi.fn().mockResolvedValue(createConfig()),
    getCalcInv: vi.fn().mockResolvedValue(createConfig()),
    getCalcExp10: vi.fn().mockResolvedValue(createConfig()),
    getCalcExp: vi.fn().mockResolvedValue(createConfig()),
  };
});

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

// ── CAN-ACT-013: inherited-property hardening ───────────────────────────────
// The registry is a plain object, so naive bracket lookup (registry[name])
// resolves inherited Object.prototype members (toString, constructor,
// hasOwnProperty, __proto__, ...). An authenticated request using one of these
// names as `action` would receive a truthy non-config, fail
// validateActionConfig, and yield IMPROPER_SETUP_ERROR 500 — instead of the
// correct ACTION_NOT_FOUND 404 for an unknown action. getAction MUST perform
// an own-property lookup so inherited names resolve to undefined (→ 404).
describe('action-registry inherited-property hardening (CAN-ACT-013)', () => {
  const globalRecord = globalThis as unknown as Record<string, unknown>;

  beforeEach(() => {
    vi.resetModules();
    delete globalRecord.__calcActionError;
  });

  afterEach(() => {
    delete globalRecord.__calcActionError;
  });

  it('does NOT resolve inherited Object.prototype property names', async () => {
    const { getAction } = await import('./index');

    // Each of these exists on Object.prototype, never as a registered action.
    // Naive `registry[name]` would return the inherited member (truthy) and
    // cause a 500 setup error; the hardened lookup must return undefined.
    expect(await getAction('toString')).toBeUndefined();
    expect(await getAction('constructor')).toBeUndefined();
    expect(await getAction('hasOwnProperty')).toBeUndefined();
    expect(await getAction('isPrototypeOf')).toBeUndefined();
    expect(await getAction('valueOf')).toBeUndefined();
    expect(await getAction('toLocaleString')).toBeUndefined();
    expect(await getAction('__proto__')).toBeUndefined();
    expect(await getAction('__defineGetter__')).toBeUndefined();
    expect(await getAction('__defineSetter__')).toBeUndefined();
    expect(await getAction('__lookupGetter__')).toBeUndefined();
    expect(await getAction('__lookupSetter__')).toBeUndefined();
  });

  it('still resolves legitimate registered actions (no false negatives)', async () => {
    const { getAction } = await import('./index');

    const action = await getAction('calc/add');
    expect(action).toBeDefined();
    expect(action?.requiredOrgId).toBe('org');
    expect(action?.requiredRoleId).toBe('role');
    expect(action?.requiredPermId).toBe('perm');
  });

  it('keeps all 21 calculator actions executor-handled and external-mode eligible', async () => {
    const names = [
      'calc/add', 'calc/subtract', 'calc/multiply', 'calc/divide', 'calc/modulo', 'calc/power',
      'calc/sin', 'calc/cos', 'calc/tan', 'calc/asin', 'calc/acos', 'calc/atan', 'calc/ln',
      'calc/log', 'calc/log2', 'calc/sqrt', 'calc/fact', 'calc/abs', 'calc/inv', 'calc/exp10', 'calc/exp',
    ];
    const { getAction } = await import('./index');
    const configs = await Promise.all(names.map((name) => getAction(name)));

    expect(configs).toHaveLength(21);
    for (const config of configs) {
      expect(config?.executorHandled).toBe(true);
      expect(config?.credentialModes).toContain('external');
    }
  });
});
