import type { UserData, MfaVerification, MfaVerificationPayload, PersonalRbacResult, OrgRbacResult } from '../../logic/types';
import type { ThemeColors } from '../../themes';
import type { Translations } from '../../locales';
import type { TabId } from '../../logic/tabs';

export type { TabId };

export interface DashboardData {
  userData:    UserData;
  // Dashboard user payload for client rendering.
}

// Re-export the RBAC result types so the client shells can type the promise
// props streamed from the RSCs (Phase 2 of the instant-fetch plan).
export type { PersonalRbacResult, OrgRbacResult };

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

