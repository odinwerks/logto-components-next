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
 */
export const fetchDashboardDataCached = cache(fetchDashboardDataCore);
