// ============================================================================
// i18n System - ENV-based Locale Loading
// ============================================================================
// Usage:
//   LANG_MAIN=en-US (or NEXT_LANG_NAME=en-US) - sets default language
//   LANG_AVAILABLE=en-US,ka-GE (or NEXT_LANG_AVAILABLE) - available languages
//
// If not set, falls back to 'en-US'
// ============================================================================

import { enUS } from './en-US';
import { kaGE } from './ka-GE';
import { getDefaultLang } from '../logic/i18n';

export type LocaleCode = 'en-US' | 'ka-GE';

export interface Translations {
  // Dashboard
  dashboard: {
    title: string;
    version: string;
    loading: string;
    error: string;
    refresh: string;
    signOut: string;
    session: string;
    processing: string;
    systemMessage: string;
    availableLangs: string;
    refreshFailed: string;
    signOutFailed: string;
    loadFailed: string;
    signInPrompt: string;
    signInButton: string;
  };
  
  // Terminal header
  terminal: {
    prompt: string;
    command: string;
  };
  
  // Tabs
  tabs: {
    profile: string;
    customData: string;
    identities: string;
    organizations: string;
    mfa: string;
    raw: string;
  };
  
  // Sidebar
  sidebar: {
    profileAvatar: string;
    noAvatar: string;
    token: string;
    userId: string;
    lastLogin: string;
    lightMode: string;
    darkMode: string;
    active: string;
  };
  
  // Profile tab
  profile: {
    userProfile: string;
    basicInfo: string;
    editingProfile: string;
    givenName: string;
    familyName: string;
    username: string;
    email: string;
    phone: string;
    name: string;
    editProfile: string;
    saveProfile: string;
    saving: string;
    cancel: string;
    add: string;
    edit: string;
    remove: string;
    null: string;
    notSet: string;
    avatarUrl: string;
    editAvatarUrl: string;
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
  };
  
  // Verification
  verification: {
    password: string;
    verifyPassword: string;
    verificationCode: string;
    verifyCode: string;
    codeSent: string;
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
    invalidJson: string;
    unknownError: string;
  };
  
  // Custom Data tab
  customData: {
    title: string;
    editing: string;
    jsonData: string;
    editCustomData: string;
    save: string;
    empty: string;
    noCustomData: string;
    invalidJson: string;
    mustBeObject: string;
    description: string;
    success: string;
    error: string;
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
  };
  
  // Organizations tab
  organizations: {
    title: string;
    orgs: string;
    orgRoles: string;
    noOrganizations: string;
    noRoles: string;
    description: string;
    rolesDescription: string;
    idLabel: string;
    organizationLabel: string;
    roleIdLabel: string;
    rawTitle: string;
    rawHeading: string;
  };
  
  // MFA tab
  mfa: {
    title: string;
    enrolledFactors: string;
    noFactors: string;
    enrollNewFactor: string;
    totp: string;
    totpDescription: string;
    authenticatorApp: string;
    generateTotpSecret: string;
    scanQrCode: string;
    cantScan: string;
    enterManually: string;
    enterCodeFromApp: string;
    verifyAndEnroll: string;
    backupCodes: string;
    generateNewCodes: string;
    viewExisting: string;
    saveTheseCodes: string;
    existingCodes: string;
    codesLeft: string;
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
    factorRemoved: string;
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
    confirmRemoveFactor: string;
    verifyPasswordToRemoveFactor: string;
    verifyPasswordToGenerateTotp: string;
    verifyPasswordToGenerateBackupCodes: string;
    verifyPasswordToViewBackupCodes: string;
  };
  
  // Raw tab
  raw: {
    title: string;
    rawUserData: string;
    dataTitle: string;
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
  };
}

// Registry of all locales
const locales: Record<LocaleCode, Translations> = {
  'en-US': enUS,
  'ka-GE': kaGE,
};

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
 * LANG_AVAILABLE and NEXT_LANG_AVAILABLE should be comma-separated list
 */
export function getAvailableLocales(): LocaleCode[] {
  const available = process.env.LANG_AVAILABLE || process.env.NEXT_LANG_AVAILABLE || 'en-US';
  const codes = available.split(',').map(l => l.trim().toUpperCase() as LocaleCode);
  
  // Filter to only valid locales
  return codes.filter(code => locales[code]);
}

/**
 * Get translations for a locale
 */
export function getTranslations(locale: LocaleCode): Translations {
  return locales[locale] || locales['en-US'];
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
  return locale.toUpperCase() in locales;
}

// Export individual locales
export { enUS } from './en-US';
export { kaGE } from './ka-GE';

// Default export
export default locales;