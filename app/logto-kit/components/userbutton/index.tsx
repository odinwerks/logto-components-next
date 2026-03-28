'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeSpec } from '../../themes';
import locales from '../../locales';
import { useThemeMode } from '../handlers/preferences';
import { useLogto } from '../handlers/logto-provider';
import { User } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getShape = (shapeProp?: string): string => {
  if (shapeProp) return shapeProp;
  const envShape = process.env.NEXT_PUBLIC_USER_SHAPE;
  if (envShape) return envShape;
  return 'circle';
};

const getInitials = (data: UserData): string => {
  if (!data) return '?';
  if (data.profile?.givenName && data.profile?.familyName) {
    return `${data.profile.givenName[0]}${data.profile.familyName[0]}`.toUpperCase();
  }
  if (data.name) {
    const parts = data.name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
  }
  if (data.username) return data.username[0]?.toUpperCase() || '?';
  return '?';
};

function getDisplayName(data: UserData): string {
  if (data.name) return data.name;
  if (data.profile?.givenName && data.profile?.familyName) {
    return `${data.profile.givenName} ${data.profile.familyName}`;
  }
  if (data.username) return data.username;
  if (data.primaryEmail) return data.primaryEmail;
  if (data.primaryPhone) return data.primaryPhone;
  return 'User';
}

// ─── Shared hook ─────────────────────────────────────────────────────────────

interface UseUserDisplayOptions {
  userData?: UserData;
  theme?: ThemeSpec;
  do?: () => void;
}

function useUserDisplay(opts: UseUserDisplayOptions) {
  const { themeSpec: contextTheme } = useThemeMode();
  const theme = opts.theme ?? contextTheme;
  const { openDashboard, userData: contextUserData, lang } = useLogto();

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (opts.userData) {
      setUserData(opts.userData);
      setLoading(false);
      return;
    }
    if (contextUserData) {
      setUserData(contextUserData);
      setLoading(false);
      return;
    }
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setShowFallback(true);
        setLoading(false);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [opts.userData, contextUserData]);

  const t = useMemo(
    () => locales[lang as keyof typeof locales] ?? locales['en-US'],
    [lang],
  );

  const handleClick = useCallback(() => {
    if (typeof opts.do === 'function') {
      opts.do();
    } else if (openDashboard) {
      openDashboard();
    }
  }, [opts.do, openDashboard]);

  return { userData, loading, showFallback, imageFailed, setImageFailed, theme, t, handleClick };
}

// ─── Fallback avatar ─────────────────────────────────────────────────────────

function FallbackAvatar({ Size, shape, theme }: { Size: string; shape?: string; theme: ThemeSpec }) {
  const resolvedShape = getShape(shape);
  const sizeNum = parseFloat(Size);
  return (
    <div style={{
      width: Size, height: Size,
      borderRadius: resolvedShape === 'sq' ? '0%' : resolvedShape === 'rsq' ? '0.5rem' : resolvedShape,
      border: `2px solid ${theme.colors.borderColor}`,
      background: theme.colors.bgTertiary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: theme.colors.textTertiary,
    }}>
      <User size={isNaN(sizeNum) ? 24 : sizeNum * 0.4} />
    </div>
  );
}

// ─── Avatar core ─────────────────────────────────────────────────────────────

interface AvatarCoreProps {
  Canvas?: 'Avatar' | 'Initials';
  Size: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData: UserData;
  theme: ThemeSpec;
  imageFailed: boolean;
  onImageError: () => void;
}

function AvatarCore({
  Canvas, Size, shape, userData, theme, imageFailed, onImageError,
}: AvatarCoreProps) {
  const resolvedShape = getShape(shape);
  const mode: 'Avatar' | 'Initials' = Canvas === 'Initials' ? 'Initials' : 'Avatar';
  const isShowingAvatar = mode === 'Avatar' && userData.avatar && !imageFailed;

  const containerStyle: React.CSSProperties = {
    width: Size,
    height: Size,
    borderRadius: resolvedShape === 'sq' ? '0%' : resolvedShape === 'rsq' ? '0.5rem' : resolvedShape,
    border: `2px solid ${theme.colors.borderColor}`,
    background: isShowingAvatar ? 'transparent' : theme.colors.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: theme.colors.textTertiary,
    fontSize: `calc(${Size} * 0.36)`,
  };

  if (!isShowingAvatar) {
    return <div style={containerStyle}>{getInitials(userData)}</div>;
  }

  return (
    <div style={containerStyle}>
      <img
        src={userData.avatar!}
        alt="Avatar"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={onImageError}
      />
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface UserButtonProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  theme?: ThemeSpec;
  do?: () => void;
}

export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  theme?: ThemeSpec;
}

export interface UserCardProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  theme?: ThemeSpec;
  do?: () => void;
}

// ─── UserButton ──────────────────────────────────────────────────────────────

export function UserButton({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
  do: customAction,
}: UserButtonProps) {
  const { userData, loading, showFallback, imageFailed, setImageFailed, theme, handleClick } =
    useUserDisplay({ userData: providedUserData, theme: providedTheme, do: customAction });
  const resolvedShape = getShape(shape);

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    borderRadius: resolvedShape === 'sq' ? '0%' : resolvedShape === 'rsq' ? '0.625rem' : resolvedShape,
    transition: 'opacity 0.15s, transform 0.15s',
  };

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) return <FallbackAvatar Size={Size} shape={shape} theme={theme} />;
      return null;
    }
    return (
      <AvatarCore
        Canvas={Canvas} Size={Size} shape={shape} userData={userData}
        theme={theme} imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    );
  };

  return (
    <button
      style={{ ...wrapperStyle, background: 'none', border: 'none', padding: 0 }}
      onClick={handleClick}
      aria-label="Open user dashboard"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.82'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {renderAvatar()}
    </button>
  );
}

// ─── UserBadge ───────────────────────────────────────────────────────────────

export function UserBadge({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
}: UserBadgeProps) {
  const { userData, loading, showFallback, imageFailed, setImageFailed, theme } =
    useUserDisplay({ userData: providedUserData, theme: providedTheme });

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) return <FallbackAvatar Size={Size} shape={shape} theme={theme} />;
      return null;
    }
    return (
      <AvatarCore
        Canvas={Canvas} Size={Size} shape={shape} userData={userData}
        theme={theme} imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    );
  };

  return (
    <div style={{ display: 'inline-flex', cursor: 'default', userSelect: 'none', pointerEvents: 'none' }} aria-hidden="true">
      {renderAvatar()}
    </div>
  );
}

// ─── UserCard ────────────────────────────────────────────────────────────────
// A wider clickable card: avatar left, "logged in as" + name right.
// Click opens the dashboard. Translations resolved from provider lang state.

export function UserCard({
  Canvas,
  Size = '2.5rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
  do: customAction,
}: UserCardProps) {
  const { userData, loading, showFallback, imageFailed, setImageFailed, theme, t, handleClick } =
    useUserDisplay({ userData: providedUserData, theme: providedTheme, do: customAction });
  const resolvedShape = getShape(shape);
  const c = theme.colors;
  const ty = theme.tokens.typography;
  const borderRadius = resolvedShape === 'sq' ? '0%' : resolvedShape === 'rsq' ? '0.625rem' : resolvedShape;

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.4375rem 0.75rem',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    borderRadius,
    transition: 'opacity 0.15s, transform 0.15s',
  };

  const label = t.common.loggedInAs;

  const renderContent = () => {
    if (loading || !userData) {
      if (showFallback) {
        return (
          <>
            <FallbackAvatar Size={Size} shape={shape} theme={theme} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', textAlign: 'left' }}>
              <span style={{ fontFamily: ty.fontMono, fontSize: ty.size.xs, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
              </span>
              <span style={{ fontFamily: ty.fontSans, fontSize: ty.size.md, fontWeight: ty.weight.medium, color: c.textPrimary }}>
                ...
              </span>
            </div>
          </>
        );
      }
      return null;
    }

    const displayName = getDisplayName(userData);

    return (
      <>
        <AvatarCore
          Canvas={Canvas} Size={Size} shape={shape} userData={userData}
          theme={theme} imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0, textAlign: 'left' }}>
          <span style={{ fontFamily: ty.fontMono, fontSize: ty.size.xs, color: c.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {label}
          </span>
          <span style={{
            fontFamily: ty.fontSans, fontSize: ty.size.md, fontWeight: ty.weight.medium,
            color: c.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {displayName}
          </span>
        </div>
      </>
    );
  };

  return (
    <button
      style={wrapperStyle}
      onClick={handleClick}
      aria-label="Open user dashboard"
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
      onMouseDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
    >
      {renderContent()}
    </button>
  );
}
