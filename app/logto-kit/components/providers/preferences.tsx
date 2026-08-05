'use client';

import { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef, useId, type ReactNode } from 'react';
import { type ThemeColors, DARK_COLORS, LIGHT_COLORS } from '../../themes';
import { getDefaultLang, type LocaleCode } from '../../logic/i18n';
import { createStorageHelpers } from '../../logic/client-storage';
import type { ActionResult } from '../../logic/actions/safe';

export type { ThemeColors, LocaleCode };

const THEME_STORAGE_KEY = 'theme-mode';
const LANG_STORAGE_KEY = 'lang-mode';
const ORG_STORAGE_KEY = 'org-mode';
const PREFERENCES_CHANNEL_NAME = 'logto-dash-preferences';
const PREFERENCES_SIGNAL_KEY = 'logto-dash-preferences-signal';

type PreferenceMessage = {
  source: string;
  timestamp: number;
  theme?: 'dark' | 'light';
  lang?: string;
  asOrg?: string | null;
};

function readSharedMessage(raw: string | null): PreferenceMessage | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const message = value as Partial<PreferenceMessage>;
    if (typeof message.source !== 'string' || typeof message.timestamp !== 'number') return null;
    if (message.theme !== undefined && message.theme !== 'dark' && message.theme !== 'light') return null;
    if (message.lang !== undefined && typeof message.lang !== 'string') return null;
    if (message.asOrg !== undefined && message.asOrg !== null && typeof message.asOrg !== 'string') return null;
    return message as PreferenceMessage;
  } catch {
    return null;
  }
}

// Shared `SecurityError`-safe sessionStorage helpers (Phase 6). Extracted
// from this file into `client-storage.ts` so every client storage consumer
// (preferences, LangSync, calculator) converges on one implementation.
const themeStorage = createStorageHelpers<'dark' | 'light'>(THEME_STORAGE_KEY);
const langStorage = createStorageHelpers<string>(LANG_STORAGE_KEY);
const orgStorage = createStorageHelpers<string | null>(ORG_STORAGE_KEY);

function getStoredTheme(): 'dark' | 'light' | null {
  const raw = themeStorage.get();
  // Validate at runtime: sessionStorage returns raw strings, so we must guard
  // against corrupted or unexpected values before using the typed result.
  if (raw === 'dark' || raw === 'light') return raw;
  return null;
}

function setStoredTheme(theme: 'dark' | 'light') {
  themeStorage.set(theme);
}

function getStoredLang(): string | null {
  return langStorage.get();
}

function setStoredLang(lang: string) {
  langStorage.set(lang);
}

function getStoredOrg(): string | null {
  return orgStorage.get();
}

function setStoredOrg(orgId: string | null) {
  orgStorage.set(orgId);
}

interface ThemeModeContextValue {
  mode: 'dark' | 'light';
  colors: ThemeColors;
  setMode: (mode: 'dark' | 'light') => void;
  toggleMode: () => void;
}

interface LangModeContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

interface OrgModeContextValue {
  asOrg: string | null;
  setAsOrg: (orgId: string | null) => void;
}

interface PreferencesContextValue {
  theme: ThemeModeContextValue;
  lang: LangModeContextValue;
  org: OrgModeContextValue;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({
  children,
  initialTheme,
  initialLang,
  initialOrgId,
  onUpdateCustomData,
  onLangChange,
  onPersistError,
}: {
  children: ReactNode;
  initialTheme?: 'dark' | 'light';
  initialLang?: string;
  // CAN-STATE-001: three-way distinction — `string` (active org), `null`
  // (authoritative personal mode), `undefined` (server value unavailable).
  initialOrgId?: string | null | undefined;
  onUpdateCustomData?: (customData: Record<string, unknown>) => Promise<ActionResult>;
  onLangChange?: () => void;
  onPersistError?: (message: string) => void;
}) {
  const serverDefaultLang = initialLang ?? getDefaultLang();

  const [theme, setThemeState] = useState<'dark' | 'light'>(initialTheme ?? 'dark');
  const [lang, setLangState] = useState<string>(serverDefaultLang);
  const [asOrg, setAsOrgState] = useState<string | null>(initialOrgId ?? null);

  // Refs for preference values to avoid stale closures in persist callbacks
  const themeRef = useRef(theme);
  const langRef = useRef(lang);
  const asOrgRef = useRef(asOrg);
  const themePersistMutationSeqRef = useRef(0);
  const langPersistMutationSeqRef = useRef(0);
  const asOrgPersistMutationSeqRef = useRef(0);
  // A stale success may become the newest known server state after the latest
  // optimistic write has failed. Keep the latest failure sequence so that
  // success can reconcile UI/storage only after the current transition failed,
  // never over a newer local or confirmed transition.
  const lastFailedThemePersistMutationSeqRef = useRef(0);
  const lastFailedLangPersistMutationSeqRef = useRef(0);
  const lastFailedOrgPersistMutationSeqRef = useRef(0);
  // CAN-STATE-002: per-key "last server-confirmed" baseline. Each persist
  // callback's rollback target MUST be the most recent value the server
  // actually accepted — NOT the captured `prev` ref snapshot, which is an
  // optimistic-only intermediate that may itself never have been confirmed.
  // Without this baseline, a double-failure (A optimistic, B optimistic
  // superseding A, then BOTH fail) rolls back to A's optimistic value (the
  // buggy intermediate) instead of the server's real last-confirmed value
  // (which is still the INITIAL server-provided value when no persist has
  // yet succeeded).
  //
  // The paired `*Seq` refs track the newest persist seq that successfully
  // confirmed, so OUT-OF-ORDER older successes (superseded by a newer write
  // in flight) cannot clobber a newer-confirmed value: we only advance
  // `lastConfirmed*Ref` when the incoming success has a strictly newer seq
  // than the previously confirmed one. The mutation-seq gate (above) still
  // discards stale RESPONSES for UI rollback purposes; it is orthogonal to
  // this confirmation tracking.
  const lastConfirmedThemeRef = useRef(theme);
  const lastConfirmedLangRef = useRef(lang);
  const lastConfirmedOrgRef = useRef(asOrg);
  const lastConfirmedThemeSeqRef = useRef(0);
  const lastConfirmedLangSeqRef = useRef(0);
  const lastConfirmedOrgSeqRef = useRef(0);
  // Ref to onUpdateCustomData so stable persist callbacks can access the latest value
  const onUpdateCustomDataRef = useRef(onUpdateCustomData);
  // Ref to onPersistError so stable persist callbacks can access the latest value
  const onPersistErrorRef = useRef(onPersistError);
  // Ref to onLangChange so setLang has a stable callback reference (BUG-084)
  const onLangChangeRef = useRef(onLangChange);
  const instanceId = useId();
  const sharedSourceRef = useRef(`preferences-${instanceId}`);
  const sharedTimestampRef = useRef(0);
  const sharedChannelRef = useRef<BroadcastChannel | null>(null);

  // Authoritative values supersede older local persistence attempts. Advancing
  // the per-field sequence makes late failures (and successes) stale, while
  // updating the confirmed baseline for any later rollback.
  const applyAuthoritativeTheme = useCallback((value: 'dark' | 'light') => {
    const seq = ++themePersistMutationSeqRef.current;
    lastConfirmedThemeSeqRef.current = seq;
    lastConfirmedThemeRef.current = value;
    themeRef.current = value;
    setStoredTheme(value);
    setThemeState(value);
  }, []);
  const applyAuthoritativeLang = useCallback((value: string) => {
    const seq = ++langPersistMutationSeqRef.current;
    lastConfirmedLangSeqRef.current = seq;
    lastConfirmedLangRef.current = value;
    langRef.current = value;
    setStoredLang(value);
    setLangState(value);
  }, []);
  const applyAuthoritativeOrg = useCallback((value: string | null) => {
    const seq = ++asOrgPersistMutationSeqRef.current;
    lastConfirmedOrgSeqRef.current = seq;
    lastConfirmedOrgRef.current = value;
    asOrgRef.current = value;
    setStoredOrg(value);
    setAsOrgState(value);
  }, []);

  const didSyncFromStorage = useRef(false);
  useEffect(() => {
    onUpdateCustomDataRef.current = onUpdateCustomData;
  }, [onUpdateCustomData]);
  useEffect(() => {
    onPersistErrorRef.current = onPersistError;
  }, [onPersistError]);
  useEffect(() => {
    onLangChangeRef.current = onLangChange;
  }, [onLangChange]);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // After the initial one-shot sync, reconcile the server-provided
    // `initialOrgId` with the cached preference. sessionStorage is per-tab
    // with no cross-tab events, so a stale cached value could pin the UI to an
    // org that another tab/server has since changed. Three cases
    // (CAN-STATE-001 distinguishes authoritative personal from unavailable):
    //   - undefined: server value unavailable → keep cached (no-op).
    //   - null:      authoritative personal mode → clear stale cached org.
    //   - string:    authoritative org selection → override stale cached org
    //                (BUG-028); reset the one-shot guard so the next sync round
    //                can re-hydrate other prefs.
    // The null/string paths mirror `setAsOrg`'s local side-effects (state +
    // storage) WITHOUT persisting — the server is the source of these
    // authoritative values, so no PATCH round-trip is needed. This matches
    // the pre-existing string-divergence path; `setAsOrg` remains the only
    // null writer that triggers persist coordination (BUG-L06).
    if (didSyncFromStorage.current) {
      // A new server render is authoritative. This is the revalidation path
      // for changes made on another device; unlike a local/channel update it
      // never writes back to the API, so refreshes cannot form a persistence
      // loop.
      if (initialTheme !== undefined) {
        applyAuthoritativeTheme(initialTheme);
      }
      if (initialLang !== undefined) {
        applyAuthoritativeLang(initialLang);
      }
      if (initialOrgId !== undefined) {
        // A defined server value is authoritative even when it happens to
        // equal the current optimistic state/storage. Always advance the
        // sequence and baseline so a pending older request cannot later fail
        // and roll the server-confirmed value back.
        applyAuthoritativeOrg(initialOrgId);
      }
      return;
    }
    didSyncFromStorage.current = true;

    // Fix: cached user preference wins over server-provided initial value.
    // Only fall back to server prop when no user selection is stored.
    const cachedTheme = getStoredTheme();
    if (cachedTheme) {
      if (cachedTheme !== themeRef.current) setThemeState(cachedTheme);
    } else if (initialTheme) {
      setStoredTheme(initialTheme);
      setThemeState(initialTheme);
    }

    const cachedLang = getStoredLang();
    if (cachedLang) {
      if (cachedLang !== langRef.current) setLangState(cachedLang);
    } else if (initialLang) {
      setStoredLang(initialLang);
      setLangState(initialLang);
    }

    const cachedOrg = getStoredOrg();
    if (initialOrgId === null) {
      // CAN-STATE-001: the server authoritatively reports personal mode
      // ("be yourself"). A stale cached org from a prior session MUST NOT
      // override the server's null — clear both storage and React state so
      // the cached org cannot resurrect on the next load. This mirrors
      // `setAsOrg(null)`'s local side-effects (state + storage wipe) WITHOUT
      // persisting, since the server already holds asOrg:null. The
      // interactive `setAsOrg(null)` remains the canonical UX null writer
      // (BUG-L06); this is the server-sync counterpart, exactly like the
      // string-divergence path which also writes state/storage directly.
      if (cachedOrg !== null) setStoredOrg(null);
      if (asOrgRef.current !== null) setAsOrgState(null);
    } else if (cachedOrg !== null) {
      // Cached user selection wins over the server prop on initial mount
      // (BUG-001 invariant preserved for non-null values).
      if (cachedOrg !== asOrgRef.current) setAsOrgState(cachedOrg);
    } else if (initialOrgId !== undefined) {
      // No cached value; fall back to the server-provided org id (string).
      setStoredOrg(initialOrgId);
      setAsOrgState(initialOrgId);
    }
  }, [initialTheme, initialLang, initialOrgId, applyAuthoritativeTheme, applyAuthoritativeLang, applyAuthoritativeOrg]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    themeRef.current = theme;
    langRef.current = lang;
    asOrgRef.current = asOrg;
  }, [theme, lang, asOrg]);

  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      // Only respond to OS theme changes if the user hasn't explicitly set a preference
      const stored = getStoredTheme();
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    const handlePreferencesChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ lang?: string }>;
      const detail = customEvent.detail || {};
      
      const hasDetail = 'lang' in detail;
      const newLang = hasDetail ? detail.lang : getStoredLang();

      if (newLang && newLang !== langRef.current) {
        setStoredLang(newLang);
        setLangState(newLang);
      }
    };

    window.addEventListener('preferences-changed', handlePreferencesChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('preferences-changed', handlePreferencesChange);
    };
  }, []);

  // BroadcastChannel is the primary cross-tab transport. The localStorage
  // signal is an intentionally small fallback for browsers without it; the
  // preference values remain in the existing per-tab sessionStorage and are
  // validated before being applied. Incoming values are local-only updates:
  // they never call a persister or rebroadcast, preventing event loops.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const channel = typeof BroadcastChannel !== 'undefined'
      ? new BroadcastChannel(PREFERENCES_CHANNEL_NAME)
      : null;
    sharedChannelRef.current = channel;

    const applyMessage = (message: PreferenceMessage | null) => {
      if (!message || message.source === sharedSourceRef.current || message.timestamp <= sharedTimestampRef.current) return;
      sharedTimestampRef.current = message.timestamp;
      if (message.theme !== undefined) applyAuthoritativeTheme(message.theme);
      if (message.lang !== undefined) applyAuthoritativeLang(message.lang);
      if (message.asOrg !== undefined) applyAuthoritativeOrg(message.asOrg);
    };

    const handleChannelMessage = (event: MessageEvent<PreferenceMessage>) => {
      let message: PreferenceMessage | null = null;
      try {
        message = readSharedMessage(JSON.stringify(event.data));
      } catch {
        // Ignore malformed structured-clone payloads.
      }
      applyMessage(message);
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === PREFERENCES_SIGNAL_KEY) applyMessage(readSharedMessage(event.newValue));
    };

    channel?.addEventListener('message', handleChannelMessage);
    window.addEventListener('storage', handleStorage);
    return () => {
      channel?.removeEventListener('message', handleChannelMessage);
      channel?.close();
      sharedChannelRef.current = null;
      window.removeEventListener('storage', handleStorage);
    };
  }, [applyAuthoritativeTheme, applyAuthoritativeLang, applyAuthoritativeOrg]);

  useEffect(() => {
    const handleThemeChange = () => {
      const stored = getStoredTheme();
      if (stored && stored !== themeRef.current) {
        setThemeState(stored);
      }
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const colors = useMemo(
    () => (theme === 'dark' ? DARK_COLORS : LIGHT_COLORS),
    [theme]
  );

  // Persisters are stable callbacks created once at mount.
  // useCallback with [] deps ensures they never change reference.
  // Ref access inside useCallback is allowed (refs are not needed for rendering).
  const persistTheme = useCallback(async (newTheme: 'dark' | 'light') => {
    // Increment before checking the optional callback. A prior request retains
    // the callback it started with and can still fail after the parent removes
    // it; this newer local transition must invalidate that stale rollback.
    const seq = ++themePersistMutationSeqRef.current;
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    try {
      const r = await onUpdateCustomData({ Preferences: { theme: newTheme } });
      // CAN-STATE-002: advance the last-confirmed baseline on every successful
      // persist whose seq is newer than the previously confirmed one. This is
      // tracked BEFORE the mutation-seq gate, so out-of-order older successes
      // (superseded by a newer write in flight) still confirm the server's
      // actual state without being clobbered by stale newer-in-flight optimism.
      const didConfirm = r.ok && seq > lastConfirmedThemeSeqRef.current;
      if (didConfirm) {
        lastConfirmedThemeSeqRef.current = seq;
        lastConfirmedThemeRef.current = newTheme;
      }
      if (didConfirm && (
        seq === themePersistMutationSeqRef.current
        || lastFailedThemePersistMutationSeqRef.current === themePersistMutationSeqRef.current
      )) {
        // Either this is current, or every newer transition has failed and
        // this response is now the newest server-confirmed value.
        themeRef.current = newTheme;
        setStoredTheme(newTheme);
        setThemeState(newTheme);
      }
      if (r.ok) return;
      lastFailedThemePersistMutationSeqRef.current = seq;
      if (seq !== themePersistMutationSeqRef.current) return;
      console.error('[PreferencesProvider] Failed to persist theme:', r.error);
      // Roll back to the LAST-CONFIRMED server value, not the optimistic
      // `prev` snapshot — the unconfirmed intermediate may also have failed.
      const confirmed = lastConfirmedThemeRef.current;
      themeRef.current = confirmed;
      setStoredTheme(confirmed);
      setThemeState(confirmed);
      onPersistErrorRef.current?.('Failed to save theme preference');
    } catch {
      lastFailedThemePersistMutationSeqRef.current = seq;
      if (seq !== themePersistMutationSeqRef.current) return;
      const confirmed = lastConfirmedThemeRef.current;
      themeRef.current = confirmed;
      setStoredTheme(confirmed);
      setThemeState(confirmed);
      onPersistErrorRef.current?.('Failed to save theme preference');
    }
  }, []);

  const persistLang = useCallback(async (newLang: string) => {
    // See persistTheme: every local transition invalidates older callbacks,
    // including transitions made while persistence is unavailable.
    const seq = ++langPersistMutationSeqRef.current;
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    try {
      const r = await onUpdateCustomData({ Preferences: { lang: newLang } });
      // CAN-STATE-002: advance last-confirmed baseline (see persistTheme).
      const didConfirm = r.ok && seq > lastConfirmedLangSeqRef.current;
      if (didConfirm) {
        lastConfirmedLangSeqRef.current = seq;
        lastConfirmedLangRef.current = newLang;
      }
      if (didConfirm && (
        seq === langPersistMutationSeqRef.current
        || lastFailedLangPersistMutationSeqRef.current === langPersistMutationSeqRef.current
      )) {
        langRef.current = newLang;
        setStoredLang(newLang);
        setLangState(newLang);
      }
      if (r.ok) return;
      lastFailedLangPersistMutationSeqRef.current = seq;
      if (seq !== langPersistMutationSeqRef.current) return;
      console.error('[PreferencesProvider] Failed to persist lang:', r.error);
      const confirmed = lastConfirmedLangRef.current;
      langRef.current = confirmed;
      setStoredLang(confirmed);
      setLangState(confirmed);
      onPersistErrorRef.current?.('Failed to save language preference');
    } catch {
      lastFailedLangPersistMutationSeqRef.current = seq;
      if (seq !== langPersistMutationSeqRef.current) return;
      const confirmed = lastConfirmedLangRef.current;
      langRef.current = confirmed;
      setStoredLang(confirmed);
      setLangState(confirmed);
      onPersistErrorRef.current?.('Failed to save language preference');
    }
  }, []);

  const persistOrg = useCallback(async (newOrgId: string | null) => {
    // CAN-STATE-003: Advance/invalidate the org mutation sequence for EVERY
    // transition — including null ("be yourself"). Previously the null case
    // returned BEFORE incrementing the seq, so a pending non-null write
    // (seq N) remained "current" (counter still N). When that older write
    // later failed, its rollback handler saw `seq === counter` and proceeded
    // to restore the LAST-CONFIRMED org — clobbering the personal mode the
    // server had already persisted via setActiveOrg(null). Incrementing the
    // seq here invalidates any in-flight older non-null writes (their failure
    // handlers now see `seq !== counter` and bail without rolling back).
    //
    // We also advance the last-confirmed baseline to null, because
    // setActiveOrg(null) — the canonical null writer (NEVER-TOUCH — persist
    // + best-effort warn) — has already persisted null server-side by the
    // time setAsOrg(null) runs in every caller (OrgSwitcher.handleChange,
    // use-org-switcher.switchToSelf, OrganizationsTab.handleBeYourself all
    // `await setActiveOrg(null)` before calling setAsOrg(null)). Without
    // this advance, a LATER non-null write that fails would roll back to the
    // OLD confirmed org instead of null — clobbering personal mode.
    //
    // BUG-L06: The customData PATCH for null is still skipped (no duplicate
    // PATCH) — setActiveOrg(null) is the single persistence writer for null.
    // Local state (setStoredOrg / setAsOrgState) is still updated by
    // setAsOrg, so the UI reflects "be yourself" immediately; only the
    // redundant PATCH round-trip is dropped. Non-null persists are untouched
    // (setActiveOrg validates but does NOT persist non-null — BUG-015 — so
    // setAsOrg remains the single writer there).
    const seq = ++asOrgPersistMutationSeqRef.current;
    if (newOrgId === null) {
      // setActiveOrg(null) has already persisted null server-side; advance
      // the last-confirmed baseline so subsequent failures roll back to null,
      // and the incremented seq invalidates any in-flight older non-null write.
      if (seq > lastConfirmedOrgSeqRef.current) {
        lastConfirmedOrgSeqRef.current = seq;
        lastConfirmedOrgRef.current = null;
      }
      return;
    }
    // Sequence invalidation must occur before this optional callback guard.
    // A prior request retains the callback it started with, so it can still
    // settle after a parent render removes onUpdateCustomData. Returning above
    // the sequence increment would let that stale failure roll back over this
    // newer local transition.
    const onUpdateCustomData = onUpdateCustomDataRef.current;
    if (!onUpdateCustomData) return;
    try {
      const r = await onUpdateCustomData({ Preferences: { asOrg: newOrgId } });
      // CAN-STATE-002: advance last-confirmed baseline (see persistTheme).
      const didConfirm = r.ok && seq > lastConfirmedOrgSeqRef.current;
      if (didConfirm) {
        lastConfirmedOrgSeqRef.current = seq;
        lastConfirmedOrgRef.current = newOrgId;
      }
      if (didConfirm && (
        seq === asOrgPersistMutationSeqRef.current
        || lastFailedOrgPersistMutationSeqRef.current === asOrgPersistMutationSeqRef.current
      )) {
        asOrgRef.current = newOrgId;
        setStoredOrg(newOrgId);
        setAsOrgState(newOrgId);
      }
      if (r.ok) return;
      lastFailedOrgPersistMutationSeqRef.current = seq;
      if (seq !== asOrgPersistMutationSeqRef.current) return;
      console.error('[PreferencesProvider] Failed to persist org:', r.error);
      const confirmed = lastConfirmedOrgRef.current;
      asOrgRef.current = confirmed;
      setStoredOrg(confirmed);
      setAsOrgState(confirmed);
      onPersistErrorRef.current?.('Failed to save organization preference');
    } catch {
      lastFailedOrgPersistMutationSeqRef.current = seq;
      if (seq !== asOrgPersistMutationSeqRef.current) return;
      const confirmed = lastConfirmedOrgRef.current;
      asOrgRef.current = confirmed;
      setStoredOrg(confirmed);
      setAsOrgState(confirmed);
      onPersistErrorRef.current?.('Failed to save organization preference');
    }
  }, []);

  const publishPreference = useCallback((change: Omit<PreferenceMessage, 'source' | 'timestamp'>) => {
    const timestamp = Math.max(Date.now(), sharedTimestampRef.current + 1);
    sharedTimestampRef.current = timestamp;
    const message: PreferenceMessage = {
      ...change,
      source: sharedSourceRef.current,
      timestamp,
    };
    try {
      if (sharedChannelRef.current) {
        sharedChannelRef.current.postMessage(message);
      } else if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(PREFERENCES_CHANNEL_NAME);
        channel.postMessage(message);
        // Keep this short-lived fallback alive for the task queue to deliver
        // the message; normal mounted providers use sharedChannelRef above.
        window.setTimeout(() => channel.close(), 0);
      }
    } catch {
      // Some privacy modes expose BroadcastChannel but reject construction.
    }
    try {
      window.localStorage.setItem(PREFERENCES_SIGNAL_KEY, JSON.stringify(message));
    } catch {
      // Storage access is optional; the in-document event still works.
    }
  }, []);

  const setMode = useCallback((newTheme: 'dark' | 'light') => {
    themeRef.current = newTheme;
    setStoredTheme(newTheme);
    setThemeState(newTheme);
    persistTheme(newTheme);
    window.dispatchEvent(new Event('theme-changed'));
    publishPreference({ theme: newTheme });
  }, [persistTheme, publishPreference]);

  const toggleMode = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setMode(next);
  }, [theme, setMode]);

  const setLang = useCallback((newLang: string) => {
    langRef.current = newLang;
    setStoredLang(newLang);
    setLangState(newLang);
    persistLang(newLang);
    window.dispatchEvent(new CustomEvent('preferences-changed', { detail: { lang: newLang } }));
    onLangChangeRef.current?.();
    publishPreference({ lang: newLang });
  }, [persistLang, publishPreference]);

  const setAsOrg = useCallback(async (newOrgId: string | null) => {
    asOrgRef.current = newOrgId;
    setStoredOrg(newOrgId);
    setAsOrgState(newOrgId);
    publishPreference({ asOrg: newOrgId });
    await persistOrg(newOrgId);
  }, [persistOrg, publishPreference]);

  const themeValue = useMemo(
    () => ({ mode: theme, colors, setMode, toggleMode }),
    [theme, colors, setMode, toggleMode]
  );
  const langValue = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  const orgValue = useMemo(() => ({ asOrg, setAsOrg }), [asOrg, setAsOrg]);
  const value = useMemo(
    () => ({ theme: themeValue, lang: langValue, org: orgValue }),
    [themeValue, langValue, orgValue]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.theme;
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('[useThemeMode] No PreferencesProvider found. Theme changes will not persist.');
  }

  return {
    mode: 'dark',
    colors: DARK_COLORS,
    setMode: () => {},
    toggleMode: () => {},
  };
}

export function useLangMode(): LangModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.lang;
  }

  return {
    lang: getDefaultLang(),
    setLang: () => {},
  };
}

export function useOrgMode(): OrgModeContextValue {
  const context = useContext(PreferencesContext);

  if (context) {
    return context.org;
  }

  return {
    asOrg: null,
    setAsOrg: () => {},
  };
}
