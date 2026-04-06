'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../../../logto';

export async function setActiveOrg(orgId: string | null): Promise<boolean> {
  const { claims, isAuthenticated } = await getLogtoContext(getLogtoConfig());

  if (!isAuthenticated || !claims?.organizations) {
    return false;
  }

  if (orgId === null) {
    return true;
  }

  const userOrgs = claims.organizations as string[];
  if (!userOrgs.includes(orgId)) {
    return false;
  }

  return true;
}
