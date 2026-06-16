'use client';

import { useEffect, useState } from 'react';
import { IBM_Plex_Mono, Instrument_Serif, DM_Sans } from 'next/font/google';
import './globals.css';
import { captureMessage } from './logto-kit/logic/capture-message';

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-plex-mono',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-instrument-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    console.error('[GlobalError] Crash inside root layout:', error);
  }, [error]);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  const msg = captureMessage(error);
  const isDevEnv = typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(
        isDevEnv
          ? `${msg}\n\nname: ${error.name}\ndigest: ${error.digest || 'N/A'}\nstack: ${error.stack || 'N/A'}`
          : `${msg}\n\nname: ${error.name}\ndigest: ${error.digest || 'N/A'}`
      );
      setCopied(true);
    } catch { /* clipboard unavailable */ }
  };

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className={`${ibmPlexMono.variable} ${instrumentSerif.variable} ${dmSans.variable}`} style={{
        margin: 0,
        padding: 0,
        backgroundColor: 'var(--ldd-bg-page, #030404)',
      }}>
        <div style={{
          minHeight: '100vh',
          background: 'var(--ldd-bg-primary, #111620)',
          color: 'var(--ldd-accent-red, #dc2626)',
          fontFamily: "var(--font-ibm-plex-mono), 'IBM Plex Mono', 'Courier New', monospace",
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}>
          <div style={{
            maxWidth: '36rem',
            width: '100%',
            padding: '1.5rem',
            border: '1px solid var(--ldd-accent-red, #dc2626)',
            borderRadius: '0.25rem',
            background: 'var(--ldd-error-bg, #1a0505)',
          }}>
            <div style={{
              fontSize: '0.7rem',
              color: 'var(--ldd-text-tertiary, #90959e)',
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
              color: 'var(--ldd-text-primary, #f3f4f6)',
              fontFamily: 'inherit',
            }}>
              {msg}
            </pre>

            {error.digest && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: 'var(--ldd-text-secondary, #9ca3af)',
              }}>
                digest: <code style={{ color: 'var(--ldd-text-primary, #f3f4f6)' }}>{error.digest}</code>
              </div>
            )}

            <div style={{
              display: 'flex',
              gap: '0.5rem',
              marginTop: '1.25rem',
            }}>
              <button
                onClick={copy}
                style={{
                  background: 'var(--ldd-bg-tertiary, #171c2a)',
                  border: '1px solid var(--ldd-accent-red, #dc2626)',
                  color: copied ? 'var(--ldd-accent-green, #059669)' : 'var(--ldd-accent-red, #dc2626)',
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
                  background: 'var(--ldd-bg-tertiary, #171c2a)',
                  border: '1px solid var(--ldd-accent-red, #dc2626)',
                  color: 'var(--ldd-accent-red, #dc2626)',
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
      </body>
    </html>
  );
}
