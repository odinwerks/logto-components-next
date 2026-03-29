'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useThemeMode } from '../logto-kit/components/handlers/preferences';
import type { NavItem } from './types';
import { SECTION_HINTS } from './nav-data';

const DOC_REGISTRY: Record<string, () => Promise<{ default: React.ComponentType }>> = {
  'user-button': () => import('./docs/user-button'),
  'dashboard': () => import('./docs/dashboard'),
};

interface ContentAreaProps {
  item: NavItem;
}

const contentStyle: React.CSSProperties = {
  flex: 1,
  height: '100vh',
  overflowY: 'auto',
  background: '#0b0b0d',
};

const topbarStyle: React.CSSProperties = {
  height: '46px',
  minHeight: '46px',
  borderBottom: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  padding: '0 40px',
  gap: '6px',
  position: 'sticky',
  top: 0,
  zIndex: 10,
  background: 'rgba(11,11,13,0.92)',
  backdropFilter: 'blur(10px)',
};

const crumbStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.2)',
  letterSpacing: '0.05em',
};

const sepStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.12)',
};

const crumbCurStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.46)',
  letterSpacing: '0.02em',
};

const tbTypeStyle: React.CSSProperties = {
  marginLeft: 'auto',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.2)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: '3px',
  padding: '2px 6px',
  letterSpacing: '0.07em',
};

const pageStyle: React.CSSProperties = {
  padding: '36px 44px 0',
  height: 'calc(100vh - 46px - 36px)',
  display: 'flex',
  flexDirection: 'column',
};

const sectStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.058)',
  borderRadius: '5px',
  overflow: 'hidden',
  marginBottom: '12px',
  background: 'rgba(255,255,255,0.01)',
};

const sectHeadStyle: React.CSSProperties = {
  padding: '9px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.045)',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  background: 'rgba(255,255,255,0.015)',
};

const sectDotStyle: React.CSSProperties = {
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.18)',
  flexShrink: 0,
};

const sectLabelStyle: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  color: 'rgba(255,255,255,0.28)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
};

const sectBodyStyle: React.CSSProperties = {
  padding: '24px 16px',
};

const phStyle: React.CSSProperties = {
  border: '1px dashed rgba(255,255,255,0.07)',
  borderRadius: '4px',
  padding: '16px 20px',
  textAlign: 'center',
  fontSize: '11px',
  color: 'rgba(255,255,255,0.14)',
  letterSpacing: '0.03em',
  lineHeight: 1.65,
  background: 'rgba(255,255,255,0.012)',
};

const cursorStyle: React.CSSProperties = {
  animation: 'blink 1.1s step-end infinite',
  color: 'rgba(255,255,255,0.22)',
  marginLeft: '2px',
};

const footStyle: React.CSSProperties = {
  marginTop: '8px',
  fontSize: '10px',
  color: 'rgba(255,255,255,0.13)',
  letterSpacing: '0.04em',
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  animation: 'riseUp 0.28s ease-out 0.4s both',
};

const footDotStyle: React.CSSProperties = {
  content: '""',
  display: 'block',
  width: '3px',
  height: '3px',
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.16)',
  flexShrink: 0,
};

export default function ContentArea({ item }: ContentAreaProps) {
  const { theme } = useThemeMode();
  const [mounted, setMounted] = useState(false);
  const [DocContent, setDocContent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDocContent(null);
    const loader = DOC_REGISTRY[item.id];
    if (loader) {
      loader().then((mod) => {
        setDocContent(() => mod.default);
      });
    }
  }, [item.id]);

  const colors = mounted ? (theme === 'dark'
    ? {
        bg: '#0b0b0d',
        border: 'rgba(255,255,255,0.05)',
        borderLight: 'rgba(255,255,255,0.045)',
        textMuted: 'rgba(255,255,255,0.2)',
        text: 'rgba(255,255,255,0.46)',
        title: 'rgba(255,255,255,0.88)',
        desc: 'rgba(255,255,255,0.32)',
        rule: 'rgba(255,255,255,0.055)',
        sectBorder: 'rgba(255,255,255,0.058)',
        sectBg: 'rgba(255,255,255,0.01)',
        sectHeadBg: 'rgba(255,255,255,0.015)',
        sectDot: 'rgba(255,255,255,0.18)',
        sectLabel: 'rgba(255,255,255,0.28)',
        phBorder: 'rgba(255,255,255,0.07)',
        phBg: 'rgba(255,255,255,0.012)',
        phText: 'rgba(255,255,255,0.14)',
        cursor: 'rgba(255,255,255,0.22)',
        footText: 'rgba(255,255,255,0.13)',
        footDot: 'rgba(255,255,255,0.16)',
      }
    : {
        bg: '#ffffff',
        border: '#e5e7eb',
        borderLight: '#d1d5db',
        textMuted: '#6b7280',
        text: '#374151',
        title: '#111827',
        desc: '#4b5563',
        rule: '#e5e7eb',
        sectBorder: '#e5e7eb',
        sectBg: '#f9fafb',
        sectHeadBg: '#f3f4f6',
        sectDot: '#9ca3af',
        sectLabel: '#6b7280',
        phBorder: '#d1d5db',
        phBg: '#f3f4f6',
        phText: '#6b7280',
        cursor: '#9ca3af',
        footText: '#9ca3af',
        footDot: '#d1d5db',
      })
    : {
        bg: '#0b0b0d',
        border: 'rgba(255,255,255,0.05)',
        borderLight: 'rgba(255,255,255,0.045)',
        textMuted: 'rgba(255,255,255,0.2)',
        text: 'rgba(255,255,255,0.46)',
        title: 'rgba(255,255,255,0.88)',
        desc: 'rgba(255,255,255,0.32)',
        rule: 'rgba(255,255,255,0.055)',
        sectBorder: 'rgba(255,255,255,0.058)',
        sectBg: 'rgba(255,255,255,0.01)',
        sectHeadBg: 'rgba(255,255,255,0.015)',
        sectDot: 'rgba(255,255,255,0.18)',
        sectLabel: 'rgba(255,255,255,0.28)',
        phBorder: 'rgba(255,255,255,0.07)',
        phBg: 'rgba(255,255,255,0.012)',
        phText: 'rgba(255,255,255,0.14)',
        cursor: 'rgba(255,255,255,0.22)',
        footText: 'rgba(255,255,255,0.13)',
        footDot: 'rgba(255,255,255,0.16)',
      };

  const themedContentStyle = { ...contentStyle, background: colors.bg, overflowY: DocContent ? 'hidden' as const : 'auto' as const };
  const themedTopbarStyle = { ...topbarStyle, borderBottom: `1px solid ${colors.border}`, background: mounted ? (theme === 'dark' ? 'rgba(11,11,13,0.92)' : 'rgba(255,255,255,0.95)') : 'rgba(11,11,13,0.92)' };
  const themedCrumbStyle = { ...crumbStyle, color: colors.textMuted };
  const themedSepStyle = { ...sepStyle, color: colors.textMuted };
  const themedCrumbCurStyle = { ...crumbCurStyle, color: colors.text };
  const themedTbTypeStyle = { ...tbTypeStyle, color: colors.textMuted, border: `1px solid ${colors.borderLight}` };
  const themedSectStyle = { ...sectStyle, border: `1px solid ${colors.sectBorder}`, background: colors.sectBg };
  const themedSectHeadStyle = { ...sectHeadStyle, borderBottom: `1px solid ${colors.borderLight}`, background: colors.sectHeadBg };
  const themedSectDotStyle = { ...sectDotStyle, background: colors.sectDot };
  const themedSectLabelStyle = { ...sectLabelStyle, color: colors.sectLabel };
  const themedPhStyle = { ...phStyle, border: `1px dashed ${colors.phBorder}`, background: colors.phBg, color: colors.phText };
  const themedCursorStyle = { ...cursorStyle, color: colors.cursor };
  const themedFootStyle = { ...footStyle, color: colors.footText };
  const themedFootDotStyle = { ...footDotStyle, background: colors.footDot };

  return (
    <div style={themedContentStyle}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        @keyframes riseUp { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={themedTopbarStyle}>
        <span style={themedCrumbStyle}>logto-kit</span>
        <span style={themedSepStyle}>/</span>
        <span style={themedCrumbCurStyle}>{item.label}</span>
        <span style={themedTbTypeStyle}>{item.type}</span>
      </div>

      <div style={pageStyle}>
        {DocContent ? (
          <Suspense fallback={null}>
            <DocContent />
          </Suspense>
        ) : (
          item.sections.map((section, i) => (
            <div
              key={section}
              style={{
                ...themedSectStyle,
                animation: `riseUp 0.28s ease-out ${0.13 + i * 0.055}s both`,
              }}
            >
              <div style={themedSectHeadStyle}>
                <div style={themedSectDotStyle} />
                <span style={themedSectLabelStyle}>{section}</span>
              </div>
              <div style={sectBodyStyle}>
                <div style={themedPhStyle}>
                  {SECTION_HINTS[section] || `${section}...`}
                  <span style={themedCursorStyle}>▌</span>
                </div>
              </div>
            </div>
          ))
        )}

        <div style={themedFootStyle}>
          <div style={themedFootDotStyle} />
          {DocContent ? 'Self-documenting demo — logto-kit' : 'Placeholder — fill in usage patterns and demos'}
        </div>
      </div>
    </div>
  );
}
