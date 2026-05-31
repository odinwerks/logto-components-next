'use server';

import { assertSafeLogtoId } from '../logic/guards';
import { getOrgPermissionsWithDescriptions } from '../logic/actions';
import type { DataResult } from '../logic/actions/safe';
import type { OrgRoleScope } from '../logic/types';

export async function loadOrgPermissionDescriptions(orgId: string): Promise<DataResult<OrgRoleScope[]>> {
  assertSafeLogtoId(orgId, 'orgId');
  return getOrgPermissionsWithDescriptions(orgId);
}
