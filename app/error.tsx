'use client';

import { useEffect, useState } from 'react';
import { captureMessage } from './logto-kit/logic/capture-message';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('[ErrorPage] RSC render error:', error);
  }, [error]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const msg = captureMessage(error);

  const isDevEnv = process.env.NODE_ENV === 'development';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        isDevEnv
          ? `${msg}\n\nname: ${error.name}\nstack: ${error.stack || 'N/A'}`
          : `${msg}\n\nname: ${error.name}`
      );
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--ldd-bg-primary)',
      color: 'var(--ldd-accent-red)',
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        maxWidth: '36rem',
        width: '100%',
        padding: '1.5rem',
        border: '1px solid var(--ldd-accent-red)',
        borderRadius: '0.25rem',
        background: 'var(--ldd-error-bg)',
      }}>
        <div style={{
          fontSize: '0.7rem',
          color: 'var(--ldd-text-tertiary)',
          marginBottom: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Render Error
        </div>

        <pre style={{
          margin: 0,
          fontSize: '0.8rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--ldd-text-primary)',
          fontFamily: 'inherit',
        }}>
          {msg}
        </pre>

        <div style={{
          display: 'flex',
          gap: '0.5rem',
          marginTop: '1.25rem',
        }}>
          <button
            onClick={copy}
            style={{
              background: 'var(--ldd-bg-tertiary)',
              border: '1px solid var(--ldd-accent-red)',
              color: copied ? 'var(--ldd-accent-green)' : 'var(--ldd-accent-red)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.1875rem',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {copied ? 'Copied!' : 'Copy error'}
          </button>

          <button
            onClick={reset}
            style={{
              background: 'var(--ldd-bg-tertiary)',
              border: '1px solid var(--ldd-accent-red)',
              color: 'var(--ldd-accent-red)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '0.375rem 0.875rem',
              borderRadius: '0.1875rem',
              fontFamily: 'inherit',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
