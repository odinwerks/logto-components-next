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
  maxHeight = '25rem',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {title && (
            <span
              style={{
                color: themeColors.textTertiary,
                fontSize: '0.625rem',
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
                fontSize: '0.5625rem',
                fontFamily: 'var(--font-ibm-plex-mono)',
                color: themeColors.accentBlue,
                background: themeColors.accentBlue + '18',
                border: `1px solid ${themeColors.accentBlue}30`,
                borderRadius: '0.1875rem',
                padding: '0.0625rem 0.3125rem',
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
            borderRadius: '0.375rem',
            padding: '0.75rem 0.875rem',
            margin: 0,
            overflow: 'auto',
            fontSize: '0.71875rem',
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
            top: '0.5rem',
            right: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.75rem',
            height: '1.75rem',
            background: themeColors.bgSecondary,
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '0.3125rem',
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
          padding: '0.625rem 2.75rem 0.625rem 0.875rem',
          background: themeColors.bgPrimary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '0.375rem',
          overflow: 'hidden',
        }}
      >
        <pre
          style={{
            margin: 0,
            color: themeColors.textPrimary,
            fontSize: '0.71875rem',
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
          right: '0.5rem',
          transform: `translateY(-50%) scale(${hovered || copied ? 1 : 0.9})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '1.75rem',
          height: '1.75rem',
          background: themeColors.bgSecondary,
          border: `1px solid ${themeColors.borderColor}`,
          borderRadius: '0.3125rem',
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