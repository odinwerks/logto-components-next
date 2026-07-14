import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { UserData, LogtoSession } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import { VERIFICATION_CLOCK_SKEW_TOLERANCE_MS } from '../../../logic/constants';

// ── Mock geo-cache to avoid network requests ──
const { mockGetCachedGeo, mockFetchGeo, mockClearGeoCache } = vi.hoisted(() => ({
  mockGetCachedGeo: vi.fn().mockReturnValue(null),
  mockFetchGeo: vi.fn().mockResolvedValue(null),
  mockClearGeoCache: vi.fn(),
}));

vi.mock('../../../logic/geo-cache', () => ({
  getCachedGeo: (...args: unknown[]) => mockGetCachedGeo(...args),
  fetchGeo: (...args: unknown[]) => mockFetchGeo(...args),
  clearGeoCache: () => mockClearGeoCache(),
}));

import { SessionsTab } from './sessions';

// ── Stubs ────────────────────────────────────────────────────
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
  onGetSessionsWithDeviceMeta?: (verificationRecordId: string, verificationTimestamp: number) => Promise<DataResult<LogtoSession[]>>;
  onRevokeSession?: (sessionId: string, identityVerificationRecordId: string, verificationTimestamp: number, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;
  onRevokeAllOtherSessions?: (verificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;
  onVerifyPassword?: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  mobmode?: number;
  isActive?: boolean;
  onVerificationDismissed?: () => void;
}

function renderSessionsTab({
  onGetSessionsWithDeviceMeta,
  onRevokeSession,
  onRevokeAllOtherSessions,
  onVerifyPassword,
  mobmode = 0,
  isActive = true,
  onVerificationDismissed,
}: RenderSessionsOptions = {}) {
  const getSessionsFn = (onGetSessionsWithDeviceMeta ??
    vi.fn<(verificationRecordId: string, verificationTimestamp: number) => Promise<DataResult<LogtoSession[]>>>().mockResolvedValue({
      ok: true,
      data: createdSessions,
    })) as (verificationRecordId: string, verificationTimestamp: number) => Promise<DataResult<LogtoSession[]>>;

  const revokeSessionFn = (onRevokeSession ??
    vi.fn<(sessionId: string, identityVerificationRecordId: string, verificationTimestamp: number, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>>().mockResolvedValue({
      ok: true,
    })) as (sessionId: string, identityVerificationRecordId: string, verificationTimestamp: number, revokeGrantsTarget?: 'all' | 'firstParty') => Promise<ActionResult>;

  const revokeAllFn = (onRevokeAllOtherSessions ??
    vi.fn<(verificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>>().mockResolvedValue({
      ok: true,
    })) as (verificationRecordId: string, verificationTimestamp: number) => Promise<ActionResult>;

  const verifyFn = (onVerifyPassword ??
    vi.fn<(password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>>().mockResolvedValue({
      ok: true,
      data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
    })) as (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;

  const onSuccess = vi.fn();
  const onError = vi.fn();

  const result = render(
    <SessionsTab
      userData={defaultUserData}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
      mobmode={mobmode}
      isActive={isActive}
      onVerificationDismissed={onVerificationDismissed}
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
  // With isActive=true, the PasswordVerifyModal auto-opens via useEffect.
  // Wait for the modal's password input to appear in the DOM.
  await waitFor(() => {
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  const passwordInput = screen.getByPlaceholderText('Enter password');
  fireEvent.change(passwordInput, { target: { value: 'test-password' } });

  // Submit by clicking the verify button inside the modal (VERIFY PASS)
  const submitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
  await act(async () => { fireEvent.click(submitBtn); });
}

describe('SessionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
  });

  // ─── BUG 2: viewState='loaded' set before sessions fetch completes ───
  describe('BUG 2: viewState timing', () => {
    it('stays in unverified state when sessions fetch fails in verifyAndLoad', async () => {
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
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
    it('resets to unverified state on VERIFICATION_FAILED error in loadSessions', async () => {
      // First, successfully verify and load sessions
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });
      const onGetSessions = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          data: createdSessions,
        })
        .mockResolvedValueOnce({
          ok: false,
          error: 'VERIFICATION_FAILED', // Auth-type error should trigger reset
        });

      renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });

      // Verify and load sessions (first call succeeds)
      await verifyAndLoadSessions();

      // Wait for sessions to appear (loaded state)
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Click refresh button (triggers loadSessions, second call fails with VERIFICATION_FAILED)
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // After the refresh fails with VERIFICATION_FAILED, the component should reset to unverified
      await waitFor(() => {
        expect(screen.getByText('Verify your identity')).toBeDefined();
      });
    });

    it('stays in loaded state on transient NETWORK_ERROR in loadSessions', async () => {
      // First, successfully verify and load sessions
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });
      const onGetSessions = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          data: createdSessions,
        })
        .mockResolvedValueOnce({
          ok: false,
          error: 'NETWORK_ERROR', // Transient error should NOT reset verification
        });

      renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });

      // Verify and load sessions (first call succeeds)
      await verifyAndLoadSessions();

      // Wait for sessions to appear (loaded state)
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Click refresh button (triggers loadSessions, second call fails with NETWORK_ERROR)
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // After the refresh fails with a transient error, the component should STAY in loaded state
      // Do NOT reset to unverified - the sessions list should still be visible
      await waitFor(() => {
        expect(screen.queryByText('Verify your identity')).toBeNull();
      });

      // Sessions should still be rendered
      expect(screen.getByText('This device')).toBeDefined();
      expect(screen.getByText('Chrome on Windows')).toBeDefined();
    });
  });

  // ─── BUG 1: Null session ID sent after revoke failure ───
  describe('BUG 1: null session ID after revoke failure', () => {
    it('preserves revoke target session ID across password retries', async () => {
      // Verify and load sessions first
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
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

      // First call: should have ses-2 as session ID (uid, NOT jti)
      const firstCallSessionId = onRevokeSession.mock.calls[0][0];
      expect(firstCallSessionId).toBe('ses-2');

      // Second call: should ALSO have ses-2 as session ID (NOT null)
      const secondCallSessionId = onRevokeSession.mock.calls[1][0];
      expect(secondCallSessionId).toBe('ses-2');
    });
  });

  describe('BUG LOG-003: revokingId not cleared on single-session revoke failure', () => {
    it('clears revokingId on single-session revoke failure', async () => {
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });
      const onRevokeSession = vi.fn().mockResolvedValue({
        ok: false,
        error: 'Failed to revoke session',
      });

      renderSessionsTab({
        onVerifyPassword,
        onGetSessionsWithDeviceMeta: onGetSessions,
        onRevokeSession,
      });

      await verifyAndLoadSessions();
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
      const nonCurrentRevokeBtn = revokeButtons[0];

      await act(async () => {
        fireEvent.click(nonCurrentRevokeBtn);
      });

      // Submit password
      const passwordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(passwordInput, { target: { value: 'test-password' } });

      const modalSubmitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
      await act(async () => {
        fireEvent.click(modalSubmitBtn);
      });

      // Wait for revoke failure error
      await waitFor(() => {
        expect(screen.getByText('Failed to revoke session')).toBeDefined();
      });

      // Since revoke failed, revokingId should be cleared (null), meaning
      // the Revoke button is no longer disabled.
      expect(nonCurrentRevokeBtn).not.toBeDisabled();
    });
  });

  describe('REGRESSION: revokingId cleared when onRevokeSession throws', () => {
    it('clears revokingId and surfaces a generic error when onRevokeSession rejects with an exception', async () => {
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });
      // Simulate a thrown exception (not a safeAction failure).
      // BUG-003 fix: handlePasswordSubmit must NOT re-throw — it should absorb
      // the error, reset loading flags, and emit a generic error toast via onError.
      const onRevokeSession = vi.fn().mockImplementation(async () => {
        throw new Error('Network failure');
      });

      const onError = vi.fn();

      render(
        <SessionsTab
          userData={defaultUserData}
          mode="dark"
          colors={DARK_COLORS}
          t={enUS}
          isActive={true}
          onGetSessionsWithDeviceMeta={onGetSessions}
          onRevokeSession={onRevokeSession}
          onRevokeAllOtherSessions={vi.fn()}
          onVerifyPassword={onVerifyPassword}
          onSuccess={vi.fn()}
          onError={onError}
        />,
      );

      await verifyAndLoadSessions();
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
      const nonCurrentRevokeBtn = revokeButtons[0];

      await act(async () => {
        fireEvent.click(nonCurrentRevokeBtn);
      });

      // Submit password — this triggers onRevokeSession which throws
      const passwordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(passwordInput, { target: { value: 'test-password' } });

      const modalSubmitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });

      await act(async () => {
        fireEvent.click(modalSubmitBtn);
      });

      // Even though onRevokeSession threw, revokingId must be cleared (button re-enabled)
      await waitFor(() => {
        expect(nonCurrentRevokeBtn).not.toBeDisabled();
      });

      // BUG-003: a generic error toast must be surfaced instead of an unhandled rejection.
      expect(onError).toHaveBeenCalledWith(enUS.common.unexpectedError);

      // The modal must NOT be stuck on the "Processing…" loading step — it should
      // recover back to the password step so the user can try again.
      expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
    });
  });

  describe('REGRESSION: gcAllLoading cleared after async onRevokeAllOtherSessions', () => {
    it('gcAllLoading is false after onRevokeAllOtherSessions resolves', async () => {
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });
      const onRevokeAllOtherSessions = vi.fn().mockResolvedValue({ ok: true });

      renderSessionsTab({
        onVerifyPassword,
        onGetSessionsWithDeviceMeta: onGetSessions,
        onRevokeAllOtherSessions,
      });

      await verifyAndLoadSessions();
      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Open GC ALL modal
      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => {
        fireEvent.click(gcAllBtn);
      });

      // Click confirm in the modal — this sets gcAllLoading=true and opens password modal
      const confirmBtn = screen.getByRole('button', { name: enUS.common.yes });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      // Submit password to trigger the actual async revoke
      const passwordInput = screen.getByPlaceholderText('Enter password');
      fireEvent.change(passwordInput, { target: { value: 'test-password' } });

      const modalSubmitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
      await act(async () => {
        fireEvent.click(modalSubmitBtn);
      });

      // After the async revoke completes, gcAllLoading must be false.
      // The GC ALL button should be re-enabled (not disabled).
      await waitFor(() => {
        expect(onRevokeAllOtherSessions).toHaveBeenCalledTimes(1);
      });

      // The 'Revoke all other sessions' button must no longer be disabled
      // (gcAllLoading=false means `disabled={gcAllLoading}` evaluates to false)
      const gcAllBtnAfter = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      expect(gcAllBtnAfter).not.toBeDisabled();
    });
  });

  describe('BUG 1: re-verification uses fresh values', () => {
    it('reloads sessions with refreshed verification after revoke re-verification', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z').getTime();
      let mockedNow = now;
      const dateNowSpy = vi.spyOn(Date, 'now').mockImplementation(() => mockedNow);

      try {
        const initialVerificationTimestamp = now + 30_000;
        const refreshedVerificationTimestamp = now + 60_000;

        const onVerifyPassword = vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: { verificationRecordId: 'initial-vid', verificationTimestamp: initialVerificationTimestamp },
          })
          .mockResolvedValueOnce({
            ok: true,
            data: { verificationRecordId: 'refreshed-vid', verificationTimestamp: refreshedVerificationTimestamp },
          });

        const onGetSessions = vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: createdSessions,
          })
          .mockResolvedValueOnce({
            ok: true,
            data: createdSessions,
          });

        const onRevokeSession = vi.fn().mockResolvedValue({ ok: true });

        renderSessionsTab({
          onVerifyPassword,
          onGetSessionsWithDeviceMeta: onGetSessions,
          onRevokeSession,
        });

        await verifyAndLoadSessions();

        await waitFor(() => {
          expect(screen.getByText('This device')).toBeDefined();
        });

        mockedNow = initialVerificationTimestamp + VERIFICATION_CLOCK_SKEW_TOLERANCE_MS + 1;

        const revokeBtn = screen.getByRole('button', { name: 'Revoke' });
        await act(async () => {
          fireEvent.click(revokeBtn);
        });

        const passwordInput = screen.getByPlaceholderText('Enter password');
        fireEvent.change(passwordInput, { target: { value: 'test-password' } });

        const submitBtn = screen.getByRole('button', { name: 'VERIFY PASS' });
        await act(async () => {
          fireEvent.click(submitBtn);
        });

        await waitFor(() => {
          expect(onVerifyPassword).toHaveBeenCalledTimes(2);
        });

        await waitFor(() => {
          expect(onGetSessions).toHaveBeenCalledTimes(2);
        });

        expect(onGetSessions.mock.calls[1][0]).toBe('refreshed-vid');
        expect(onGetSessions.mock.calls[1][1]).toBe(refreshedVerificationTimestamp);
      } finally {
        dateNowSpy.mockRestore();
      }
    });
  });

  describe('verification expiry source', () => {
    it('treats stale server verification timestamp as expired on refresh', async () => {
      const now = new Date('2026-01-01T00:00:00.000Z').getTime();
      const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now);

      try {
        const onVerifyPassword = vi.fn().mockResolvedValue({
          ok: true,
          data: { verificationRecordId: 'stale-vid', verificationTimestamp: now - 60_000 },
        });

        const onGetSessions = vi.fn()
          .mockResolvedValueOnce({
            ok: true,
            data: createdSessions,
          })
          .mockResolvedValueOnce({
            ok: true,
            data: createdSessions,
          });

        renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });

        await verifyAndLoadSessions();

        await waitFor(() => {
          expect(screen.getByText('This device')).toBeDefined();
        });

        const refreshBtn = screen.getByRole('button', { name: /refresh/i });
        await act(async () => {
          fireEvent.click(refreshBtn);
        });

        await waitFor(() => {
          expect(screen.getByText('Verify your identity')).toBeDefined();
        });

        expect(onGetSessions).toHaveBeenCalledTimes(1);
      } finally {
        dateNowSpy.mockRestore();
      }
    });
  });



  describe('BUG-014: macOS / Mac OS icon rendering', () => {
    it('renders the macOS icon for both macOS and Mac OS values', async () => {
      const macOSSessions: LogtoSession[] = [
        {
          payload: { loginTs: 1000, exp: 2000, uid: 'ses-mac-1', iat: 1000, jti: 'jti-mac-1', kind: 'Session', accountId: 'acct_1' },
          meta: {
            browser: 'Safari', browserVersion: '17',
            os: 'macOS', osVersion: '14', deviceType: 'desktop',
            ip: '1.2.3.4', isCurrent: true, lastActive: '500', jti: 'jti-mac-1',
            userId: 'test-user', createdAt: '2024-01-01T00:00:00Z',
          },
          lastSubmission: null, clientId: null, accountId: 'acct_1', expiresAt: 2000,
        },
        {
          payload: { loginTs: 1000, exp: 2000, uid: 'ses-mac-2', iat: 1000, jti: 'jti-mac-2', kind: 'Session', accountId: 'acct_1' },
          meta: {
            browser: 'Safari', browserVersion: '17',
            os: 'Mac OS', osVersion: '14', deviceType: 'desktop',
            ip: '1.2.3.5', isCurrent: false, lastActive: '500', jti: 'jti-mac-2',
            userId: 'test-user', createdAt: '2024-01-01T00:00:00Z',
          },
          lastSubmission: null, clientId: null, accountId: 'acct_1', expiresAt: 2000,
        }
      ];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: macOSSessions,
      });

      renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        const images = screen.getAllByRole('img');
        const macosImg = images.find(img => img.getAttribute('alt') === 'macOS');
        const macosImg2 = images.find(img => img.getAttribute('alt') === 'Mac OS');

        expect(macosImg).toBeDefined();
        expect(macosImg?.getAttribute('src')).toContain('/os-icons/MacOS.svg');

        expect(macosImg2).toBeDefined();
        expect(macosImg2?.getAttribute('src')).toContain('/os-icons/MacOS.svg');
      });
    });
  });

  describe('skeleton loader and map features', () => {
    it('renders the correct skeleton elements on mobile and desktop during loading', async () => {
      // First, successfully verify and load sessions
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
      });

      let resolveRefresh: (value: DataResult<LogtoSession[]>) => void = () => {};
      const refreshPromise = new Promise<DataResult<LogtoSession[]>>((resolve) => {
        resolveRefresh = resolve;
      });

      const onGetSessions = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          data: createdSessions,
        })
        .mockReturnValueOnce(refreshPromise);

      render(
        <SessionsTab
          userData={defaultUserData}
          mode="dark"
          colors={DARK_COLORS}
          t={enUS}
          mobmode={1} // Mobile Mode
          isActive={true}
          onGetSessionsWithDeviceMeta={onGetSessions}
          onRevokeSession={vi.fn()}
          onRevokeAllOtherSessions={vi.fn()}
          onVerifyPassword={onVerifyPassword}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />,
      );

      // Verify and load initial sessions
      await verifyAndLoadSessions();

      // Wait for loaded sessions to appear (use button role with name for mobile)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: enUS.sessions.thisDevice })).toBeInTheDocument();
      });

      // Click refresh button to trigger loading state with viewState='loaded'
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // Now the loading state is active. Check for mobile Globe icon button placeholder
      await waitFor(() => {
        expect(screen.getByRole('button', { name: enUS.sessions.thisDevice })).toBeInTheDocument();
      });

      // Check for map button placeholders
      expect(screen.getAllByRole('button', { name: enUS.sessions.ipLocation }).length).toBeGreaterThan(0);

      // Clean up by resolving the pending promise
      await act(async () => {
        resolveRefresh({ ok: true, data: createdSessions });
      });
    });

    it('opens SessionMapModal directly when clicking the map button', async () => {
      const mockGeo = {
        lat: 41.7151,
        lon: 44.8271,
        city: 'Tbilisi',
        country: 'Georgia',
        region: 'Tbilisi',
      };
      mockFetchGeo.mockResolvedValueOnce(mockGeo);

      // Render the sessions tab and load sessions
      renderSessionsTab();
      await verifyAndLoadSessions();

      // Find the map pin button
      const mapBtn = screen.getAllByTitle(enUS.sessions.ipLocation)[0];
      await act(async () => { fireEvent.click(mapBtn); });

      // The inline consent prompt should NOT be visible — map opens directly
      expect(screen.queryByText(/Allow map feature to use your IP address/)).not.toBeInTheDocument();

      // Check if SessionMapModal is open with correct information
      await waitFor(() => {
        // Tbilisi, Georgia should be displayed
        expect(screen.getByText('Tbilisi, Georgia')).toBeInTheDocument();
        // IP address 1.2.3.4 should be displayed (check inside modal)
        expect(screen.getAllByText(/1\.2\.3\.4/).length).toBeGreaterThan(0);
        // Latitude & Longitude with 4 decimals (e.g. 41.7151, 44.8271)
        expect(screen.getByText(/41\.7151/)).toBeInTheDocument();
        expect(screen.getByText(/44\.8271/)).toBeInTheDocument();
        // OpenStreetMap and Google Maps buttons
        expect(screen.getByRole('link', { name: new RegExp(enUS.sessions.viewOnOpenStreetMap, 'i') })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: new RegExp(enUS.sessions.viewOnGoogleMaps, 'i') })).toBeInTheDocument();
      });

      // fetchGeo should have been called
      expect(mockFetchGeo).toHaveBeenCalled();
    });

    it('opens SessionMapModal directly with cached geo data on map button click', async () => {
      const cachedGeo = {
        lat: 51.5,
        lon: -0.1,
        city: 'London',
        country: 'UK',
        region: 'London',
      };
      // Use mockReturnValue (not mockReturnValueOnce) so it survives
      // any incidental calls during render / session loading.
      mockGetCachedGeo.mockReturnValue(cachedGeo);

      renderSessionsTab();
      await verifyAndLoadSessions();

      const mapBtn = screen.getAllByTitle(enUS.sessions.ipLocation)[0];
      await act(async () => { fireEvent.click(mapBtn); });

      // Modal should open directly (no consent prompt)
      expect(screen.queryByText(/Allow map feature to use your IP address/)).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('London, UK')).toBeInTheDocument();
      });

      // fetchGeo should NOT have been called (cache hit)
      expect(mockFetchGeo).not.toHaveBeenCalled();

      // Restore default so other tests are not affected
      mockGetCachedGeo.mockReturnValue(null);
    });
  });

  describe('GC ALL Confirmation Modal (Task 1)', () => {
    it('renders with correct ARIA attributes, focus trap, and references', async () => {
      renderSessionsTab();
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Open GC ALL modal by clicking the 'Revoke all other sessions' button
      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => {
        fireEvent.click(gcAllBtn);
      });

      // The modal should be open
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-labelledby')).toBe('gc-all-title');

      const title = screen.getByText(enUS.sessions.gcAllConfirmTitle);
      expect(title).toBeInTheDocument();
      expect(title.getAttribute('id')).toBe('gc-all-title');
    });
  });

  describe('Sessions Tab UI Fixes', () => {
    it('applies correct styling to the mobile revoke button', async () => {
      renderSessionsTab({ mobmode: 1 });
      await verifyAndLoadSessions();

      // Find the mobile revoke trash button
      const revokeBtns = screen.getAllByRole('button', { name: enUS.sessions.revoke });
      expect(revokeBtns.length).toBeGreaterThan(0);
      const revokeBtn = revokeBtns[0] as HTMLButtonElement;

      const style = window.getComputedStyle(revokeBtn);
      expect(style.width).toBe('2rem');
      expect(style.height).toBe('2rem');
      expect(revokeBtn.style.color).toBe('rgb(220, 38, 38)');
      expect(revokeBtn.style.background).toBe('rgb(26, 5, 5)');
    });

    it('styles the mobile current-device button cyberpunk green', async () => {
      renderSessionsTab({ mobmode: 1 });
      await verifyAndLoadSessions();
      // On mobile the current-device button uses only a Globe icon (no text).
      // Use getByRole('button', {...}) which matches on aria-label.
      const currentBtn = screen.getByRole('button', { name: enUS.sessions.thisDevice });
      expect(currentBtn).toHaveStyle({ width: '2rem', height: '2rem', flexShrink: '0' });
      // Dark mode (renderSessionsTab uses DARK_COLORS): greenFill #064e3b, greenBorder #10b981
      expect(currentBtn.style.background).toBe('rgb(6, 78, 59)');
      expect(currentBtn.style.border).toBe('1px solid rgb(16, 185, 129)');
    });

    it('renders desktop Revoke All button with correct translation text', async () => {
      renderSessionsTab({ mobmode: 0 });
      await verifyAndLoadSessions();

      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      expect(gcAllBtn).toBeInTheDocument();
      expect(gcAllBtn.textContent).toBe(enUS.sessions.revokeAll);
    });

    it('renders desktop Refresh button as text-only without RefreshCw icon', async () => {
      renderSessionsTab({ mobmode: 0 });
      await verifyAndLoadSessions();

      const refreshBtn = screen.getByRole('button', { name: enUS.sessions.refreshData });
      expect(refreshBtn).toBeInTheDocument();
      expect(refreshBtn.textContent).toBe(enUS.sessions.refreshData);
      
      const svg = refreshBtn.querySelector('svg');
      expect(svg).toBeNull();
    });

    it('renders desktop Map button as a text button with View map label', async () => {
      renderSessionsTab({ mobmode: 0 });
      await verifyAndLoadSessions();

      const mapBtns = screen.getAllByRole('button', { name: enUS.sessions.ipLocation });
      expect(mapBtns.length).toBeGreaterThan(0);
      const mapBtn = mapBtns[0];
      expect(mapBtn).toBeInTheDocument();
      expect(mapBtn.textContent).toContain(enUS.sessions.viewMap);

      const svg = mapBtn.querySelector('svg');
      expect(svg).toBeNull();
    });
    });
  });

  // ─── BUG-H05: loadSessions bypassed expiry check when `verification` param was passed ───
  describe('BUG-H05: loadSessions expiry validation with explicit verification param', () => {
    it('proceeds with the sessions fetch when verification expiry timestamp is in the future (state path)', async () => {
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });

      // We need to test loadSessions directly; do that via the refresh button path
      // First establish a valid session
      const validTs = Date.now() + 10 * 60 * 1000;
      const onVerifyPasswordValid = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'valid-vid', verificationTimestamp: validTs },
      });
      renderSessionsTab({
        onVerifyPassword: onVerifyPasswordValid,
        onGetSessionsWithDeviceMeta: onGetSessions,
      });

      await verifyAndLoadSessions();
      await waitFor(() => { expect(screen.getByText('This device')).toBeDefined(); });

      // Sessions were fetched once (the initial verifyAndLoad path calls onGetSessions directly)
      expect(onGetSessions).toHaveBeenCalledTimes(1);

      // Click refresh - triggers loadSessions() with no explicit verification
      // It uses verificationExpiry from state (validTs - in the future), so should proceed
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // Sessions fetch should have been called again (expiry is valid)
      await waitFor(() => {
        expect(onGetSessions).toHaveBeenCalledTimes(2);
      });
    });

    it('skips the sessions fetch when the verification timestamp is expired (past timestamp)', async () => {
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });

      // Set up with an already-expired timestamp (1 second in the past, well outside skew tolerance)
      const expiredTs = Date.now() - 1000;
      const onVerifyPasswordExpired = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'expired-vid', verificationTimestamp: expiredTs },
      });

      renderSessionsTab({
        onVerifyPassword: onVerifyPasswordExpired,
        onGetSessionsWithDeviceMeta: onGetSessions,
      });

      // verifyAndLoadSessions triggers onGetSessions directly via the callback path
      await verifyAndLoadSessions();

      // The direct callback invocation still calls onGetSessions (timestamp check happens inside loadSessions)
      // Now trigger refresh, which calls loadSessions() with the state-stored expired timestamp
      // isVerificationValid is computed from verificationExpiry which is expiredTs (past) — so it's false
      // loadSessions should bail out early without calling onGetSessions again
      const callCountAfterVerify = onGetSessions.mock.calls.length;

      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      // Allow any async state updates to settle
      await act(async () => {});

      // onGetSessions should NOT have been called an additional time
      expect(onGetSessions).toHaveBeenCalledTimes(callCountAfterVerify);
    });
    it('proceeds with the sessions fetch when verification timestamp is in the future', async () => {
      const futureTs = Date.now() + 10 * 60 * 1000;
      const onVerifyPassword = vi.fn().mockResolvedValue({
        ok: true,
        data: { verificationRecordId: 'test-vid', verificationTimestamp: futureTs },
      });
      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: createdSessions,
      });

      renderSessionsTab({ onVerifyPassword, onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      // verifyAndLoad calls onGetSessions directly (not via loadSessions)
      await waitFor(() => {
        expect(onGetSessions).toHaveBeenCalledTimes(1);
      });

      // Refresh triggers loadSessions() — isVerificationValid should be true
      const refreshBtn = screen.getByRole('button', { name: /refresh/i });
      await act(async () => { fireEvent.click(refreshBtn); });

      await waitFor(() => {
        expect(onGetSessions).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ─── Batch 6c: getSessionTitle simplification (D16) ───
  describe('getSessionTitle simplification (Batch 6c)', () => {
    it('renders "Firefox on macOS" instead of "Firefox 121 · macOS 14"', async () => {
      renderSessionsTab();
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Firefox on macOS')).toBeDefined();
      });

      // Old format should not appear
      expect(screen.queryByText('Firefox 121 · macOS 14')).toBeNull();
    });
  });

  // ─── Batch 6c: Revoke-all button visibility (D16) ───
  describe('Revoke all button visibility (Batch 6c)', () => {
    it('shows revoke-all button even when no session has isCurrent: true', async () => {
      const sessionsWithoutCurrent: LogtoSession[] = [
        {
          ...createdSessions[0],
          meta: { ...createdSessions[0].meta!, isCurrent: false },
        },
        {
          ...createdSessions[1],
          meta: { ...createdSessions[1].meta!, isCurrent: false },
        },
      ];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: sessionsWithoutCurrent,
      });

      renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Firefox on macOS')).toBeDefined();
      });

      // Revoke-all button should still be visible (gated on sessions.length > 0)
      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      expect(gcAllBtn).toBeInTheDocument();
    });
  });

  // ─── Batch 6c: Single-session guard (D16) ───
  describe('Single-session guard (D16)', () => {
    it('shows "only one session" modal when clicking revoke-all with exactly one session', async () => {
      const singleSession: LogtoSession[] = [createdSessions[0]];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: singleSession,
      });

      renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeDefined();
      });

      // Revoke-all button should exist (1 session, length > 0)
      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => { fireEvent.click(gcAllBtn); });

      // "Only one session" modal should appear
      await waitFor(() => {
        expect(screen.getByText(enUS.sessions.gcOnlyOneTitle)).toBeDefined();
      });

      // GC ALL confirmation modal should NOT appear
      expect(screen.queryByText(enUS.sessions.gcAllConfirmTitle)).toBeNull();
    });

    it('does not show "only one session" modal when there are multiple sessions', async () => {
      renderSessionsTab();
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('This device')).toBeDefined();
      });

      // Click revoke-all with multiple sessions
      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => { fireEvent.click(gcAllBtn); });

      // GC ALL confirmation should appear
      await waitFor(() => {
        expect(screen.getByText(enUS.sessions.gcAllConfirmTitle)).toBeDefined();
      });

      // "Only one session" modal should NOT appear
      expect(screen.queryByText(enUS.sessions.gcOnlyOneTitle)).toBeNull();
    });

    it('"I get it" button closes the single-session modal', async () => {
      const singleSession: LogtoSession[] = [createdSessions[0]];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: singleSession,
      });

      renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeDefined();
      });

      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => { fireEvent.click(gcAllBtn); });

      await waitFor(() => {
        expect(screen.getByText(enUS.sessions.gcOnlyOneTitle)).toBeDefined();
      });

      // Click "I get it" button
      const ackBtn = screen.getByRole('button', { name: enUS.sessions.gcOnlyOneAck });
      await act(async () => { fireEvent.click(ackBtn); });

      // Modal should be gone
      await waitFor(() => {
        expect(screen.queryByText(enUS.sessions.gcOnlyOneTitle)).toBeNull();
      });
    });

    it('Only One Session modal has no outside-click dismiss', async () => {
      const singleSession: LogtoSession[] = [createdSessions[0]];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: singleSession,
      });

      const { container } = renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeDefined();
      });

      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => { fireEvent.click(gcAllBtn); });

      await waitFor(() => {
        expect(screen.getByText(enUS.sessions.gcOnlyOneTitle)).toBeDefined();
      });

      // Click the overlay backdrop (the fixed motion.div that covers the viewport)
      // The overlay is the outermost <motion.div> with position:fixed, inset:0
      const overlay = container.querySelector('[style*="position: fixed"][style*="inset: 0"][style*="z-index: 9000"]');
      if (overlay) {
        await act(async () => { fireEvent.click(overlay); });
      }

      // Modal should STILL be in the DOM (no outside-click dismiss)
      expect(screen.getByText(enUS.sessions.gcOnlyOneTitle)).toBeDefined();
    });

    it('single-session modal does not trigger a password verification (no FlowModal)', async () => {
      const singleSession: LogtoSession[] = [createdSessions[0]];

      const onGetSessions = vi.fn().mockResolvedValue({
        ok: true,
        data: singleSession,
      });

      renderSessionsTab({ onGetSessionsWithDeviceMeta: onGetSessions });
      await verifyAndLoadSessions();

      await waitFor(() => {
        expect(screen.getByText('Chrome on Windows')).toBeDefined();
      });

      const gcAllBtn = screen.getByRole('button', { name: enUS.sessions.revokeAll });
      await act(async () => { fireEvent.click(gcAllBtn); });

      // "Only one session" modal should appear
      await waitFor(() => {
        expect(screen.getByText(enUS.sessions.gcOnlyOneTitle)).toBeDefined();
      });

      // Wait for any lingering AnimatePresence exits to complete,
      // then ensure no password input has appeared.
      await waitFor(() => {
        // No password input should appear (no FlowModal for verification)
        expect(screen.queryByPlaceholderText('Enter password')).toBeNull();
      });
    });
  });

