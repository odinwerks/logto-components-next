'use client';

import { useState, useEffect, useLayoutEffect, useReducer, useRef, useCallback, startTransition, useId } from 'react';

// SSR-safe useLayoutEffect (suppresses React warning during SSR)
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { RoleCard } from '../shared/RoleCard';
import { RefreshButton } from '../shared/RefreshButton';
import { setActiveOrg } from '../../../custom-logic/set-active-org';
import { useOrgMode } from '../../providers/preferences';
import { useRefreshable } from '../../../hooks/use-refreshable';
import {
  loadOrganizationPermissions,
  loadOrganizationUserRoles,
  loadOrgPermissionDescriptions,
} from '../../../server-actions';
import type { OrgRoleScope } from '../../../logic/types';
import { getClampedTooltipPosition } from '../shared/tooltip-position';

// ─── Hardcoded design tokens ───

interface OrganizationsTabProps {
  userData: UserData;
  currentOrgId?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
}

// ─── OrgCard (extracted from OrganizationsTab to prevent re-creation on every render) ───
interface OrgCardProps {
  org: { id: string; name: string; description?: string };
  isSelected: boolean;
  isLoading: string | null;
  handleOrgClick: (orgId: string) => Promise<void>;
  colors: ThemeColors;
  t: Translations;
  mode: 'dark' | 'light';
}

const OrgCard = ({ org, isSelected, isLoading, handleOrgClick, colors, t, mode }: OrgCardProps) => {
  const c = colors;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const showTooltip = isHovered || isFocused;
  const tooltipId = useId();
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  const openTooltip = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const { left, top } = getClampedTooltipPosition({
      left: rect.left,
      top: rect.bottom + 6,
      width: 288,
      height: 96,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    openTooltip();
  }, [openTooltip]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    openTooltip();
  }, [openTooltip]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <button
      onClick={() => handleOrgClick(org.id)}
      role="radio"
      aria-checked={isSelected}
      onFocus={handleFocus}
      onBlur={handleBlur}
      aria-describedby={showTooltip ? tooltipId : undefined}
      style={{
        padding: '0.625rem 0.75rem',
        background: isSelected ? `${c.accentBlue}15` : c.bgPrimary,
        border: `1px solid ${isSelected ? c.accentBlue : c.borderColor}`,
        borderRadius: '0.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: isLoading === org.id ? 'wait' : 'pointer',
        opacity: isLoading === org.id ? 0.6 : 1,
        transition: 'all 0.15s ease',
        boxShadow: isSelected ? `0 0 0 1px ${c.accentBlue}` : 'none',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <div>
        <div style={{
          color: isSelected ? c.accentBlue : c.textPrimary,
          fontSize: '0.6875rem',
          fontWeight: 600,
          fontFamily: FONT_MONO,
        }}>
          {org.name}
          {isSelected && <span style={{ marginLeft: '0.5rem', fontSize: '0.5625rem' }}>{t.organizations.active}</span>}
        </div>
        <div
          ref={triggerRef}
          style={{ display: 'inline-flex', alignItems: 'center', marginTop: '0.125rem' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <Info
            size={12}
            strokeWidth={1.5}
            style={{ color: c.textTertiary, cursor: 'help', flexShrink: 0 }}
          />
          {showTooltip &&
            createPortal(
              <div
                id={tooltipId}
                style={tooltipStyle}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div
                  style={{
                    background: c.bgSecondary,
                    border: `1px solid ${c.borderColor}`,
                    borderRadius: '0.25rem',
                    padding: '0.5rem 0.625rem',
                    minWidth: '14rem',
                    maxWidth: '18rem',
                    boxShadow: mode === 'dark'
                      ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                      : '0 2px 8px rgba(0, 0, 0, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
                    <span style={{ color: c.textTertiary }}>{t.organizations.idLabel}: </span>
                    {org.id}
                  </div>
                  {org.description && (
                    <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
                      <span style={{ color: c.textTertiary }}>Description: </span>
                      {org.description}
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
    </button>
  );
};

// ─── PermissionsBlock - refreshable wrapper so the Refresh button
//     unmounts / remounts the entire block, running effects fresh. ───
interface PermissionsBlockProps {
  activeOrgId: string;
  colors: ThemeColors;
  t: Translations;
  userData: UserData;
  scrollWell?: boolean;
  mode: 'dark' | 'light';
}

// ── Reducer types ──
type PermsState = {
  loading: boolean;
  permissions: string[];
  descriptions: Map<string, OrgRoleScope>;
};

type PermsAction =
  | { type: 'fetchStart' }
  | { type: 'fetchPermissionsDone'; permissions: string[] }
  | { type: 'fetchDescriptionsDone'; descriptions: Map<string, OrgRoleScope> }
  | { type: 'fetchDescriptionsError' }
  | { type: 'fetchDone' }
  | { type: 'fetchError' };

const initialPermsState: PermsState = {
  loading: false,
  permissions: [],
  descriptions: new Map(),
};

function permsReducer(state: PermsState, action: PermsAction): PermsState {
  switch (action.type) {
    case 'fetchStart':
      return { ...state, loading: true };
    case 'fetchPermissionsDone':
      return { ...state, permissions: action.permissions };
    case 'fetchDescriptionsDone':
      return { ...state, descriptions: action.descriptions };
    case 'fetchDescriptionsError':
      return { ...state, descriptions: new Map() };
    case 'fetchDone':
      return { ...state, loading: false };
    case 'fetchError':
      return { loading: false, permissions: [], descriptions: new Map() };
  }
}

const PermissionsBlock = ({ activeOrgId, colors, t, userData, scrollWell, mode }: PermissionsBlockProps) => {
  const c = colors;
  const { visible, triggerRefresh } = useRefreshable();
  const [permsState, dispatchPerms] = useReducer(permsReducer, initialPermsState);
  const [hoveredPerm, setHoveredPerm] = useState<string | null>(null);
  const [focusedPerm, setFocusedPerm] = useState<string | null>(null);

  const activePerm = hoveredPerm || focusedPerm;
  const showTooltip = !!activePerm;
  const tooltipId = useId();

  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const activePermissionInfo = activePerm ? {
    name: activePerm,
    description: permsState.descriptions.get(activePerm)?.description
  } : null;

  useIsomorphicLayoutEffect(() => {
    if (!activePerm) return;

    const element = document.getElementById(`perm-trigger-${activePerm}`);
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const { left, top } = getClampedTooltipPosition({
      left: rect.left,
      top: rect.bottom + 4,
      width: 288,
      height: 88,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setTooltipPos({ x: left, y: top });
  }, [activePerm]);

  const handlePermMouseEnter = useCallback((perm: string) => {
    setHoveredPerm(perm);
  }, []);

  const handlePermMouseLeave = useCallback(() => {
    setHoveredPerm(null);
  }, []);

  const handlePermFocus = useCallback((perm: string) => {
    setFocusedPerm(perm);
  }, []);

  const handlePermBlur = useCallback(() => {
    setFocusedPerm(null);
  }, []);

  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: 0,
  };

  const wellStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: c.textTertiary,
  };

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    dispatchPerms({ type: 'fetchStart' });

    const permissionsRequest = loadOrganizationPermissions(activeOrgId)
      .then(r => {
        if (cancelled) return r;
        if (!r.ok) {
          console.error('[PermissionsBlock] Failed to load permissions:', r.error);
          return r;
        }
        dispatchPerms({ type: 'fetchPermissionsDone', permissions: r.data });
        return r;
      })
      .catch(error => {
        if (cancelled) return null;
        console.error('[PermissionsBlock] Failed to load permissions:', error);
        return null;
      });

    const descriptionsRequest = loadOrgPermissionDescriptions(activeOrgId)
      .then(r => {
        if (cancelled) return r;
        if (!r.ok) {
          console.error('[PermissionsBlock] Failed to load permission descriptions:', r.error);
          return r;
        }
        const descriptions = new Map<string, OrgRoleScope>();
        for (const scope of r.data) {
          if (scope.name) descriptions.set(scope.name, scope);
        }
        dispatchPerms({ type: 'fetchDescriptionsDone', descriptions });
        return r;
      })
      .catch(err => {
        if (!cancelled) {
          console.error('[PermissionsBlock] Failed to load permission descriptions:', err);
          dispatchPerms({ type: 'fetchDescriptionsError' });
        }
        return null;
      });

    Promise.allSettled([permissionsRequest, descriptionsRequest])
      .then(([permResult]) => {
        if (cancelled) return;

        const permOk = permResult.status === 'fulfilled' && permResult.value?.ok;

        if (!permOk) {
          dispatchPerms({ type: 'fetchError' });
        } else {
          dispatchPerms({ type: 'fetchDone' });
        }
      });

    return () => { cancelled = true; };
  }, [activeOrgId, userData, visible]);

  if (!visible) return null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
        <RefreshButton
          onClick={triggerRefresh}
          loading={permsState.loading}
          colors={colors}
          ariaLabel={t.organizations.refreshOrgPermissions}
        />
      </div>
      <div style={{ ...wellStyle, ...(scrollWell ? { flex: 1, minHeight: 0, overflowY: 'auto' as const, marginBottom: 0 } : {}) }}>
        {permsState.permissions.length === 0 ? (
          <div style={emptyStateStyle}>
            {permsState.loading
              ? t.organizations.loadingPermissions
              : t.organizations.noOrgPermissions}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {permsState.permissions.map((permission) => (
              <div
                key={permission}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: c.bgPrimary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: FONT_MONO, fontSize: '0.6875rem', color: c.textPrimary }}>
                  {permission}
                </span>
                <button
                  id={`perm-trigger-${permission}`}
                  type="button"
                  onMouseEnter={() => handlePermMouseEnter(permission)}
                  onMouseLeave={handlePermMouseLeave}
                  onFocus={() => handlePermFocus(permission)}
                  onBlur={handlePermBlur}
                  aria-describedby={showTooltip && activePermissionInfo?.name === permission ? tooltipId : undefined}
                  style={{
                    cursor: 'help',
                    color: c.textTertiary,
                    display: 'inline-flex',
                    alignItems: 'center',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: 0,
                    outline: 'none',
                  }}
                >
                  <Info size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {showTooltip && activePermissionInfo && createPortal(
        <div id={tooltipId} style={{
          position: 'fixed',
          top: tooltipPos.y,
          left: tooltipPos.x,
          background: c.bgSecondary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.5rem 0.625rem',
          minWidth: '14rem',
          maxWidth: '18rem',
          boxShadow: mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>Permission: </span>
            {activePermissionInfo.name}
          </div>
          {activePermissionInfo.description && (
            <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
              <span style={{ color: c.textTertiary }}>Description: </span>
              {activePermissionInfo.description}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

export function OrganizationsTab({ userData, currentOrgId, mode, colors, t, mobmode }: OrganizationsTabProps) {
  const c = colors;
  const isMobile = mobmode === 1;
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const switchingRef = useRef(false);

  // Auto-clear error message after 3 seconds
  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  // NOTE: explicit null means "be yourself" mode and must NOT fall back to
  // a stale server prop. Only fallback behavior should apply to unexpected
  // undefined values.
  const activeOrgId = asOrg !== null ? (asOrg ?? currentOrgId) : null;

  const organizations = userData.organizations || [];
  // Only show roles for the active organization (security: don't show org roles when "be yourself")
  const organizationRoles = activeOrgId ? (userData.organizationRoles || []).filter(role => role.organizationId === activeOrgId) : [];

  // Fetch the user's org role details from Management API (real UUIDs + descriptions)
  const [orgUserRoles, setOrgUserRoles] = useState<Record<string, { id: string; description?: string }>>({});

  useEffect(() => {
    let cancelled = false;

    if (!activeOrgId || organizationRoles.length === 0) return;

    loadOrganizationUserRoles(activeOrgId).then(result => {
      if (cancelled) return;
      if (!result.ok) {
        console.error('[OrganizationsTab] Failed to load org user roles:', result.error);
        return;
      }
      const map: Record<string, { id: string; description?: string }> = {};
      for (const apiRole of result.data) {
        map[apiRole.name] = { id: apiRole.id, description: apiRole.description };
      }
      setOrgUserRoles(map);
    });

    return () => { cancelled = true; };
    // intentional: relies on unmount/remount for refresh, not dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, userData]);

  const handleOrgClick = async (orgId: string) => {
    if (switchingRef.current) return;
    if (orgId === activeOrgId) return;
    switchingRef.current = true;
    setIsLoading(orgId);
    try {
      const isValid = await setActiveOrg(orgId);
      if (!isValid) {
        setErrorMsg(t.organizations.noOrganizations);
        return;
      }
      startTransition(() => {
        setAsOrg(orgId);
        router.refresh();
      });
    } catch (err) {
      console.error('[OrganizationsTab] Failed to switch organization:', err);
      setErrorMsg(t.organizations.switchFailed || 'Failed to switch organization. Please try again.');
    } finally {
      setIsLoading(null);
      switchingRef.current = false;
    }
  };

  const handleBeYourself = async () => {
    if (switchingRef.current) return;
    if (activeOrgId === null || activeOrgId === undefined) return;
    switchingRef.current = true;
    setIsLoading('clear');
    try {
      const isCleared = await setActiveOrg(null);
      if (!isCleared) {
        setErrorMsg(t.organizations.clearOrgFailed || 'Failed to switch to personal mode. Please try again.');
        return;
      }

      startTransition(() => {
        setAsOrg(null);
        router.refresh();
      });
    } catch (err) {
      console.error('[OrganizationsTab] Failed to clear organization:', err);
      setErrorMsg(t.organizations.clearOrgFailed || 'Failed to switch to personal mode. Please try again.');
    } finally {
      setIsLoading(null);
      switchingRef.current = false;
    }
  };

  // ─── Inlined component styles (replaces cs.*) ───
  const sectionLabel: React.CSSProperties = {
    fontFamily: FONT_SANS,
    fontWeight: 500,
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '0.75rem',
  };

  const wellStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    padding: '1rem 1.25rem',
    marginBottom: '1rem',
  };

  const mutedMonoStyle: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: '0.625rem',
    color: c.textTertiary,
    lineHeight: 1.5,
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: c.textTertiary,
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Organizations */}
      <p style={sectionLabel}>{t.organizations.orgs}</p>
      <div style={wellStyle}>
        {organizations.length === 0 ? (
          <div style={emptyStateStyle}>{t.organizations.noOrganizations}</div>
        ) : (
          <>
            {/* Be Yourself button */}
            {activeOrgId && (
              <button
                onClick={handleBeYourself}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: c.bgPrimary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem',
                  cursor: isLoading === 'clear' ? 'wait' : 'pointer',
                  opacity: isLoading === 'clear' ? 0.6 : 1,
                  color: c.textSecondary,
                  fontSize: '0.6875rem',
                  fontFamily: FONT_MONO,
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                ← {t.organizations.beYourself}
              </button>
            )}
            {errorMsg && (
              <div style={{ padding: '0.375rem 0.75rem', color: c.accentRed, fontSize: '0.6875rem', fontFamily: FONT_MONO }}>
                {errorMsg}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {organizations.map(org => (
                <OrgCard
                  key={org.id}
                  org={org}
                  isSelected={org.id === activeOrgId}
                  isLoading={isLoading}
                  handleOrgClick={handleOrgClick}
                  colors={colors}
                  t={t}
                  mode={mode}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginBottom: '40px' }}>
        {/* Roles */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>{t.organizations.orgRoles}</p>
            <RefreshButton
              onClick={() => router.refresh()}
              loading={false}
              colors={colors}
              ariaLabel={t.organizations.refreshOrgRoles}
            />
          </div>
          <div style={{ ...wellStyle, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
            {!activeOrgId && (
              <p style={{ ...mutedMonoStyle, marginBottom: '0.75rem' }}>
                {t.organizations.selectOrgForRoles}
              </p>
            )}

            {organizationRoles.length === 0 ? (
              <div style={emptyStateStyle}>
                {activeOrgId
                  ? t.organizations.noRoles
                  : t.organizations.selectOrgForRoles
                }
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {organizationRoles.map((role) => {
                  const apiData = orgUserRoles[role.name];
                  return (
                    <RoleCard
                      key={role.id}
                      name={role.name}
                      roleId={apiData?.id}
                      description={apiData?.description}
                      colors={colors}
                      t={t}
                      mode={mode}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Permissions - refreshable block remounts on refresh */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          {activeOrgId ? (
            <PermissionsBlock activeOrgId={activeOrgId} colors={colors} t={t} userData={userData} scrollWell mode={mode} />
          ) : (
            <>
              <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
              <div style={{ ...wellStyle, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
                <p style={{ ...mutedMonoStyle, marginBottom: '0.75rem' }}>
                  {t.organizations.selectOrgForPermissions}
                </p>
                <div style={emptyStateStyle}>{t.organizations.noActiveOrg}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
