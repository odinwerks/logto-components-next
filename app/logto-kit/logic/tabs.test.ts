import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./log', () => ({
  warn: vi.fn(),
}));

const NON_DEV_TABS = [
  'profile',
  'preferences',
  'security',
  'sessions',
  'identities',
  'organizations',
];

interface EnvOptions {
  patEnabled?: string;
  loadTabs?: string;
  publicLoadTabs?: string;
  publicPatEnabled?: string;
}

async function loadTabsModule({
  patEnabled,
  loadTabs,
  publicLoadTabs,
  publicPatEnabled,
}: EnvOptions = {}) {
  vi.stubEnv('PAT_ENABLED', patEnabled);
  vi.stubEnv('LOAD_TABS', loadTabs);
  vi.stubEnv('NEXT_PUBLIC_LOAD_TABS', publicLoadTabs);
  vi.stubEnv('NEXT_PUBLIC_PAT_ENABLED', publicPatEnabled);
  vi.resetModules();
  return import('./tabs');
}

describe('PAT feature flag and loaded tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['whitespace', '   '],
    ['false', 'false'],
    ['numeric one', '1'],
    ['invalid mixed case', 'TrUe-ish'],
    ['arbitrary invalid', 'enabled'],
  ])('defaults PAT off for %s PAT_ENABLED', async (_label, patEnabled) => {
    const { getLoadedTabs, isPatEnabled } = await loadTabsModule({ patEnabled });

    expect(isPatEnabled()).toBe(false);
    expect(getLoadedTabs()).toEqual(NON_DEV_TABS);
  });

  it.each(['true', 'TRUE', ' TrUe '])(
    'accepts only normalized true values (%s)',
    async (patEnabled) => {
      const { ALL_TABS, getLoadedTabs, isPatEnabled } = await loadTabsModule({ patEnabled });

      expect(isPatEnabled()).toBe(true);
      expect(getLoadedTabs()).toEqual(ALL_TABS);
    },
  );

  it.each([undefined, '', '   '])(
    'filters dev from unset or empty LOAD_TABS (%s)',
    async (loadTabs) => {
      const { getLoadedTabs } = await loadTabsModule({
        patEnabled: 'false',
        loadTabs,
      });

      expect(getLoadedTabs()).toEqual(NON_DEV_TABS);
    },
  );

  it.each(['dev', 'developer', 'pat', 'pats', 'pat-tokens', 'tokens'])(
    'filters the %s alias and uses non-dev defaults when disabled',
    async (loadTabs) => {
      const { getLoadedTabs } = await loadTabsModule({
        patEnabled: 'false',
        loadTabs,
      });

      expect(getLoadedTabs()).toEqual(NON_DEV_TABS);
      expect(getLoadedTabs()).not.toContain('dev');
    },
  );

  it('preserves non-PAT ordering and deduplication in mixed disabled lists', async () => {
    const { getLoadedTabs } = await loadTabsModule({
      patEnabled: 'false',
      loadTabs: 'security, profile, dev, profile, tokens, sessions, security',
    });

    expect(getLoadedTabs()).toEqual(['security', 'profile', 'sessions']);
  });

  it('uses non-dev defaults for unknown-only input while disabled', async () => {
    const { getLoadedTabs } = await loadTabsModule({
      patEnabled: 'false',
      loadTabs: 'unknown,still-unknown',
    });
    const { warn } = await import('./log');

    expect(getLoadedTabs()).toEqual(NON_DEV_TABS);
    expect(warn).toHaveBeenCalledTimes(3);
  });

  it('filters public tab fallback and ignores a public-only PAT flag', async () => {
    const { getLoadedTabs, isPatEnabled } = await loadTabsModule({
      publicLoadTabs: 'dev,profile,pat,security,profile',
      publicPatEnabled: 'true',
    });

    expect(isPatEnabled()).toBe(false);
    expect(getLoadedTabs()).toEqual(['profile', 'security']);
  });

  it('preserves enabled aliases, order, deduplication, and warnings', async () => {
    const { getLoadedTabs } = await loadTabsModule({
      patEnabled: 'true',
      loadTabs: 'tokens,profile,unknown,pat,security,profile,developer',
    });
    const { warn } = await import('./log');

    expect(getLoadedTabs()).toEqual(['dev', 'profile', 'security']);
    expect(warn).toHaveBeenCalledOnce();
  });

  it('preserves the enabled all-invalid fallback', async () => {
    const { ALL_TABS, getLoadedTabs } = await loadTabsModule({
      patEnabled: 'true',
      loadTabs: 'unknown',
    });

    expect(getLoadedTabs()).toEqual(ALL_TABS);
  });

  it('preserves enabled NEXT_PUBLIC_LOAD_TABS fallback behavior', async () => {
    const { getLoadedTabs } = await loadTabsModule({
      patEnabled: 'true',
      publicLoadTabs: 'pat,security,pat,profile',
    });

    expect(getLoadedTabs()).toEqual(['dev', 'security', 'profile']);
  });
});
