import '@testing-library/jest-dom';

process.env.APP_SECRET = 'dummy-secret';

// Framer Motion relies on requestAnimationFrame and performance.now() to
// drive its animation engine. jsdom provides neither natively, so polyfill
// both. performance.now() is wired to Date.now() so vitest's fake timers
// (vi.advanceTimersByTime) advance it, allowing animations to complete in
// tests.
if (typeof globalThis.performance === 'undefined') {
  (globalThis as { performance?: unknown }).performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
  } as unknown as Performance;
} else if (typeof globalThis.performance.now === 'function') {
  // jsdom provides a performance object but its now() uses a monotonic
  // clock that doesn't advance with fake timers. Replace it with Date.now().
  globalThis.performance.now = () => Date.now();
}

// Framer Motion relies on requestAnimationFrame to drive its animation engine
// (initial → animate transitions, exit animations). jsdom does not provide it,
// so polyfill with a realistic implementation that advances the clock so
// animations can actually complete their full duration.
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  // Each rAF callback gets a timestamp ~16ms later than the previous one,
  // simulating 60fps. This lets Framer Motion animations progress from
  // initial through animate and exit values like a real browser would.
  const pending = new Map<number, FrameRequestCallback>();
  let nextId = 1;
  let lastTime = Date.now();

  const flushFrame = (id: number) => {
    const cb = pending.get(id);
    if (!cb) return;
    pending.delete(id);
    lastTime += 16;
    cb(lastTime);
  };

  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    const id = nextId++;
    pending.set(id, cb);
    setTimeout(() => flushFrame(id), 16);
    return id;
  };

  globalThis.cancelAnimationFrame = (id: number): void => {
    pending.delete(id);
  };
}

// Framer Motion (used by app/logto-kit/components/shared/motion.tsx) measures
// layout for shared `layoutId` animations and relies on ResizeObserver /
// IntersectionObserver. jsdom does not implement them, so provide no-op
// stubs so tests that render motion components (e.g. the dashboard seeker)
// don't throw or emit noisy warnings.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = NoopObserver;
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoopObserver;
}

// Node 26+ predefines its own experimental localStorage/sessionStorage globals
// (backed by --localstorage-file). In vitest's jsdom environment those
// unavailable accessors shadow jsdom's Storage, leaving `window.localStorage`
// undefined and breaking suites that touch Web Storage. Only when the global
// is missing do we install a minimal in-memory Storage, restoring the jsdom
// contract. On older Node versions this block is a no-op.
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  const makeStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
      key: (index: number) => [...store.keys()][index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, String(value));
      },
    } as Storage;
  };
  Object.defineProperty(globalThis, 'localStorage', {
    value: makeStorage(),
    writable: true,
    configurable: true,
  });
  if (typeof globalThis.sessionStorage === 'undefined') {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: makeStorage(),
      writable: true,
      configurable: true,
    });
  }
}
