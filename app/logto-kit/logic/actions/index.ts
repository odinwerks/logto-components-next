// ============================================================================
// Barrel file for server actions.
// 
// NOTE: This file does NOT have 'use server' directive.
// Each individual module (./shared.ts, ./tokens.ts, etc.) has 'use server' at the top.
// This file just re-exports them for convenient importing.
// ============================================================================

// Safe action wrapper types
export type { ActionResult, DataResult } from './safe';

// Shared Helpers
export { throwOnApiError, patchMyAccount } from './shared';

// Action Helpers (staleness checks, audit)
export { assertVerificationNotExpired, auditSafe } from './helpers';

// Token Helpers
export { getTokenForServerAction, getFreshAccessToken } from './tokens';

// Request Helper
export { makeRequest } from './request';

// Dashboard Data Fetching
export { fetchDashboardData } from './dashboard';

// Authentication
export { signOutUser } from './auth';

// Profile Management
export { 
  updateUserBasicInfo, 
  updateUserProfile, 
  updateUserCustomData, 
  updateAvatarUrl 
} from './profile';

// Verification
export { 
  verifyPasswordForIdentity,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyVerificationCode,
  updateEmailWithVerification,
  updatePhoneWithVerification,
  removeUserEmail,
  removeUserPhone,
} from './verification';

// MFA Management
export { 
  getMfaVerifications,
  generateTotpSecret,
  addMfaVerification,
  deleteMfaVerification,
  replaceTotpVerification,
  generateBackupCodes,
  getBackupCodes,
} from './mfa';

// WebAuthn / Passkey Management
export { requestWebAuthnRegistration, verifyAndLinkWebAuthn, renamePasskey } from './webauthn';

// Password Management
export { updateUserPassword } from './password';

// Account Management
export { deleteUserAccount } from './account';

// Avatar Upload
export { uploadAvatar } from './avatar';

// Organization Permissions + M2M Access Verification
export { getOrganizationUserPermissions, verifyOrgAccess, getOrgPermissionsWithDescriptions } from './organizations';
export type { OrgAccessResult } from './organizations';

// Personal RBAC Verification
export { verifyPersonalAccess } from './roles';
export type { PersonalAccessResult } from '../types';

// User Roles & Personal Permissions
export { getUserRoles, getUserScopes, getRoleDetails, getOrganizationUserRoles } from './roles';

// Heartbeat
export { recordHeartbeat } from './heartbeat';

// Session Management
export { 
  getUserSessions,
  getSessionsWithDeviceMeta,
  revokeUserSession,
  revokeAllOtherSessions,
  getUserGrants,
  revokeUserGrant,
} from './sessions';

// Token Introspection - removed: introspectTokenWithOrg was dead code (zero callers)

