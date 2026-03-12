import type { UserData, MfaVerification, MfaVerificationPayload } from '../../logic/types';
import type { ThemeSpec, ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import type { TabId } from '../../logic/tabs';

export type { TabId };

export interface DashboardData {
  userData:    UserData;
  accessToken: string;
}

export interface ToastMessage {
  id:        string;
  type:      'success' | 'error' | 'info';
  message:   string;
  duration?: number;
}

export interface VerificationState {
  type:           'email' | 'phone' | null;
  operation:      'add' | 'edit' | 'remove' | null;
  step:           'password' | 'code' | null;
  verificationId: string | null;
  newValue:       string;
}

/** Dashboard context available to all tabs. */
export interface DashboardContext {
  theme:     ThemeSpec;
  t:         Translations;
  locale:    string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refreshData: () => void;
}

// Re-export convenience bundle
export type {
  UserData, MfaVerification, MfaVerificationPayload,
  ThemeSpec, ThemeColors, Translations,
};

