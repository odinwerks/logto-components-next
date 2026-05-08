'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ThemeColors } from '../../../themes';
import type { Translations } from '../../../locales';

// ─────────────────────────────────────────────────────────────────────────────
// CodeBlock
// ─────────────────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  title?: string;
  badge?: string;
  data: unknown;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
  maxHeight?: string;
  copyKey?: string;
  onCopy?: (text: string, key: string) => void;
}

export function CodeBlock({
  title, badge, data, mode, colors, t, maxHeight = '25rem',
  copyKey = 'default', onCopy,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const c = colors;
  const isDark = mode === 'dark';

  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.(text, copyKey);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Inlined component styles
  const codeWrapperStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    borderRadius: '0.1875rem',
    overflow: 'hidden',
  };

  const codePreStyle: React.CSSProperties = {
    margin: 0,
    padding: '0.875rem 1rem',
    overflow: 'auto',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '0.6875rem',
    lineHeight: 1.6,
    color: c.textSecondary,
    whiteSpace: 'pre',
    background: c.bgSecondary,
  };

  const copyButtonBase: React.CSSProperties = {
    position: 'absolute',
    background: c.bgPrimary,
    border: `1px solid ${c.borderColor}`,
    borderRadius: '0.25rem',
    padding: '0.25rem',
    cursor: 'pointer',
    color: c.textTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    zIndex: 1,
  };

  const copyButtonVisible: React.CSSProperties = {
    opacity: 1,
  };

  const copyButtonCopied: React.CSSProperties = {
    color: c.accentGreen,
  };

  const copyBtnStyle: React.CSSProperties = {
    ...copyButtonBase,
    top: '0.5rem',
    right: '0.5rem',
    opacity: 0.5,
    ...(hovered || copied ? copyButtonVisible : {}),
    ...(copied ? copyButtonCopied : {}),
  };

  const microMonoStyle: React.CSSProperties = {
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    fontSize: '0.5625rem',
    fontWeight: 600,
    color: c.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    padding: '0.5625rem 1rem 0',
  };

  const badgeInfoStyle: React.CSSProperties = {
    background: isDark ? '#3b82f61f' : '#2563eb1f',
    color: c.accentBlue,
    borderRadius: '0.1875rem',
  };

  return (
    <div style={codeWrapperStyle}>
      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {title && (
            <span style={microMonoStyle}>{title}</span>
          )}
          {badge && (
            <span style={{
              ...badgeInfoStyle,
              padding: '0.0625rem 0.3125rem',
              fontSize: '0.5625rem',
              fontWeight: 600,
            }}>
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
        <pre style={{ ...codePreStyle, maxHeight }}>{text}</pre>

        <button
          onClick={handleCopy}
          title={t.common.copy}
          style={copyBtnStyle}
        >
          {copied
            ? <Check size={13} strokeWidth={2.5} />
            : <Copy size={13} strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TruncatedToken
// ─────────────────────────────────────────────────────────────────────────────

interface TruncatedTokenProps {
  token: string;
  mode: 'dark' | 'light';
  colors: ThemeColors;
  t: Translations;
}

export function TruncatedToken({ token, mode, colors, t }: TruncatedTokenProps) {
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);
  const c = colors;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const copyButtonBase: React.CSSProperties = {
    position: 'absolute',
    background: c.bgPrimary,
    border: `1px solid ${c.borderColor}`,
    borderRadius: '0.25rem',
    padding: '0.25rem',
    cursor: 'pointer',
    color: c.textTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
    zIndex: 1,
  };

  const copyButtonVisible: React.CSSProperties = {
    opacity: 1,
  };

  const copyButtonCopied: React.CSSProperties = {
    color: c.accentGreen,
  };

  const copyBtnStyle: React.CSSProperties = {
    ...copyButtonBase,
    top: '50%',
    right: '0.5rem',
    opacity: 0.5,
    transform: `translateY(-50%) scale(${hovered || copied ? 1 : 0.9})`,
    ...(hovered || copied ? copyButtonVisible : {}),
    ...(copied ? copyButtonCopied : {}),
  };

  const tokenContainerStyle: React.CSSProperties = {
    background: c.bgSecondary,
    border: `1px solid ${c.borderColor}`,
    borderRadius: '0.1875rem',
    padding: '0.4375rem 0.625rem',
    paddingRight: '2rem',
    overflow: 'hidden',
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={tokenContainerStyle}>
        <pre style={{
          margin: 0,
          color: c.textPrimary,
          fontSize: '0.71875rem',
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          lineHeight: 1.4,
        }}>
          {token}
        </pre>
      </div>

      <button
        onClick={handleCopy}
        title={t.common.copy}
        style={copyBtnStyle}
      >
        {copied
          ? <Check size={13} strokeWidth={2.5} />
          : <Copy size={13} strokeWidth={2} />
        }
      </button>
    </div>
  );
}
