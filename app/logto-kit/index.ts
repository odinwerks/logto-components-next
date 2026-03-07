
export { Dashboard } from './components/dashboard';

export { ThemeModeProvider, useThemeMode } from './components/theme-mode';
export type { ThemeColors } from './components/theme-mode';

export { UserDataProvider, useUserDataContext } from './components/user-data-context';

export * from './logic';

export * from './components/dashboard';

export * from './themes';

export * from './locales';

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolvelang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';