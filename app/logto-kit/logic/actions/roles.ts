'use server';

import { getManagementApiToken } from '../../../logto';
import { getCleanEndpoint } from '../utils';
import { debugLog } from '../debug';
import { assertSafeUserId } from '../guards';
import { safeAction, type DataResult } from './safe';
import type { UserRole } from '../types';
import { warn } from '../log';

export async function getUserRoles(userId: string): Promise<DataResult<UserRole[]>> {
  return safeAction(async () => {
    assertSafeUserId(userId);
    const token = await getManagementApiToken();
    const endpoint = getCleanEndpoint();
    const url = `${endpoint}/api/users/${encodeURIComponent(userId)}/roles`;

    debugLog(`[getUserRoles] Fetching roles for user ${userId} from ${url}`);

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      warn(`[getUserRoles] Management API returned ${res.status}: ${text.substring(0, 300)}`);
      throw new Error(`Management API returned ${res.status}`);
    }

    const data = (await res.json()) as UserRole[];
    debugLog(`[getUserRoles] Parsed ${data.length} roles for user ${userId}`);
    return data;
  });
}
