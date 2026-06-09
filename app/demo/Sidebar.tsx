'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserCard } from '../logto-kit/components/UserButton';
import { useThemeMode } from '../logto-kit/components/providers/preferences';
import type { NavItem } from './types';
import { slugify } from './components/SectionComponents';

interface SidebarProps {
  items: NavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
}

const BrandIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 3h4v4H3zM9 3h4v4H9zM3 9h4v4H3zM9 9h4v4H9z"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
  </svg>
);

const sidebarStyle: React.CSSProperties = {
  position: 'relative',
  width: '236px',
  minWidth: '236px',
  height: '100vh',
  background: '#050608',
  borderRight: '1px solid rgba(255,255,255,0.055)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  animation: 'slideIn 0.32s cubic-bezier(0.4,0,0.2,1)',
};

const brandStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  padding: '20px 18px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
};

const brandIconStyle: React.CSSProperties = {
  width: '20px',
  height: '20px',
  flexShrink: 0,
  color: 'rgba(255,255,255,0.4)',
  display: 'flex',
  alignItems: 'center',
};

const brandNameStyle: React.CSSProperties = {
  fontSize: '11.5px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.52)',
  letterSpacing: '0.06em',
};

const brandVerStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.18)',
  letterSpacing: '0.08em',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '3px',
  padding: '2px 5px',
};

const navListStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '6px 0',
  scrollbarWidth: 'none',
};

const navGroupLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 500,
  color: 'rgba(255,255,255,0.18)',
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  padding: '12px 18px 5px',
};

const navItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '9px',
  padding: '8.5px 18px',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.12s ease',
  userSelect: 'none',
};

const navBarStyle: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  top: '22%',
  bottom: '22%',
  width: '2px',
  borderRadius: '0 2px 2px 0',
  background: 'rgba(255,255,255,0.42)',
  opacity: 0,
  transition: 'opacity 0.12s ease',
};

const navIconStyle: React.CSSProperties = {
  width: '14px',
  height: '14px',
  flexShrink: 0,
  color: 'rgba(255,255,255,0.22)',
  transition: 'color 0.12s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const navLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 400,
  color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap',
  transition: 'color 0.12s ease',
  flex: 1,
  textAlign: 'left',
};

const navTypeStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 400,
  color: 'rgba(255,255,255,0.15)',
  letterSpacing: '0.05em',
  flexShrink: 0,
  transition: 'color 0.12s ease',
};

const dropdownStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  paddingLeft: '16px',
  borderLeft: '1px solid rgba(255,255,255,0.06)',
  marginLeft: '32px',
  marginTop: '4px',
  marginBottom: '8px',
  gap: '6px',
};

const dropdownLinkStyle: React.CSSProperties = {
  fontSize: '11px',
  background: 'none',
  border: 'none',
  padding: '2px 0',
  textAlign: 'left',
  cursor: 'pointer',
  outline: 'none',
  transition: 'color 0.12s ease',
};

const footerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  borderTop: '1px solid rgba(255,255,255,0.05)',
  padding: '14px 18px',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

export default function Sidebar({ items, activeId: propActiveId, onSelect }: SidebarProps) {
  const { mode } = useThemeMode();
  const pathname = usePathname() || '';
  const segments = pathname.split('/').filter(Boolean);
  const activeId = propActiveId || segments[0] || 'getting-started';
  const activeSection = segments[1] || '';

  const colors = mode === 'dark'
    ? {
        bg: '#050608',
        border: 'rgba(255,255,255,0.055)',
        borderLight: 'rgba(255,255,255,0.05)',
        textMuted: 'rgba(255,255,255,0.4)',
        text: 'rgba(255,255,255,0.52)',
        textSubtle: 'rgba(255,255,255,0.18)',
        borderSubtle: 'rgba(255,255,255,0.09)',
        navActive: 'rgba(255,255,255,0.038)',
        navHover: 'rgba(255,255,255,0.022)',
        navIndicator: 'rgba(255,255,255,0.42)',
        icon: 'rgba(255,255,255,0.22)',
        iconActive: 'rgba(255,255,255,0.6)',
        label: 'rgba(255,255,255,0.35)',
        labelActive: 'rgba(255,255,255,0.84)',
        typeText: 'rgba(255,255,255,0.15)',
        typeActive: 'rgba(255,255,255,0.28)',
        codeActive: 'rgba(255,255,255,0.74)',
        code: 'rgba(255,255,255,0.28)',
      }
    : {
        bg: '#f3f4f6',
        border: '#e5e7eb',
        borderLight: '#d1d5db',
        textMuted: '#6b7280',
        text: '#374151',
        textSubtle: '#9ca3af',
        borderSubtle: '#e5e7eb',
        navActive: '#e5e7eb',
        navHover: '#f3f4f6',
        navIndicator: '#6b7280',
        icon: '#9ca3af',
        iconActive: '#111827',
        label: '#374151',
        labelActive: '#111827',
        typeText: '#9ca3af',
        typeActive: '#374151',
        codeActive: '#111827',
        code: '#6b7280',
      };

  const themedSidebarStyle = { ...sidebarStyle, background: colors.bg, borderRight: `1px solid ${colors.border}` };
  const themedBrandStyle = { ...brandStyle, borderBottom: `1px solid ${colors.borderLight}` };
  const themedBrandIconStyle = { ...brandIconStyle, color: colors.textMuted };
  const themedBrandNameStyle = { ...brandNameStyle, color: colors.text };
  const themedBrandVerStyle = { ...brandVerStyle, color: colors.textSubtle, border: `1px solid ${colors.borderSubtle}` };
  const themedNavGroupLabelStyle = { ...navGroupLabelStyle, color: colors.textSubtle };
  const themedNavBarStyle = { ...navBarStyle, background: colors.navIndicator };

  return (
    <div style={themedSidebarStyle}>
      <div style={themedBrandStyle}>
        <div style={themedBrandIconStyle}>
          <BrandIcon />
        </div>
        <span style={themedBrandNameStyle}>logto-kit</span>
        <span style={themedBrandVerStyle}>docs</span>
      </div>

      <div style={navListStyle}>
        <div style={themedNavGroupLabelStyle}>Reference</div>
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <div key={item.id}>
              <Link
                href={`/${item.id}/${slugify(item.sections[0])}`}
                style={{ textDecoration: 'none', display: 'block' }}
                onClick={() => onSelect?.(item.id)}
              >
                <div
                  style={{
                    ...navItemStyle,
                    background: isActive ? colors.navActive : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = colors.navHover;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      ...themedNavBarStyle,
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                  <div
                    style={{
                      ...navIconStyle,
                      color: isActive ? colors.iconActive : colors.icon,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span
                    style={{
                      ...navLabelStyle,
                      fontSize: item.code ? '11.5px' : '12px',
                      color: isActive
                        ? item.code
                          ? colors.codeActive
                          : colors.labelActive
                        : item.code
                          ? colors.code
                          : colors.label,
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      ...navTypeStyle,
                      color: isActive ? colors.typeActive : colors.typeText,
                    }}
                  >
                    {item.type}
                  </span>
                </div>
              </Link>
              {isActive && item.sections && item.sections.length > 0 && (
                <div style={{ ...dropdownStyle, borderLeftColor: colors.borderLight }}>
                  {item.sections.map((section) => {
                    const sectionId = slugify(section);
                    const isSectionActive = activeSection === sectionId;
                    return (
                      <Link
                        key={section}
                        href={`/${item.id}/${sectionId}`}
                        style={{
                          ...dropdownLinkStyle,
                          textDecoration: 'none',
                          display: 'block',
                          color: isSectionActive ? colors.labelActive : colors.textMuted,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = colors.labelActive)}
                        onMouseLeave={(e) => {
                          if (!isSectionActive) e.currentTarget.style.color = colors.textMuted;
                        }}
                      >
                        {section}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={footerStyle}>
        <UserCard
          Size="42px"
        />
      </div>
    </div>
  );
}
