// ============================================================================
// Dashboard Result (Discriminated Union)
// ============================================================================

export type DashboardSuccess = {
  success: true;
  userData: UserData;
  accessToken: string;
};

export type DashboardAuthError = {
  success: false;
  needsAuth: true;
};

export type DashboardFetchError = {
  success: false;
  error: string;
};

export type DashboardResult = DashboardSuccess | DashboardAuthError | DashboardFetchError;

// ============================================================================
// User Domain Types
// ============================================================================

export interface UserProfile {
  givenName?: string;
  familyName?: string;
}

export interface UserData {
  id: string;
  username?: string;
  name?: string;
  avatar?: string;
  primaryEmail?: string;
  primaryPhone?: string;
  profile: UserProfile;
  customData: Record<string, unknown>;
  identities: Record<string, { userId: string; details?: Record<string, unknown> }>;
  lastSignInAt?: string | number;
  createdAt: string | number;
  updatedAt: string | number;
  organizations?: Array<{ id: string; name: string }>;
  organizationRoles?: Array<{ id: string; name: string; organizationId: string }>;
}

// ============================================================================
// MFA Types
// ============================================================================

export interface MfaVerification {
  id: string;
  type: string;
  name?: string;
  agent?: string;
  createdAt: string;
  lastUsedAt?: string;
  remainCodes?: number;
}

export interface TotpSecret {
  secret: string;
  secretQrCode: string;
}

export interface BackupCode {
  code: string;
  usedAt: string | null;
}

export interface BackupCodesResponse {
  codes: BackupCode[];
}

// ============================================================================
// Verification Flow Types
// ============================================================================

export interface VerificationResult {
  verificationRecordId: string;
}

export type VerificationType = 'email' | 'phone';

// ============================================================================
// Update Payload Types
// ============================================================================

export interface BasicInfoUpdate {
  name?: string;
  username?: string;
  avatar?: string;
}

export interface EmailUpdatePayload {
  email: string | null;
  newIdentifierVerificationRecordId: string;
}

export interface PhoneUpdatePayload {
  phone: string | null;
  newIdentifierVerificationRecordId: string;
}

// ============================================================================
// MFA Payload Types (Enhanced Type Safety)
// ============================================================================

export type MfaType = 'Totp' | 'WebAuthn' | 'BackupCode';

export interface TotpVerificationPayload {
  code: string;
  secret: string;
}

export interface WebAuthnVerificationPayload {
  [key: string]: unknown;
}

export interface BackupCodeVerificationPayload {
  [key: string]: unknown;
}

export type MfaVerificationPayload =
  | { type: 'Totp'; payload: TotpVerificationPayload }
  | { type: 'WebAuthn'; payload: WebAuthnVerificationPayload }
  | { type: 'BackupCode'; payload: BackupCodeVerificationPayload };

// ============================================================================
// Type Guards
// ============================================================================

export const isTotpVerification = (v: MfaVerification): boolean => v.type === 'Totp';
export const isWebAuthnVerification = (v: MfaVerification): boolean => v.type === 'WebAuthn';
export const isBackupCodeVerification = (v: MfaVerification): boolean => v.type === 'BackupCode';

export const isDashboardSuccess = (result: DashboardResult): result is DashboardSuccess =>
  result.success === true;

export const isDashboardAuthError = (result: DashboardResult): result is DashboardAuthError =>
  'needsAuth' in result;

export const isDashboardFetchError = (result: DashboardResult): result is DashboardFetchError =>
  'error' in result;
