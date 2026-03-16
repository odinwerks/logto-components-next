'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeSpec } from '../../themes';
import { useThemeMode } from '../handlers/preferences';
import { fetchUserBadgeData } from '../../logic/actions';
import { useLogto } from '../handlers/logto-provider';
import { User } from 'lucide-react';

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
  themeColors?: ReturnType<typeof useThemeMode>['themeColors'];
}

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
  const { openDashboard, userData: contextUserData } = useLogto();
  
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
    } else if (openDashboard) {
      openDashboard();
    }
  }, [customAction, openDashboard]);

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

export function UserBadge({
  Canvas,
  Size = '6.25rem',
  shape,
  userData: providedUserData,
  theme: providedTheme,
}: UserBadgeProps) {
  const { themeSpec: contextTheme } = useThemeMode();
  const theme = providedTheme ?? contextTheme;
  const { userData: contextUserData } = useLogto();
  
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
