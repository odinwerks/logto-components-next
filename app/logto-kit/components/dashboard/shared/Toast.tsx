'use client';

import React, { useEffect } from 'react';
import type { ToastMessage } from '../types';
import type { ThemeColors } from '../../../themes';

interface ToastProps {
  message: ToastMessage;
  onDismiss: (id: string) => void;
  themeColors: ThemeColors;
}

export function Toast({ message, onDismiss, themeColors }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(message.id);
    }, message.duration || 3000);

    return () => clearTimeout(timer);
  }, [message.id, message.duration, onDismiss]);

  const bgColor =
    message.type === 'success'
      ? themeColors.successBg
      : message.type === 'error'
      ? themeColors.errorBg
      : themeColors.warningBg;

  const borderColor =
    message.type === 'success'
      ? themeColors.accentGreen
      : message.type === 'error'
      ? themeColors.accentRed
      : themeColors.accentYellow;

  const textColor =
    message.type === 'success'
      ? themeColors.accentGreen
      : message.type === 'error'
      ? themeColors.accentRed
      : themeColors.accentYellow;

  return (
    <div
      style={{
        padding: '0.625rem',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '0.3125rem',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-ibm-plex-mono)',
        zIndex: 9999,
        maxWidth: '25rem',
        color: textColor,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <span>{message.message}</span>
        <button
          onClick={() => onDismiss(message.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
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

interface ToastContainerProps {
  messages: ToastMessage[];
  onDismiss: (id: string) => void;
  themeColors: ThemeColors;
}

export function ToastContainer({ messages, onDismiss, themeColors }: ToastContainerProps) {
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
          <Toast message={message} onDismiss={onDismiss} themeColors={themeColors} />
        </div>
      ))}
    </>
  );
}
