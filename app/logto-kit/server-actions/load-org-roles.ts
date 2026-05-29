'use server';

import { getOrganizationUserRoles } from '../logic/actions';
import type { DataResult } from '../logic/actions/safe';
import type { UserRole } from '../logic/types';

export async function loadOrganizationUserRoles(orgId: string): Promise<DataResult<UserRole[]>> {
  return getOrganizationUserRoles(orgId);
}
