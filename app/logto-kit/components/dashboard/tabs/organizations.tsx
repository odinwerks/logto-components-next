'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import { FONT_SANS, FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { RoleCard } from '../shared/RoleCard';
import { RefreshButton } from '../shared/RefreshButton';
import { setActiveOrg } from '../../../custom-logic/set-active-org';
import { useOrgMode } from '../../providers/preferences';
import { useRefreshable } from '../../../hooks/use-refreshable';
import { loadOrganizationPermissions } from '../../../server-actions/load-org-permissions';
import { loadOrganizationUserRoles } from '../../../server-actions/load-org-roles';

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
  org: { id: string; name: string };
  isSelected: boolean;
  isLoading: string | null;
  handleOrgClick: (orgId: string) => Promise<void>;
  colors: ThemeColors;
  t: Translations;
}

const OrgCard = ({ org, isSelected, isLoading, handleOrgClick, colors, t }: OrgCardProps) => {
  const c = colors;
  return (
    <button
      onClick={() => handleOrgClick(org.id)}
      role="radio"
      aria-checked={isSelected}
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
        <div style={{ color: c.textTertiary, fontSize: '0.5625rem', marginTop: '0.125rem', fontFamily: FONT_MONO }}>
          {t.organizations.idLabel}: {org.id}
        </div>
      </div>
    </button>
  );
};

// ─── PermissionsBlock — refreshable wrapper so the Refresh button
//     unmounts / remounts the entire block, running effects fresh. ───
interface PermissionsBlockProps {
  activeOrgId: string;
  colors: ThemeColors;
  t: Translations;
  userData: UserData;
  scrollWell?: boolean;
}

const PermissionsBlock = ({ activeOrgId, colors, t, userData, scrollWell }: PermissionsBlockProps) => {
  const c = colors;
  const { visible, triggerRefresh } = useRefreshable();
  const [loadedPermissions, setLoadedPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

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

  const mutedMonoStyle: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontSize: '0.625rem',
    color: c.textTertiary,
    lineHeight: 1.5,
  };

  const emptyStateStyle: React.CSSProperties = {
    padding: '1.5rem 1rem',
    textAlign: 'center' as const,
    color: c.textTertiary,
  };

  useEffect(() => {
    let cancelled = false;

    setLoadedPermissions([]);
    setPermissionsLoading(true);

    loadOrganizationPermissions(activeOrgId)
      .then(r => {
        if (cancelled) return;
        if (r.ok) {
          setLoadedPermissions(r.data);
        } else {
          console.error('[PermissionsBlock] Failed to load permissions:', r.error);
          setLoadedPermissions([]);
        }
      })
      .catch(error => {
        if (cancelled) return;
        console.error('[PermissionsBlock] Failed to load permissions:', error);
        setLoadedPermissions([]);
      })
      .finally(() => {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      });

    return () => { cancelled = true; };
    // intentional: relies on unmount/remount for refresh, not dependency tracking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrgId, userData]);

  const organizationPermissions = loadedPermissions;

  if (!visible) return null;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
        <RefreshButton onClick={triggerRefresh} loading={permissionsLoading} colors={colors} />
      </div>
      <div style={{ ...wellStyle, ...(scrollWell ? { flex: 1, minHeight: 0, overflowY: 'auto' as const, marginBottom: 0 } : {}) }}>
        {organizationPermissions.length === 0 ? (
          <div style={emptyStateStyle}>
            {permissionsLoading
              ? t.organizations.loadingPermissions
              : t.organizations.noOrgPermissions}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {organizationPermissions.map((permission, index) => (
              <div
                key={`${permission}-${index}`}
                style={{
                  padding: '0.5rem 0.75rem',
                  background: c.bgPrimary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  fontFamily: FONT_MONO,
                  fontSize: '0.6875rem',
                  color: c.textPrimary,
                }}
              >
                {permission}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export function OrganizationsTab({ userData, currentOrgId, mode, colors, t, mobmode }: OrganizationsTabProps) {
  const c = colors;
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

  const activeOrgId = asOrg ?? currentOrgId;

  const organizations = userData.organizations || [];
  // Only show roles for the active organization (security: don't show org roles when "be yourself")
  const organizationRoles = activeOrgId ? (userData.organizationRoles || []).filter(role => role.organizationId === activeOrgId) : [];

  // Fetch the user's org role details from Management API (real UUIDs + descriptions)
  const [orgUserRoles, setOrgUserRoles] = useState<Record<string, { id: string; description?: string }>>({});

  useEffect(() => {
    let cancelled = false;
    setOrgUserRoles({});

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
        setErrorMsg('You are not a member of this organization.');
        return;
      }
      startTransition(() => {
        setAsOrg(orgId);
        router.refresh();
      });
    } catch (err) {
      console.error('[OrganizationsTab] Failed to switch organization:', err);
      setErrorMsg('Failed to switch organization. Please try again.');
    } finally {
      setIsLoading(null);
      switchingRef.current = false;
    }
  };

  const handleBeYourself = () => {
    if (activeOrgId === null || activeOrgId === undefined) return;
    setIsLoading('clear');
    try {
      setAsOrg(null);
      router.refresh();
    } catch (err) {
      console.error('[OrganizationsTab] Failed to clear organization:', err);
      setErrorMsg('Failed to switch to personal mode. Please try again.');
    } finally {
      setIsLoading(null);
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
    padding: '1.5rem 1rem',
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
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0, marginBottom: '40px' }}>
        {/* Roles */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>{t.organizations.orgRoles}</p>
            <RefreshButton onClick={() => router.refresh()} loading={false} colors={colors} />
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
                {organizationRoles.map((role, index) => {
                  const apiData = orgUserRoles[role.name];
                  return (
                    <RoleCard
                      key={`${role.id}-${index}`}
                      name={role.name}
                      roleId={apiData?.id}
                      description={apiData?.description}
                      colors={colors}
                      t={t}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Permissions — refreshable block remounts on refresh */}
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
          {activeOrgId ? (
            <PermissionsBlock activeOrgId={activeOrgId} colors={colors} t={t} userData={userData} scrollWell />
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
