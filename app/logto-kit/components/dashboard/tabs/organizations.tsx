'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';
import { setActiveOrg } from '../../../custom-logic/actions/set-active-org';
import { useOrgMode } from '../../handlers/preferences';

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

  const organizations     = userData.organizations      || [];
  const organizationRoles = userData.organizationRoles  || [];

  const activeOrgId = asOrg ?? currentOrgId;

  const handleOrgClick = async (orgId: string) => {
    if (orgId === activeOrgId) return;
    const isValid = await setActiveOrg(orgId);
    if (!isValid) return;
    setIsLoading(orgId);
    try {
      setAsOrg(orgId);
      router.refresh();
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
    <div
      onClick={() => handleOrgClick(org.id)}
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
          {isSelected && <span style={{ marginLeft: '0.5rem', fontSize: ty.size.micro }}>(active)</span>}
        </div>
        <div style={{ color: c.textTertiary, fontSize: ty.size.micro, marginTop: '0.125rem', fontFamily: ty.fontMono }}>
          {t.organizations.idLabel}: {org.id}
        </div>
      </div>
    </div>
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
              <div 
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
                }}
              >
                ← Be yourself (global)
              </div>
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
          {t.organizations.rolesDescription}
        </p>

        {organizationRoles.length === 0 ? (
          <div style={cs.surfaces.emptyState}>{t.organizations.noRoles}</div>
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
                    {t.organizations.organizationLabel}: {org?.name || role.organizationId}
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

      {/* Raw JSON */}
      <p style={cs.text.sectionLabel}>{t.organizations.rawHeading}</p>
      <div style={cs.surfaces.well}>
        <CodeBlock
          title={t.organizations.rawTitle}
          data={{ organizations, organizationRoles }}
          theme={theme}
          t={t}
        />
      </div>
    </div>
  );
}
