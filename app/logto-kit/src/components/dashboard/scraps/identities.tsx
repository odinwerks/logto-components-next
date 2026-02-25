'use client';

import type { UserData } from '../../../logic/types';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import { CodeBlock } from '../shared/CodeBlock';

interface IdentitiesTabProps {
  userData: UserData;
  themeColors: ThemeColors;
  t: Translations;
}

export function IdentitiesTab({ userData, themeColors, t }: IdentitiesTabProps) {
  const identityEntries = Object.entries(userData.identities || {});

  return (
    <div>
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            color: themeColors.textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.identities.title}
        </h3>

        <p
          style={{
            color: themeColors.textTertiary,
            fontSize: '10px',
            marginBottom: '12px',
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.identities.description}
        </p>

        {identityEntries.length === 0 ? (
          <div
            style={{
              padding: '20px',
              textAlign: 'center',
              color: themeColors.textTertiary,
              fontSize: '11px',
              fontFamily: 'var(--font-ibm-plex-mono)',
            }}
          >
            {t.identities.noIdentities}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {identityEntries.map(([provider, identity]) => (
              <div
                key={provider}
                style={{
                  padding: '12px',
                  background: themeColors.bgPrimary,
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                }}
              >
                <div
                  style={{
                    color: themeColors.textPrimary,
                    fontSize: '11px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                    textTransform: 'uppercase',
                  }}
                >
                  {provider}
                </div>
                <div
                  style={{
                    color: themeColors.textSecondary,
                    fontSize: '10px',
                    marginBottom: '8px',
                    fontFamily: 'var(--font-ibm-plex-mono)',
                  }}
                >
                  {t.identities.userIdLabel}: {identity.userId}
                </div>
                {identity.details && Object.keys(identity.details).length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px',
                      background: themeColors.bgSecondary,
                      borderRadius: '3px',
                      fontSize: '10px',
                      fontFamily: 'var(--font-ibm-plex-mono)',
                    }}
                  >
                    <div
                      style={{
                        color: themeColors.textTertiary,
                        fontSize: '9px',
                        marginBottom: '4px',
                      }}
                    >
                      {t.identities.detailsLabel}:
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        color: themeColors.textSecondary,
                        fontSize: '9px',
                        lineHeight: '1.4',
                        overflow: 'auto',
                      }}
                    >
                      {JSON.stringify(identity.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Raw Data */}
      <div
        style={{
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          padding: '16px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            color: themeColors.textPrimary,
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {t.identities.rawHeading}
        </h3>
        <CodeBlock title={t.identities.rawTitle} data={userData.identities} themeColors={themeColors} t={t} />
      </div>
    </div>
  );
}
