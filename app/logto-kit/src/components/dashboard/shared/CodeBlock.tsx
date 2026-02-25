'use client';

import { useState } from 'react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

// Simple Copy Icon SVG
const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);

interface CodeBlockProps {
  title: string;
  data: unknown;
  themeColors: ThemeColors;
  maxHeight?: string;
  copyKey?: string;
  onCopy?: (text: string, key: string) => void;
  t: Translations;
}

export function CodeBlock({
  title,
  data,
  themeColors,
  maxHeight = '400px',
  copyKey = 'default',
  onCopy,
  t,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (onCopy) {
        onCopy(text, copyKey);
      }
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          fontFamily: 'var(--font-ibm-plex-mono)',
        }}
      >
        <span style={{ color: themeColors.textTertiary, fontSize: '11px' }}>{title}</span>
        <button
          onClick={handleCopy}
          style={{
            padding: '3px 8px',
            background: themeColors.bgTertiary,
            color: copied ? themeColors.accentGreen : themeColors.textPrimary,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px',
            fontFamily: 'var(--font-ibm-plex-mono)',
            transition: 'color 0.2s',
          }}
        >
          {copied ? t.common.copied : t.common.copy}
        </button>
      </div>
      <pre
        style={{
          background: themeColors.bgPrimary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '5px',
          padding: '10px',
          margin: 0,
          overflow: 'auto',
          fontSize: '11px',
          lineHeight: '1.4',
          maxHeight,
          color: themeColors.textPrimary,
          fontFamily: 'var(--font-ibm-plex-mono)',
        }}
      >
        {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

interface TruncatedTokenProps {
  token: string;
  themeColors: ThemeColors;
  t: Translations;
}

export function TruncatedToken({ token, themeColors, t }: TruncatedTokenProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div
      style={{
        padding: '10px 14px',
        background: themeColors.bgPrimary,
        border: `1px solid ${themeColors.borderColor}`,
        borderRadius: '5px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <pre
        style={{
          margin: 0,
          color: themeColors.textPrimary,
          fontSize: '11px',
          fontFamily: 'var(--font-ibm-plex-mono)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          paddingRight: '30px',
          lineHeight: '1.2',
        }}
      >
        {token}
      </pre>
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute',
          right: '6px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'transparent',
          border: 'none',
          color: copied ? themeColors.accentGreen : themeColors.textSecondary,
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'color 0.2s',
        }}
        title={t.common.copy}
      >
        <CopyIcon />
      </button>
    </div>
  );
}
