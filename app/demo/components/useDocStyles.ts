'use client';

import { useThemeMode } from '../../logto-kit/components/providers/preferences';

export function useDocStyles() {
  const { mode } = useThemeMode();
  const isDark = mode === 'dark';

  return {
    twoColLayoutStyle: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      alignItems: 'stretch',
    } as React.CSSProperties,

    colLeftStyle: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
      overflow: 'visible',
    } as React.CSSProperties,

    colRightStyle: {
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      minWidth: 0,
      overflow: 'visible',
    } as React.CSSProperties,

    sectionWrapStyle: {
      border: `1px solid var(--ldd-border-color)`,
      borderRadius: '5px',
      overflow: 'hidden',
      background: 'var(--ldd-bg-page)',
      display: 'flex',
      flexDirection: 'column',
    } as React.CSSProperties,

    sectionHeadStyle: {
      padding: '8px 14px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      background: 'var(--ldd-bg-secondary)',
    } as React.CSSProperties,

    sectionDotStyle: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: 'var(--ldd-text-tertiary)',
      flexShrink: 0,
    } as React.CSSProperties,

    sectionLabelStyle: {
      fontSize: '9px',
      fontWeight: 600,
      color: 'var(--ldd-text-secondary)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
    } as React.CSSProperties,

    sectionBodyStyle: {
      padding: '20px 16px',
    } as React.CSSProperties,

    textStyle: {
      fontSize: '0.75rem',
      lineHeight: 1.7,
      color: 'var(--ldd-text-secondary)',
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
      color: 'var(--ldd-text-secondary)',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      marginBottom: '0.625rem',
      paddingLeft: '10px',
      borderLeft: `2px solid var(--ldd-border-color)`,
    } as React.CSSProperties,

    tableStyle: {
      width: '100%',
      borderCollapse: 'collapse',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.6875rem',
      marginBottom: '0.75rem',
      tableLayout: 'fixed',
    } as React.CSSProperties,

    thStyle: {
      textAlign: 'left',
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      color: 'var(--ldd-text-tertiary)',
      fontWeight: 600,
      fontSize: '0.5625rem',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,

    tdStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      color: 'var(--ldd-text-secondary)',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdPathStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      color: isDark ? '#9cdcdb' : '#0369a1',
      fontFamily: "'IBM Plex Mono', monospace",
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdPropStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      color: isDark ? '#9cdcdb' : '#0369a1',
      fontFamily: "'IBM Plex Mono', monospace",
      whiteSpace: 'nowrap',
      verticalAlign: 'top',
      lineHeight: 1.5,
    } as React.CSSProperties,

    tdTypeStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
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
      background: 'var(--ldd-bg-secondary)',
      border: `1px solid var(--ldd-border-color)`,
      color: 'var(--ldd-text-secondary)',
      letterSpacing: '0.03em',
    } as React.CSSProperties,

    strongNoteStyle: {
      color: 'var(--ldd-text-primary)',
    } as React.CSSProperties,

    linkColor: isDark ? '#60a5fa' : '#2563eb',

    thAltStyle: {
      textAlign: 'left',
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      background: 'var(--ldd-bg-secondary)',
      color: 'var(--ldd-text-secondary)',
      fontWeight: 600,
    } as React.CSSProperties,

    tdAltStyle: {
      padding: '7px 10px',
      borderBottom: `1px solid var(--ldd-border-color)`,
      color: 'var(--ldd-text-secondary)',
    } as React.CSSProperties,

    exampleCardStyle: {
      border: `1px solid var(--ldd-border-color)`,
      borderRadius: '5px',
      overflow: 'hidden',
      background: 'var(--ldd-bg-secondary)',
      display: 'flex',
      alignItems: 'stretch',
    } as React.CSSProperties,

    exampleCodeStyle: {
      flex: 1,
      minWidth: 0,
      borderRight: `1px solid var(--ldd-border-color)`,
      padding: '8px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    } as React.CSSProperties,

    exampleLabelStyle: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.5rem',
      color: 'var(--ldd-text-secondary)',
      letterSpacing: '0.05em',
      whiteSpace: 'nowrap',
    } as React.CSSProperties,

    exampleSubLabelStyle: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '0.5rem',
      color: 'var(--ldd-text-tertiary)',
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
      background: 'var(--ldd-bg-tertiary)',
    } as React.CSSProperties,

    exampleMetaStyle: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: '6px',
      flexWrap: 'wrap' as const,
    } as React.CSSProperties,

    warningBannerStyle: {
      background: 'var(--ldd-warning-bg)',
      border: `1px solid var(--ldd-accent-yellow)`,
      borderRadius: '0.375rem',
      padding: '0.75rem 1rem',
      marginBottom: '1rem',
      fontSize: '0.8125rem',
      color: 'var(--ldd-text-primary)',
    } as React.CSSProperties,

    warningBannerStrongStyle: {
      color: 'var(--ldd-accent-yellow)',
    } as React.CSSProperties,
  };
}
