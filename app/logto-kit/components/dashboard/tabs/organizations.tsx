'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { RoleCard } from '../shared/RoleCard';
import { setActiveOrg } from '../../../custom-logic/actions/set-active-org';
import { useOrgMode } from '../../handlers/preferences';
import { loadOrganizationPermissions } from '../../../actions/load-org-permissions';

// ─── Hardcoded design tokens ───
const FONT_SANS = "'DM Sans', system-ui, sans-serif";
const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

interface OrganizationsTabProps {
  userData: UserData;
  currentOrgId?: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

export function OrganizationsTab({ userData, currentOrgId, mode, colors, t }: OrganizationsTabProps) {
  const c = colors;
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [loadedPermissions, setLoadedPermissions] = useState<string[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const lastFailedOrgRef = useRef<string | null>(null);

  const activeOrgId = asOrg ?? currentOrgId;

  const organizations = userData.organizations || [];
  // Only show roles for the active organization (security: don't show org roles when "be yourself")
  const organizationRoles = activeOrgId ? (userData.organizationRoles || []).filter(role => role.organizationId === activeOrgId) : [];
  // Use loaded permissions if available, otherwise fall back to userData
  const organizationPermissions = loadedPermissions.length > 0 ? loadedPermissions : (userData.organizationPermissions || []);

  // Load permissions for active organization, clear when switching to "be yourself"
  // Bug 1 fix: clear loadedPermissions on every activeOrgId change (no stale data)
  // Bug 2 fix: cancelled flag prevents setState on unmounted component
  // Bug 3 fix: permissionsLoading tracks loading vs empty state
  useEffect(() => {
    let cancelled = false;

    if (!activeOrgId) {
      // User is in "be yourself" mode - clear all organization permissions
      setLoadedPermissions([]);
      setPermissionsLoading(false);
      lastFailedOrgRef.current = null;
      return;
    }

    // Skip re-fetching if this org already failed to load permissions
    if (activeOrgId === lastFailedOrgRef.current) return;

    // Clear old permissions when switching orgs (Bug 1)
    setLoadedPermissions([]);
    setPermissionsLoading(true);

    loadOrganizationPermissions(activeOrgId)
      .then(r => {
        if (cancelled) return;
        if (r.ok) {
          lastFailedOrgRef.current = null;
          setLoadedPermissions(r.data);
        } else {
          console.error('[OrganizationsTab] Failed to load permissions:', r.error);
          lastFailedOrgRef.current = activeOrgId;
          setLoadedPermissions(userData.organizationPermissions || []);
        }
      })
      .catch(error => {
        if (cancelled) return;
        console.error('[OrganizationsTab] Failed to load permissions:', error);
        lastFailedOrgRef.current = activeOrgId;
        setLoadedPermissions(userData.organizationPermissions || []);
      })
      .finally(() => {
        if (!cancelled) {
          setPermissionsLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [activeOrgId, userData.organizationPermissions]);

  const handleOrgClick = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    setIsLoading(orgId);
    try {
      const isValid = await setActiveOrg(orgId);
      if (!isValid) return;
      setAsOrg(orgId);
      router.refresh();
    } catch (err) {
      console.error('[OrganizationsTab] Failed to switch organization:', err);
    } finally {
      setIsLoading(null);
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

  const OrgCard = ({ org, isSelected }: { org: { id: string; name: string }; isSelected: boolean }) => (
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

  return (
    <div>
      {/* Organizations */}
      <p style={sectionLabel}>{t.organizations.orgs}</p>
      <div style={wellStyle}>
        <p style={{ ...mutedMonoStyle, marginBottom: '0.75rem' }}>
          {t.organizations.description}
        </p>

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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {organizations.map(org => (
                <OrgCard
                  key={org.id}
                  org={org}
                  isSelected={org.id === activeOrgId}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Roles */}
      <p style={sectionLabel}>{t.organizations.orgRoles}</p>
      <div style={wellStyle}>
        <p style={{ ...mutedMonoStyle, marginBottom: '0.75rem' }}>
          {activeOrgId
            ? t.organizations.rolesDescription
            : t.organizations.selectOrgForRoles
          }
        </p>

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
              const org = organizations.find(o => o.id === role.organizationId);
              return (
                <RoleCard
                  key={`${role.id}-${index}`}
                  name={role.name}
                  subtitle={org?.name || role.organizationId}
                  subtitleLabel={t.organizations.organizationLabel}
                  id={role.id}
                  idLabel={t.organizations.roleIdLabel}
                  colors={colors}
                  t={t}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions */}
      <p style={sectionLabel}>{t.organizations.orgPermissions}</p>
      <div style={wellStyle}>
        <p style={{ ...mutedMonoStyle, marginBottom: '0.75rem' }}>
          {activeOrgId
            ? t.organizations.orgPermissionsDesc
            : t.organizations.selectOrgForPermissions
          }
        </p>

        {organizationPermissions.length === 0 ? (
          <div style={emptyStateStyle}>
            {activeOrgId
              ? permissionsLoading
                ? t.organizations.loadingPermissions
                : t.organizations.noOrgPermissions
              : t.organizations.noActiveOrg}
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
    </div>
  );
}
