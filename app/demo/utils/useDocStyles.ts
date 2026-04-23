'use client';

import { useThemeMode } from '../../logto-kit/components/handlers/preferences';

export function useDocStyles() {
  const { theme } = useThemeMode();
  const isDark = theme === 'dark';

  return {
    twoColLayoutStyle: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      alignItems: 'start',
    } as React.CSSProperties,

    colLeftStyle: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    } as React.CSSProperties,

    sectionWrapStyle: {
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.058)' : '#e5e7eb'}`,
      borderRadius: '5px',
      overflow: 'hidden',
      background: isDark ? 'rgba(255,255,255,0.01)' : '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
    } as React.CSSProperties,

    sectionHeadStyle: {
      padding: '8px 14px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.045)' : '#e5e7eb'}`,
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      background: isDark ? 'rgba(255,255,255,0.015)' : '#f3f4f6',
    } as React.CSSProperties,

    sectionDotStyle: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: isDark ? 'rgba(255,255,255,0.18)' : '#9ca3af',
      flexShrink: 0,
    } as React.CSSProperties,

    sectionLabelStyle: {
      fontSize: '9px',
      fontWeight: 600,
      color: isDark ? 'rgba(255,255,255,0.28)' : '#6b7280',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    } as React.CSSProperties,

    sectionBodyStyle: {
      padding: '20px 16px',
    } as React.CSSProperties,

    textStyle: {
      fontSize: '0.75rem',
      lineHeight: 1.7,
      color: isDark ? 'rgba(255,255,255,0.5)' : '#374151',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      marginBottom: '0.75rem',
    } as React.CSSProperties,

    codeStyle: {
      color: isDark ? '#9cdcdb' : '#0369a1',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.75rem',
    } as React.CSSProperties,

    codeSmStyle: {
      color: isDark ? '#ce9178' : '#c2410c',
      fontSize: '0.6875rem',
      fontFamily: "'IBM Plex Mono', monospace",
    } as React.CSSProperties,

    noteStyle: {
      fontSize: '0.6875rem',
      lineHeight: 1.7,
      color: isDark ? 'rgba(255,255,255,0.38)' : '#6b7280',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      marginBottom: '0.625rem',
      paddingLeft: '10px',
      borderLeft: `2px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#d1d5db'}`,
    } as React.CSSProperties,

    tableStyle: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.6875rem',
      marginBottom: '0.75rem',
    } as React.CSSProperties,

    thStyle: {
      textAlign: 'left',
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      color: isDark ? 'rgba(255,255,255,0.35)' : '#6b7280',
      fontWeight: 600,
      fontSize: '0.5625rem',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,

    tdStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.035)' : '#f3f4f6'}`,
      color: isDark ? 'rgba(255,255,255,0.5)' : '#374151',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdPathStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.035)' : '#f3f4f6'}`,
      color: isDark ? '#9cdcdb' : '#0369a1',
      fontFamily: "'IBM Plex Mono', monospace",
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdPropStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.035)' : '#f3f4f6'}`,
      color: isDark ? '#9cdcdb' : '#0369a1',
      fontFamily: "'IBM Plex Mono', monospace",
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdTypeStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.035)' : '#f3f4f6'}`,
      color: isDark ? '#4ec9b0' : '#059669',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.625rem',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    chipStyle: {
      display: 'inline-block',
      padding: '2px 6px',
      borderRadius: '3px',
      fontSize: '0.5625rem',
      fontFamily: "'IBM Plex Mono', monospace",
      background: isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      color: isDark ? 'rgba(255,255,255,0.45)' : '#6b7280',
      letterSpacing: '0.03em',
    } as React.CSSProperties,

    strongNoteStyle: {
      color: isDark ? 'rgba(255,255,255,0.55)' : '#111827',
    } as React.CSSProperties,

    linkColor: isDark ? '#60a5fa' : '#2563eb',

    thAltStyle: {
      textAlign: 'left',
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      background: isDark ? 'rgba(255,255,255,0.02)' : '#f9fafb',
      color: isDark ? 'rgba(255,255,255,0.6)' : '#6b7280',
      fontWeight: 600,
    } as React.CSSProperties,

    tdAltStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.03)' : '#f3f4f6'}`,
      color: isDark ? 'rgba(255,255,255,0.5)' : '#374151',
    } as React.CSSProperties,

    exampleCardStyle: {
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.058)' : '#e5e7eb'}`,
      borderRadius: '5px',
      overflow: 'hidden',
      background: isDark ? 'rgba(255,255,255,0.008)' : '#f9fafb',
      display: 'flex',
      alignItems: 'stretch',
    } as React.CSSProperties,

    exampleCodeStyle: {
      flex: 1,
      minWidth: 0,
      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#e5e7eb'}`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    } as React.CSSProperties,

    exampleLabelStyle: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.5rem',
      color: isDark ? 'rgba(255,255,255,0.4)' : '#6b7280',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,

    exampleSubLabelStyle: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.5rem',
      color: isDark ? 'rgba(255,255,255,0.18)' : '#9ca3af',
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,

    examplePreviewStyle: {
      flex: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '10px 16px',
      background: isDark ? 'rgba(0,0,0,0.15)' : '#f3f4f6',
    } as React.CSSProperties,

    exampleMetaStyle: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: '6px',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,

    warningBannerStyle: {
      background: isDark ? 'rgba(255,200,0,0.08)' : '#fef3c7',
      border: `1px solid ${isDark ? 'rgba(255,200,0,0.3)' : '#f59e0b'}`,
      borderRadius: '0.375rem',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      fontSize: '0.8125rem',
      color: isDark ? 'rgba(255,255,255,0.7)' : '#92400e',
    } as React.CSSProperties,

    warningBannerStrongStyle: {
      color: isDark ? '#ffc800' : '#b45309',
    } as React.CSSProperties,
  };
}
