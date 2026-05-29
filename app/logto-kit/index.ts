
export { Dashboard } from './components/dashboard';

export { PreferencesProvider, useThemeMode, useLangMode, useOrgMode } from './components/providers/preferences';
export type { ThemeColors } from './components/providers/preferences';

export { UserDataProvider, useUserDataContext } from './components/providers/user-data-context';

export { LogtoProvider, useLogto } from './components/providers/logto-provider';

export { UserButton, UserBadge, UserCard } from './components/UserButton';

export * from './logic';

export * from './custom-logic';

export * from './components/dashboard';

export * from './themes';

export * from './locales';

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolveLang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';
export type { KitTranslations, Translations } from './locales';

export { useAvatarUpload } from './hooks/use-avatar-upload';

export { default as AuthWatcher } from './components/providers/auth-watcher';