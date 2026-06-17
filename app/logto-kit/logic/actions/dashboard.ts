'use server';

import 'server-only';

import { fetchDashboardDataCore } from '../dashboard-data';
import type { DashboardResult } from '../types';

/**
 * Server Action wrapper around `fetchDashboardDataCore`.
 * Keeps `'use server'` for compatibility with any client-side callers.
 * For RSC/layout deduplication, use `fetchDashboardDataCached` instead.
 */
export async function fetchDashboardData(
  opts?: { tolerateAuthErrors?: boolean },
): Promise<DashboardResult> {
  return fetchDashboardDataCore(opts);
}
