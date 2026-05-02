'use client';

import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const locationLabel = [...new Set([geo.city, geo.region, geo.country].filter(Boolean))].join(', ') || t.sessions.ipLocation;

  const osmLink = `https://www.openstreetmap.org/?mlat=${geo.lat}&mlon=${geo.lon}#map=14/${geo.lat}/${geo.lon}`;
  const googleMapsLink = `https://www.google.com/maps?q=${geo.lat},${geo.lon}`;

  const cardBg = isDark ? '#0e0e14' : '#ffffff';

  const linkStyle: React.CSSProperties = {
    fontFamily: "'DM Sans', system-ui, sans-serif",
    fontSize: '0.6875rem',
    color: c.textTertiary,
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.25rem 0.375rem',
    borderRadius: '0.25rem',
    transition: 'color 0.15s',
    whiteSpace: 'nowrap',
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const cartoStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        carto: {
          type: 'raster',
          tiles: isDark
            ? [
                'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
              ]
            : [
                'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
                'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
              ],
          tileSize: 256,
          attribution:
            '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>',
        },
      },
      layers: [{ id: 'carto-tiles', type: 'raster', source: 'carto' }],
    };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: cartoStyle,
      center: [geo.lon, geo.lat],
      zoom: 14,
    });

    const el = document.createElement('div');
    el.style.cssText = 'width:28px;height:36px;cursor:default;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));';
    el.innerHTML = `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 36 14 36C14 36 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="${c.accentRed}"/>
  <circle cx="14" cy="14" r="6" fill="white" opacity="0.95"/>
  <circle cx="14" cy="14" r="3.5" fill="${c.accentRed}"/>
</svg>`;

    new maplibregl.Marker({ element: el })
      .setLngLat([geo.lon, geo.lat])
      .addTo(map);

    return () => {
      map.remove();
    };
  }, [geo.lat, geo.lon, isDark, c.accentRed]);

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
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: 'calc(100vw - 2rem)',
          height: 'calc(100vh - 2rem)',
          background: cardBg,
          border: `1px solid ${c.borderColor}`,
          borderRadius: theme.tokens.dashboardRadius,
          overflow: 'hidden',
          boxShadow: '0 2rem 5rem rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* header */}
        <div
          style={{
            flexShrink: 0,
            padding: '1rem 1.25rem',
            borderBottom: `1px solid ${c.borderColor}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {/* Left: location + coordinates */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: 0 }}>
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: c.textPrimary,
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              {locationLabel}
            </p>
            <p
              style={{
                fontFamily: "'DM Sans', system-ui, sans-serif",
                fontSize: '0.6875rem',
                color: c.textTertiary,
                margin: 0,
              }}
            >
              {ip} &middot; {geo.lat.toFixed(4)}, {geo.lon.toFixed(4)}
            </p>
          </div>

          {/* Right: external links + divider + close */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '0.5rem',
              flexShrink: 0,
            }}
          >
            {/* OSM link */}
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              {t.sessions.viewOnOpenStreetMap}
              <ExternalLink size={11} strokeWidth={1.5} />
            </a>

            {/* Google Maps link */}
            <a
              href={googleMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              {t.sessions.viewOnGoogleMaps}
              <ExternalLink size={11} strokeWidth={1.5} />
            </a>

            {/* Vertical divider */}
            <div
              style={{
                width: '1px',
                height: '1rem',
                background: c.borderColor,
                flexShrink: 0,
              }}
            />

            {/* Close button */}
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
        </div>

        {/* map — fills all remaining height */}
        <div ref={containerRef} style={{ flex: 1, minHeight: 0 }} />
      </div>
    </div>
  );
}
