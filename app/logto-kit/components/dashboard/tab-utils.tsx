import { Monitor } from 'lucide-react';
import type { TabId } from './types';
import type { Translations } from '../../locales';

// ── Icons ───────────────────────────────────────────────────────────────────

type SvgIconProps = React.SVGProps<SVGSVGElement> & { size?: number; color?: string };

const UserIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

const ShieldIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <path d="M12 3L4 7v5c0 5 3.5 9 8 10 4.5-1 8-5 8-10V7L12 3z" />
  </svg>
);

const LinkIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <path d="M9 17H7a5 5 0 0 1 0-10h2" />
    <path d="M15 7h2a5 5 0 0 1 0 10h-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

const BuildingIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <rect x="3" y="9" width="5" height="12" />
    <rect x="9" y="5" width="6" height="16" />
    <rect x="16" y="12" width="5" height="9" />
  </svg>
);

const SettingsIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const LogoutIcon = ({ size = 14, color = 'currentColor', ...rest }: SvgIconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" {...rest}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export function getTabIcon(id: TabId): React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; color?: string }> {
  switch (id) {
    case 'profile': return UserIcon;
    case 'security': return ShieldIcon;
    case 'sessions': return Monitor;
    case 'identities': return LinkIcon;
    case 'organizations': return BuildingIcon;
    case 'preferences': return SettingsIcon;
    default: return UserIcon;
  }
}

export function getTabLabel(id: TabId, t: Translations): string {
  switch (id) {
    case 'profile': return t.tabs.profile;
    case 'preferences': return t.tabs.preferences;
    case 'security': return t.tabs.security;
    case 'sessions': return t.tabs.sessions;
    case 'identities': return t.tabs.identities;
    case 'organizations': return t.tabs.organizations;
    default: return (id as string).toUpperCase();
  }
}

export { UserIcon, ShieldIcon, LinkIcon, BuildingIcon, SettingsIcon, LogoutIcon };
