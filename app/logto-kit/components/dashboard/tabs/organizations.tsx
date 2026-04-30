'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { setActiveOrg } from '../../../custom-logic/actions/set-active-org';
import { useOrgMode } from '../../handlers/preferences';
import { loadOrganizationPermissions } from '../../../actions/load-org-permissions';

interface OrganizationsTabProps {
  userData: UserData;
  currentOrgId?: string;
  theme:    ThemeSpec;
  t:        Translations;
}

export function OrganizationsTab({ userData, currentOrgId, theme, t }: OrganizationsTabProps) {
  const cs = theme.components;
  const c  = theme.colors;
  const ty = theme.tokens.typography;
  const router = useRouter();
  const { asOrg, setAsOrg } = useOrgMode();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [loadedPermissions, setLoadedPermissions] = useState<string[]>([]);

  const activeOrgId = asOrg ?? currentOrgId;

  const organizations       = userData.organizations        || [];
  // Only show roles for the active organization (security: don't show org roles when "be yourself")
  const organizationRoles   = activeOrgId ? (userData.organizationRoles || []).filter(role => role.organizationId === activeOrgId) : [];
  // Use loaded permissions if available, otherwise fall back to userData
  const organizationPermissions = loadedPermissions.length > 0 ? loadedPermissions : (userData.organizationPermissions || []);

  // Load permissions for active organization, clear when switching to "be yourself"
  useEffect(() => {
    if (activeOrgId) {
      // User is acting as an organization - load permissions
      if (loadedPermissions.length === 0) {
        loadOrganizationPermissions(activeOrgId)
          .then(permissions => {
            setLoadedPermissions(permissions);
          })
          .catch(error => {
            console.error('[OrganizationsTab] Failed to load permissions:', error);
            setLoadedPermissions([]);
          });
      }
    } else {
      // User is in "be yourself" mode - clear all organization permissions
      setLoadedPermissions([]);
    }
  }, [activeOrgId]);

const handleOrgClick = async (orgId: string) => {
  if (orgId === activeOrgId) return;
  try {
    const isValid = await setActiveOrg(orgId);
    if (!isValid) return;
    setIsLoading(orgId);
    setAsOrg(orgId);
    router.refresh();
  } catch (err) {
    console.error('Failed to switch organization:', err);
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
    } finally {
      setIsLoading(null);
    }
  };

  const OrgCard = ({ org, isSelected }: { org: { id: string; name: string }; isSelected: boolean }) => (
    <button
      onClick={() => handleOrgClick(org.id)}
      role="radio"
      aria-checked={isSelected}
      style={{
        padding:         '0.625rem 0.75rem',
        background:      isSelected ? `${c.accentBlue}15` : c.bgPrimary,
        border:          `1px solid ${isSelected ? c.accentBlue : c.borderColor}`,
        borderRadius:    theme.tokens.radii.sm,
        display:         'flex',
        justifyContent:  'space-between',
        alignItems:      'center',
        cursor:          isLoading === org.id ? 'wait' : 'pointer',
        opacity:         isLoading === org.id ? 0.6 : 1,
        transition:      'all 0.15s ease',
        boxShadow:       isSelected ? `0 0 0 1px ${c.accentBlue}` : 'none',
        width:           '100%',
        textAlign:       'left',
      }}
    >
      <div>
        <div style={{ 
          color: isSelected ? c.accentBlue : c.textPrimary, 
          fontSize: ty.size.sm, 
          fontWeight: ty.weight.semibold, 
          fontFamily: ty.fontMono 
        }}>
          {org.name}
      {isSelected && <span style={{ marginLeft: '0.5rem', fontSize: ty.size.micro }}>{t.organizations.active}</span>}
        </div>
        <div style={{ color: c.textTertiary, fontSize: ty.size.micro, marginTop: '0.125rem', fontFamily: ty.fontMono }}>
          {t.organizations.idLabel}: {org.id}
        </div>
      </div>
    </button>
  );

  return (
    <div>
      {/* Organizations */}
      <p style={cs.text.sectionLabel}>{t.organizations.orgs}</p>
      <div style={cs.surfaces.well}>
        <p style={{ ...cs.text.mutedMono, marginBottom: '0.75rem' }}>
          {t.organizations.description}
        </p>

        {organizations.length === 0 ? (
          <div style={cs.surfaces.emptyState}>{t.organizations.noOrganizations}</div>
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
                  borderRadius: theme.tokens.radii.sm,
                  marginBottom: '0.5rem',
                  cursor: isLoading === 'clear' ? 'wait' : 'pointer',
                  opacity: isLoading === 'clear' ? 0.6 : 1,
                  color: c.textSecondary,
                  fontSize: ty.size.sm,
                  fontFamily: ty.fontMono,
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
      <p style={cs.text.sectionLabel}>{t.organizations.orgRoles}</p>
      <div style={cs.surfaces.well}>
        <p style={{ ...cs.text.mutedMono, marginBottom: '0.75rem' }}>
          {activeOrgId
            ? t.organizations.rolesDescription
            : t.organizations.selectOrgForRoles
          }
        </p>

        {organizationRoles.length === 0 ? (
          <div style={cs.surfaces.emptyState}>
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
                <div
                  key={`${role.id}-${index}`}
                  style={{
                    padding:      '0.625rem 0.75rem',
                    background:   c.bgPrimary,
                    border:       `1px solid ${c.borderColor}`,
                    borderRadius: theme.tokens.radii.sm,
                  }}
                >
                  <div style={{ color: c.textPrimary, fontSize: ty.size.sm, fontWeight: ty.weight.semibold, fontFamily: ty.fontMono, marginBottom: '0.25rem' }}>
                    {role.name}
                  </div>
                  <div style={{ color: c.textSecondary, fontSize: ty.size.micro, fontFamily: ty.fontMono }}>
                    {t.organizations.organizationLabel || 'Organization'}: {org?.name || role.organizationId}
                  </div>
                  <div style={{ color: c.textTertiary, fontSize: ty.size.micro, marginTop: '0.125rem', fontFamily: ty.fontMono }}>
                    {t.organizations.roleIdLabel}: {role.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions */}
      <p style={cs.text.sectionLabel}>{t.organizations.orgPermissions}</p>
      <div style={cs.surfaces.well}>
        <p style={{ ...cs.text.mutedMono, marginBottom: '0.75rem' }}>
          {activeOrgId
            ? t.organizations.orgPermissionsDesc
            : t.organizations.selectOrgForPermissions
          }
        </p>

        {organizationPermissions.length === 0 ? (
          <div style={cs.surfaces.emptyState}>
            {activeOrgId ? t.organizations.loadingPermissions : t.organizations.noActiveOrg}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {organizationPermissions.map((permission, index) => (
              <div
                key={`${permission}-${index}`}
                style={{
                  padding:      '0.5rem 0.75rem',
                  background:   c.bgPrimary,
                  border:       `1px solid ${c.borderColor}`,
                  borderRadius: theme.tokens.radii.sm,
                  fontFamily:   ty.fontMono,
                  fontSize:     ty.size.sm,
                  color:        c.textPrimary,
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
