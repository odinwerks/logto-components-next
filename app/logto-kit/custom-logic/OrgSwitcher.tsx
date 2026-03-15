'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { setActiveOrg } from './actions/set-active-org';
import { useOrgMode } from '../components/handlers/preferences';
import type { OrganizationData } from './types';
import type { ThemeSpec } from '../themes';

interface OrgSwitcherProps {
  organizations: OrganizationData[];
  currentOrgId?: string;
  theme: ThemeSpec;
  t?: {
    organizations?: {
      beYourself?: string;
    };
  };
}

export function OrgSwitcher({ organizations, currentOrgId, theme, t }: OrgSwitcherProps) {
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [selected, setSelected] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const c = theme.colors;
  const ty = theme.tokens.typography;

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
            ...theme.components.inputs.select,
            cursor: isLoading ? 'not-allowed' : 'pointer',
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
          fontSize: ty.size.xs,
        }}>
          ▶
        </span>
      </div>
    </div>
  );
}
