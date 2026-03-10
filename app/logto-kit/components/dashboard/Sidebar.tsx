'use client';

/**
 * Sidebar.tsx
 * -----------
 * Left-panel sidebar for the dashboard.
 * Uses themeColors prop for dual theme support.
 */

import type { UserData } from '../../logic/types';
import type { Translations } from '../../locales';
import type { ThemeColors } from '../../themes';
import { TruncatedToken } from './shared/CodeBlock';
import { css, Btn } from './shared/design';

const SignOutIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M5 2H2v10h3M9.5 4.5L12 7l-2.5 2.5M12 7H5.5"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

const MoonIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M11 8A5 5 0 1 1 6 3a4 4 0 0 0 5 5z"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

const SunIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
  </svg>
);

function InfoRow({ label, value, themeColors }: { label: string; value: string; themeColors: ThemeColors }) {
  return (
    <div style={{
      padding: '0.625rem 0.75rem',
      background: themeColors.bgPrimary,
      border: `1px solid ${themeColors.borderColor}`,
      borderRadius: '0.25rem',
    }}>
      <p style={{
        fontFamily: css.sans, fontWeight: 500, fontSize: '0.625rem',
        color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: '0.25rem',
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: css.mono, fontSize: '0.6875rem',
        color: themeColors.textSecondary, wordBreak: 'break-all', lineHeight: 1.4,
      }}>
        {value}
      </p>
    </div>
  );
}

export interface SidebarProps {
  userData:       UserData;
  accessToken:    string;
  lang:           string;
  supportedLangs: string[];
  theme:          'dark' | 'light';
  themeColors:    ThemeColors;
  t:              Translations;
  formatDate:     (timestamp?: number | string) => string;
  onSignOut:      () => void;
  onToggleTheme:  () => void;
  onChangeLang:   (code: string) => void;
}

export function Sidebar({
  userData,
  accessToken,
  lang,
  supportedLangs,
  theme,
  themeColors,
  t,
  formatDate,
  onSignOut,
  onToggleTheme,
  onChangeLang,
}: SidebarProps) {

  const hasMultipleLangs = supportedLangs.length > 1;
  const isJwt            = accessToken.split('.').length === 3;
  const tokenLabel       = isJwt ? 'JWT Token' : 'Opaque Token';

  const initials = (() => {
    const g = userData.profile?.givenName?.[0]  ?? '';
    const f = userData.profile?.familyName?.[0] ?? '';
    if (g || f) return (g + f).toUpperCase();
    return (userData.username?.[0] ?? userData.name?.[0] ?? '?').toUpperCase();
  })();

  const displayName  = userData.profile?.givenName ?? userData.name ?? userData.username ?? userData.primaryEmail ?? '—';
  const displayEmail = userData.primaryEmail ?? userData.username ?? '';

  return (
    <div style={{
      width: '14.375rem',
      background: themeColors.bgSecondary,
      borderRight: `1px solid ${themeColors.borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRadius: '0.375rem',
    }}>

      <div style={{ padding: '1rem 0.875rem', borderBottom: `1px solid ${themeColors.borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>

          {userData.avatar ? (
            <img
              src={userData.avatar}
              alt={displayName}
              style={{
                width: '2rem', height: '2rem', objectFit: 'cover', flexShrink: 0,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '0.25rem',
              }}
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const next = e.currentTarget.nextSibling as HTMLElement | null;
                if (next) next.style.display = 'flex';
              }}
            />
          ) : null}

          <div style={{
            width: '2rem', height: '2rem',
            background: themeColors.bgTertiary, border: `1px solid ${themeColors.borderColor}`,
            display: userData.avatar ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            borderRadius: '0.25rem',
          }}>
            <span style={{
              fontFamily: css.sans, fontWeight: 700, fontSize: '0.75rem', color: themeColors.accentBlue,
            }}>
              {initials}
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: css.sans, fontWeight: 600, fontSize: '0.8125rem', color: themeColors.textPrimary,
              lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </p>
            {displayEmail && (
              <p style={{
                fontFamily: css.mono, fontSize: '0.625rem', color: themeColors.textTertiary, marginTop: '0.0625rem',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '0.75rem 0.75rem 0', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>

        <InfoRow label={t.sidebar?.userId ?? 'User ID'} value={userData.id} themeColors={themeColors} />

        <InfoRow
          label={t.sidebar?.lastLogin ?? 'Last sign-in'}
          value={formatDate(userData.lastSignInAt)}
          themeColors={themeColors}
        />

        <div>
          <p style={{
            fontFamily: css.sans, fontWeight: 500, fontSize: '0.625rem',
            color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
            marginBottom: '0.25rem', paddingLeft: 0,
          }}>
            {tokenLabel}
          </p>
          <TruncatedToken token={accessToken} t={t} themeColors={themeColors} />
        </div>
      </div>

      {hasMultipleLangs && (
        <div style={{ padding: '0.75rem 0.75rem 0' }}>
          <p style={{
            fontFamily: css.sans, fontWeight: 500, fontSize: '0.625rem',
            color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
            marginBottom: '0.375rem',
          }}>
            {t.dashboard?.availableLangs ?? 'Language'}
          </p>

          <div style={{
            background: themeColors.bgPrimary, border: `1px solid ${themeColors.borderColor}`,
            padding: '0.25rem 0.375rem',
            borderRadius: '0.25rem',
          }}>
            {supportedLangs.map(code => {
              const active = code === lang;
              return (
                <button
                  key={code}
                  onClick={() => !active && onChangeLang(code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.3125rem 0.375rem',
                    background: 'transparent', border: 'none',
                    borderLeft: `0.125rem solid ${active ? themeColors.accentBlue : 'transparent'}`,
                    color: active ? themeColors.accentBlue : themeColors.textTertiary,
                    fontFamily: css.sans, fontWeight: 500, fontSize: '0.75rem',
                    cursor: active ? 'default' : 'pointer', textAlign: 'left',
                    transition: 'color 0.1s, border-color 0.1s',
                    borderRadius: '0.125rem',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = themeColors.textSecondary; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = themeColors.textTertiary; }}
                >
                  {active && (
                    <span style={{ fontSize: '0.5rem', color: themeColors.accentBlue }}>●</span>
                  )}
                  <span style={{ flex: 1 }}>{code.toUpperCase()}</span>
                  {active && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.5625rem', color: themeColors.textTertiary, fontFamily: css.mono }}>
                      {t.sidebar?.active ?? 'active'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      <div style={{ padding: '0.5rem 0.625rem 0.75rem', borderTop: `1px solid ${themeColors.borderColor}` }}>

        <button
          onClick={onToggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5625rem',
            width: '100%', padding: '0.4375rem 0.5625rem',
            background: 'transparent', border: 'none',
            borderLeft: '0.125rem solid transparent',
            color: themeColors.textTertiary,
            fontFamily: css.sans, fontWeight: 500, fontSize: '0.8125rem',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.1s', marginBottom: '0.0625rem',
            borderRadius: '0.25rem',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = themeColors.textSecondary;
            e.currentTarget.style.background = themeColors.bgTertiary;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = themeColors.textTertiary;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          {theme === 'dark'
            ? (t.sidebar?.lightMode ?? 'Light mode')
            : (t.sidebar?.darkMode  ?? 'Dark mode')
          }
        </button>

        <button
          onClick={onSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5625rem',
            width: '100%', padding: '0.4375rem 0.5625rem',
            background: 'transparent', border: 'none',
            borderLeft: '0.125rem solid transparent',
            color: themeColors.textTertiary,
            fontFamily: css.sans, fontWeight: 500, fontSize: '0.8125rem',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.1s',
            borderRadius: '0.25rem',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = themeColors.accentRed;
            e.currentTarget.style.background = themeColors.errorBg;
            e.currentTarget.style.borderLeftColor = themeColors.accentRed;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = themeColors.textTertiary;
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderLeftColor = 'transparent';
          }}
        >
          <SignOutIcon />
          {t.dashboard?.signOut ?? 'Sign out'}
        </button>
      </div>
    </div>
  );
}
