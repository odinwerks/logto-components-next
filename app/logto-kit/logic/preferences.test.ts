import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────
// Use vi.hoisted() to declare mock before vi.mock factory (which gets hoisted)

const { warnMock } = vi.hoisted(() => {
  return { warnMock: vi.fn() };
});

vi.mock('./log', () => ({
  log: vi.fn(),
  warn: warnMock,
  error: vi.fn(),
  debug: vi.fn(),
}));

// ── Imports under test ────────────────────────────────────────────────────────

import { getPreferencesFromUserData, buildUpdatedCustomData } from './preferences';
import type { UserData } from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeUserData(customData?: Record<string, unknown>): UserData {
  return {
    customData: customData ?? null,
  } as unknown as UserData;
}

function makePrefsUserData(prefs: Record<string, unknown>): UserData {
  return makeUserData({ Preferences: prefs });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getPreferencesFromUserData', () => {
  beforeEach(() => {
    warnMock.mockReset();
  });

  it('returns null when customData is missing', () => {
    expect(getPreferencesFromUserData(makeUserData())).toBeNull();
  });

  it('returns theme and lang when valid', () => {
    const result = getPreferencesFromUserData(
      makePrefsUserData({ theme: 'dark', lang: 'en-US' })
    );
    expect(result).toEqual({ theme: 'dark', lang: 'en-US' });
  });

  it('returns valid asOrg when it passes SAFE_ID_REGEX', () => {
    const result = getPreferencesFromUserData(
      makePrefsUserData({ theme: 'dark', asOrg: 'abc123-org_id' })
    );
    expect(result?.asOrg).toBe('abc123-org_id');
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('coerces invalid asOrg to null and emits a warning (BUG-L-004)', () => {
    const result = getPreferencesFromUserData(
      makePrefsUserData({ theme: 'light', asOrg: '../../../etc/passwd' })
    );
    // asOrg should be coerced to null
    expect(result?.asOrg).toBeNull();
    // Warning should be emitted
    expect(warnMock).toHaveBeenCalledWith(
      expect.stringContaining('SAFE_ID_REGEX')
    );
  });

  it('coerces asOrg with spaces to null and emits a warning', () => {
    getPreferencesFromUserData(
      makePrefsUserData({ theme: 'dark', asOrg: 'org id with spaces' })
    );
    expect(warnMock).toHaveBeenCalled();
  });

  it('does NOT emit a warning when asOrg is null (intentional null)', () => {
    getPreferencesFromUserData(
      makePrefsUserData({ theme: 'dark', asOrg: null })
    );
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('does NOT emit a warning when asOrg is absent', () => {
    getPreferencesFromUserData(makePrefsUserData({ theme: 'dark' }));
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('does NOT emit a warning when asOrg is undefined', () => {
    getPreferencesFromUserData(makePrefsUserData({ theme: 'dark', asOrg: undefined }));
    expect(warnMock).not.toHaveBeenCalled();
  });
});

describe('buildUpdatedCustomData', () => {
  it('merges new preferences into existing customData', () => {
    const userData = makePrefsUserData({ theme: 'dark', lang: 'en-US', asOrg: null });
    const result = buildUpdatedCustomData(userData, { theme: 'light' });

    expect((result['Preferences'] as Record<string, unknown>).theme).toBe('light');
    expect((result['Preferences'] as Record<string, unknown>).lang).toBe('en-US');
  });

  it('preserves existing customData keys outside Preferences', () => {
    const userData = makeUserData({ someOtherKey: 'preserved', Preferences: { theme: 'dark', lang: 'en-US', asOrg: null } });
    const result = buildUpdatedCustomData(userData, { lang: 'ka-GE' });

    expect(result['someOtherKey']).toBe('preserved');
  });
});
