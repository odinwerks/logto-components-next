'use server';

import { getOrganizationUserPermissions } from '../logic/actions';
import type { DataResult } from '../logic/actions/safe';

export async function loadOrganizationPermissions(orgId: string): Promise<DataResult<string[]>> {
  return getOrganizationUserPermissions(orgId);
}