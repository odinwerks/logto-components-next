'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { setActiveOrg } from './actions/set-active-org';
import { useOrgMode } from '../components/handlers/preferences';
import type { OrganizationData } from './types';
import type { ThemeColors } from '../themes';

interface OrgSwitcherProps {
  organizations: OrganizationData[];
  currentOrgId?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t?: {
    organizations?: {
      beYourself?: string;
    };
  };
}

export function OrgSwitcher({ organizations, currentOrgId, mode, colors, t }: OrgSwitcherProps) {
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [selected, setSelected] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const c = colors;

  useEffect(() => {
    const activeOrg = asOrg ?? currentOrgId ?? '';
    setSelected(activeOrg);
  }, [asOrg, currentOrgId]);

  useEffect(() => {
    if (organizations.length === 1 && !asOrg && !currentOrgId) {
      handleChange(organizations[0].id);
    }
  }, [organizations, asOrg, currentOrgId]);

  const handleChange = async (newOrgId: string) => {
    const orgIdToSet = newOrgId || null;
    
    if (orgIdToSet !== null) {
      const isValid = await setActiveOrg(orgIdToSet);
      if (!isValid) return;
    }
    
    setIsLoading(true);
    try {
      setAsOrg(orgIdToSet);
      setSelected(newOrgId);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  if (organizations.length === 1 && !asOrg && !currentOrgId) {
    return null;
  }

  const displaySelected = asOrg ?? currentOrgId ?? '';

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ position: 'relative' }}>
        <select
          value={displaySelected}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isLoading}
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
