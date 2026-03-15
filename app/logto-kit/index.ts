
export { Dashboard } from './components/dashboard';

export { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './components/handlers/preferences';
export type { ThemeColors } from './components/handlers/preferences';

export { UserDataProvider, useUserDataContext } from './components/handlers/user-data-context';

export { LogtoProvider, useLogto } from './components/handlers/logto-provider';

export { UserButton, UserBadge } from './components/userbutton';

export * from './logic';

export * from './custom-logic';

export * from './components/dashboard';

export * from './themes';

export * from './locales';

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolvelang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';

export { useAvatarUpload } from './components/handlers/use-avatar-upload';

export { default as AuthWatcher } from './components/handlers/auth-watcher';