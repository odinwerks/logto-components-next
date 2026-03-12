'use client';

import React, { useEffect } from 'react';
import type { ToastMessage } from '../types';
import type { ThemeSpec } from '../../../themes';

// ─────────────────────────────────────────────────────────────────────────────
// Single Toast
// ─────────────────────────────────────────────────────────────────────────────

interface ToastProps {
  message:   ToastMessage;
  onDismiss: (id: string) => void;
  theme:     ThemeSpec;
}

export function Toast({ message, onDismiss, theme }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(
      () => onDismiss(message.id),
      message.duration || 3000,
    );
    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  const cs = theme.components;
  const styleMap = {
    success: cs.toasts.success,
    error:   cs.toasts.error,
    info:    cs.toasts.info,
    warning: cs.toasts.warning,
  } as const;

  const toastStyle: React.CSSProperties = {
    ...styleMap[message.type],
    zIndex:    9999,
    maxWidth:  '25rem',
    animation: 'slideIn 0.2s ease-out',
  };

  return (
    <div style={toastStyle}>
      <div style={{
        display:     'flex',
        justifyContent: 'space-between',
        alignItems:  'center',
        gap:         '0.75rem',
      }}>
        <span>{message.message}</span>
        <button
          onClick={() => onDismiss(message.id)}
          style={{
            background: 'transparent',
            border:     'none',
            color:      'inherit',
            cursor:     'pointer',
            fontSize:   '0.875rem',
            padding:    '0',
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
  messages:  ToastMessage[];
  onDismiss: (id: string) => void;
  theme:     ThemeSpec;
}

export function ToastContainer({ messages, onDismiss, theme }: ToastContainerProps) {
  return (
    <>
      {messages.map((message, index) => (
        <div
          key={message.id}
          style={{
            position: 'fixed',
            top:      `${1.25 + index * 4.375}rem`,
            right:    '1.25rem',
            zIndex:   9999,
          }}
        >
          <Toast message={message} onDismiss={onDismiss} theme={theme} />
        </div>
      ))}
    </>
  );
}
