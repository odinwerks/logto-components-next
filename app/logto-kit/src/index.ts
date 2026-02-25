// ============================================================================
// Dashboard Component
// ============================================================================

export { Dashboard } from './components/dashboard';

// ============================================================================
// Logic & Actions
// ============================================================================

export * from './logic';

// ============================================================================
// Components
// ============================================================================

export * from './components/dashboard';

// ============================================================================
// Themes
// ============================================================================

export * from './themes';

// ============================================================================
// Locales
// ============================================================================

export * from './locales';

// ============================================================================
// ENV-based utilities
// ============================================================================

export { getSupportedLangs, getDefaultLang, isValidLang, getNextLang, resolvelang, AVAILABLE_LOCALES } from './logic/i18n';
export { getLoadedTabs, ALL_TABS } from './logic/tabs';
export { getPreferencesFromUserData, buildUpdatedCustomData, hasPreferences } from './logic/preferences';
export { getDefaultThemeMode } from './themes';
export { getAllTranslations } from './locales';