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

export function Toast({ message, onDismiss, mode, colors }: ToastProps) {
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
      // Clipboard API unavailable — no user feedback in current design
      setCopied(false);
    }
  }, [message.message]);

  const isDark = mode === 'dark';

  const mkToast = (accent: string, bg: string): React.CSSProperties => ({
    padding: '0.625rem',
    background: bg,
    border: `1px solid ${accent}`,
    borderRadius: '0.1875rem',
    fontSize: '0.75rem',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    color: accent,
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'opacity 0.15s',
  });

  const styleMap = {
    success: mkToast(colors.accentGreen, colors.successBg),
    error: mkToast(colors.accentRed, colors.errorBg),
    info: mkToast(colors.accentBlue, isDark ? '#3b82f61f' : '#2563eb1f'),
  } as const;

  const toastStyle: React.CSSProperties = {
    ...styleMap[message.type],
    zIndex: 9999,
    maxWidth: '25rem',
    animation: 'slideIn 0.2s ease-out',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  };

  return (
    <div style={toastStyle} onClick={copy} title="Click to copy">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '0.5rem',
      }}>
        <span style={{ flex: 1 }}>{message.message}</span>
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
  return (
    <>
      {messages.map((message, index) => (
        <div
          key={message.id}
          style={{
            position: 'fixed',
            top: `${1.25 + index * 4.375}rem`,
            right: '1.25rem',
            zIndex: 9999,
          }}
        >
          <Toast message={message} onDismiss={onDismiss} mode={mode} colors={colors} />
        </div>
      ))}
    </>
  );
}
