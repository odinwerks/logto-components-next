export { Protected } from './Protected';

export { OrgSwitcher } from './OrgSwitcher';
export { setActiveOrg } from './actions/set-active-org';

export async function OrgSwitcherWrapper(...args: Parameters<typeof import('./org-switcher-wrapper').OrgSwitcherWrapper>) {
  const mod = await import('./org-switcher-wrapper');
  return mod.OrgSwitcherWrapper(...args);
}

export type {
  OrganizationData,
} from './types';
