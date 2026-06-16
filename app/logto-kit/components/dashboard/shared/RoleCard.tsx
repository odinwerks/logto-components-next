'use client';

import { useState, useRef, useCallback, useId, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info, Loader2 } from 'lucide-react';
import { getRoleDetails } from '../../../logic/actions/roles';
import type { ThemeColors } from '../../../themes';
import { FONT_MONO } from '../../../themes';
import type { Translations } from '../../../locales';
import { getClampedTooltipPosition } from './tooltip-position';

interface RoleCardProps {
  name: string;
  roleId?: string;
  description?: string;
  colors: ThemeColors;
  t: Translations;
  mode?: 'dark' | 'light';
}


export function RoleCard({ name, roleId, description, colors, t, mode = 'dark' }: RoleCardProps) {
  const descriptionCacheRef = useRef(new Map<string, string | null>());
  const c = colors;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const showTooltip = isHovered || isFocused;
  const tooltipId = useId();
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [resolvedDescription, setResolvedDescription] = useState<string | null | undefined>(description);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    fetchedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResolvedDescription(description);
  }, [roleId, description]);

  const effectiveDescription = description !== undefined ? description : resolvedDescription;

  const fetchDescription = useCallback(async () => {
    if (!roleId) return;
    if (description !== undefined) return;
    if (fetchedRef.current) return;

    const cached = descriptionCacheRef.current.get(roleId);
    if (cached !== undefined) {
      setResolvedDescription(cached);
      fetchedRef.current = true;
      return;
    }

    fetchedRef.current = true;
    setLoadingDesc(true);
    try {
      const result = await getRoleDetails(roleId);
      if (result.ok) {
        const desc = result.data.description || null;
        descriptionCacheRef.current.set(roleId, desc);
        setResolvedDescription(desc);
      } else {
        descriptionCacheRef.current.set(roleId, null);
        setResolvedDescription(null);
      }
    } catch {
      descriptionCacheRef.current.set(roleId, null);
      setResolvedDescription(null);
    } finally {
      setLoadingDesc(false);
    }
  }, [roleId, description]);

  const openTooltip = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const { left, top } = getClampedTooltipPosition({
      left: rect.left,
      top: rect.bottom + 6,
      width: 288,
      height: 120,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setTooltipStyle({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 4000,
    });
    fetchDescription();
  }, [fetchDescription]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    openTooltip();
  }, [openTooltip]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    openTooltip();
  }, [openTooltip]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  return (
    <div
      style={{
        padding: '0.625rem 0.75rem',
        background: c.bgPrimary,
        border: `1px solid ${c.borderColor}`,
        borderRadius: '0.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div
        style={{
          color: c.textPrimary,
          fontSize: '0.6875rem',
          fontWeight: 600,
          fontFamily: FONT_MONO,
        }}
      >
        {name}
      </div>
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={showTooltip ? tooltipId : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          cursor: 'help',
          outline: 'none',
        }}
      >
        <Info
          size={14}
          strokeWidth={1.5}
          style={{ color: c.textTertiary, cursor: 'help', flexShrink: 0 }}
        />
        {showTooltip &&
          createPortal(
            <div
              id={tooltipId}
              style={tooltipStyle}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div
                style={{
                  background: c.bgSecondary,
                  border: `1px solid ${c.borderColor}`,
                  borderRadius: '0.25rem',
                  padding: '0.5rem 0.625rem',
                  minWidth: '14rem',
                  maxWidth: '18rem',
                  boxShadow: mode === 'dark'
                    ? '0 2px 8px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                    : '0 2px 8px rgba(0, 0, 0, 0.15)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                {roleId && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
                    <span style={{ color: c.textTertiary }}>{t.profile.roleIdLabel}: </span>
                    {roleId}
                  </div>
                )}
                {!roleId && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textTertiary }}>
                    {t.profile.loading}
                  </div>
                )}
                {effectiveDescription && (
                  <div style={{ fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textSecondary }}>
                    <span style={{ color: c.textTertiary }}>{t.profile.roleDescriptionLabel}: </span>
                    {effectiveDescription}
                  </div>
                )}
                {loadingDesc && !effectiveDescription && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: FONT_MONO, fontSize: '0.5625rem', color: c.textTertiary }}>
                    <Loader2 size={10} strokeWidth={2} style={{ animation: 'spin 1s linear infinite' }} />
                    {t.profile.loading}
                  </div>
                )}
              </div>
            </div>,
            document.body
          )}
      </button>
    </div>
  );
}
