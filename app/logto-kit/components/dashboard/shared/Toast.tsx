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
        padding: '10px',
        background: bgColor,
        border: `1px solid ${borderColor}`,
        borderRadius: '5px',
        fontSize: '12px',
        fontFamily: 'var(--font-ibm-plex-mono)',
        zIndex: 9999,
        maxWidth: '400px',
        color: textColor,
        animation: 'slideIn 0.2s ease-out',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <span>{message.message}</span>
        <button
          onClick={() => onDismiss(message.id)}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: '14px',
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
            top: `${20 + index * 70}px`,
            right: '20px',
            zIndex: 9999,
          }}
        >
          <Toast message={message} onDismiss={onDismiss} themeColors={themeColors} />
        </div>
      ))}
    </>
  );
}
