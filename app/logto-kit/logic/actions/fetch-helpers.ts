'use server';

import { warn } from '../log';
import { makeManagementFetch } from './management-request';

type ScopeFetchResult<T> = { roleId: string; scopes: T[] };

/**
 * Fetches scopes for multiple roles in parallel via the Logto Management API,
 * tolerating individual failures (warned and skipped).
 *
 * @param roleIds       - Role IDs to fetch scopes for
 * @param buildScopesUrl - Builds the scopes endpoint URL for a given role ID
 * @param m2mToken      - M2M bearer token for the Management API
 * @param logPrefix     - Label for log messages (e.g. caller function name)
 * @returns Array of { roleId, scopes } for each successfully fetched role
 */
export async function fetchRoleScopes<T>(
  roleIds: string[],
  buildScopesUrl: (roleId: string) => string,
  m2mToken: string,
  logPrefix: string,
): Promise<ScopeFetchResult<T>[]> {
  const results = await Promise.allSettled(
    roleIds.map(async (roleId) => {
      const url = buildScopesUrl(roleId);
      const res = await makeManagementFetch(url, { method: 'GET', token: m2mToken });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        warn(
          `[${logPrefix}] Scopes endpoint returned ${res.status} for role ${roleId}: ${text.substring(0, 200)}`,
        );
        throw new Error(
          `Scopes fetch failed for role ${roleId}: ${res.status}`,
        );
      }

      return { roleId, scopes: (await res.json()) as T[] };
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<ScopeFetchResult<T>> =>
        r.status === 'fulfilled',
    )
    .map((r) => r.value);
}
