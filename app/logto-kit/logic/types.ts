// ============================================================================
// Dashboard Result (Discriminated Union)
// ============================================================================

export type DashboardSuccess = {
  success: true;
  userData: UserData;
  activeOrgId?: string;
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
  organizationPermissions?: string[]; // Permission scopes from organization token
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
// Session Types (from Logto Account API)
// ============================================================================

export interface LogtoSessionPayload {
  exp: number;
  iat: number;
  jti: string;
  uid: string;
  kind: 'Session';
  loginTs: number;
  accountId: string;
  authorizations?: Record<string, {
    sid?: string;
    grantId?: string;
    persistsLogout?: boolean;
  }>;
}

export interface LogtoSessionVerificationRecord {
  id: string;
  type: string;
  identifier?: { type: string; value: string };
}

export interface LogtoSessionLastSubmission {
  interactionEvent: 'SignIn' | 'Register' | 'ForgotPassword';
  userId: string;
  verificationRecords: LogtoSessionVerificationRecord[];
  signInContext?: SignInContext;
}

export interface SignInContext {
  ip?: string;
  userAgent?: string;
  [key: string]: string | undefined;
}

export interface SessionMeta {
  jti: string;
  userId: string;
  ip: string | null;
  browser: string | null;
  browserVersion: string | null;
  os: string | null;
  osVersion: string | null;
  deviceType: string | null;
  lastActive: string | null; // Always null - S3 session tracking removed
  createdAt: string;
}

export interface LogtoSession {
  payload: LogtoSessionPayload;
  lastSubmission: LogtoSessionLastSubmission | null;
  clientId: string | null;
  accountId: string | null;
  expiresAt: number;
  meta: SessionMeta | null;
}

// ============================================================================
// Token Types
// ============================================================================

export interface OidcIntrospectionResponse {
  active: boolean;
  sub?: string;
  scope?: string;
  client_id?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  token_type?: string;
  organization_id?: string;
  sid?: string; // Session ID
  jti?: string; // JWT ID
}

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
