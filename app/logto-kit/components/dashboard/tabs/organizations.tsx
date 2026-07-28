'use client';

import { useState, useRef, useCallback, useEffect, useMemo, useId, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import type { UserData, UserRole, OrgRoleScope } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { RoleCard } from '../shared/RoleCard';
import { RefreshButton } from '../shared/RefreshButton';
import { useOrgSwitcher } from '../../../hooks/use-org-switcher';
import { useOrgRoles } from '../../../hooks/use-org-roles';
import { useOrgPermissions } from '../../../hooks/use-org-permissions';
import { getClampedTooltipPosition } from '../shared/tooltip-position';
import { BouncingDots } from '../../shared/motion';
import { OrgRolesStream, OrgPermissionsStream } from '../shared/rbac-streams';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrganizationsTabProps {
  userData: UserData;
  currentOrgId?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  mobmode?: number;
}

// ─── OrgCard (extracted to prevent re-creation on every render) ───────────────
interface OrgCardProps {
  org: { id: string; name: string; description?: string };
  isSelected: boolean;
  isLoading: string | null;
  handleOrgClick: (orgId: string) => Promise<void>;
  colors: ThemeColors;
  t: Translations;
  mode: 'dark' | 'light';
  tabIndex?: number;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

const OrgCard = ({ org, isSelected, isLoading, handleOrgClick, colors, t, mode, tabIndex = 0, buttonRef }: OrgCardProps) => {
  const c = colors;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInfoFocused, setIsInfoFocused] = useState(false);
  const showTooltip = isHovered || isInfoFocused;
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
      zIndex: 4000,
    });
  }, []);

  // Close tooltip on window scroll/resize so the fixed-position tooltip
  // doesn't detach from its trigger (BUG-M07).
  useEffect(() => {
    if (!showTooltip) return;

    const close = () => {
      setIsHovered(false);
      setIsInfoFocused(false);
    };

    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('resize', close, { passive: true });

    return () => {
      window.removeEventListener('scroll', close);
      window.removeEventListener('resize', close);
    };
  }, [showTooltip]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    openTooltip();
  }, [openTooltip]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleInfoFocus = useCallback(() => {
    setIsInfoFocused(true);
    openTooltip();
  }, [openTooltip]);

  const handleInfoBlur = useCallback(() => {
    setIsInfoFocused(false);
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      <button
        ref={buttonRef}
        tabIndex={tabIndex}
        onClick={() => handleOrgClick(org.id)}
        role="radio"
        aria-checked={isSelected}
        style={{
          padding: '0.625rem 2.25rem 0.625rem 0.75rem',
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
        </div>
      </button>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Organization info"
        aria-describedby={showTooltip ? tooltipId : undefined}
        style={{
          position: 'absolute',
          right: '0.75rem',
          top: '50%',
          transform: 'translateY(-50%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'help',
          background: 'none',
          border: 'none',
          padding: '0.25rem',
          margin: 0,
          outline: isInfoFocused ? `1px solid ${c.accentBlue}` : undefined,
          borderRadius: '0.25rem',
          zIndex: 10,
          color: c.textTertiary,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleInfoFocus}
        onBlur={handleInfoBlur}
        onClick={(e) => {
          e.stopPropagation();
          setIsInfoFocused((prev) => !prev);
        }}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            setIsInfoFocused((prev) => !prev);
          }
        }}
      >
        <Info
          size={12}
          strokeWidth={1.5}
          style={{ flexShrink: 0 }}
        />
      </button>
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
  );
};

// ─── PermissionsBlock - consumes useOrgPermissions ───────────────────────────
interface PermissionsBlockProps {
  activeOrgId: string;
  colors: ThemeColors;
  t: Translations;
  scrollWell?: boolean;
  mode: 'dark' | 'light';
  /**
   * Optional pre-fetched org permissions + descriptions streamed from the
   * RSC (`orgRbacPromise`). When provided, the hook seeds its state and
   * skips BOTH the grant AND the M2M descriptions fetch on mount. On
   * `refresh()`, both run (the grant — refresh-token rotation, BUG-L01 —
   * runs ONLY here, not on every mount — a security improvement).
   */
  initialData?: { permissions: string[]; descriptions: Map<string, OrgRoleScope> };
}

const PermissionsBlock = ({ activeOrgId, colors, t, scrollWell, mode, initialData }: PermissionsBlockProps) => {
  const c = colors;
  const {
    permissions,
    descriptions,
    loading,
    error,
    refresh,
    tooltip,
    activePermission,
    getTooltipHandlers,
  } = useOrgPermissions({ orgId: activeOrgId, initialData });

  const tooltipId = useId();
  const showTooltip = tooltip.visible && activePermission !== null;
  const activePermInfo = activePermission
    ? { name: activePermission, description: descriptions.get(activePermission)?.description }
    : null;

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

  // useRefreshable remount gating is handled by useOrgPermissions.visible
  // but PermissionsBlock itself doesn't use useRefreshable anymore - the hook manages it.
  // However, the original PermissionsBlock used useRefreshable internally, and the parent
  // uses it to gate rendering. Since useOrgPermissions handles visibility internally,
  // we just render normally and rely on the hook's state.

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
        <RefreshButton
          onClick={refresh}
          loading={loading}
          colors={colors}
          ariaLabel={t.organizations.refreshOrgPermissions}
        />
      </div>
      <div style={{ ...wellStyle, ...(scrollWell ? { flex: 1, minHeight: 0, overflowY: 'auto' as const, marginBottom: 0 } : {}) }}>
        {error ? (
          <div style={{ ...emptyStateStyle, color: c.accentRed }}>
            {error}
          </div>
        ) : permissions.length === 0 ? (
          <div style={{ ...emptyStateStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
            {loading ? (
              <><BouncingDots size={5} gap={3} ariaLabel="" /> {t.organizations.loadingPermissions}</>
            ) : (
              t.organizations.noOrgPermissions
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {permissions.map((permission) => {
              const handlers = getTooltipHandlers(permission);
              return (
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
                    type="button"
                    aria-label={`Permission details for ${permission}`}
                    {...handlers}
                    aria-describedby={showTooltip && activePermInfo?.name === permission ? tooltipId : undefined}
                    style={{
                      cursor: 'help',
                      color: c.textTertiary,
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      margin: 0,
                      outline: activePermission === permission ? `1px solid ${c.accentBlue}` : 'none',
                      borderRadius: '0.25rem',
                    }}
                  >
                    <Info size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showTooltip && activePermInfo && createPortal(
        <div id={tooltipId} style={{
          position: 'fixed',
          top: tooltip.y,
          left: tooltip.x,
          background: c.bgSecondary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0.25rem',
          padding: '0.5rem 0.625rem',
          minWidth: '14rem',
          maxWidth: '18rem',
          boxShadow: mode === 'dark'
            ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
            : '0 2px 8px rgba(0, 0, 0, 0.15)',
          zIndex: 4000,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
            <span style={{ color: c.textTertiary }}>Permission: </span>
            {activePermInfo.name}
          </div>
          {activePermInfo.description && (
            <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
              <span style={{ color: c.textTertiary }}>Description: </span>
              {activePermInfo.description}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};

// ─── OrgRolesList — extracted from the inline roles card so it can be
//     wrapped by `OrgRolesStream` and seeded with the streamed org roles
//     as `initialData` (instant-fetch). The hook still handles `refresh()`,
//     loading/error/empty states, and refetches on `orgId` change. ───

interface OrgRolesListProps {
  orgId: string | null | undefined;
  initialRoles?: UserRole[];
  colors: ThemeColors;
  t: Translations;
  mode: 'dark' | 'light';
  sectionLabel: React.CSSProperties;
  wellStyle: React.CSSProperties;
  emptyStateStyle: React.CSSProperties;
}

const OrgRolesList = ({
  orgId,
  initialRoles,
  colors,
  t,
  mode,
  sectionLabel,
  wellStyle,
  emptyStateStyle,
}: OrgRolesListProps) => {
  const {
    roles: orgRoles,
    loading: isRolesLoading,
    refresh: refreshRoles,
  } = useOrgRoles({ orgId, autoLoad: !!orgId, initialData: initialRoles });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={{ ...sectionLabel, marginBottom: 0 }}>{t.organizations.orgRoles}</p>
        <RefreshButton
          onClick={refreshRoles}
          loading={isRolesLoading}
          colors={colors}
          ariaLabel={t.organizations.refreshOrgRoles}
        />
      </div>
      <div style={{ ...wellStyle, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>

        {orgRoles.length === 0 ? (
          <div style={emptyStateStyle}>
            {orgId
              ? t.organizations.noRoles
              : t.organizations.selectOrgForRoles
            }
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {orgRoles.map((role) => (
              <RoleCard
                key={role.id}
                name={role.name}
                roleId={role.id}
                description={role.description}
                colors={colors}
                t={t}
                mode={mode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main OrganizationsTab ────────────────────────────────────────────────────

export function OrganizationsTab({ userData, currentOrgId, mode, colors, t, mobmode }: OrganizationsTabProps) {
  const c = colors;
  const isMobile = mobmode === 1;

  const [localError, setLocalError] = useState<string | null>(null);

  // Auto-clear local error after 3 seconds (matches old behavior)
  useEffect(() => {
    if (!localError) return;
    const timer = setTimeout(() => setLocalError(null), 3000);
    return () => clearTimeout(timer);
  }, [localError]);

  // Track which mode we're switching in, to map errors correctly
  const switchModeRef = useRef<'to-org' | 'to-self' | null>(null);

  const {
    activeOrgId,
    switchingOrgId,
    switchToOrg: rawSwitchToOrg,
    switchToSelf: rawSwitchToSelf,
  } = useOrgSwitcher({
    currentOrgId,
    onError: (msg) => {
      if (switchModeRef.current === 'to-org') {
        setLocalError(t.organizations.switchFailed || 'Failed to switch organization. Please try again.');
      } else if (switchModeRef.current === 'to-self') {
        setLocalError(t.organizations.clearOrgFailed || 'Failed to switch to personal mode. Please try again.');
      } else {
        setLocalError(msg);
      }
    },
  });

  // Wrap switch calls with mode tracking
  const switchToOrg = useCallback(async (orgId: string) => {
    setLocalError(null);
    switchModeRef.current = 'to-org';
    await rawSwitchToOrg(orgId);
  }, [rawSwitchToOrg]);

  const switchToSelf = useCallback(async () => {
    setLocalError(null);
    switchModeRef.current = 'to-self';
    await rawSwitchToSelf();
  }, [rawSwitchToSelf]);

  // Note: `useOrgRoles` is NOT called at the top of `OrganizationsTab` anymore.
  // It now lives inside `OrgRolesList` (extracted), which is wrapped by
  // `<OrgRolesStream>` so the streamed `orgRbacPromise` seeds the hook's
  // `initialData` and skips the mount-effect fetch (instant-fetch). The
  // `sourceKey` (orgId) change on org-switch still triggers a refetch via
  // the existing server-action path.

  const organizations = useMemo(() => userData.organizations || [], [userData.organizations]);

  // ── Roving tabindex ref map & keyboard handler for org radiogroup ────────
  const radioRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  // Memoize org tab order so the key-down handler is anchored to this render's
  // data snapshot (avoids stale closures when switching).
  const sortedOrgIds = useMemo(() => organizations.map(o => o.id), [organizations]);

  const handleRadioKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = sortedOrgIds.indexOf(activeOrgId ?? '');
      if (currentIndex < 0) return; // no active org — nothing to rove from

      let nextIndex = currentIndex;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          nextIndex = currentIndex > 0 ? currentIndex - 1 : sortedOrgIds.length - 1;
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % sortedOrgIds.length;
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          e.preventDefault();
          nextIndex = sortedOrgIds.length - 1;
          break;
        default:
          return; // Don't handle other keys
      }

      const nextOrgId = sortedOrgIds[nextIndex];
      if (nextOrgId) {
        void switchToOrg(nextOrgId);
        // Focus the newly-selected radio button after the render commits
        requestAnimationFrame(() => {
          radioRefs.current.get(nextOrgId)?.focus();
        });
      }
    },
    [sortedOrgIds, activeOrgId, switchToOrg],
  );

  // ── Styles ──
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
                onClick={() => switchToSelf()}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: c.bgPrimary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  marginBottom: '0.5rem',
                  cursor: switchingOrgId === 'clear' ? 'wait' : 'pointer',
                  opacity: switchingOrgId === 'clear' ? 0.6 : 1,
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
            {localError && (
              <div role="alert" style={{ padding: '0.375rem 0.75rem', color: c.accentRed, fontSize: '0.6875rem', fontFamily: FONT_MONO }}>
                {localError}
              </div>
            )}
            <div
              role="radiogroup"
              aria-label={t.organizations.orgs}
              style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              onKeyDown={handleRadioKeyDown}
            >
              {organizations.map(org => (
                <OrgCard
                  key={org.id}
                  org={org}
                  isSelected={org.id === activeOrgId}
                  isLoading={switchingOrgId}
                  handleOrgClick={(orgId) => switchToOrg(orgId)}
                  colors={colors}
                  t={t}
                  mode={mode}
                  tabIndex={org.id === activeOrgId ? 0 : -1}
                  buttonRef={el => { radioRefs.current.set(org.id, el); }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginBottom: '40px' }}>
        {/* Org roles — streamed via `orgRbacPromise` (instant-fetch).
            When no org is active, the `OrgRolesList` is rendered outside
            the stream with `orgId=null` (it shows the "select org" message
            and doesn't fetch). When an org IS active but the RSC didn't
            pre-fetch (interim / no promise), the stream calls `render(undefined)`
            so the hook fetches on mount. */}
        <Suspense fallback={(
          <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <p style={{ ...sectionLabel, marginBottom: 0 }}>{t.organizations.orgRoles}</p>
            </div>
            <div style={{ ...wellStyle, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
              <div style={emptyStateStyle}>
                <BouncingDots size={5} gap={3} color={c.textTertiary} ariaLabel="" /> {t.organizations.loadingPermissions}
              </div>
            </div>
          </div>
        )}>
          <OrgRolesStream
            render={(initialRoles) => (
              <OrgRolesList
                orgId={activeOrgId}
                initialRoles={initialRoles}
                colors={colors}
                t={t}
                mode={mode}
                sectionLabel={sectionLabel}
                wellStyle={wellStyle}
                emptyStateStyle={emptyStateStyle}
              />
            )}
          />
        </Suspense>

        {/* Org permissions — same streamed promise (instant-fetch).
            The "no active org" case is handled here (outside the stream)
            to preserve the existing "select org for permissions" UX. When
            an org IS active but no promise is available, the stream calls
            `render(undefined)` so `PermissionsBlock` fetches on mount. */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          {activeOrgId ? (
            <Suspense fallback={(
              <>
                <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
                <div style={{ ...wellStyle, flex: 1, minHeight: 0, overflowY: 'auto', marginBottom: 0 }}>
                  <div style={emptyStateStyle}>
                    <BouncingDots size={5} gap={3} color={c.textTertiary} ariaLabel="" /> {t.organizations.loadingPermissions}
                  </div>
                </div>
              </>
            )}>
              <OrgPermissionsStream
                render={(initialData) => (
                  <PermissionsBlock
                    activeOrgId={activeOrgId}
                    colors={colors}
                    t={t}
                    scrollWell
                    mode={mode}
                    initialData={initialData}
                  />
                )}
              />
            </Suspense>
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
