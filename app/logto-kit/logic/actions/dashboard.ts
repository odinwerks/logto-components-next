'use server';

import 'server-only';

import { safeAction, type DataResult } from './safe';
import { fetchDashboardDataCore } from '../dashboard-data';
import type { DashboardResult } from '../types';

/**
 * Server Action wrapper around `fetchDashboardDataCore`.
 *
 * Wrapped with `safeAction` for consistent error sanitization across all
 * server actions (BUG-065).  `NEXT_REDIRECT` control-flow errors thrown by
 * `redirect()` are re-thrown through `safeAction` so the router picks them up.
 *
 * For RSC/layout deduplication, use `fetchDashboardDataCached` instead.
 */
export async function fetchDashboardData(
  opts?: { tolerateAuthErrors?: boolean },
): Promise<DataResult<DashboardResult>> {
  return safeAction(() => fetchDashboardDataCore(opts));
}
