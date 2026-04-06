'use server';

import { getOrganizationUserPermissions } from '../logic/actions';

export async function loadOrganizationPermissions(orgId: string) {
  try {
    const permissions = await getOrganizationUserPermissions(orgId);
    return permissions;
  } catch (error) {
    console.error('[loadOrganizationPermissions] Failed:', error);
    return [];
  }
}