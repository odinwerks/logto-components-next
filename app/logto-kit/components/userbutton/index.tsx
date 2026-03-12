'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { UserData } from '../../logic/types';
import type { ThemeSpec } from '../../themes';
import { useThemeMode } from '../handlers/preferences';
import { useUserDataContext } from '../handlers/user-data-context';
import { fetchUserBadgeData } from '../../logic/actions';
import { Dashboard } from '../dashboard';
import { User } from 'lucide-react';

// ============================================================================
// Helpers
// ============================================================================

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

// ============================================================================
// Types
// ============================================================================

export interface UserButtonProps {
  /** Canvas type - Avatar or Initials */
  Canvas?: 'Avatar' | 'Initials';
  /** Size of the avatar */
  Size?: string;
  /** Shape of the avatar container. */
  shape?: 'circle' | 'sq' | 'rsq';
  /** User data - fetches automatically if not provided */
  userData?: UserData;
  /** Theme - uses ThemeModeProvider if not provided */
  theme?: ThemeSpec;
  /**
   * Optional custom click handler. When provided, this function is called
   * instead of opening the Dashboard modal. Useful for custom integrations.
   */
  do?: () => void;
}

export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  theme?: ThemeSpec;
  // NOTE: `do` is intentionally omitted — the badge is non-interactive.
}

export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  shape?: 'circle' | 'sq' | 'rsq';
  userData?: UserData;
  themeColors?: ReturnType<typeof useThemeMode>['themeColors'];
  // NOTE: `do` is intentionally omitted — the badge is non-interactive.
}

// ============================================================================
// DashboardModal
// ============================================================================

interface DashboardModalProps {
  onClose: () => void;
  theme: ThemeSpec;
}

function DashboardModal({ onClose, theme }: DashboardModalProps) {
  const themeColors = theme.colors;
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    backdropFilter: 'blur(0.25rem)',
    WebkitBackdropFilter: 'blur(0.25rem)',
    padding: '1.5rem',
    animation: 'ub-fade-in 0.18s ease',
  };

  const dialogStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '60rem',
    maxHeight: 'calc(100vh - 3rem)',
    borderRadius: '0.625rem',
    overflow: 'hidden',
    boxShadow: `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px ${theme.colors.borderColor}`,
    display: 'flex',
    flexDirection: 'column',
    animation: 'ub-slide-up 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
  };

  const closeBtnStyle: React.CSSProperties = {
    position: 'absolute',
    top: '0.75rem',
    right: '0.75rem',
    zIndex: 10,
    width: '2rem',
    height: '2rem',
    border: `1px solid ${theme.colors.borderColor}`,
    borderRadius: '0.25rem',
    background: theme.colors.bgSecondary,
    color: theme.colors.textSecondary,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    lineHeight: 1,
    transition: 'color 0.15s, background 0.15s',
  };

  const innerStyle: React.CSSProperties = {
    overflowY: 'auto',
    overflowX: 'hidden',
    flex: 1,
    minHeight: 0,
  };

  return createPortal(
    <>
      <style>{`
        @keyframes ub-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ub-slide-up {
          from { opacity: 0; transform: translateY(0.75rem) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      <div ref={overlayRef} style={overlayStyle} onClick={handleOverlayClick}>
        <div style={dialogStyle} role="dialog" aria-modal="true">
          <button
            style={closeBtnStyle}
            onClick={onClose}
            aria-label="Close dashboard"
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textPrimary;
              (e.currentTarget as HTMLButtonElement).style.background = theme.colors.bgTertiary;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = theme.colors.textSecondary;
              (e.currentTarget as HTMLButtonElement).style.background = theme.colors.bgSecondary;
            }}
          >
            ✕
          </button>

          <div style={innerStyle}>
            <Dashboard />
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ============================================================================
// AvatarCore — shared visual, no interaction logic
// ============================================================================

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
  Canvas,
  Size,
  shape,
  userData,
  theme,
  imageFailed,
  onImageError,
}: AvatarCoreProps) {
  const themeColors = theme.colors;
  const mode: 'Avatar' | 'Initials' =
    Canvas === 'Avatar' || Canvas === 'Initials' ? Canvas : 'Initials';

  const isShowingAvatar = mode === 'Avatar' && userData.avatar && !imageFailed;

  const containerStyle: React.CSSProperties = {
    width: Size,
    height: Size,
    borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '0.5rem' : '50%',
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

// ============================================================================
// UserButton — clickable; opens Dashboard modal or fires custom `do` handler
// ============================================================================

export function UserButton({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
  do: customAction,
}: UserButtonProps) {
  const { themeSpec: contextTheme } = useThemeMode();
  const theme = providedTheme ?? contextTheme;
  
  const contextUserData = useUserDataContext();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFallback, setShowFallback] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Priority: 1. Prop, 2. Context, 3. Fetch
    if (providedUserData) {
      setUserData(providedUserData);
      setLoading(false);
      return;
    }

    if (contextUserData) {
      setUserData(contextUserData);
      setLoading(false);
      return;
    }

    // No prop and no context - fetch from server
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setShowFallback(true);
      }
    }, 1500);

    fetchUserBadgeData()
      .then((result) => {
        if (result.success && isMountedRef.current) {
          setUserData(result.userData);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setShowFallback(true);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
          clearTimeout(timeout);
        }
      });

    return () => clearTimeout(timeout);
  }, [providedUserData, contextUserData]);

  const handleClick = useCallback(() => {
    if (typeof customAction === 'function') {
      customAction();
    } else {
      setModalOpen(true);
    }
  }, [customAction]);

  const handleClose = useCallback(() => setModalOpen(false), []);

  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    cursor: 'pointer',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '0.625rem' : '50%',
    transition: 'opacity 0.15s, transform 0.15s',
  };

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) {
        const sizeNum = parseFloat(Size);
        return (
          <div style={{
            width: Size,
            height: Size,
            borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '0.5rem' : '50%',
            border: `2px solid ${theme.colors.borderColor}`,
            background: theme.colors.bgTertiary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textTertiary,
          }}>
            <User size={isNaN(sizeNum) ? 24 : sizeNum * 0.4} />
          </div>
        );
      }
      return null;
    }

    return (
      <AvatarCore
        Canvas={Canvas}
        Size={Size}
        shape={shape}
        userData={userData}
        theme={theme}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    );
  };

  return (
    <>
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

      {modalOpen && (
        <DashboardModal onClose={handleClose} theme={theme} />
      )}
    </>
  );
}

// ============================================================================
// UserBadge — same visual as UserButton but non-interactive (no click handler)
// ============================================================================

export function UserBadge({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
}: UserBadgeProps) {
  const { themeSpec: contextTheme } = useThemeMode();
  const theme = providedTheme ?? contextTheme;
  
  const contextUserData = useUserDataContext();
  
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
    // Priority: 1. Prop, 2. Context, 3. Fetch
    if (providedUserData) {
      setUserData(providedUserData);
      setLoading(false);
      return;
    }

    if (contextUserData) {
      setUserData(contextUserData);
      setLoading(false);
      return;
    }

    // No prop and no context - fetch from server
    const timeout = setTimeout(() => {
      if (isMountedRef.current) {
        setShowFallback(true);
      }
    }, 1500);

    fetchUserBadgeData()
      .then((result) => {
        if (result.success && isMountedRef.current) {
          setUserData(result.userData);
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setShowFallback(true);
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoading(false);
          clearTimeout(timeout);
        }
      });

    return () => clearTimeout(timeout);
  }, [providedUserData, contextUserData]);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    cursor: 'default',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const renderAvatar = () => {
    if (loading || !userData) {
      if (showFallback) {
        const sizeNum = parseFloat(Size);
        return (
          <div style={{
            width: Size,
            height: Size,
            borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '0.5rem' : '50%',
            border: `2px solid ${theme.colors.borderColor}`,
            background: theme.colors.bgTertiary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: theme.colors.textTertiary,
          }}>
            <User size={isNaN(sizeNum) ? 24 : sizeNum * 0.4} />
          </div>
        );
      }
      return null;
    }

    return (
      <AvatarCore
        Canvas={Canvas}
        Size={Size}
        shape={shape}
        userData={userData}
        theme={theme}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    );
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      {renderAvatar()}
    </div>
  );
}
