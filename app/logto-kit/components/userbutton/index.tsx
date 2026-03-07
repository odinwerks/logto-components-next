'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import { Dashboard } from '../dashboard';

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
  /** Render mode: show avatar image or initials fallback. Defaults to 'Initials'. */
  Canvas?: 'Avatar' | 'Initials';
  /** CSS size string for both width and height. Defaults to '6.25rem'. */
  Size?: string;
  /** Shape of the avatar container. */
  shape?: 'circle' | 'sq' | 'rsq';
  userData: UserData;
  themeColors: ThemeColors;
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
  userData: UserData;
  themeColors: ThemeColors;
  // NOTE: `do` is intentionally omitted — the badge is non-interactive.
}

// ============================================================================
// DashboardModal
// ============================================================================

interface DashboardModalProps {
  onClose: () => void;
  themeColors: ThemeColors;
}

function DashboardModal({ onClose, themeColors }: DashboardModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Prevent body scroll while modal is open
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
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    padding: '1.5rem',
    animation: 'ub-fade-in 0.18s ease',
  };

  const dialogStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    maxWidth: '960px',
    maxHeight: 'calc(100vh - 3rem)',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px ${themeColors.borderColor}`,
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
    border: `1px solid ${themeColors.borderColor}`,
    borderRadius: '4px',
    background: themeColors.bgSecondary,
    color: themeColors.textSecondary,
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
      {/* Keyframe injection — only rendered once per mount */}
      <style>{`
        @keyframes ub-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ub-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>

      <div ref={overlayRef} style={overlayStyle} onClick={handleOverlayClick}>
        <div style={dialogStyle} role="dialog" aria-modal="true">
          {/* Close button */}
          <button
            style={closeBtnStyle}
            onClick={onClose}
            aria-label="Close dashboard"
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = themeColors.textPrimary;
              (e.currentTarget as HTMLButtonElement).style.background = themeColors.bgTertiary;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = themeColors.textSecondary;
              (e.currentTarget as HTMLButtonElement).style.background = themeColors.bgSecondary;
            }}
          >
            ✕
          </button>

          {/* Dashboard content */}
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
  themeColors: ThemeColors;
  imageFailed: boolean;
  onImageError: () => void;
}

function AvatarCore({
  Canvas,
  Size,
  shape,
  userData,
  themeColors,
  imageFailed,
  onImageError,
}: AvatarCoreProps) {
  const mode: 'Avatar' | 'Initials' =
    Canvas === 'Avatar' || Canvas === 'Initials' ? Canvas : 'Initials';

  const isShowingAvatar = mode === 'Avatar' && userData.avatar && !imageFailed;

  const containerStyle: React.CSSProperties = {
    width: Size,
    height: Size,
    borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '8px' : '50%',
    border: `2px solid ${themeColors.borderColor}`,
    background: isShowingAvatar ? 'transparent' : themeColors.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: themeColors.textTertiary,
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
  userData,
  themeColors,
  do: customAction,
}: UserButtonProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

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
    borderRadius: shape === 'sq' ? '0%' : shape === 'rsq' ? '10px' : '50%',
    transition: 'opacity 0.15s, transform 0.15s',
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
        <AvatarCore
          Canvas={Canvas}
          Size={Size}
          shape={shape}
          userData={userData}
          themeColors={themeColors}
          imageFailed={imageFailed}
          onImageError={() => setImageFailed(true)}
        />
      </button>

      {modalOpen && (
        <DashboardModal onClose={handleClose} themeColors={themeColors} />
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
  userData,
  themeColors,
}: UserBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    cursor: 'default',
    userSelect: 'none',
    pointerEvents: 'none', // fully non-interactive
  };

  return (
    <div style={containerStyle} aria-hidden="true">
      <AvatarCore
        Canvas={Canvas}
        Size={Size}
        shape={shape}
        userData={userData}
        themeColors={themeColors}
        imageFailed={imageFailed}
        onImageError={() => setImageFailed(true)}
      />
    </div>
  );
}