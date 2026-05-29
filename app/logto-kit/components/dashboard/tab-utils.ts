import type { TabId } from './types';
import type { Translations } from '../../locales';

/**
 * Maps a TabId to its translated display label.
 * Shared between DashboardClient (desktop) and MobileClient.
 */
export function getTabLabel(id: TabId, t: Translations): string {
  switch (id) {
    case 'profile': return t.tabs.profile;
    case 'preferences': return t.tabs.preferences;
    case 'security': return t.tabs.security;
    case 'sessions': return t.tabs.sessions;
    case 'identities': return t.tabs.identities;
    case 'organizations': return t.tabs.organizations;
    case 'dev': return t.tabs.dev;
    default: return (id as string).toUpperCase();
  }
}
