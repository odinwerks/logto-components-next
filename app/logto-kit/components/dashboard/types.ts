import type { UserData, MfaVerification, MfaVerificationPayload } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import type { TabId } from '../../logic/tabs';

export type { TabId };

export interface DashboardData {
  userData:    UserData;
  // Access token kept server-side; fetch via getCurrentAccessToken() when dev mode requires it.
}

export interface ToastMessage {
  id:        string;
  type:      'success' | 'error' | 'info';
  message:   string;
  duration?: number;
}

// Re-export convenience bundle
export type {
  UserData, MfaVerification, MfaVerificationPayload,
  ThemeColors, Translations,
};

