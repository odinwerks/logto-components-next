'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import type { GeoLocation } from './geo-cache';

interface SessionMapModalProps {
  geo: GeoLocation;
  ip: string;
  theme: ThemeSpec;
  t: Translations;
  onClose: () => void;
}

export function SessionMapModal({ geo, ip, theme, t, onClose }: SessionMapModalProps) {
  const c = theme.colors;
  const isDark = theme.mode === 'dark';

  const locationLabel = [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || t.sessions.ipLocation;

  const embedSrc = `https://www.google.com/maps?q=${geo.lat},${geo.lon}&z=14&output=embed`;
  const externalLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}&t=k`;

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
        padding: '1.25rem',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%',
        maxWidth: '52.5rem',
        background: isDark ? '#0e0e14' : '#ffffff',
        border: `1px solid ${c.borderColor}`,
        borderRadius: theme.tokens.dashboardRadius,
        overflow: 'hidden',
        boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        <div style={{
          padding: '1rem 1.25rem',
          borderBottom: `1px solid ${c.borderColor}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0 }}>
            <p style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: '0.9375rem',
              color: c.textPrimary,
              letterSpacing: '-0.02em',
              margin: 0,
            }}>
              {locationLabel}
            </p>
            <p style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.6875rem',
              color: c.textTertiary,
              margin: 0,
            }}>
              {ip} &middot; {geo.lat.toFixed(4)}, {geo.lon.toFixed(4)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: c.textTertiary,
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%' }}>
          <iframe
            src={embedSrc}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title={locationLabel}
          />
        </div>

        <div style={{
          padding: '0.75rem 1.25rem',
          borderTop: `1px solid ${c.borderColor}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <a
            href={externalLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: '0.75rem',
              color: c.accentBlue,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {t.sessions.viewInGoogleMaps}
            <ExternalLink size={12} strokeWidth={1.5} />
          </a>
        </div>
      </div>
    </div>
  );
}