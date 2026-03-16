'use client';

import React from 'react';
import type { NavItem } from './types';
import { SECTION_HINTS } from './nav-data';

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
  padding: '50px 44px 80px',
  maxWidth: '800px',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-instrument-serif)',
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: '38px',
  color: 'rgba(255,255,255,0.88)',
  letterSpacing: '-0.01em',
  lineHeight: 1.08,
  marginBottom: '14px',
  animation: 'riseUp 0.28s ease-out 0.04s both',
};

const descStyle: React.CSSProperties = {
  fontSize: '11.5px',
  lineHeight: 1.95,
  color: 'rgba(255,255,255,0.32)',
  maxWidth: '510px',
  animation: 'riseUp 0.28s ease-out 0.08s both',
};

const ruleStyle: React.CSSProperties = {
  height: '1px',
  background: 'rgba(255,255,255,0.055)',
  margin: '34px 0 40px',
  animation: 'riseUp 0.28s ease-out 0.1s both',
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
  return (
    <div style={contentStyle}>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateX(-6px); } to { opacity:1; transform:translateX(0); } }
        @keyframes riseUp { from { opacity:0; transform:translateY(7px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>

      <div style={topbarStyle}>
        <span style={crumbStyle}>logto-kit</span>
        <span style={sepStyle}>/</span>
        <span style={crumbCurStyle}>{item.label}</span>
        <span style={tbTypeStyle}>{item.type}</span>
      </div>

      <div style={pageStyle}>
        <h1 style={titleStyle}>{item.label}</h1>
        <p style={descStyle}>{item.desc}</p>
        <div style={ruleStyle} />

        {item.sections.map((section, i) => (
          <div
            key={section}
            style={{
              ...sectStyle,
              animation: `riseUp 0.28s ease-out ${0.13 + i * 0.055}s both`,
            }}
          >
            <div style={sectHeadStyle}>
              <div style={sectDotStyle} />
              <span style={sectLabelStyle}>{section}</span>
            </div>
            <div style={sectBodyStyle}>
              <div style={phStyle}>
                {SECTION_HINTS[section] || `${section}...`}
                <span style={cursorStyle}>▌</span>
              </div>
            </div>
          </div>
        ))}

        <div style={footStyle}>
          <div style={footDotStyle} />
          Placeholder — fill in usage patterns and demos
        </div>
      </div>
    </div>
  );
}
