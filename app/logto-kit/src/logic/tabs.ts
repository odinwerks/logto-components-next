// ============================================================================
// Tab Configuration Handler
// Reads LOAD_TABS from ENV and returns an ordered, validated list of tabs.
// ============================================================================

// TabId is defined here (logic layer) so that components/dashboard/types.ts
// can import it from logic — not the other way around.
export type TabId = 'profile' | 'custom-data' | 'identities' | 'organizations' | 'mfa' | 'raw';

// All valid tab IDs and their display labels (used as fallback)
export const ALL_TABS: TabId[] = [
  'profile',
  'custom-data',
  'identities',
  'organizations',
  'mfa',
  'raw',
];

// ENV value aliases — lets operators use friendly names
const TAB_ALIASES: Record<string, TabId> = {
  // profile aliases
  profile: 'profile',
  personal: 'profile',
  user: 'profile',

  // custom-data aliases
  'custom-data': 'custom-data',
  custom: 'custom-data',
  customdata: 'custom-data',

  // identities aliases
  identities: 'identities',
  identity: 'identities',

  // organizations aliases
  organizations: 'organizations',
  orgs: 'organizations',
  org: 'organizations',

  // mfa aliases
  mfa: 'mfa',
  '2fa': 'mfa',
  totp: 'mfa',

  // raw aliases
  raw: 'raw',
  debug: 'raw',
  data: 'raw',
};

function readEnv(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env[name] ||
      process.env[`NEXT_PUBLIC_${name}`] ||
      undefined
    );
  }
  return undefined;
}

/**
 * Returns the ordered list of tab IDs to load, based on LOAD_TABS env var.
 *
 * Source: `LOAD_TABS` or `NEXT_PUBLIC_LOAD_TABS`
 * Example: "profile,custom-data,mfa,raw"
 *
 * Rules:
 *  1. Parse as comma-separated list.
 *  2. Resolve aliases (e.g. "personal" → "profile").
 *  3. Filter to valid TabId values.
 *  4. Deduplicate while preserving order.
 *  5. If ENV is not set or empty → show ALL tabs in default order.
 */
export function getLoadedTabs(): TabId[] {
  const raw = readEnv('LOAD_TABS') || '';

  if (!raw.trim()) {
    // ENV not set → show all tabs in default order
    return [...ALL_TABS];
  }

  const seen = new Set<TabId>();
  const result: TabId[] = [];

  for (const token of raw.split(',')) {
    const key = token.trim().toLowerCase();
    if (!key) continue;

    const tabId = TAB_ALIASES[key];
    if (!tabId) {
      console.warn(`[tabs] Unknown tab identifier "${token.trim()}" in LOAD_TABS — skipping.`);
      continue;
    }

    if (!seen.has(tabId)) {
      seen.add(tabId);
      result.push(tabId);
    }
  }

  if (result.length === 0) {
    console.warn('[tabs] LOAD_TABS produced no valid tabs. Falling back to all tabs.');
    return [...ALL_TABS];
  }

  return result;
}
