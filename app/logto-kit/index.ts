
export { Dashboard } from './components/dashboard';

export { PreferencesProvider, useThemeMode, useLangMode } from './components/handlers/preferences';
export type { ThemeColors } from './components/handlers/preferences';

export { UserDataProvider, useUserDataContext } from './components/handlers/user-data-context';

export * from './logic';

export * from './components/dashboard';

export * from './themes';

export * from './locales';

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolvelang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';

export { useAvatarUpload } from './components/handlers/use-avatar-upload';