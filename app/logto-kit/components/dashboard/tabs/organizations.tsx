'use client';

import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface OrganizationsTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
}

export function OrganizationsTab({ userData, themeColors, t }: OrganizationsTabProps) {
  const organizations = userData.organizations || [];
  const organizationRoles = userData.organizationRoles || [];

  return (
    <div>
      {/* Organizations */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            margin: '0 0 0.75rem 0',
            color: themeColors.textPrimary,
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.organizations.orgs}
        </h3>

        <p
          style={{
            color: themeColors.textTertiary,
            fontSize: '0.625rem',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.organizations.description}
        </p>

        {organizations.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              color: themeColors.textTertiary,
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.organizations.noOrganizations}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {organizations.map((org) => (
              <div
                key={org.id}
                style={{
                  padding: '0.625rem 0.75rem',
                  background: themeColors.bgPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '0.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div
                    style={{
                      color: themeColors.textPrimary,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {org.name}
                  </div>
                  <div
                    style={{
                      color: themeColors.textTertiary,
                      fontSize: '0.5625rem',
                      marginTop: '0.125rem',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {t.organizations.idLabel}: {org.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Organization Roles */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          padding: '1rem',
          marginBottom: '1rem',
        }}
      >
        <h3
          style={{
            margin: '0 0 0.75rem 0',
            color: themeColors.textPrimary,
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.organizations.orgRoles}
        </h3>

        <p
          style={{
            color: themeColors.textTertiary,
            fontSize: '0.625rem',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.organizations.rolesDescription}
        </p>

        {organizationRoles.length === 0 ? (
          <div
            style={{
              padding: '1.25rem',
              textAlign: 'center',
              color: themeColors.textTertiary,
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.organizations.noRoles}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {organizationRoles.map((role, index) => {
              const org = organizations.find((o) => o.id === role.organizationId);
              return (
                <div
                  key={`${role.id}-${index}`}
                  style={{
                    padding: '0.625rem 0.75rem',
                    background: themeColors.bgPrimary,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '0.25rem',
                  }}
                >
                  <div
                    style={{
                      color: themeColors.textPrimary,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-ibm-plex-mono)',
                      marginBottom: '0.25rem',
                    }}
                  >
                    {role.name}
                  </div>
                  <div
                    style={{
                      color: themeColors.textSecondary,
                      fontSize: '0.5625rem',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {t.organizations.organizationLabel}: {org?.name || role.organizationId}
                  </div>
                  <div
                    style={{
                      color: themeColors.textTertiary,
                      fontSize: '0.5625rem',
                      marginTop: '0.125rem',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    {t.organizations.roleIdLabel}: {role.id}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw Data */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          padding: '1rem',
        }}
      >
        <h3
          style={{
            margin: '0 0 0.75rem 0',
            color: themeColors.textPrimary,
            fontSize: '0.75rem',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.organizations.rawHeading}
        </h3>
        <CodeBlock
          title={t.organizations.rawTitle}
          data={{ organizations, organizationRoles }}
          themeColors={themeColors}
          t={t}
        />
      </div>
    </div>
  );
}
