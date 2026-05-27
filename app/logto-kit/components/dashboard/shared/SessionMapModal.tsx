'use client';

import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, MapPin } from 'lucide-react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';
import type { GeoLocation } from './geo-cache';

interface SessionMapModalProps {
  geo: GeoLocation;
  ip: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  onClose: () => void;
}

export function SessionMapModal({ geo, ip, mode, colors, t, onClose }: SessionMapModalProps) {
  const c = colors;
  const isDark = mode === 'dark';

  const locationLabel = [...new Set([geo.city, geo.region, geo.country].filter(Boolean))].join(', ') || t.sessions.ipLocation;
  const osmLink = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=14/${geo.lat}/${geo.lon}`;
  const googleMapsLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;

  // Close on Escape
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
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
        style={{
          width: '100%',
          maxWidth: '26rem',
          background: isDark ? '#0e0e14' : '#ffffff',
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

          <button onClick={onClose} style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: c.textTertiary,
            padding: '0.125rem',
            display: 'flex',
            alignItems: 'center',
          }}>
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* External link buttons */}
        <div style={{ padding: '1rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
