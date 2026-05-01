// ============================================================================
// Barrel file for server actions.
// 
// NOTE: This file does NOT have 'use server' directive.
// Each individual module (./shared.ts, ./tokens.ts, etc.) has 'use server' at the top.
// This file just re-exports them for convenient importing.
// ============================================================================

// Shared Helpers
export { throwOnApiError, patchMyAccount } from './shared';

// Token Helpers
export { getTokenForServerAction, getFreshAccessToken } from './tokens';

// Request Helper
export { makeRequest } from './request';

// Dashboard Data Fetching
export { fetchDashboardData, fetchUserBadgeData } from './dashboard';

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

// Password Management
export { updateUserPassword } from './password';

// Account Management
export { deleteUserAccount } from './account';

// Avatar Upload
export { uploadAvatar } from './avatar';

// Organization Permissions
export { getOrganizationUserPermissions } from './organizations';

// Session Management
export { 
  getUserSessions,
  getSessionsWithDeviceMeta,
  revokeUserSession,
  revokeAllOtherSessions,
  getUserGrants,
  revokeUserGrant,
} from './sessions';

// Token Introspection (for RBAC)
export { introspectTokenWithOrg } from './introspection';

// Dev-only: Token access for the Dev tab (server refuses in production)
export { getCurrentAccessToken } from './debug-token';
