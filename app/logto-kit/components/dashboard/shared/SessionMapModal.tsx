'use client';

import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, MapPin } from 'lucide-react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import type { GeoLocation } from '../../../logic/geo-cache';

interface SessionMapModalProps {
  geo: GeoLocation;
  ip: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    return !el.hasAttribute('disabled') && el.tabIndex !== -1 && el.getAttribute('aria-hidden') !== 'true';
  });
}

export function SessionMapModal({ geo, ip, mode, colors, t, onClose }: SessionMapModalProps) {
  const c = colors;
  const isDark = mode === 'dark';

  const locationLabel = [...new Set([geo.city, geo.region, geo.country].filter(Boolean))].join(', ') || t.sessions.ipLocation;
  const osmLink = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=14/${geo.lat}/${geo.lon}`;
  const googleMapsLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;

  // Focus management (Mount focus, Trap focus, Restore focus) and Escape listener
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Restore focus to the element that had focus before the modal opened
    const previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Focus the close button on mount
    if (closeBtnRef.current) {
      closeBtnRef.current.focus();
    } else {
      const focusable = getFocusableElements(dialog);
      const initial = focusable[0] ?? dialog;
      initial.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const currentDialog = dialogRef.current;
      if (!currentDialog) return;

      const nodes = getFocusableElements(currentDialog);
      if (nodes.length === 0) {
        e.preventDefault();
        currentDialog.focus();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const outsideDialog = !active || !currentDialog.contains(active);

      if (e.shiftKey) {
        if (outsideDialog || active === first) {
          e.preventDefault();
          last.focus();
        }
        return;
      }

      if (outsideDialog || active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, []);

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.625rem 1rem',
    boxSizing: 'border-box' as const,
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontWeight: 500,
    fontSize: '0.8125rem',
    borderRadius: '0.25rem',
    border: `1px solid ${c.borderColor}`,
    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    color: c.textSecondary,
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'background 0.15s, color 0.15s',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(0.375rem) saturate(0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        ref={dialogRef}
        style={{
          width: '100%',
          maxWidth: '26rem',
          background: c.bgSecondary,
          border: `1px solid ${c.borderColor}`,
          borderRadius: '0',
          boxShadow: isDark
            ? '0 2rem 5rem rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)'
            : '0 2rem 5rem rgba(0,0,0,0.2)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: `1px solid ${c.borderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', minWidth: 0 }}>
            <div style={{
              flexShrink: 0,
              width: '2rem',
              height: '2rem',
              borderRadius: '0.25rem',
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              border: `1px solid ${c.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MapPin size={14} strokeWidth={1.5} color={c.accentRed} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: c.textPrimary,
                letterSpacing: '-0.02em',
                margin: 0,
                marginBottom: '0.25rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {locationLabel}
              </p>
              <p style={{
                fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                fontSize: '0.625rem',
                color: c.textTertiary,
                margin: 0,
              }}>
                {ip} &nbsp;&middot;&nbsp; {geo.lat.toFixed(4)}, {geo.lon.toFixed(4)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close dialog"
            ref={closeBtnRef}
            style={{
              flexShrink: 0,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.textTertiary,
              padding: '0.125rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* External link buttons */}
        <div style={{ padding: '0.75rem 1.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <p style={{
            margin: 0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.6875rem',
            color: c.textTertiary,
            lineHeight: 1.45,
          }}>
            {t.sessions.locationDisclosure}
          </p>
          <p style={{
            margin: 0,
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: '0.6875rem',
            color: c.textTertiary,
            lineHeight: 1.45,
          }}>
            {t.sessions.externalMapDisclosure}
          </p>
        </div>

        <div style={{ padding: '0.875rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a href={osmLink} target="_blank" rel="noopener noreferrer" style={btnStyle}>
            {t.sessions.viewOnOpenStreetMap}
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>
          <a href={googleMapsLink} target="_blank" rel="noopener noreferrer" style={btnStyle}>
            {t.sessions.viewOnGoogleMaps}
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}
