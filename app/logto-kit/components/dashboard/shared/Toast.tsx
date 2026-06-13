'use client';

import React, { useEffect, useState, useCallback } from 'react';
import type { ToastMessage } from '../types';
import type { ThemeColors } from '../../../themes';

// ─────────────────────────────────────────────────────────────────────────────
// Single Toast
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

export function Toast({ message, onDismiss, mode: _mode, colors }: ToastProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(
      () => onDismiss(message.id),
      message.duration || 3000,
    );
    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(message.message);
      setCopied(true);
    } catch {
      // Clipboard API unavailable - no user feedback in current design
      setCopied(false);
    }
  }, [message.message]);

  const mkToast = (accent: string, bg: string): React.CSSProperties => ({
    padding: '0.625rem',
    background: bg,
    border: `1px solid ${accent}`,
    borderRadius: '0.1875rem',
    fontSize: '0.75rem',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    color: accent,
    userSelect: 'none',
    transition: 'opacity 0.15s',
  });

  const styleMap = {
    success: mkToast(colors.accentGreen, colors.successBg),
    error: mkToast(colors.accentRed, colors.errorBg),
    info: mkToast(colors.accentBlue, `${colors.accentBlue}1f`),
  } as const;

  const toastStyle: React.CSSProperties = {
    ...styleMap[message.type],
    maxWidth: '25rem',
    animation: 'slideIn 0.2s ease-out',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div style={toastStyle} role="status" aria-live="polite">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.5rem',
      }}>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy message"
          title="Click to copy"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textAlign: 'left',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            flex: 1,
            outline: 'none',
            alignSelf: 'stretch',
            whiteSpace: 'inherit',
            wordBreak: 'inherit',
          }}
        >
          {message.message}
        </button>
        <div style={{
          display: 'flex',
          gap: '0.375rem',
          flexShrink: 0,
          fontSize: '0.7rem',
          lineHeight: '1.2',
        }}>
          {copied ? (
            <span style={{ opacity: 0.7 }}>Copied!</span>
          ) : (
            <button
              onClick={copy}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid currentColor',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '0.65rem',
                padding: '0.0625rem 0.375rem',
                borderRadius: '0.125rem',
                lineHeight: '1.5',
                fontFamily: 'inherit',
              }}
            >
              copy
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDismiss(message.id); }}
            aria-label="Dismiss notification"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
              padding: '0',
              lineHeight: '1',
              opacity: 0.6,
            }}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToastContainer
// ─────────────────────────────────────────────────────────────────────────────

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
  mode: 'dark' | 'light';
  colors: ThemeColors;
}

export function ToastContainer({ messages, onDismiss, mode, colors }: ToastContainerProps) {
  if (messages.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.25rem',
        right: '1.25rem',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      {messages.map((message) => (
        <div
          key={message.id}
          style={{
            pointerEvents: 'auto',
          }}
        >
          <Toast message={message} onDismiss={onDismiss} mode={mode} colors={colors} />
        </div>
      ))}
    </div>
  );
}
