import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '../../logto';
import { OrgSwitcher } from './OrgSwitcher';
import type { OrganizationData } from './types';
import type { ThemeSpec } from '../themes';
import type { Translations } from '../locales';

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

  return <OrgSwitcher organizations={organizationData} theme={theme} />;
}
