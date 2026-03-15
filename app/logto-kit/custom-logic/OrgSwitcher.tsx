'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { setActiveOrg } from './actions/set-active-org';
import type { OrganizationData } from './types';
import type { ThemeSpec } from '../themes';

interface OrgSwitcherProps {
  organizations: OrganizationData[];
  currentOrgId?: string;
  theme: ThemeSpec;
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : undefined;
}

export function OrgSwitcher({ organizations, currentOrgId, theme }: OrgSwitcherProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentOrgId ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const c = theme.colors;
  const ty = theme.tokens.typography;

  useEffect(() => {
    if (currentOrgId) {
      setSelected(currentOrgId);
    }
  }, [currentOrgId]);

  useEffect(() => {
    if (organizations.length === 1 && !currentOrgId) {
      handleChange(organizations[0].id);
    }
  }, [organizations, currentOrgId]);

  const handleChange = async (newOrgId: string) => {
    if (!newOrgId) return;
    
    setIsLoading(true);
    try {
      await setActiveOrg(newOrgId);
      setSelected(newOrgId);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  if (organizations.length === 0) {
    return null;
  }

  if (organizations.length === 1 && !currentOrgId) {
    return null;
  }

  const activeOrgCookie = getCookieValue('logto-active-org');
  const displaySelected = activeOrgCookie || selected;

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
