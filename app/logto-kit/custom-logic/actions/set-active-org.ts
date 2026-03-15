'use server';

import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../../logto';

export async function setActiveOrg(orgId: string | null): Promise<boolean> {
  const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

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
