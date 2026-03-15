'use server';

import { cookies } from 'next/headers';
import { getLogtoContext, getOrganizationToken } from '@logto/next/server-actions';
import { logtoConfig } from '../../../logto';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

export async function setActiveOrg(orgId: string): Promise<void> {
  const { claims, isAuthenticated } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated || !claims?.organizations) {
    return;
  }

  const userOrgs = claims.organizations as string[];
  if (!userOrgs.includes(orgId)) {
    return;
  }

  // Fetch and cache the organization token
  // This triggers Logto to issue a token with organization_id claim
  await getOrganizationToken(logtoConfig, orgId);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
    secure: logtoConfig.cookieSecure ?? process.env.NODE_ENV === 'production',
  });
}
