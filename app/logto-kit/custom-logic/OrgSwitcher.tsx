'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, startTransition, useCallback } from 'react';
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
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);
  // While the single-org auto-switch promise is in flight we keep the whole
  // component hidden so the user never sees a stale "Be yourself" selection
  // snap to their org (BUG-025).
  const [isAutoSwitching, setIsAutoSwitching] = useState(false);
  const isSwitchingRef = useRef(false);

  const c = colors;

  const handleChange = useCallback(async (newOrgId: string) => {
    const orgIdToSet = newOrgId || null;

    setIsLoading(true);
    try {
      if (orgIdToSet !== null) {
        const isValid = await setActiveOrg(orgIdToSet);
        if (!isValid) return;
        startTransition(() => {
          setAsOrg(orgIdToSet);
          router.refresh();
        });
      } else {
        await setActiveOrg(null);
        // BUG-L06: setActiveOrg(null) already persists asOrg:null with
        // best-effort warn (NEVER-TOUCH rule). Skip the redundant client-side
        // setAsOrg persist to avoid a double-write round trip.
        startTransition(() => {
          router.refresh();
        });
      }
    } catch (error) {
      console.error('[OrgSwitcher] Failed to switch organization:', error);
    } finally {
      setIsLoading(false);
    }
  }, [setAsOrg, router]);

  useEffect(() => {
    if (organizations.length === 1 && !asOrg && !currentOrgId && !isSwitchingRef.current && !hasAutoSwitched) {
      isSwitchingRef.current = true;
      setHasAutoSwitched(true);
      setIsAutoSwitching(true);
      handleChange(organizations[0].id).finally(() => {
        isSwitchingRef.current = false;
        setIsAutoSwitching(false);
      });
    }
  }, [organizations, asOrg, currentOrgId, handleChange, hasAutoSwitched]);

  if (organizations.length === 0) {
    return null;
  }

  // Keep hidden during the in-flight auto-switch (isAutoSwitching) OR before it
  // has even started (pre-effect first render for a single-org user with no
  // active org). This prevents the brief "Be yourself" flash (BUG-025).
  if (isAutoSwitching || (!hasAutoSwitched && organizations.length === 1 && !asOrg && !currentOrgId)) {
    return null;
  }

  const displaySelected = asOrg ?? currentOrgId ?? '';

  return (
    <div style={{ marginBottom: '0.75rem' }} aria-busy={isLoading}>
      <span className="sr-only" aria-live="polite">
        {isLoading ? 'Switching organization…' : ''}
      </span>
      <div style={{ position: 'relative' }}>
        <select
          value={displaySelected}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isLoading}
          aria-label="Select organization"
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
