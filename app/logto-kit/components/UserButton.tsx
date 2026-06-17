'use client';

import { useState, useCallback, useEffect, useRef, useMemo, useSyncExternalStore } from 'react';
import type { UserData } from '../logic/types';
import type { ThemeColors } from '../themes';
import locales from '../locales';
import { useThemeMode } from './providers/preferences';
import { useLogto } from './providers/logto-provider';
import { useUserDataContext } from './providers/user-data-context';
import { User } from 'lucide-react';
import { readEnv } from '../logic/env';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getShape = (shapeProp?: string): string => {
  if (shapeProp) return shapeProp;
  const envShape = readEnv('USER_SHAPE');
  if (envShape) return envShape;
  return 'circle';
};

const getBorderRadius = (shape: string, rsqRadius: string): string => {
  if (shape === 'sq') return '0%';
  if (shape === 'rsq') return rsqRadius;
  if (shape === 'circle') return '50%';
  return shape; // custom CSS value (e.g. '8px', '1rem')
};

const getInitials = (data: UserData): string => {
  if (!data) return '?';
  if (data.profile?.givenName?.trim() && data.profile?.familyName?.trim()) {
    return `${data.profile.givenName.trim()[0]}${data.profile.familyName.trim()[0]}`.toUpperCase();
  }
  if (data.name?.trim()) {
    const parts = data.name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
  }
  if (data.username?.trim()) return data.username.trim()[0]?.toUpperCase() || '?';
  return '?';
};

function getDisplayName(data: UserData): string {
  if (data.name?.trim()) return data.name.trim();
  if (data.profile?.givenName?.trim() && data.profile?.familyName?.trim()) {
    return `${data.profile.givenName.trim()} ${data.profile.familyName.trim()}`;
  }
  if (data.username?.trim()) return data.username.trim();
  if (data.primaryEmail?.trim()) return data.primaryEmail.trim();
  if (data.primaryPhone?.trim()) return data.primaryPhone.trim();
  return 'User';
}

// ─── useMounted (SSR-safe hydration guard) ───────────────────────────────────

const emptySubscribe = () => () => {};

function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

// ─── Shared hook ─────────────────────────────────────────────────────────────

interface UseUserDisplayOptions {
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}

function useUserDisplay(opts: UseUserDisplayOptions) {
  const { colors: contextColors } = useThemeMode();
  const colors = opts.colors ?? contextColors;
  const { openDashboard, lang, isAuthenticated } = useLogto();
  const contextUserData = useUserDataContext();

  const [showFallback, setShowFallback] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Derive userData and loading during render — no state sync needed
  const userData = opts.userData ?? contextUserData ?? null;

  // When explicitly unauthenticated, skip loading and show fallback immediately.
  // When isAuthenticated is undefined (unknown/loading), preserve existing behavior.
  const isExplicitlyUnauthenticated = isAuthenticated === false;

  // Derive showFallback at render: suppress fallback once userData is available
  const effectiveShowFallback = userData ? false : (isExplicitlyUnauthenticated || showFallback);
  const loading = !userData && !effectiveShowFallback;

  // Timeout-only effect — only starts the timer; never calls setState with a derived value
  useEffect(() => {
    if (userData || isExplicitlyUnauthenticated) return; // timer is irrelevant once data arrives or auth state is known
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setShowFallback(true);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [userData, isExplicitlyUnauthenticated]);

  const t = useMemo(
    () => locales[lang as keyof typeof locales] ?? locales['en-US'],
    [lang],
  );

  const handleClick = useCallback(() => {
    const customAction = opts.do;
    if (typeof customAction === 'function') {
      customAction();
    } else if (openDashboard) {
      openDashboard();
    }
  }, [opts.do, openDashboard]);

  return { userData, loading, showFallback: effectiveShowFallback, isExplicitlyUnauthenticated, imageFailed, setImageFailed, colors, t, handleClick };
}

// ─── Fallback avatar ─────────────────────────────────────────────────────────

function FallbackAvatar({ Size, shape, colors }: { Size: string; shape?: string; colors: ThemeColors }) {
  const resolvedShape = getShape(shape);
  const sizeNum = parseFloat(Size);
  return (
    <div style={{
      width: Size, height: Size,
      borderRadius: getBorderRadius(resolvedShape, '0.5rem'),
      border: `2px solid ${colors.borderColor}`,
      background: colors.bgTertiary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors.textTertiary,
    }}>
      <User size={isNaN(sizeNum) ? 24 : sizeNum * 0.4} />
    </div>
  );
}

function LoadingPlaceholder({ Size, shape, colors }: { Size: string; shape?: string; colors: ThemeColors }) {
  const resolvedShape = getShape(shape);
  const prefersReducedMotion = useSyncExternalStore(
    (callback) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      mq.addEventListener('change', callback);
      return () => mq.removeEventListener('change', callback);
    },
    () => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
  return (
    <div
      style={{
        width: Size,
        height: Size,
        borderRadius: getBorderRadius(resolvedShape, '0.5rem'),
        border: `2px solid ${colors.borderColor}`,
        background: colors.bgTertiary,
        opacity: 0.6,
        animation: prefersReducedMotion ? 'none' : 'pulse 1.5s infinite ease-in-out',
      }}
    />
  );
}

// ─── Avatar core ─────────────────────────────────────────────────────────────

interface AvatarCoreProps {
  Canvas?: 'Avatar' | 'Initials';
  Size: string;
  shape?: 'circle' | 'sq' | 'rsq' | (string & {});
  userData: UserData;
  imageFailed: boolean;
  onImageError: () => void;
  colors: ThemeColors;
}

function AvatarCore({
  Canvas, Size, shape, userData, imageFailed, onImageError, colors,
}: AvatarCoreProps) {
  const resolvedShape = getShape(shape);
  const mode: 'Avatar' | 'Initials' = Canvas === 'Initials' ? 'Initials' : 'Avatar';
  const isShowingAvatar = mode === 'Avatar' && userData.avatar && !imageFailed;

  const containerStyle: React.CSSProperties = {
    width: Size,
    height: Size,
    borderRadius: getBorderRadius(resolvedShape, '0.5rem'),
    border: isShowingAvatar ? 'none' : `2px solid ${colors.borderColor}`,
    background: isShowingAvatar ? 'transparent' : colors.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: colors.textTertiary,
    fontSize: `calc(${Size} * 0.36)`,
  };

  if (!isShowingAvatar) {
    return <div style={containerStyle}>{getInitials(userData)}</div>;
  }

  return (
    <div style={containerStyle}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={userData.avatar!}
        alt="User avatar"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          objectFit: 'cover',
          borderRadius: getBorderRadius(resolvedShape, '0.5rem'),
        }}
        onError={onImageError}
      />
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface UserButtonProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | (string & {});
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}

export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | (string & {});
  userData?: UserData;
  colors?: ThemeColors;
}

export interface UserCardProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq' | (string & {});
  userData?: UserData;
  colors?: ThemeColors;
  do?: () => void;
}

// ─── UserButton ──────────────────────────────────────────────────────────────

export function UserButton({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  colors: providedColors,
  do: customAction,
}: UserButtonProps) {
  const { userData, loading, showFallback, imageFailed, setImageFailed, colors, t, handleClick } =
    useUserDisplay({ userData: providedUserData, colors: providedColors, do: customAction });
  const resolvedShape = getShape(shape);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const mounted = useMounted();

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    borderRadius: getBorderRadius(resolvedShape, '0.625rem'),
    transition: 'opacity 0.15s, transform 0.1s',
  };

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) return <FallbackAvatar Size={Size} shape={shape} colors={colors} />;
      return <LoadingPlaceholder Size={Size} shape={shape} colors={colors} />;
    }
    return (
      <AvatarCore
        Canvas={Canvas} Size={Size} shape={shape} userData={userData}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
        colors={colors}
      />
    );
  };

  const labelPrefix = mounted ? t.common.loggedInAs : 'Logged in as';
  const labelSuffix = mounted ? t.common.openUserDashboard : 'Open user dashboard';
  const ariaLabel = `${labelPrefix} ${userData ? getDisplayName(userData) : ""}. ${labelSuffix}`;

  return (
    <button
      style={{
        ...wrapperStyle,
        background: 'none',
        border: 'none',
        padding: 0,
        opacity: hovered ? 0.82 : 1,
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'opacity 0.15s, transform 0.1s',
      }}
      onClick={handleClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
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
  colors: providedColors,
}: UserBadgeProps) {
  const { userData, loading, showFallback, imageFailed, setImageFailed, colors } =
    useUserDisplay({ userData: providedUserData, colors: providedColors });

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) return <FallbackAvatar Size={Size} shape={shape} colors={colors} />;
      return <LoadingPlaceholder Size={Size} shape={shape} colors={colors} />;
    }
    return (
      <AvatarCore
        Canvas={Canvas} Size={Size} shape={shape} userData={userData}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
        colors={colors}
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
  colors: providedColors,
  do: customAction,
}: UserCardProps) {
  const { userData, loading, showFallback, isExplicitlyUnauthenticated, imageFailed, setImageFailed, colors, t, handleClick } =
    useUserDisplay({ userData: providedUserData, colors: providedColors, do: customAction });
  const resolvedShape = getShape(shape);
  const borderRadius = getBorderRadius(resolvedShape, '0.625rem');
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const mounted = useMounted();

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.4375rem',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    background: colors.bgSecondary,
    border: `1px solid ${colors.borderColor}`,
    borderRadius,
    maxWidth: '100%',
    boxSizing: 'border-box',
    transition: 'opacity 0.15s, transform 0.1s',
  };

  const label = mounted ? t.common.loggedInAs : 'Logged in as';
  const labelSuffix = mounted ? t.common.openUserDashboard : 'Open user dashboard';
  const ariaLabel = `${label} ${userData ? getDisplayName(userData) : ""}. ${labelSuffix}`;

  const renderContent = () => {
    if (loading || !userData) {
      if (showFallback) {
        const nameText = isExplicitlyUnauthenticated ? 'Unauthenticated' : '...';
        return (
          <>
            <FallbackAvatar Size={Size} shape={shape} colors={colors} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', textAlign: 'left' }}>
              <span style={{ fontFamily: 'var(--ldd-font-mono)', fontSize: 'var(--ldd-size-xs)', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                {label}
              </span>
              <span style={{ fontFamily: 'var(--ldd-font-sans)', fontSize: 'var(--ldd-size-md)', fontWeight: 'var(--ldd-weight-medium)', color: colors.textPrimary }}>
                {nameText}
              </span>
            </div>
          </>
        );
      }
      return (
        <>
          <LoadingPlaceholder Size={Size} shape={shape} colors={colors} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', textAlign: 'left' }}>
            <span style={{ fontFamily: 'var(--ldd-font-mono)', fontSize: 'var(--ldd-size-xs)', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {label}
            </span>
            <span style={{ fontFamily: 'var(--ldd-font-sans)', fontSize: 'var(--ldd-size-md)', fontWeight: 'var(--ldd-weight-medium)', color: colors.textPrimary }}>
              ...
            </span>
          </div>
        </>
      );
    }

    const displayName = getDisplayName(userData);

    return (
      <>
        <AvatarCore
          Canvas={Canvas} Size={Size} shape={shape} userData={userData}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
          colors={colors}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0, textAlign: 'left' }}>
          <span style={{ fontFamily: 'var(--ldd-font-mono)', fontSize: 'var(--ldd-size-xs)', color: colors.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            {label}
          </span>
          <span style={{
            fontFamily: 'var(--ldd-font-sans)', fontSize: 'var(--ldd-size-md)', fontWeight: 'var(--ldd-weight-medium)',
            color: colors.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {displayName}
          </span>
        </div>
      </>
    );
  };

  return (
    <button
      style={{
        ...wrapperStyle,
        opacity: hovered ? 0.85 : 1,
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
      }}
      onClick={handleClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
    >
      {renderContent()}
    </button>
  );
}
