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
  createdAt?: string | number;
  updatedAt?: string | number;
  organizations?: Array<{ id: string; name: string }>;
  organizationRoles?: Array<{ id: string; name: string; organizationId: string }>;
  organizationPermissions?: string[]; // Permission scopes from organization token
  roles?: UserRole[];
}

export interface UserRole {
  id: string;
  name: string;
  description?: string;
  type?: 'User' | 'MachineToMachine';
  tenantId?: string;
  isDefault?: boolean;
}

export interface RoleScopeResource {
  id: string;
  name: string;
  indicator: string;
  isDefault: boolean;
  tenantId: string;
  accessTokenTtl: number;
}

export interface RoleScope {
  id: string;
  name: string;
  description: string | null;
  resourceId: string;
  tenantId: string;
  createdAt: number;
  resource: RoleScopeResource;
}

export interface PersonalPermission {
  scope: string;
  resourceName: string;
  resourceIndicator: string;
  description?: string | null;
}

/**
 * Scope (permission) assigned to an organization role.
 * Returned by GET /api/organization-roles/{id}/scopes.
 * Note: flat structure — no resource field (unlike API resource scopes).
 */
export interface OrgRoleScope {
  id: string;
  name: string;
  description: string | null;
  tenantId: string;
}

// ============================================================================
// Protected Action Types
// ============================================================================

export interface ProtectedActionHandler {
  (data: { userId: string; orgId: string | null; payload: unknown }): Promise<unknown>;
}

/**
 * Action configuration for the Protected Actions API.
 *
 * All three check categories MUST be defined. Missing any of them causes
 * IMPROPER_SETUP_ERROR at startup. Use "self" for requiredOrgId to check
 * personal (global) roles and permissions instead of an organization.
 */
export interface ActionConfig {
  requiredOrgId: string;
  requiredRoleId: string | string[];
  requiredPermId: string | string[];
  handler: ProtectedActionHandler;
}

export type ActionRegistry = Record<string, ActionConfig>;

export interface PersonalAccessResult {
  roles: UserRole[];
  permissions: string[];
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
  lastActive: string | null; // Populated from session.lastActiveAt ?? null
  createdAt: string;
  /**
   * Enriched UI-facing value derived from `LogtoSession.isCurrent ?? false`.
   * Always `false` until Logto ships the `isCurrent` field in the Account API
   * sessions response (PRs #8728–#8731). After enrichment, this is the
   * authoritative value for UI components — read `session.meta.isCurrent`,
   * not the raw `session.isCurrent`.
   */
  isCurrent: boolean;
}

export interface LogtoSession {
  payload: LogtoSessionPayload;
  lastSubmission: LogtoSessionLastSubmission | null;
  clientId: string | null;
  accountId: string | null;
  expiresAt: number;
  /**
   * Raw value from the Logto Account API (`GET /api/my-account/sessions`).
   * `true` for the session backing the caller's access token, `false` for
   * the others. `undefined` until Logto ships PRs #8728–#8731 — the
   * `getSessionsWithDeviceMeta` action uses `?? false` when populating
   * `SessionMeta.isCurrent`. UI components should read `session.meta.isCurrent`,
   * not this field directly.
   */
  isCurrent?: boolean;
  lastActiveAt?: string | null;
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
  !result.success && 'needsAuth' in result;

export const isDashboardFetchError = (result: DashboardResult): result is DashboardFetchError =>
  !result.success && 'error' in result;

// ============================================================================
// Organization Types
// ============================================================================

export interface OrganizationData {
  id: string;
  name: string;
  description?: string;
}
