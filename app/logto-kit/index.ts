
export { Dashboard } from './components/dashboard';

export * from './logic';

export * from './components/dashboard';

export * from './themes';

export * from './locales';

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolvelang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';