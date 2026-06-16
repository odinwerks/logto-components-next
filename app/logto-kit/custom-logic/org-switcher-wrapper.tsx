import { getLogtoContext } from '@logto/next/server-actions';
import { getLogtoConfig } from '../config';
import { OrgSwitcher } from './OrgSwitcher';
import type { OrganizationData } from '../logic/types';
import type { ThemeColors } from '../themes';
import type { Translations } from '../locales';

interface OrgSwitcherWrapperProps {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

export async function OrgSwitcherWrapper({ mode, colors, t }: OrgSwitcherWrapperProps) {
  const { isAuthenticated, userInfo } = await getLogtoContext(getLogtoConfig(), {
    fetchUserInfo: true,
  });

  if (!isAuthenticated) {
    return null;
  }

  const organizationData = userInfo?.organization_data as OrganizationData[] | undefined;
  if (!organizationData || organizationData.length === 0) {
    return null;
  }

  return <OrgSwitcher organizations={organizationData} mode={mode} colors={colors} t={t} />;
}
