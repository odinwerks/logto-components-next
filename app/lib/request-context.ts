/**
 * ============================================================================
 * Request-scoped context via AsyncLocalStorage
 * ============================================================================
 *
 * Provides a single `requestContext` AsyncLocalStorage that carries the
 * `requestId` for the current request across all async hops. `logEvent`
 * (log.ts) and `audit()` (audit.ts) auto-merge `requestId` from this store,
 * so no caller needs to thread `requestId` manually.
 *
 * The store is populated by:
 *   - `withLogger` (route handlers): `requestContext.run({ requestId }, ...)`
 *   - `safeAction` (server actions): only when no existing context is active
 *     (so a server action invoked from a route reuses the route's requestId).
 *
 * Next.js Node runtime supports AsyncLocalStorage (it uses it internally).
 * Edge runtime does not — but all affected routes and server actions run on
 * Node. `getRequestBindings()` gracefully returns `{}` when the store is
 * unavailable (e.g. outside a request scope, or in client bundles).
 *
 * Client-safe: `node:async_hooks` is only loaded when actually running in a
 * Node.js environment. When bundled for the browser, a stub is used that
 * returns `undefined` for `getStore()` and passes through the callback for
 * `run()`.
 */

export interface RequestContext {
  requestId: string;
}

/** Minimal interface matching what AsyncLocalStorage provides for our use case. */
interface AlsLike {
  getStore(): RequestContext | undefined;
  run<T>(store: RequestContext, callback: () => T): T;
}

let _store: AlsLike | null = null;

function getOrCreateStore(): AlsLike {
  if (_store) return _store;

  // Only load AsyncLocalStorage in Node.js. In browser bundles this path is
  // dead code at runtime, and `require('node:async_hooks')` is only compiled
  // when Turbopack can determine the guard is reachable (server).
  if (typeof process !== 'undefined' && process.versions?.node) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { AsyncLocalStorage } = require('node:async_hooks') as {
      AsyncLocalStorage: new () => AlsLike;
    };
    _store = new AsyncLocalStorage();
  } else {
    // Client-side stub — no async context, just passthrough.
    _store = {
      getStore: () => undefined,
      run: <T>(_ctx: RequestContext, callback: () => T): T => callback(),
    };
  }
  return _store;
}

/** AsyncLocalStorage-compatible wrapper. Lazy-initialised to avoid pulling
 *  `node:async_hooks` into client bundles. */
export const requestContext: AlsLike = {
  getStore(): RequestContext | undefined {
    return getOrCreateStore().getStore();
  },
  run<T>(context: RequestContext, callback: () => T): T {
    return getOrCreateStore().run(context, callback);
  },
};

/**
 * Returns the current requestId, or undefined outside a request scope.
 */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

/**
 * Returns bindings to merge into every structured log/audit record.
 * Returns `{}` when no request scope is active (graceful degradation).
 */
export function getRequestBindings(): Record<string, unknown> {
  const requestId = getRequestId();
  return requestId ? { requestId } : {};
}
