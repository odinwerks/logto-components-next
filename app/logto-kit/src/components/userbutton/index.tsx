'use client';

import { useState } from 'react';
import type { UserData } from '../../logic/types';
import type { ThemeColors } from '../../themes';

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

export interface UserBadgeProps {
  Canvas?: 'Avatar' | 'Initials';
  Size?: string;
  Border?: string;
  userData: UserData;
  themeColors: ThemeColors;
}

export function UserBadge({
  Canvas,
  Size = '6.25rem',
  Border = '50%',
  userData,
  themeColors,
}: UserBadgeProps) {
  const [imageFailed, setImageFailed] = useState(false);

  let mode: 'Avatar' | 'Initials';

  if (Canvas === 'Avatar' || Canvas === 'Initials') {
    mode = Canvas;
  } else {
    mode = 'Initials';
  }

  const isShowingAvatar = mode === 'Avatar' && userData.avatar && !imageFailed;

  const fontSizeStyle = `calc(${Size} * 0.36)`;

  const containerStyle: React.CSSProperties = {
    width: Size,
    height: Size,
    borderRadius: Border,
    border: `2px solid ${themeColors.borderColor}`,
    background: isShowingAvatar ? 'transparent' : themeColors.bgTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    color: themeColors.textTertiary,
    fontSize: fontSizeStyle,
  };

  if (!isShowingAvatar) {
    return <div style={containerStyle}>{getInitials(userData)}</div>;
  }

  return (
    <div style={containerStyle}>
      <img
        src={userData.avatar}
        alt="Avatar"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={() => setImageFailed(true)}
      />
    </div>
  );
}
