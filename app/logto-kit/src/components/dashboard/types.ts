import type { UserData, MfaVerification, MfaVerificationPayload } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
// TabId lives in logic/tabs so that the logic layer never has to import from components
import type { TabId } from '../../logic/tabs';

export type { TabId };

export interface DashboardData {
  userData: UserData;
  accessToken: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
  duration?: number;
}

export interface VerificationState {
  type: 'email' | 'phone' | null;
  operation: 'add' | 'edit' | 'remove' | null;
  step: 'password' | 'code' | null;
  verificationId: string | null;
  newValue: string;
}

// Dashboard context for passing theme, locale, and callbacks
export interface DashboardContext {
  theme: ThemeColors;
  t: Translations;
  locale: string;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refreshData: () => void;
}

// Re-export for convenience
export type { UserData, MfaVerification, MfaVerificationPayload, ThemeColors, Translations };
