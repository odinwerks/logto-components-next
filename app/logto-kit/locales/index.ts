// ============================================================================
// i18n System - ENV-based Locale Loading
// ============================================================================
// Usage:
//   LANG_MAIN=en-US - sets default language
//   LANG_AVAILABLE=en-US,ka-GE - available languages
//
// If not set, falls back to 'en-US'
// ============================================================================

import { enUS } from './en-US';
import { kaGE } from './ka-GE';
import { ukUA } from './uk-UA';
import { getDefaultLang } from '../logic/i18n';
import { readEnv } from '../logic/env';

export type LocaleCode = 'en-US' | 'ka-GE' | 'uk-UA';

export interface Translations {
  // Dashboard
  dashboard: {
    loading: string;
    error: string;
    refresh: string;
    signOut: string;
    session: string;
    processing: string;
    availableLangs: string;
    refreshFailed: string;
    signOutFailed: string;
    loadFailed: string;
    opaqueToken: string;
    defaultUserName: string;
    account: string;
    closeDashboard: string;
    backToMenu: string;
  };
  
  // Tabs
  tabs: {
    profile: string;
    preferences: string;
    security: string;
    sessions: string;
    identities: string;
    organizations: string;
    mfa: string;
  };
  
  // Security tab
  security: {
    email: string;
    phone: string;
    password: string;
    changePassword: string;
    deleteAccount: string;
    deleteAccountDescription: string;
    dangerZone: string;
    removeEmail: string;
    removeEmailConfirm: string;
    removePhone: string;
    removePhoneConfirm: string;
    updateEmailTitle: string;
    updateEmailConfirm: string;
    removeEmailSubtitle: string;
    addEmailTitle: string;
    updatePhoneTitle: string;
    updatePhoneConfirm: string;
    removePhoneSubtitle: string;
    addPhoneTitle: string;
    enterValueFirst: string;
    reconfigureAuthenticator: string;
    reconfigureAuthenticatorDesc: string;
    removeAuthenticator: string;
    removeAuthenticatorDesc: string;
    generateBackupCodesTitle: string;
    generateBackupCodesConfirm: string;
    generateBackupCodesCta: string;
    viewBackupCodesTitle: string;
    enterCurrentPassword: string;
    enterNewPassword: string;
    passwordChanged: string;
    confirmDeleteAccount: string;
    accountDeleted: string;
    accountDeletedFarewell: string;
    deletingAccount: string;
    passwordChangeFailed: string;
    reconfigure: string;
    searchCountry: string;
    noCountryFound: string;
  };

  // Profile tab
  profile: {
    userProfile: string;
    basicInfo: string;
    editingProfile: string;
    firstName: string;
    lastName: string;
    firstNamePlaceholder: string;
    lastNamePlaceholder: string;
    username: string;
    email: string;
    phone: string;
    name: string;
    changeName: string;
    editProfile: string;
    saveProfile: string;
    edit: string;
    cancel: string;
    saving: string;
    avatarRemoved: string;
    removeAvatar: string;
    saveChanges: string;
    modify: string;
    discard: string;
    add: string;
    remove: string;
    notSet: string;
    editAvatarUrl: string;
    profilePhoto: string;
    dragDrop: string;
    browse: string;
    saveUrl: string;
    changePhoto: string;
    adjustPhoto: string;
    applyCrop: string;
    deletePfpPrefix: string;
    deletePfpHighlight: string;
    deletePfpSuffix: string;
    avatarUpdated: string;
    cropFailed: string;
    avatarInvalidType: string;
    avatarTooLarge: string;
    passwordRequired: string;
    emailRemoved: string;
    phoneRemoved: string;
    verificationFailed: string;
    missingVerification: string;
    emailUpdated: string;
    phoneUpdated: string;
    updateFailed: string;
    profileUpdated: string;
    confirmRemoveEmail: string;
    confirmRemovePhone: string;
    usernamePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    noRoles: string;
    rolesDescription: string;
    roleDescriptionLabel: string;
    roleIdLabel: string;
    rolesError: string;
    loading: string;
    personalPermissionsDesc: string;
    noPersonalPermissions: string;
    loadingPermissions: string;
    permissionsError: string;
    resourceLabel: string;
    takePicture: string;
    chooseFromGallery: string;
    deleteHint: string;
    sameEmailError: string;
    samePhoneError: string;
    refreshPersonalPermissions: string;
    refreshRoles: string;
  };
  
  // Verification
  verification: {
    password: string;
    verifyPassword: string;
    verificationCode: string;
    verifyCode: string;
    codeSent: string;
    totpCodeLabel: string;
  };

  // Validation messages
  validation: {
    phoneE164Format: string;
    invalidEmailFormat: string;
    emailTooLong: string;
    passwordRequired: string;
    passwordTooLong: string;
    codeMustBeSixDigits: string;
    verificationIdRequired: string;
    usernameTooShort: string;
    usernameTooLong: string;
    usernameInvalidCharacters: string;
    urlInvalidProtocol: string;
    urlInvalidFormat: string;
    jsonMustBeObject: string;
    unknownError: string;
    phoneCountryNotAllowed: string;
  };
  
  // Identities tab
  identities: {
    title: string;
    noIdentities: string;
    description: string;
    userIdLabel: string;
    detailsLabel: string;
    rawTitle: string;
    rawHeading: string;
    linkedAccounts: string;
    connected: string;
    idWithUserId: string;
    unknownDetail: string;
    providerGoogle: string;
    providerGithub: string;
    providerDiscord: string;
    providerFacebook: string;
    providerTwitter: string;
    providerApple: string;
    providerMicrosoft: string;
    providerLinkedin: string;
  };
  
  // Organizations tab
  organizations: {
    title: string;
    orgs: string;
    orgRoles: string;
    noOrganizations: string;
    noRoles: string;
    idLabel: string;
    organizationLabel: string;
    roleIdLabel: string;
    rawTitle: string;
    rawHeading: string;
    active: string;
    beYourself: string;
    orgPermissions: string;
    selectOrgForRoles: string;
    selectOrgForPermissions: string;
    loadingPermissions: string;
    noActiveOrg: string;
    noOrgPermissions: string;
    switchFailed: string;
    clearOrgFailed: string;
    refreshOrgPermissions: string;
    refreshOrgRoles: string;
    // ── Point 2: organization-context / switcher / listbox / provenance ──
    accessEyebrow: string;
    personalAccessLabel: string;
    personalModeDescription: string;
    selectedOrgDescription: string;
    noOrgDescription: string;
    switchingLabel: string;
    switchingAnnouncement: string;
    listboxLabel: string;
    personalOptionLabel: string;
    personalOptionDescription: string;
    orgSectionLabel: string;
    selectTriggerAriaLabel: string;
  };

  // ── Point 2: shared RBAC lister copy (provenance, details, copy, empty) ──
  rbac: {
    scopeLabel: string;
    scopeIdLabel: string;
    resourceIndicatorLabel: string;
    detailsButtonLabel: string;
    detailsDialogTitle: string;
    detailsCopyLabel: string;
    detailsCopyAnnouncement: string;
    detailsCopyFailedAnnouncement: string;
    countLabel: string;
    loadingLabel: string;
    emptyRolesTitle: string;
    emptyPermissionsTitle: string;
    emptyRolesDetail: string;
    emptyPermissionsDetail: string;
    // provenance / degraded state
    sourceM2mDerived: string;
    sourceLiveAudit: string;
    auditStatusAuditing: string;
    auditStatusLive: string;
    auditStatusError: string;
    descriptionsError: string;
    staleRetryNotice: string;
    refreshFailedNotice: string;
    // personal-only labels (no org context)
    personalRolesTitle: string;
    personalPermissionsTitle: string;
    // organization-only labels
    orgRolesTitle: string;
    orgPermissionsTitle: string;
  };
  
  // MFA tab
  mfa: {
    scanQrCode: string;
    registerPasskey: string;
    factorRemoved: string;
    enrollNewFactor: string;
    totp: string;
    totpDescription: string;
    authenticatorApp: string;
    generateTotpSecret: string;
    cantScan: string;
    enterManually: string;
    enterCodeFromApp: string;
    verifyAndEnroll: string;
    backupCodes: string;
    saveBackupCodes: string;
    backupCodesWarning: string;
    backupCodesTitle: string;
    generateNewCodes: string;
    viewExisting: string;
    saveTheseCodes: string;
    existingCodes: string;
    downloadTxt: string;
    downloadHtml: string;
    finishAndSave: string;
    hide: string;
    webauthn: string;
    webauthnDescription: string;
    enrollWebauthn: string;
    remove: string;
    created: string;
    lastUsed: string;
    passwordRequired: string;
    backupCodesGenerated: string;
    missingVerification: string;
    totpEnrolled: string;
    backupCodesDownloaded: string;
    backupCodesDownloadedHtml: string;
    enterPasswordPlaceholder: string;
    enterCodePlaceholder: string;
    updateFailed: string;
    loadFailed: string;
    verificationFailed: string;
    totpVerificationFailed: string;
    verifyPasswordToRemoveFactor: string;
    verifyPasswordToGenerateTotp: string;
    verifyPasswordToGenerateBackupCodes: string;
    verifyPasswordToViewBackupCodes: string;
    verifying: string;
    sendingCode: string;
    changingPassword: string;
    verifyingCode: string;
    removingOldAuth: string;
    generatingSecret: string;
    activating: string;
    removing: string;
    generatingCodes: string;
    fetchingCodes: string;
    authenticatorAuth: string;
    authenticatorActive: string;
    recoveryCodes: string;
    remaining: string;
    singleUseCodes: string;
    passkeys: string;
    passkeyDescription: string;
    passkey: string;
    addPasskey: string;
    registerPasskeyDesc: string;
    checkDevice: string;
    linkingPasskey: string;
    passkeyAdded: string;
    renamePasskey: string;
    renamePasskeyDesc: string;
    newPasskeyName: string;
    passkeyRenamed: string;
    deletePasskey: string;
    deletePasskeyDesc: string;
    passkeyDeleted: string;
    webauthnNotSupported: string;
    backupCodesRequireOtherFactor: string;
  };
  
  // Sessions tab
  sessions: {
    title: string;
    description: string;
    activeSessions: string;
    loggedInAt: string;
    lastActive: string;
    expires: string;
    authMethod: string;
    deviceId: string;
    unknown: string;
    revoke: string;
    revokeSession: string;
    revokeSessionDesc: string;
    processing: string;
    revokeAll: string;
    revokeAllDesc: string;
    revoked: string;
    revokeFailed: string;
    noSessions: string;
    password: string;
    social: string;
    webauthn: string;
    totp: string;
    backupCode: string;
    thisDevice: string;
    verifyToView: string;
    verifyToViewDesc: string;
    verifyPassword: string;
    verifyFailed: string;
    loadFailed: string;
    locationUnavailable: string;
    ipLocation: string;
    viewOnOpenStreetMap: string;
    viewOnGoogleMaps: string;
    refreshData: string;
    activeNow: string;
    locationDisclosure: string;
    externalMapDisclosure: string;
    gcAllConfirmTitle: string;
    gcAllSuccess: string;
    viewMap: string;
    gcOnlyOneTitle: string;
    gcOnlyOneBody: string;
    gcOnlyOneAck: string;
  };
   
  // Common
  common: {
    copy: string;
    copied: string;
    close: string;
    success: string;
    error: string;
    loading: string;
    retry: string;
    notAvailable: string;
    invalidDate: string;
    preferences: string;
    appearance: string;
    language: string;
    signOut: string;
    lightTheme: string;
    darkTheme: string;
    systemTheme: string;
    loggedInAs: string;
    openUserDashboard: string;
    yes: string;
    imageCropperHint: string;
    cancel: string;
    allow: string;
    unexpectedError: string;
  };

  // Auth prompt (unauthenticated user)
  auth: {
    signInToContinue: string;
    needToSignIn: string;
    signIn: string;
    readOnlyMode: string;
    ariaSignIn: string;
  };

  // Sign-out modal (playful farewell flow)
  signout: {
    title: string;
    bodyCountdown: string;
    abort: string;
    confirm: string;
    farewell: string;
  };

  // Error codes — maps the client-receivable string code to a human-readable message.
  // Keys are the code values from ERROR_CODES in error-codes.ts (not the registry key names).
  // For Logto dot-notation codes, `.` → `_` in the key (e.g. `session.invalid_credentials` → `session_invalid_credentials`).
  errors: {
    // ── auth ──
    UNAUTHENTICATED: string;
    UNAUTHORIZED: string;
    FORBIDDEN_ORIGIN: string;
    VERIFICATION_FAILED: string;
    VERIFICATION_EXPIRED: string;
    VERIFICATION_REQUIRED: string;
    MISSING_VERIFICATION: string;

    // ── rbac ──
    ROLE_DENIED: string;
    PERMISSION_DENIED: string;
    ORG_NOT_MEMBER: string;

    // ── validation ──
    INVALID_INPUT: string;
    MISSING_FIELDS: string;
    INVALID_PAYLOAD: string;
    PAYLOAD_TOO_LARGE: string;
    PHONE_COUNTRY_NOT_ALLOWED: string;

    // ── server ──
    INTERNAL_ERROR: string;
    FETCH_FAILED: string;
    UPDATE_FAILED: string;
    DELETE_FAILED: string;
    SERVICE_UNAVAILABLE: string;
    MFA_ENROLL_FAILED: string;
    MFA_REMOVE_FAILED: string;
    BACKUP_CODES_FAILED: string;
    BACKUP_CODES_SINGLETON_CONFLICT: string;
    PASSWORD_UPDATE_FAILED: string;
    EMAIL_UPDATE_FAILED: string;
    PHONE_UPDATE_FAILED: string;
    SESSION_REVOKE_FAILED: string;
    GRANT_REVOKE_FAILED: string;

    // ── rate-limit ──
    RATE_LIMITED: string;
    UPLOAD_RATE_LIMITED: string;

    // ── upload ──
    UPLOAD_FAILED: string;
    UPLOAD_TOO_LARGE: string;
    UPLOAD_INVALID_TYPE: string;

    // ── oauth (snake_case per RFC 6749) ──
    access_denied: string;
    invalid_request: string;
    unauthorized_client: string;
    unsupported_response_type: string;
    invalid_scope: string;
    server_error: string;
    temporarily_unavailable: string;
    interaction_required: string;
    login_required: string;
    consent_required: string;
    unknown_error: string;
    OAUTH_UNKNOWN_ERROR: string;

    // ── silent / ultimate fallback ──
    ERROR: string;

    // ── Logto structured API codes (dot-notation → underscore in key) ──
    session_invalid_credentials: string;
    session_verification_failed: string;
    session_identifier_not_found: string;
    session_identity_conflict: string;
    session_verification_session_not_found: string;
    user_user_not_exist: string;
    guard_invalid_target: string;
    password_expired: string;
    password_rejected: string;
    session_mfa_backup_code_can_not_be_alone: string;
    session_mfa_mfa_factor_not_enabled: string;
    session_mfa_pending_info_not_found: string;
    session_mfa_webauthn_verification_failed: string;
    session_not_supported_for_forgot_password: string;
    user_missing_profile: string;
    user_password_policy_violation: string;
    user_same_password: string;
    user_totp_already_in_use: string;
    user_username_already_in_use: string;
  };
}

// Backward-compatible alias
export type KitTranslations = Translations;

// Registry of all locales
const locales: Record<LocaleCode, Translations> = {
  'en-US': enUS,
  'ka-GE': kaGE,
  'uk-UA': ukUA,
};

// The registry crosses the React Server Component boundary, so it must remain
// a plain object (null-prototype objects are not serializable by React). Shadow
// every Object.prototype name with undefined as defense in depth for direct,
// same-runtime consumers. React Flight drops undefined properties, so every
// lookup must still use getTranslations(), which checks ownership at access
// time after the registry has crossed the server/client boundary.
for (const inheritedName of Object.getOwnPropertyNames(Object.prototype)) {
  Object.defineProperty(locales, inheritedName, {
    value: undefined,
    enumerable: true,
    configurable: false,
    writable: false,
  });
}

export type TranslationRegistry = Readonly<Record<string, Translations>>;

const TRANSLATION_NAMESPACES = [
  'dashboard',
  'tabs',
  'security',
  'profile',
  'verification',
  'validation',
  'identities',
  'organizations',
  'rbac',
  'mfa',
  'sessions',
  'common',
  'auth',
  'signout',
  'errors',
] as const satisfies readonly (keyof Translations)[];

function getOwnTranslations(
  locale: string,
  registry: TranslationRegistry,
): Translations | undefined {
  if (!Object.hasOwn(registry, locale)) return undefined;

  const candidate: unknown = registry[locale];
  if (typeof candidate !== 'object' || candidate === null) return undefined;

  // A polluted prototype must not be able to supply a translation namespace
  // for an otherwise own locale entry.
  if (!TRANSLATION_NAMESPACES.every((namespace) => Object.hasOwn(candidate, namespace))) {
    return undefined;
  }

  return candidate as Translations;
}

function hasOwnLocale(locale: string): locale is LocaleCode {
  return getOwnTranslations(locale, locales) !== undefined;
}

/**
 * Get main locale from environment
 * Uses getDefaultLang from logic/i18n as single source of truth
 */
export function getMainLocale(): LocaleCode {
  const defaultLang = getDefaultLang();
  // defaultLang is guaranteed to be in AVAILABLE_LOCALES, which matches LocaleCode
  return defaultLang as LocaleCode;
}

/**
 * Get available locales from environment
 * LANG_AVAILABLE should be a comma-separated list
 */
export function getAvailableLocales(): LocaleCode[] {
  const available = readEnv('LANG_AVAILABLE') || 'en-US';
  const codes = available.split(',').map(l => l.trim() as LocaleCode);

  // Filter to only valid locales
  return codes.filter(hasOwnLocale);
}

/**
 * Get translations for a locale using own properties only.
 *
 * A registry supplied by a Client Component may have crossed React Flight,
 * which strips undefined shadow properties. The lookup therefore checks the
 * registry and translation dictionary at use time rather than trusting shape.
 */
export function getTranslations(
  locale: string,
  registry: TranslationRegistry = locales,
  fallback: Translations = enUS,
): Translations {
  return getOwnTranslations(locale, registry) ?? fallback;
}

/**
 * Returns the full map of all translations
 */
export function getAllTranslations(): Record<string, Translations> {
  return locales;
}

/**
 * Check if a locale is available
 */
export function isLocaleAvailable(locale: string): boolean {
  return hasOwnLocale(locale);
}

// Export individual locales
export { enUS } from './en-US';
export { kaGE } from './ka-GE';
export { ukUA } from './uk-UA';

// Default export
export default locales;
