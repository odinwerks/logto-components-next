/**
 * ============================================================================
 * Shared client-side sessionStorage helpers (Phase 6 storage consolidation)
 * ============================================================================
 *
 * Single typed, `SecurityError`-safe sessionStorage abstraction for all
 * client storage consumers (preferences, lang sync, calculator). Extracted
 * from `preferences.tsx`'s local `createStorageHelpers` so every caller
 * converges on one implementation.
 *
 * This module is CLIENT-SAFE (no `'use client'` directive — it's plain
 * functions imported by client components). It never touches `sessionStorage`
 * during SSR: every helper guards `typeof window === 'undefined'` and
 * swallows `SecurityError` (sandboxed iframes, privacy mode, quota).
 *
 * Exported surface:
 *   - `createStorageHelpers<T>(key)` — get/set/remove with `String(value)`.
 *     Mirrors the previous `preferences.tsx` helper exactly so the existing
 *     theme/lang/org preferences work unchanged.
 *   - `createJsonStorageHelpers<T>(key, fallback)` — get/set for JSON-typed
 *     object state (used by the calculator). `get` returns the `fallback`
 *     when storage is empty or the stored value fails to parse, so callers
 *     never have to re-implement the try/catch.
 */

/**
 * Typed sessionStorage helper with `SecurityError`-safe get/set/remove.
 * `set(null)` removes the key (mirrors the previous `preferences.tsx`
 * semantics used by the org-mode helper).
 *
 * Values are stringified via `String(value)` — appropriate for scalar
 * preferences (theme, lang, org id). For object state, use
 * `createJsonStorageHelpers` instead.
 */
export function createStorageHelpers<T>(key: string) {
  return {
    get: (): T | null => {
      if (typeof window === 'undefined') return null;
      try {
        return sessionStorage.getItem(key) as T | null;
      } catch {
        // SecurityError (sandbox, privacy mode) — safe no-op.
        return null;
      }
    },
    set: (value: T) => {
      if (typeof window === 'undefined') return;
      try {
        if (value === null) {
          sessionStorage.removeItem(key);
        } else {
          sessionStorage.setItem(key, String(value));
        }
      } catch {
        // SecurityError / quota — safe no-op.
      }
    },
    remove: () => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.removeItem(key);
      } catch {
        // SecurityError — safe no-op.
      }
    },
  };
}

/**
 * JSON-typed variant for object state (used by the calculator). `get`
 * returns the `fallback` when storage is empty, missing, or fails to parse,
 * so callers never need to re-implement the try/catch + default logic.
 *
 * `set` serializes via `JSON.stringify`. `remove` is not exposed (the
 * calculator never needs to drop its state — `set(DEFAULT_STATE)` is the
 * canonical "reset").
 */
export function createJsonStorageHelpers<T>(key: string, fallback: T) {
  return {
    get: (): T => {
      if (typeof window === 'undefined') return fallback;
      try {
        const stored = sessionStorage.getItem(key);
        if (stored === null) return fallback;
        try {
          return JSON.parse(stored) as T;
        } catch {
          // Corrupted entry — fall back rather than crash the UI.
          return fallback;
        }
      } catch {
        // SecurityError — safe no-op.
        return fallback;
      }
    },
    set: (value: T) => {
      if (typeof window === 'undefined') return;
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        // SecurityError / quota — safe no-op.
      }
    },
  };
}
