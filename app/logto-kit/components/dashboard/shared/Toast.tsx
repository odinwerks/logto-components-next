'use client';

import React, { useEffect } from 'react';
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
  useEffect(() => {
    const timer = setTimeout(
      () => onDismiss(message.id),
      message.duration || 3000,
    );
    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  const isDark = mode === 'dark';

  const mkToast = (accent: string, bg: string): React.CSSProperties => ({
    padding: '0.625rem',
    background: bg,
    border: `1px solid ${accent}`,
    borderRadius: '0.1875rem',
    fontSize: '0.75rem',
    fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
    color: accent,
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
  };

  return (
    <div style={toastStyle}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <span>{message.message}</span>
        <button
          onClick={() => onDismiss(message.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '0.875rem',
            padding: '0',
            lineHeight: '1',
          }}
        >
          ×
        </button>
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
