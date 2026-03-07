'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

interface CodeBlockProps {
  title?: string;
  data: unknown;
  themeColors: ThemeColors;
  maxHeight?: string;
  copyKey?: string;
  onCopy?: (text: string, key: string) => void;
  t: Translations;
  badge?: string;
}

export function CodeBlock({
  title,
  data,
  themeColors,
  maxHeight = '400px',
  copyKey = 'default',
  onCopy,
  t,
  badge,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (onCopy) onCopy(text, copyKey);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title && (
            <span
              style={{
                color: themeColors.textTertiary,
                fontSize: '10px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
              }}
            >
              {title}
            </span>
          )}
          {badge && (
            <span
              style={{
                fontSize: '9px',
                fontFamily: 'var(--font-ibm-plex-mono)',
                color: themeColors.accentBlue,
                background: themeColors.accentBlue + '18',
                border: `1px solid ${themeColors.accentBlue}30`,
                borderRadius: '3px',
                padding: '1px 5px',
                letterSpacing: '0.04em',
                fontWeight: 600,
              }}
            >
              {badge}
            </span>
          )}
        </div>
      )}

      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <pre
          style={{
            background: themeColors.bgPrimary,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '6px',
            padding: '12px 14px',
            margin: 0,
            overflow: 'auto',
            fontSize: '11.5px',
            lineHeight: '1.6',
            maxHeight,
            color: themeColors.textPrimary,
            fontFamily: 'var(--font-ibm-plex-mono)',
          }}
        >
          {text}
        </pre>

        {/* GitHub-style hover copy button */}
        <button
          onClick={handleCopy}
          title={t.common.copy}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            background: themeColors.bgSecondary,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '5px',
            cursor: 'pointer',
            color: copied ? themeColors.accentGreen : themeColors.textSecondary,
            opacity: hovered || copied ? 1 : 0,
            transform: hovered || copied ? 'scale(1)' : 'scale(0.9)',
            transition: 'opacity 0.15s ease, transform 0.15s ease, color 0.2s ease',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
        >
          {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
        </button>
      </div>
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
  const [hovered, setHovered] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          padding: '10px 44px 10px 14px',
          background: themeColors.bgPrimary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '6px',
          overflow: 'hidden',
        }}
      >
        <pre
          style={{
            margin: 0,
            color: themeColors.textPrimary,
            fontSize: '11.5px',
            fontFamily: 'var(--font-ibm-plex-mono)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: '1.4',
          }}
        >
          {token}
        </pre>
      </div>

      <button
        onClick={handleCopy}
        title={t.common.copy}
        style={{
          position: 'absolute',
          top: '50%',
          right: '8px',
          transform: `translateY(-50%) scale(${hovered || copied ? 1 : 0.9})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '5px',
          cursor: 'pointer',
          color: copied ? themeColors.accentGreen : themeColors.textSecondary,
          opacity: hovered || copied ? 1 : 0,
          transition: 'opacity 0.15s ease, transform 0.15s ease, color 0.2s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
      </button>
    </div>
  );
}