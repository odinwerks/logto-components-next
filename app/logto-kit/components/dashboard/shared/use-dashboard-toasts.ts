import { useState, useCallback } from 'react';
import type { Translations } from '../../../locales';
import type { ToastMessage } from '../types';

let toastCounter = 0;

export function useDashboardToasts(t: Translations) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const toast: ToastMessage = {
      id: `toast-${Date.now()}-${++toastCounter}`,
      type,
      message,
      duration: type === 'success' ? 3000 : 8000,
    };

    setToasts((prev) => [...prev, toast]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const mapErrorToast = useCallback((message: string) => {
    if (message === 'PHONE_COUNTRY_NOT_ALLOWED') {
      return t.validation.phoneCountryNotAllowed;
    }
    return message;
  }, [t]);

  return {
    toasts,
    showToast,
    dismissToast,
    mapErrorToast,
  };
}
