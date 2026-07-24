'use client';

import type { OrganizationData } from './types';
import type { ThemeColors } from '../themes';
import { useOrgSwitcher } from '../hooks/use-org-switcher';

interface OrgSwitcherProps {
  organizations: OrganizationData[];
  currentOrgId?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t?: {
    organizations?: {
      beYourself?: string;
      switchingAnnouncement?: string;
      selectTriggerAriaLabel?: string;
    };
  };
}

export function OrgSwitcher({ organizations, currentOrgId, colors, t }: OrgSwitcherProps) {
  const {
    activeOrgId,
    switchingOrgId,
    hasAutoSwitched,
    isAutoSwitching,
    switchToOrg,
    switchToSelf,
  } = useOrgSwitcher({
    currentOrgId,
    autoSwitchSingleOrg: true,
    organizations,
  });

  const c = colors;
  const isLoading = switchingOrgId !== null;

  if (organizations.length === 0) {
    return null;
  }

  // Keep hidden during the in-flight auto-switch (isAutoSwitching) OR before it
  // has even started (pre-effect first render for a single-org user with no
  // active org). This prevents the brief "Be yourself" flash (BUG-025).
  if (isAutoSwitching || (!hasAutoSwitched && organizations.length === 1 && !activeOrgId && !currentOrgId)) {
    return null;
  }

  const displaySelected = activeOrgId ?? '';

  const handleChange = async (value: string) => {
    if (value === '') {
      await switchToSelf();
    } else {
      await switchToOrg(value);
    }
  };

  return (
    <div style={{ marginBottom: '0.75rem' }} aria-busy={isLoading}>
      <span className="sr-only" aria-live="polite">
        {isLoading ? (t?.organizations?.switchingAnnouncement || 'Switching organization, please wait.') : ''}
      </span>
      <div style={{ position: 'relative' }}>
        <select
          value={displaySelected}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isLoading}
          aria-label={t?.organizations?.selectTriggerAriaLabel || 'Select access context'}
        style={{
          width: '100%',
          padding: '0.5625rem 2.25rem 0.5625rem 0.75rem',
          background: colors.bgPage,
          border: `1px solid ${colors.borderColor}`,
          color: colors.textPrimary,
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: '0.8125rem',
          outline: 'none',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          appearance: 'none' as const,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)',
          borderRadius: '0.25rem',
          opacity: isLoading ? 0.5 : 1,
        }}
        >
          <option value="">{t?.organizations?.beYourself || 'Be yourself (global)'}</option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <span style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%) rotate(90deg)',
          color: c.textTertiary,
          pointerEvents: 'none',
          fontSize: '0.625rem',
        }}>
          ▶
        </span>
      </div>
    </div>
  );
}
