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
      padding: '10px 12px',
      background: themeColors.bgPrimary,
      border: `1px solid ${themeColors.borderColor}`,
      borderRadius: '4px',
    }}>
      <p style={{
        fontFamily: css.sans, fontWeight: 500, fontSize: 10,
        color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
        marginBottom: 4,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: css.mono, fontSize: 11,
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
      width: 230,
      background: themeColors.bgSecondary,
      borderRight: `1px solid ${themeColors.borderColor}`,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      borderRadius: '6px',
    }}>

      <div style={{ padding: '16px 14px', borderBottom: `1px solid ${themeColors.borderColor}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

          {userData.avatar ? (
            <img
              src={userData.avatar}
              alt={displayName}
              style={{
                width: 32, height: 32, objectFit: 'cover', flexShrink: 0,
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '4px',
              }}
              onError={e => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                const next = e.currentTarget.nextSibling as HTMLElement | null;
                if (next) next.style.display = 'flex';
              }}
            />
          ) : null}

          <div style={{
            width: 32, height: 32,
            background: themeColors.bgTertiary, border: `1px solid ${themeColors.borderColor}`,
            display: userData.avatar ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            borderRadius: '4px',
          }}>
            <span style={{
              fontFamily: css.sans, fontWeight: 700, fontSize: 12, color: themeColors.accentBlue,
            }}>
              {initials}
            </span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontFamily: css.sans, fontWeight: 600, fontSize: 13, color: themeColors.textPrimary,
              lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </p>
            {displayEmail && (
              <p style={{
                fontFamily: css.mono, fontSize: 10, color: themeColors.textTertiary, marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayEmail}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>

        <InfoRow label={t.sidebar?.userId ?? 'User ID'} value={userData.id} themeColors={themeColors} />

        <InfoRow
          label={t.sidebar?.lastLogin ?? 'Last sign-in'}
          value={formatDate(userData.lastSignInAt)}
          themeColors={themeColors}
        />

        <div>
          <p style={{
            fontFamily: css.sans, fontWeight: 500, fontSize: 10,
            color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
            marginBottom: 4, paddingLeft: 0,
          }}>
            {tokenLabel}
          </p>
          <TruncatedToken token={accessToken} t={t} themeColors={themeColors} />
        </div>
      </div>

      {hasMultipleLangs && (
        <div style={{ padding: '12px 12px 0' }}>
          <p style={{
            fontFamily: css.sans, fontWeight: 500, fontSize: 10,
            color: themeColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.6,
            marginBottom: 6,
          }}>
            {t.dashboard?.availableLangs ?? 'Language'}
          </p>

          <div style={{
            background: themeColors.bgPrimary, border: `1px solid ${themeColors.borderColor}`,
            padding: '4px 6px',
            borderRadius: '4px',
          }}>
            {supportedLangs.map(code => {
              const active = code === lang;
              return (
                <button
                  key={code}
                  onClick={() => !active && onChangeLang(code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '5px 6px',
                    background: 'transparent', border: 'none',
                    borderLeft: `2px solid ${active ? themeColors.accentBlue : 'transparent'}`,
                    color: active ? themeColors.accentBlue : themeColors.textTertiary,
                    fontFamily: css.sans, fontWeight: 500, fontSize: 12,
                    cursor: active ? 'default' : 'pointer', textAlign: 'left',
                    transition: 'color 0.1s, border-color 0.1s',
                    borderRadius: '2px',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.color = themeColors.textSecondary; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.color = themeColors.textTertiary; }}
                >
                  {active && (
                    <span style={{ fontSize: 8, color: themeColors.accentBlue }}>●</span>
                  )}
                  <span style={{ flex: 1 }}>{code.toUpperCase()}</span>
                  {active && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: themeColors.textTertiary, fontFamily: css.mono }}>
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

      <div style={{ padding: '8px 10px 12px', borderTop: `1px solid ${themeColors.borderColor}` }}>

        <button
          onClick={onToggleTheme}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '7px 9px',
            background: 'transparent', border: 'none',
            borderLeft: '2px solid transparent',
            color: themeColors.textTertiary,
            fontFamily: css.sans, fontWeight: 500, fontSize: 13,
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.1s', marginBottom: 1,
            borderRadius: '4px',
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
            display: 'flex', alignItems: 'center', gap: 9,
            width: '100%', padding: '7px 9px',
            background: 'transparent', border: 'none',
            borderLeft: '2px solid transparent',
            color: themeColors.textTertiary,
            fontFamily: css.sans, fontWeight: 500, fontSize: 13,
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.1s',
            borderRadius: '4px',
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
