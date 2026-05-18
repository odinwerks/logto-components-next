import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';

// ── Mock geo-cache to avoid network requests in SessionMiniMap ──
const { mockGetCachedGeo, mockFetchGeo, mockClearGeoCache } = vi.hoisted(() => ({
  mockGetCachedGeo: vi.fn().mockReturnValue(null),
  mockFetchGeo: vi.fn().mockResolvedValue(null),
  mockClearGeoCache: vi.fn(),
}));

vi.mock('../../shared/geo-cache', () => ({
  getCachedGeo: (...args: unknown[]) => mockGetCachedGeo(...args),
  fetchGeo: (...args: unknown[]) => mockFetchGeo(...args),
  clearGeoCache: () => mockClearGeoCache(),
}));

import { SessionsTab } from './sessions';

// ── Stubs ────────────────────────────────────────────────────
const noop = () => undefined;
const resolvedActionResult = () => Promise.resolve({ ok: true } as ActionResult);

const createdSessions: LogtoSession[] = [
  {
    payload: {
      loginTs: 1000,
      exp: 2000,
      uid: 'ses-1',
      iat: 1000,
      jti: 'jti-ses-1',
      kind: 'Session',
      accountId: 'acct_1',
    },
    meta: {
      browser: 'Chrome',
      browserVersion: '120',
      os: 'Windows',
      osVersion: '11',
      deviceType: 'desktop',
      ip: '1.2.3.4',
      isCurrent: true,
      lastActive: '500',
      jti: 'jti-ses-1',
      userId: 'test-user',
      createdAt: '2024-01-01T00:00:00Z',
    },
    lastSubmission: null,
    clientId: null,
    accountId: 'acct_1',
    expiresAt: 2000,
  },
  {
    payload: {
      loginTs: 900,
      exp: 1900,
      uid: 'ses-2',
      iat: 900,
      jti: 'jti-ses-2',
      kind: 'Session',
      accountId: 'acct_1',
    },
    meta: {
      browser: 'Firefox',
      browserVersion: '121',
      os: 'macOS',
      osVersion: '14',
      deviceType: 'desktop',
      ip: '5.6.7.8',
      isCurrent: false,
      lastActive: '400',
      jti: 'jti-ses-2',
      userId: 'test-user',
      createdAt: '2024-01-01T00:00:00Z',
    },
    lastSubmission: null,
    clientId: null,
    accountId: 'acct_1',
    expiresAt: 1900,
  },
];

const defaultUserData: UserData = {
  id: 'test-user',
  username: 'testuser',
  name: 'Test User',
  avatar: undefined,
  primaryEmail: 'test@example.com',
  primaryPhone: '+1234567890',
  profile: { givenName: 'Test', familyName: 'User' },
  identities: {},
  customData: {},
  createdAt: 0,
  updatedAt: 0,
};

interface RenderSessionsOptions {
  onGetSessionsWithDeviceMeta?: (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession?: (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions?: (verificationRecordId: string) => Promise<ActionResult>;
  onVerifyPassword?: (password: string) => Promise<DataResult<{ verificationRecordId: string }>>;
}

function renderSessionsTab({
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onVerifyPassword,
}: RenderSessionsOptions = {}) {
  const getSessionsFn = (onGetSessionsWithDeviceMeta ??
    vi.fn<(verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>>().mockResolvedValue({
      ok: true,
      data: createdSessions,
    })) as (verificationRecordId: string) => Promise<DataResult<LogtoSession[]>>;

  const revokeSessionFn = (onRevokeSession ??
    vi.fn<(sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>>().mockResolvedValue({
      ok: true,
    })) as (sessionId: string, identityVerificationRecordId: string, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;

  const revokeAllFn = (onRevokeAllOtherSessions ??
    vi.fn<(verificationRecordId: string) => Promise<ActionResult>>().mockResolvedValue({
      ok: true,
    })) as (verificationRecordId: string) => Promise<ActionResult>;

  const verifyFn = (onVerifyPassword ??
    vi.fn<(password: string) => Promise<DataResult<{ verificationRecordId: string }>>>().mockResolvedValue({
      ok: true,
      data: { verificationRecordId: 'test-vid' },
    })) as (password: string) => Promise<DataResult<{ verificationRecordId: string }>>;

  const onSuccess = vi.fn();
  const onError = vi.fn();

  const result = render(
    <SessionsTab
      userData={defaultUserData}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
      onGetSessionsWithDeviceMeta={getSessionsFn}
      onRevokeSession={revokeSessionFn}
      onRevokeAllOtherSessions={revokeAllFn}
      onVerifyPassword={verifyFn}
      onSuccess={onSuccess}
      onError={onError}
    />,
  );

  return { ...result, getSessionsFn, revokeSessionFn, revokeAllFn, verifyFn, onSuccess, onError };
}

// ── Helpers ──────────────────────────────────────────────────
async function verifyAndLoadSessions() {
  // In unverified state, click "Verify password" button
  const verifyBtn = screen.getByRole('button', { name: /verify password/i });
  await act(async () => { fireEvent.click(verifyBtn); });

  // Modal should now be visible with password input
  const passwordInput = screen.getByPlaceholderText('Enter password');
  fireEvent.change(passwordInput, { target: { value: 'test-password' } });

  // Submit by clicking the verify button inside the modal (VERIFY PASS)
  const submitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
  await act(async () => { fireEvent.click(submitBtn); });
}

describe('SessionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── BUG 2: viewState='loaded' set before sessions fetch completes ───
  describe('BUG 2: viewState timing', () => {
    it('stays in unverified state when sessions fetch fails in verifyAndLoad', async () => {
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid' },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Failed to load sessions',
      });

      renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });

      // Verify and attempt to load
      await verifyAndLoadSessions();

      // After the async operations complete, the component should NOT show loaded state
      // It should still show the "Verify your identity" prompt
      // because setViewState('loaded') was called BEFORE the fetch, but the fetch failed
      await waitFor(() => {
        // "Verify your identity" heading should be visible (unverified state)
        expect(screen.getByText('Verify your identity')).toBeDefined();
      });

      // "No active sessions" should NOT be visible (that would mean loaded state with empty data)
      expect(screen.queryByText('No active sessions')).toBeNull();
    });
  });

  // ─── BUG 3: Fragile error-type detection via string matching ───
  describe('BUG 3: error-type detection', () => {
    it('resets to unverified state on any loadSessions error (not just 401/verification)', async () => {
      // First, successfully verify and load sessions
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid' },
      });
      const onGetSessions = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          data: createdSessions,
        })
        .mockResolvedValueOnce({
          ok: false,
          error: 'SOME_RANDOM_ERROR', // Does NOT contain '401' or 'verification'
        });

      renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });

      // Verify and load sessions (first call succeeds)
      await verifyAndLoadSessions();

      // Wait for sessions to appear (loaded state)
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Click refresh button (triggers loadSessions, second call fails)
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // After the refresh fails with a non-verification error,
      // the component should reset to unverified state
      await waitFor(() => {
        expect(screen.getByText('Verify your identity')).toBeDefined();
      });
    });
  });

  // ─── BUG 1: Null session ID sent after revoke failure ───
  describe('BUG 1: null session ID after revoke failure', () => {
    it('preserves revoke target session ID across password retries', async () => {
      // Verify and load sessions first
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid' },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });

      // Revoke sessions mock: fails first time, succeeds second time
      const onRevokeSession = vi.fn()
        .mockResolvedValueOnce({ ok: false, error: 'Failed to revoke' })
        .mockResolvedValueOnce({ ok: true });

      renderSessionsTab({
        onVerifyPassword,
        onGetSessionsWithDeviceMeta: onGetSessions,
        onRevokeSession,
      });

      // Verify and load sessions
      await verifyAndLoadSessions();
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Find and click the "Revoke" button for session ses-2 (not current)
      // Use exact name to distinguish from "Revoke all other sessions" in header
      const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
      expect(revokeButtons.length).toBe(1); // One non-current session to revoke
      const nonCurrentRevokeBtn = revokeButtons[0];

      await act(async () => { fireEvent.click(nonCurrentRevokeBtn); });

      // Modal with password input should appear
      const passwordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(passwordInput, { target: { value: 'test-password' } });

      // Submit password - first revoke attempt (fails)
      // The modal's verify button has "VERIFY PASS" text
      const modalSubmitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
      await act(async () => { fireEvent.click(modalSubmitBtn); });

      // Wait for error to appear in modal (revoke failed)
      await waitFor(() => {
        expect(screen.getByText('Failed to revoke')).toBeDefined();
      });

      // Password input should still be visible for retry
      const retryPasswordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(retryPasswordInput, { target: { value: 'test-password' } });

      // Submit password again - second revoke attempt (should succeed)
      const retryModalSubmitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
      await act(async () => { fireEvent.click(retryModalSubmitBtn); });

      // The second revoke call should have the CORRECT session ID, not null
      await waitFor(() => {
        expect(onRevokeSession).toHaveBeenCalledTimes(2);
      });

      // First call: should have ses-2 as session ID
      const firstCallSessionId = onRevokeSession.mock.calls[0][0];
      expect(firstCallSessionId).toBe('ses-2');

      // Second call: should ALSO have ses-2 as session ID (NOT null)
      const secondCallSessionId = onRevokeSession.mock.calls[1][0];
      expect(secondCallSessionId).toBe('ses-2');
    });
  });
});
