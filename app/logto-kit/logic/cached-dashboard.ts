import 'server-only';

import { cache } from 'react';
import { fetchDashboardDataCore } from './dashboard-data';

/**
 * Per-request cached version of `fetchDashboardDataCore`.
 * Wraps a plain async function (NOT a Server Action) with React.cache,
 * ensuring true deduplication across multiple RSC callers in the same request.
 *
 * Both root layout and docs layout call this with identical arguments,
 * so only one `/oidc/me` request will be made per render.
 *
 * NOTE: Accepts a primitive boolean instead of an object literal.
 * React.cache memoizes primitives by value (Map), but objects by reference
 * (WeakMap). Every caller passing `{ tolerateAuthErrors: true }` creates
 * a fresh object literal → cache always misses. A primitive boolean
 * ensures proper deduplication.
 */
export const fetchDashboardDataCached = cache(
  (tolerateAuthErrors = false) => fetchDashboardDataCore({ tolerateAuthErrors }),
);
