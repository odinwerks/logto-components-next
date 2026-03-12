'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import type { ThemeSpec } from '../../../themes';
import type { Translations } from '../../../locales';

// ─────────────────────────────────────────────────────────────────────────────
// CodeBlock
// ─────────────────────────────────────────────────────────────────────────────

interface CodeBlockProps {
  title?:   string;
  badge?:   string;
  data:     unknown;
  theme:    ThemeSpec;
  t:        Translations;
  maxHeight?: string;
  copyKey?:   string;
  onCopy?:    (text: string, key: string) => void;
}

export function CodeBlock({
  title, badge, data, theme, t, maxHeight = '25rem',
  copyKey = 'default', onCopy,
}: CodeBlockProps) {
  const [copied, setCopied]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const cs = theme.components;
  const c  = theme.colors;

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

  const copyBtnStyle: React.CSSProperties = {
    ...cs.code.copyButton.base,
    top:   '0.5rem',
    right: '0.5rem',
    ...(hovered || copied ? cs.code.copyButton.visible : {}),
    ...(copied ? cs.code.copyButton.copied : {}),
  };

  return (
    <div style={cs.code.wrapper}>
      {(title || badge) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {title && (
            <span style={cs.text.microMono}>{title}</span>
          )}
          {badge && (
            <span style={{
              ...cs.badges.info,
              padding:   '0.0625rem 0.3125rem',
              fontSize:  theme.tokens.typography.size.micro,
              fontWeight:theme.tokens.typography.weight.semibold,
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
        <pre style={{ ...cs.code.pre, maxHeight }}>{text}</pre>

        <button
          onClick={handleCopy}
          title={t.common.copy}
          style={copyBtnStyle}
        >
          {copied
            ? <Check size={13} strokeWidth={2.5} />
            : <Copy  size={13} strokeWidth={2} />
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
  theme: ThemeSpec;
  t:     Translations;
}

export function TruncatedToken({ token, theme, t }: TruncatedTokenProps) {
  const [copied, setCopied]   = useState(false);
  const [hovered, setHovered] = useState(false);
  const cs = theme.components;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const copyBtnStyle: React.CSSProperties = {
    ...cs.code.copyButton.base,
    top:       '50%',
    right:     '0.5rem',
    transform: `translateY(-50%) scale(${hovered || copied ? 1 : 0.9})`,
    ...(hovered || copied ? cs.code.copyButton.visible : {}),
    ...(copied ? cs.code.copyButton.copied : {}),
  };

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={cs.code.tokenContainer}>
        <pre style={{
          margin:       0,
          color:        theme.colors.textPrimary,
          fontSize:     '0.71875rem',
          fontFamily:   theme.tokens.typography.fontMono,
          overflow:     'hidden',
          textOverflow: 'ellipsis',
          whiteSpace:   'nowrap',
          lineHeight:   1.4,
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
          : <Copy  size={13} strokeWidth={2} />
        }
      </button>
    </div>
  );
}
