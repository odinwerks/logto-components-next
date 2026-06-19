'use client';

import { useState, useCallback, useMemo } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useThemeMode } from '../../logto-kit/components/providers/preferences';

// ─── Token types ────────────────────────────────────────────────────────────

interface Token {
  type: 'comment' | 'string' | 'keyword' | 'type' | 'function' | 'number' | 'tag' | 'attribute' | 'jsxExpr' | 'plain';
  value: string;
}

// ─── VSCode Dark+ colors ────────────────────────────────────────────────────

const COLORS: Record<Token['type'], string> = {
  comment:   '#6A9955',
  string:    '#CE9178',
  keyword:   '#569CD6',
  type:      '#4EC9B0',
  function:  '#DCDCAA',
  number:    '#B5CEA8',
  tag:       '#569CD6',
  attribute: '#9CDCDB',
  jsxExpr:   '#D4D4D4',
  plain:     '#D4D4D4',
};

// ─── Tokenizer ──────────────────────────────────────────────────────────────

const KEYWORDS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var',
  'function', 'return', 'if', 'else', 'new', 'typeof', 'instanceof',
  'type', 'interface', 'extends', 'implements', 'enum', 'declare',
  'async', 'await', 'try', 'catch', 'throw', 'class', 'constructor',
  'void', 'null', 'undefined', 'true', 'false', 'this', 'as', 'of',
  'switch', 'case', 'break', 'continue', 'for', 'while', 'do',
  'yield', 'static', 'readonly', 'abstract', 'keyof', 'infer',
  'never', 'unknown', 'any', 'string', 'number', 'boolean', 'object',
  'unique', 'symbol', 'bigint', 'module', 'namespace', 'require',
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Line comments
    if (code[i] === '/' && code[i + 1] === '/') {
      const start = i;
      while (i < code.length && code[i] !== '\n') i++;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Block comments
    if (code[i] === '/' && code[i + 1] === '*') {
      const start = i;
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2;
      tokens.push({ type: 'comment', value: code.slice(start, i) });
      continue;
    }

    // Template literals
    if (code[i] === '`') {
      const start = i;
      i++;
      while (i < code.length && code[i] !== '`') {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      tokens.push({ type: 'string', value: code.slice(start, i) });
      continue;
    }

    // Strings
    if (code[i] === '"' || code[i] === "'") {
      const quote = code[i];
      const start = i;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\') i++;
        i++;
      }
      i++;
      tokens.push({ type: 'string', value: code.slice(start, i) });
      continue;
    }

    // Numbers
    if (/[0-9]/.test(code[i]) && (i === 0 || !/[a-zA-Z_$]/.test(code[i - 1]))) {
      const start = i;
      while (i < code.length && /[0-9.]/.test(code[i])) i++;
      tokens.push({ type: 'number', value: code.slice(start, i) });
      continue;
    }

    // JSX tags
    if (code[i] === '<' && (i === 0 || /[\s=(]/.test(code[i - 1]))) {
      const start = i;
      i++;
      // closing tag </
      if (code[i] === '/') i++;
      // tag name
      if (/[A-Za-z]/.test(code[i])) {
        while (i < code.length && /[A-Za-z0-9._]/.test(code[i])) i++;
        tokens.push({ type: 'tag', value: code.slice(start, i) });
        continue;
      }
      // just < or </
      tokens.push({ type: 'plain', value: code.slice(start, i) });
      continue;
    }

    // JSX self-close or >
    if (code[i] === '/' && code[i + 1] === '>' && i > 0) {
      const prev = tokens[tokens.length - 1];
      if (prev && (prev.type === 'tag' || prev.type === 'attribute')) {
        tokens.push({ type: 'tag', value: '/>' });
        i += 2;
        continue;
      }
    }

    // Words (identifiers, keywords, types)
    if (/[a-zA-Z_$]/.test(code[i])) {
      const start = i;
      while (i < code.length && /[a-zA-Z0-9_$]/.test(code[i])) i++;
      const word = code.slice(start, i);

      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', value: word });
      } else if (/^[A-Z]/.test(word)) {
        tokens.push({ type: 'type', value: word });
      } else if (i < code.length && code[i] === '(') {
        tokens.push({ type: 'function', value: word });
      } else {
        // Check if it's a JSX attribute (preceded by whitespace, followed by =)
        const rest = code.slice(i).trimStart();
        if (rest.startsWith('=')) {
          const prevChar = code[start - 1];
          if (prevChar && /[\s\n]/.test(prevChar)) {
            tokens.push({ type: 'attribute', value: word });
            continue;
          }
        }
        tokens.push({ type: 'plain', value: word });
      }
      continue;
    }

    // Whitespace / punctuation
    tokens.push({ type: 'plain', value: code[i] });
    i++;
  }

  return tokens;
}

// ─── Render highlighted code ────────────────────────────────────────────────

function HighlightedCode({ code }: { code: string }) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <code style={{ fontFamily: "'IBM Plex Mono', 'Courier New', monospace", fontSize: '0.75rem', lineHeight: 1.65, whiteSpace: 'pre' }}>
      {tokens.map((tok, i) => (
        <span key={i} style={{ color: COLORS[tok.type] }}>{tok.value}</span>
      ))}
    </code>
  );
}

// ─── CodeBlock component ────────────────────────────────────────────────────

interface CodeBlockProps {
  code: string;
  lang?: 'tsx' | 'ts' | 'bash';
  title?: string;
}

export default function CodeBlock({ code, lang = 'tsx', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { mode } = useThemeMode();

  const isDark = mode === 'dark';

  // Frame / chrome colors — theme-aware
  // Note: COLORS (token highlighting) stays dark-only: code editors conventionally
  // use dark syntax colors even on light backgrounds, matching VS Code Dark+.
  const frameBorder   = isDark ? '#3c3c3c' : '#d1d5db';
  const titleBg       = isDark ? '#252526' : '#f3f4f6';
  const titleBorder   = isDark ? '#3c3c3c' : '#d1d5db';
  const titleColor    = isDark ? '#808080' : '#6b7280';
  const langColor     = isDark ? '#5a5a5a' : '#9ca3af';
  const codeBg        = isDark ? '#1e1e1e' : '#f9fafb';
  const copyBtnBg     = isDark ? '#2d2d2d' : '#ffffff';
  const copyBtnBorder = isDark ? '#3c3c3c' : '#d1d5db';
  const copyBtnColor  = isDark ? '#808080' : '#6b7280';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback for older browsers / non-HTTPS
      try {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch {
        setCopyFailed(true);
        setTimeout(() => setCopyFailed(false), 1500);
        return;
      }
    }
    setCopied(true);
    setCopyFailed(false);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  const trimmedCode = code.trim();

  return (
    <div style={{
      border: `1px solid ${frameBorder}`,
      borderRadius: '6px',
      overflow: 'hidden',
      marginBottom: '6px',
    }}>
      {title && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          background: titleBg,
          borderBottom: `1px solid ${titleBorder}`,
          fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
          fontSize: '0.6875rem',
          color: titleColor,
          letterSpacing: '0.03em',
        }}>
          <span>{title}</span>
          <span style={{ fontSize: '0.5625rem', color: langColor, textTransform: 'uppercase' }}>{lang}</span>
        </div>
      )}

      <div
        style={{
          position: 'relative',
          background: codeBg,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <pre style={{
          margin: 0,
          padding: '14px 16px',
          overflowX: 'auto',
          overflowY: 'hidden',
          background: 'transparent',
        }}>
          <HighlightedCode code={trimmedCode} />
        </pre>

        <button
          onClick={handleCopy}
          title={copyFailed ? 'Copy failed' : copied ? 'Copied!' : 'Copy'}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            background: copyBtnBg,
            border: `1px solid ${copyBtnBorder}`,
            borderRadius: '4px',
            cursor: 'pointer',
            color: copyFailed ? '#dc2626' : copied ? '#4ec9b0' : copyBtnColor,
            opacity: hovered || copied || copyFailed ? 1 : 0,
            transform: `scale(${hovered || copied || copyFailed ? 1 : 0.9})`,
            transition: 'opacity 0.15s ease, transform 0.15s ease, color 0.15s ease',
            pointerEvents: hovered || copied || copyFailed ? 'auto' : 'none',
          }}
        >
          {copyFailed
            ? <AlertCircle size={13} strokeWidth={2} />
            : copied
              ? <Check size={13} strokeWidth={2.5} />
              : <Copy size={13} strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  );
}
