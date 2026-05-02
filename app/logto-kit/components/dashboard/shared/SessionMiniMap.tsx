'use client';

import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';
import { fetchGeo, getCachedGeo } from './geo-cache';
import type { GeoLocation } from './geo-cache';

const ZOOM = 13;
const MAP_WIDTH = 260;

function lonToX(lon: number, z: number): number {
  return Math.floor((lon + 180) / 360 * Math.pow(2, z));
}

function latToY(lat: number, z: number): number {
  const rad = lat * Math.PI / 180;
  return Math.floor((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, z));
}

const TILE_HOSTS_DARK = ['a', 'b', 'c'].map(s => `https://${s}.basemaps.cartocdn.com/dark_all`);
const TILE_HOSTS_LIGHT = ['a', 'b', 'c'].map(s => `https://${s}.basemaps.cartocdn.com/light_all`);

function getTileUrl(x: number, y: number, z: number, isDark: boolean): string {
  const hosts = isDark ? TILE_HOSTS_DARK : TILE_HOSTS_LIGHT;
  const host = hosts[(x + y) % hosts.length];
  return `${host}/${z}/${x}/${y}@2x.png`;
}

interface MiniMapProps {
  ip: string | null;
  theme: ThemeSpec;
  t: Translations;
  refreshKey: number;
  onClick: (geo: GeoLocation, ip: string) => void;
  onGeoLoaded?: (ip: string, geo: GeoLocation) => void;
}

export function SessionMiniMap({ ip, theme, t, refreshKey, onClick, onGeoLoaded }: MiniMapProps) {
  const [geo, setGeo] = useState<GeoLocation | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [loading, setLoading] = useState(false);
  const isDark = theme.mode === 'dark';

  useEffect(() => {
    if (!ip) {
      setGeo(null);
      setGeoError(true);
      return;
    }

    const cached = getCachedGeo(ip);
    if (cached) {
      setGeo(cached);
      setGeoError(false);
      onGeoLoaded?.(ip, cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setGeoError(false);
    fetchGeo(ip).then(result => {
      if (cancelled) {
        setLoading(false);
        return;
      }
      if (result) {
        setGeo(result);
        setGeoError(false);
        onGeoLoaded?.(ip, result);
      } else {
        setGeo(null);
        setGeoError(true);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [ip, refreshKey]);

const containerStyle: React.CSSProperties = {
    width: `${MAP_WIDTH}px`,
    alignSelf: 'stretch',
    flexShrink: 0,
  };

  if (!ip || geoError) {
    return (
      <div style={{
        ...containerStyle,
        borderLeft: `1px solid ${theme.colors.borderColor}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '0.25rem',
        color: theme.colors.textTertiary,
        fontSize: '0.625rem',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        padding: '0.5rem',
        textAlign: 'center',
      }}>
        <MapPin size={16} strokeWidth={1.5} />
        {t.sessions.locationUnavailable}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{
        ...containerStyle,
        borderLeft: `1px solid ${theme.colors.borderColor}`,
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '1.25rem',
          height: '1.25rem',
          border: `2px solid ${theme.colors.borderColor}`,
          borderTopColor: theme.colors.accentBlue,
          borderRadius: '50%',
          animation: 'ldd-spin 0.7s linear infinite',
        }} />
      </div>
    );
  }

  if (!geo) return null;

  const tileX = lonToX(geo.lon, ZOOM);
  const tileY = latToY(geo.lat, ZOOM);
  const tileSrc = getTileUrl(tileX, tileY, ZOOM, isDark);
  const pinColor = theme.colors.accentRed;

  return (
    <div
      onClick={() => onClick(geo, ip)}
      style={{
        ...containerStyle,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        borderLeft: `1px solid ${theme.colors.borderColor}`,
        background: isDark ? '#1a1a2e' : '#e8e8f0',
      }}
      title={t.sessions.viewOnOpenStreetMap}
    >
      <img
        src={tileSrc}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: pinColor,
          boxShadow: `0 0 0 2px ${isDark ? '#000' : '#fff'}, 0 1px 3px rgba(0,0,0,0.4)`,
        }} />
        <div style={{
          width: '0',
          height: '0',
          borderLeft: '4px solid transparent',
          borderRight: '4px solid transparent',
          borderTop: `5px solid ${pinColor}`,
          marginTop: '-1px',
        }} />
      </div>
    </div>
  );
}