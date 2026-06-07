import type { UserData, MfaVerification, MfaVerificationPayload } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import type { TabId } from '../../logic/tabs';

export type { TabId };

export interface DashboardData {
  userData:    UserData;
  // Dashboard user payload for client rendering.
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

