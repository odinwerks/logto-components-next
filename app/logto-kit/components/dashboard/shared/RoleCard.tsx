'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Info, Loader2 } from 'lucide-react';
import { getRoleDetails } from '../../../logic/actions/roles';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface RoleCardProps {
  name: string;
  roleId?: string;
  description?: string;
  colors: ThemeColors;
  t: Translations;
}

const FONT_MONO = "'IBM Plex Mono', 'Courier New', monospace";

const descriptionCache = new Map<string, string | null>();

export function RoleCard({ name, roleId, description, colors, t }: RoleCardProps) {
  const c = colors;
  const triggerRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const [resolvedDescription, setResolvedDescription] = useState<string | null | undefined>(description);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const fetchedRef = useRef(false);

  const effectiveDescription = description !== undefined ? description : resolvedDescription;

  const fetchDescription = useCallback(async () => {
    if (!roleId) return;
    if (description !== undefined) return;
    if (fetchedRef.current) return;

    const cached = descriptionCache.get(roleId);
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
        descriptionCache.set(roleId, desc);
        setResolvedDescription(desc);
      } else {
        descriptionCache.set(roleId, null);
        setResolvedDescription(null);
      }
    } catch {
      descriptionCache.set(roleId, null);
      setResolvedDescription(null);
    } finally {
      setLoadingDesc(false);
    }
  }, [roleId, description]);

  const handleMouseEnter = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setTooltipStyle({
      position: 'fixed',
      bottom: `${window.innerHeight - rect.top + 6}px`,
      right: `${window.innerWidth - rect.right}px`,
      zIndex: 9999,
    });
    setShowTooltip(true);
    fetchDescription();
  }, [fetchDescription]);

  const handleMouseLeave = useCallback(() => {
    setShowTooltip(false);
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
      <div
        ref={triggerRef}
        style={{ display: 'flex', alignItems: 'center' }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Info
          size={14}
          strokeWidth={1.5}
          style={{ color: c.textTertiary, cursor: 'help', flexShrink: 0 }}
        />
        {showTooltip &&
          createPortal(
            <div
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
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
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
      </div>
    </div>
  );
}
