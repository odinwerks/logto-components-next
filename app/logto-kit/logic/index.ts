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
  generateBackupCodes,
  getBackupCodes,
  introspectTokenWithOrg,
} from './actions';

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
  sanitizeLogtoError,
} from './validation';

export type { ValidationResult } from './validation';
