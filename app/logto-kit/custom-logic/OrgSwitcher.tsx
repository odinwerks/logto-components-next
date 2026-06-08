'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, startTransition } from 'react';
import { setActiveOrg } from './set-active-org';
import { useOrgMode } from '../components/providers/preferences';
import type { OrganizationData } from '../logic/types';
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

export function OrgSwitcher({ organizations, currentOrgId, colors, t }: OrgSwitcherProps) {
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [isLoading, setIsLoading] = useState(false);
  const isSwitchingRef = useRef(false);

  const c = colors;

  const handleChange = async (newOrgId: string) => {
    const orgIdToSet = newOrgId || null;
    
    setIsLoading(true);
    try {
      if (orgIdToSet !== null) {
        const isValid = await setActiveOrg(orgIdToSet);
        if (!isValid) return;
      }
      
      startTransition(() => {
        setAsOrg(orgIdToSet);
        router.refresh();
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (organizations.length === 1 && !asOrg && !currentOrgId && !isSwitchingRef.current) {
      isSwitchingRef.current = true;
      handleChange(organizations[0].id).finally(() => { isSwitchingRef.current = false; });
    }
  }, [organizations, asOrg, currentOrgId]);

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
