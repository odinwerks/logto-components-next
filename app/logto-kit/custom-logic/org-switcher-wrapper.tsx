import { cookies } from 'next/headers';
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { OrgSwitcher } from './OrgSwitcher';
import type { OrganizationData } from './types';
import type { ThemeSpec } from '../themes';
import type { Translations } from '../locales';

const ACTIVE_ORG_COOKIE = 'logto-active-org';

async function getActiveOrgIdFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(ACTIVE_ORG_COOKIE);
  return cookie?.value;
}

interface OrgSwitcherWrapperProps {
  theme: ThemeSpec;
  t: Translations;
}

export async function OrgSwitcherWrapper({ theme, t }: OrgSwitcherWrapperProps) {
  const { claims, isAuthenticated, userInfo } = await getLogtoContext(logtoConfig, {
    fetchUserInfo: true,
  });

  if (!isAuthenticated || !claims?.organizations) {
    return null;
  }

  const orgIds = claims.organizations as string[];
  if (orgIds.length === 0) {
    return null;
  }

  const organizationData = userInfo?.organization_data as OrganizationData[] | undefined;
  if (!organizationData || organizationData.length === 0) {
    return null;
  }

  const currentOrgId = await getActiveOrgIdFromCookie();

  return <OrgSwitcher organizations={organizationData} currentOrgId={currentOrgId} theme={theme} />;
}
