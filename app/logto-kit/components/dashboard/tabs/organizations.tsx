'use client';

import type { UserData } from '../../../logic/types';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface OrganizationsTabProps {
  userData: UserData;
  theme:    ThemeSpec;
  t:        Translations;
}

export function OrganizationsTab({ userData, theme, t }: OrganizationsTabProps) {
  const cs = theme.components;
  const c  = theme.colors;
  const ty = theme.tokens.typography;

  const organizations     = userData.organizations      || [];
  const organizationRoles = userData.organizationRoles  || [];

  const OrgCard = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      padding:         '0.625rem 0.75rem',
      background:      c.bgPrimary,
      border:          `1px solid ${c.borderColor}`,
      borderRadius:    theme.tokens.radii.sm,
      display:         'flex',
      justifyContent:  'space-between',
      alignItems:      'center',
    }}>
      {children}
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {organizations.map(org => (
              <OrgCard key={org.id}>
                <div>
                  <div style={{ color: c.textPrimary, fontSize: ty.size.sm, fontWeight: ty.weight.semibold, fontFamily: ty.fontMono }}>
                    {org.name}
                  </div>
                  <div style={{ color: c.textTertiary, fontSize: ty.size.micro, marginTop: '0.125rem', fontFamily: ty.fontMono }}>
                    {t.organizations.idLabel}: {org.id}
                  </div>
                </div>
              </OrgCard>
            ))}
          </div>
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
