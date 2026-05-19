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
  introspectTokenWithOrg,
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
