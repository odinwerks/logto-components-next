import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createStorageHelpers, createJsonStorageHelpers } from './client-storage';

// ── Helpers ───────────────────────────────────────────────────────────────

/** A realistic in-memory sessionStorage mock that throws on demand. */
function makeSessionStorage(throwable?: () => boolean) {
  const store = new Map<string, string>();
  const shouldThrow = throwable ?? (() => false);
  return {
    store,
    mock: {
      getItem: vi.fn((key: string) => {
        if (shouldThrow()) throw new Error('SecurityError: Sandbox restriction');
        return store.has(key) ? store.get(key)! : null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        if (shouldThrow()) throw new Error('SecurityError: Sandbox restriction');
        store.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        if (shouldThrow()) throw new Error('SecurityError: Sandbox restriction');
        store.delete(key);
      }),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('createStorageHelpers', () => {
  let sessionStorageMock: ReturnType<typeof makeSessionStorage>;

  beforeEach(() => {
    sessionStorageMock = makeSessionStorage();
    vi.stubGlobal('sessionStorage', sessionStorageMock.mock);
    vi.stubGlobal('window', { /* truthy for typeof check */ });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('round-trips a scalar value via get/set', () => {
    const storage = createStorageHelpers<string>('theme-mode');
    expect(storage.get()).toBeNull();
    storage.set('dark');
    expect(storage.get()).toBe('dark');
    expect(sessionStorageMock.mock.setItem).toHaveBeenCalledWith('theme-mode', 'dark');
  });

  it('stringifies non-string values via String(value)', () => {
    const storage = createStorageHelpers<number>('count');
    storage.set(42);
    expect(storage.get()).toBe('42' as unknown as number);
    expect(sessionStorageMock.mock.setItem).toHaveBeenCalledWith('count', '42');
  });

  it('set(null) removes the key (mirrors preferences.tsx org-mode semantics)', () => {
    const storage = createStorageHelpers<string | null>('org-mode');
    storage.set('org-abc');
    expect(storage.get()).toBe('org-abc');
    storage.set(null);
    expect(sessionStorageMock.mock.removeItem).toHaveBeenCalledWith('org-mode');
    expect(storage.get()).toBeNull();
  });

  it('remove() removes the key', () => {
    const storage = createStorageHelpers<string>('lang-mode');
    storage.set('uk');
    storage.remove();
    expect(sessionStorageMock.mock.removeItem).toHaveBeenCalledWith('lang-mode');
    expect(storage.get()).toBeNull();
  });

  it('get returns null during SSR (typeof window undefined)', () => {
    vi.unstubAllGlobals();
    // Force `typeof window === 'undefined'` so the helper takes its SSR
    // early-return path. `vi.stubGlobal('window', undefined)` sets the
    // global to undefined; combined with unstubbing, the `typeof` check
    // resolves to 'undefined'.
    vi.stubGlobal('window', undefined);
    delete (globalThis as Record<string, unknown>).window;
    const storage = createStorageHelpers<string>('theme-mode');
    expect(storage.get()).toBeNull();
  });

  it('set is a no-op during SSR', () => {
    vi.unstubAllGlobals();
    const storage = createStorageHelpers<string>('theme-mode');
    expect(() => storage.set('dark')).not.toThrow();
  });

  it('remove is a no-op during SSR', () => {
    vi.unstubAllGlobals();
    const storage = createStorageHelpers<string>('theme-mode');
    expect(() => storage.remove()).not.toThrow();
  });

  it('swallows SecurityError on get (returns null)', () => {
    const throwing = makeSessionStorage(() => true);
    vi.stubGlobal('sessionStorage', throwing.mock);
    const storage = createStorageHelpers<string>('theme-mode');
    expect(() => storage.get()).not.toThrow();
    expect(storage.get()).toBeNull();
  });

  it('swallows SecurityError on set (no-op)', () => {
    const throwing = makeSessionStorage(() => true);
    vi.stubGlobal('sessionStorage', throwing.mock);
    const storage = createStorageHelpers<string>('theme-mode');
    expect(() => storage.set('dark')).not.toThrow();
  });

  it('swallows SecurityError on remove (no-op)', () => {
    const throwing = makeSessionStorage(() => true);
    vi.stubGlobal('sessionStorage', throwing.mock);
    const storage = createStorageHelpers<string>('theme-mode');
    expect(() => storage.remove()).not.toThrow();
  });
});

describe('createJsonStorageHelpers', () => {
  let sessionStorageMock: ReturnType<typeof makeSessionStorage>;

  beforeEach(() => {
    sessionStorageMock = makeSessionStorage();
    vi.stubGlobal('sessionStorage', sessionStorageMock.mock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  interface CalcState {
    expr: string;
    isRad: boolean;
  }

  const DEFAULT: CalcState = { expr: '', isRad: false };

  it('returns the fallback when storage is empty', () => {
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(storage.get()).toEqual(DEFAULT);
  });

  it('round-trips an object via get/set (JSON serialization)', () => {
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    const state: CalcState = { expr: '1+2', isRad: true };
    storage.set(state);
    expect(storage.get()).toEqual(state);
    expect(sessionStorageMock.mock.setItem).toHaveBeenCalledWith(
      'demo:calc-state',
      JSON.stringify(state),
    );
  });

  it('returns the fallback when the stored value fails to JSON.parse', () => {
    sessionStorageMock.store.set('demo:calc-state', '{not valid json');
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(storage.get()).toEqual(DEFAULT);
  });

  it('returns the fallback during SSR (typeof window undefined)', () => {
    vi.unstubAllGlobals();
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(storage.get()).toEqual(DEFAULT);
  });

  it('set is a no-op during SSR', () => {
    vi.unstubAllGlobals();
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(() => storage.set(DEFAULT)).not.toThrow();
  });

  it('swallows SecurityError on get (returns fallback)', () => {
    const throwing = makeSessionStorage(() => true);
    vi.stubGlobal('sessionStorage', throwing.mock);
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(() => storage.get()).not.toThrow();
    expect(storage.get()).toEqual(DEFAULT);
  });

  it('swallows SecurityError on set (no-op)', () => {
    const throwing = makeSessionStorage(() => true);
    vi.stubGlobal('sessionStorage', throwing.mock);
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(() => storage.set(DEFAULT)).not.toThrow();
  });

  it('returns the fallback when getItem returns null (key absent)', () => {
    const storage = createJsonStorageHelpers<CalcState>('demo:calc-state', DEFAULT);
    expect(sessionStorageMock.mock.getItem).not.toHaveBeenCalled();
    expect(storage.get()).toEqual(DEFAULT);
  });
});
