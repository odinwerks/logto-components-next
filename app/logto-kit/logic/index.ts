export type {
  DashboardResult,
  DashboardSuccess,
  DashboardAuthError,
  DashboardFetchError,
  UserData,
  MfaVerification,
  TotpSecret,
  BackupCode,
  BackupCodesResponse,
  VerificationResult,
  VerificationType,
  BasicInfoUpdate,
  EmailUpdatePayload,
  PhoneUpdatePayload,
  MfaType,
  MfaVerificationPayload,
  TotpVerificationPayload,
  WebAuthnVerificationPayload,
  BackupCodeVerificationPayload,
  PersonalPermission,
  RoleScope,
} from './types';

export {
  isTotpVerification,
  isWebAuthnVerification,
  isBackupCodeVerification,
  isDashboardSuccess,
  isDashboardAuthError,
  isDashboardFetchError,
} from './types';

export {
  fetchDashboardData,
  signOutUser,
  updateUserBasicInfo,
  updateUserProfile,
  updateUserCustomData,
  updateAvatarUrl,
  updateUserPassword,
  deleteUserAccount,
  uploadAvatar,
  verifyPasswordForIdentity,
  sendEmailVerificationCode,
  sendPhoneVerificationCode,
  verifyVerificationCode,
  updateEmailWithVerification,
  updatePhoneWithVerification,
  removeUserEmail,
  removeUserPhone,
  getMfaVerifications,
  generateTotpSecret,
  addMfaVerification,
  deleteMfaVerification,
  replaceTotpVerification,
  generateBackupCodes,
  getBackupCodes,
  requestWebAuthnRegistration,
  verifyAndLinkWebAuthn,
  renamePasskey,
  getUserSessions,
  getSessionsWithDeviceMeta,
  revokeUserSession,
  revokeAllOtherSessions,
  getUserGrants,
  revokeUserGrant,
  getOrganizationUserPermissions,
  getUserRoles,
  getUserScopes,
} from './actions/index';

export { LogtoApiError } from './errors';

export {
  ValidationError,
  validateE164,
  validateEmail,
  validatePassword,
  validateVerificationCode,
  validateVerificationId,
  validateUsername,
  validateUrl,
  validateJsonObject,
} from './validation';

export { formatPhone } from './formatting';

export type { ValidationResult } from './validation';

// UI components moved from ../custom-logic (kept here for barrel re-export).
// Note: setActiveOrg and OrgSwitcherWrapper remain in ../custom-logic.
export { Protected } from './Protected';
export { OrgSwitcher } from './OrgSwitcher';
