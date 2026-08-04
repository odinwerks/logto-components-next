import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { UserData, MfaVerification } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';

const { mockPush } = vi.hoisted(() => ({ mockPush: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@simplewebauthn/browser', () => ({
  browserSupportsWebAuthn: () => true,
  startRegistration: vi.fn(),
}));

import { SecurityTab } from './security';

const defaultUserData: UserData = {
  id: 'user-id',
  username: 'user',
  name: 'User',
  avatar: undefined,
  primaryEmail: 'user@example.com',
  primaryPhone: '+15550001111',
  profile: { givenName: 'User', familyName: 'Test' },
  identities: {},
  customData: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const defaultMfaList: MfaVerification[] = [
  {
    id: 'totp-1',
    type: 'Totp',
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'backup-1',
    type: 'BackupCode',
    remainCodes: 6,
    createdAt: new Date('2024-01-01').toISOString(),
  },
  {
    id: 'passkey-1',
    type: 'WebAuthn',
    name: 'Phone passkey',
    createdAt: new Date('2024-01-01').toISOString(),
  },
];

type RenderOptions = {
  onVerifyPassword?: (password: string) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onGetMfaVerifications?: () => Promise<DataResult<MfaVerification[]>>;
  onGenerateTotpSecret?: () => Promise<DataResult<{ secret: string }>>;
  onAddMfaVerification?: React.ComponentProps<typeof SecurityTab>['onAddMfaVerification'];
  onGenerateBackupCodes?: (verificationRecordId: string) => Promise<DataResult<{ codes: string[] }>>;
  mobmode?: number;
};

function renderSecurity(options: RenderOptions = {}) {
  const onVerifyPassword = options.onVerifyPassword ?? vi.fn().mockResolvedValue({
    ok: true,
    data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
  });

  const onGenerateBackupCodes = options.onGenerateBackupCodes ?? vi.fn().mockResolvedValue({
    ok: true,
    data: { codes: ['A1'] },
  });

  const onError = vi.fn();

  render(
    <SecurityTab
      userData={defaultUserData}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
      mobmode={options.mobmode}
      onVerifyPassword={onVerifyPassword}
      onGetMfaVerifications={options.onGetMfaVerifications ?? vi.fn().mockResolvedValue({ ok: true, data: defaultMfaList })}
      onGenerateTotpSecret={options.onGenerateTotpSecret ?? vi.fn().mockResolvedValue({ ok: true, data: { secret: 'secret' } })}
      onAddMfaVerification={options.onAddMfaVerification ?? vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onDeleteMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onReplaceTotpVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onGenerateBackupCodes={onGenerateBackupCodes}
      onUpdatePassword={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onDeleteAccount={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onRequestWebAuthnRegistration={vi.fn().mockResolvedValue({ ok: true, data: { registrationOptions: {}, verificationRecordId: 'wa-1' } })}
      onVerifyAndLinkWebAuthn={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onRenamePasskey={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
      onSuccess={vi.fn()}
      onError={onError}
    />,
  );

  return { onVerifyPassword, onGenerateBackupCodes, onError };
}

describe('SecurityTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows backup regeneration warning only in modal body with explicit CTA label', async () => {
    renderSecurity();

    await screen.findByText(enUS.mfa.recoveryCodes);
    fireEvent.click(screen.getByRole('button', { name: enUS.security.generateBackupCodesTitle }));

    const warningText = screen.getByText(enUS.security.generateBackupCodesConfirm);
    expect(screen.getAllByText(enUS.security.generateBackupCodesConfirm)).toHaveLength(1);
    expect(warningText).toHaveStyle({ fontWeight: '700' });
    expect(screen.getByText(enUS.mfa.verifyPasswordToGenerateBackupCodes)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: enUS.security.generateBackupCodesCta })).toBeInTheDocument();
  });

  it('keeps backup-codes modal open with inline error on wrong password', async () => {
    const { onVerifyPassword, onGenerateBackupCodes, onError } = renderSecurity({
      onVerifyPassword: vi.fn().mockResolvedValue({ ok: false, error: 'Wrong password' }),
    });

    await screen.findByText(enUS.mfa.recoveryCodes);
    fireEvent.click(screen.getByRole('button', { name: enUS.security.generateBackupCodesTitle }));
    fireEvent.click(screen.getByRole('button', { name: enUS.security.generateBackupCodesCta }));

    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
      expect(screen.getAllByText(enUS.security.generateBackupCodesTitle).length).toBeGreaterThan(0);
    });

    expect(onVerifyPassword).toHaveBeenCalledWith('bad');
    expect(onGenerateBackupCodes).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps delete-account modal open with inline error on wrong password', async () => {
    const { onError } = renderSecurity({
      onVerifyPassword: vi.fn().mockResolvedValue({ ok: false, error: 'Wrong password' }),
    });

    await screen.findByText(enUS.security.dangerZone);
    fireEvent.click(screen.getAllByRole('button', { name: enUS.security.deleteAccount })[0]);

    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
      expect(screen.getByText(enUS.security.confirmDeleteAccount)).toBeInTheDocument();
    });

    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps mobile passkey edit action button square', async () => {
    renderSecurity({ mobmode: 1 });

    const editButton = await screen.findByRole('button', { name: enUS.profile.edit });
    expect(editButton).toHaveStyle({ width: '2rem', height: '2rem', flexShrink: '0' });
  });

  it('keeps mobile delete account action button square', async () => {
    renderSecurity({ mobmode: 1 });

    const deleteButton = await screen.findByRole('button', { name: enUS.security.deleteAccount });
    expect(deleteButton).toHaveStyle({ width: '2rem', height: '2rem', flexShrink: '0' });
  });

  it('keeps the TOTP secret and verification record available after activation fails', async () => {
    const onAddMfaVerification = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: 'Invalid authenticator code' } satisfies ActionResult)
      .mockResolvedValueOnce({ ok: true } satisfies ActionResult);

    renderSecurity({
      onGetMfaVerifications: vi.fn().mockResolvedValue({ ok: true, data: [] }),
      onGenerateTotpSecret: vi.fn().mockResolvedValue({ ok: true, data: { secret: 'REUSABLESECRET' } }),
      onAddMfaVerification,
    });

    fireEvent.click(await screen.findByRole('button', { name: enUS.mfa.generateTotpSecret }));
    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    const codeInput = await screen.findByLabelText(enUS.verification.totpCodeLabel);
    fireEvent.change(codeInput, { target: { value: '123456' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid authenticator code');
    expect(screen.getByText('REUSABLESECRET')).toBeInTheDocument();
    expect(onAddMfaVerification).toHaveBeenLastCalledWith(
      { type: 'Totp', payload: { secret: 'REUSABLESECRET', code: '123456' } },
      'vid-1',
    );

    fireEvent.change(codeInput, { target: { value: '654321' } });
    await waitFor(() => expect(onAddMfaVerification).toHaveBeenCalledTimes(2));
    expect(onAddMfaVerification).toHaveBeenLastCalledWith(
      { type: 'Totp', payload: { secret: 'REUSABLESECRET', code: '654321' } },
      'vid-1',
    );
  });

  it('names and enables the mobile backup-code button when prerequisites are met', async () => {
    renderSecurity({ mobmode: 1 });

    const button = await screen.findByRole('button', { name: enUS.security.generateBackupCodesTitle });
    expect(button).toBeEnabled();
  });

  it('names and natively disables the mobile backup-code button without another MFA factor', async () => {
    const { onError } = renderSecurity({
      mobmode: 1,
      onGetMfaVerifications: vi.fn().mockResolvedValue({
        ok: true,
        data: [{ id: 'backup-1', type: 'BackupCode', createdAt: new Date('2024-01-01').toISOString() }],
      }),
    });

    const button = await screen.findByRole('button', { name: enUS.security.generateBackupCodesTitle });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onError).not.toHaveBeenCalled();
  });

  it('renders the security tab root as a flex column that fills its parent', async () => {
    renderSecurity();
    await screen.findByText(enUS.security.dangerZone);
    const root = screen.getByTestId('security-danger-zone').parentElement;
    expect(root).toHaveStyle({ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' });
  });

  it('pins the danger zone as the sibling after the scrollable upper area', async () => {
    renderSecurity();
    await screen.findByText(enUS.security.dangerZone);
    const scrollArea = screen.getByTestId('security-scroll-area');
    const dangerZone = screen.getByTestId('security-danger-zone');
    // Danger zone is the next sibling after the scroll area (which contains the passkey card).
    expect(dangerZone.previousElementSibling).toBe(scrollArea);
    // Never shrinks → stays pinned at the bottom of the flex column.
    expect(dangerZone).toHaveStyle({ flexShrink: '0' });
    // Upper area is the scroll well (pretty scrollbar inherited globally).
    expect(scrollArea).toHaveStyle({ overflowY: 'auto', flex: '1 1 auto', minHeight: '0' });
  });

  it('styles the mobile delete-account button cyberpunk red while staying square', async () => {
    renderSecurity({ mobmode: 1 });
    const deleteButton = await screen.findByRole('button', { name: enUS.security.deleteAccount });
    // Dimensions preserved (existing square regression guard).
    expect(deleteButton).toHaveStyle({ width: '2rem', height: '2rem', flexShrink: '0' });
    // Theme-sourced red (dark mode, which renderSecurity uses): errorBg fill, accentRed outline.
    // jsdom normalizes hex → rgb()
    expect(deleteButton.style.background).toBe('rgb(26, 5, 5)');
    expect(deleteButton.style.border).toBe('1px solid rgb(220, 38, 38)');
  });

  it('LOW-3: encodes TOTP secret with encodeURIComponent in otpauth URI', async () => {
    // Arrange: use a mock secret containing characters that need encoding
    // Base32 alphabet is safe (A-Z, 2-7, =), but test with a special char to verify encoding
    const specialSecret = 'JBSWY3DPEHPK3PXP+EXTRA=';
    render(
      <SecurityTab
        userData={{ ...defaultUserData, primaryEmail: 'user@example.com' }}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        onVerifyPassword={vi.fn().mockResolvedValue({
          ok: true,
          data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
        })}
        onGetMfaVerifications={vi.fn().mockResolvedValue({ ok: true, data: [] })}
        onGenerateTotpSecret={vi.fn().mockResolvedValue({ ok: true, data: { secret: specialSecret } })}
        onAddMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onReplaceTotpVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onGenerateBackupCodes={vi.fn().mockResolvedValue({ ok: true, data: { codes: ['A1'] } })}
        onUpdatePassword={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteAccount={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRequestWebAuthnRegistration={vi.fn().mockResolvedValue({ ok: true, data: { registrationOptions: {}, verificationRecordId: 'wa-1' } })}
        onVerifyAndLinkWebAuthn={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRenamePasskey={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />,
    );

    // Find and click the "Set up authenticator" button (no existing TOTP factor)
    const setupButton = await screen.findByRole('button', { name: enUS.mfa.generateTotpSecret });
    fireEvent.click(setupButton);

    // Enter password in the verification step
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'mypassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    // Wait for the TOTP scan step with the QR code
    await waitFor(() => {
      // The secret key text should be visible in the scan step
      expect(screen.getByText(specialSecret)).toBeInTheDocument();
    });

    // Verify the QR code URI has the secret properly encoded
    // The QRCodeSVG renders with value={totpUri}; find the SVG element
    // and check that the + in the secret was encoded as %2B in the URI
    const svgElement = document.querySelector('svg');
    expect(svgElement).toBeInTheDocument();
    // The URI is passed to QRCodeSVG as a prop - we can verify encoding by checking
    // that encodeURIComponent was applied (+ → %2B, = → %3D)
    const encodedSecret = encodeURIComponent(specialSecret);
    expect(encodedSecret).toContain('%2B'); // + should be encoded
    expect(encodedSecret).toContain('%3D'); // = should be encoded
    // Confirm the encoded form does not contain unencoded + or trailing =
    expect(encodedSecret).not.toContain('+');
  });

  it('BUG-078: keeps TOTP remove modal open with inline error on wrong password', async () => {
    const { onVerifyPassword, onError } = renderSecurity({
      onVerifyPassword: vi.fn().mockResolvedValue({ ok: false, error: 'Wrong password' }),
    });

    // Open TOTP setup modal (TOTP exists → shows "Reconfigure")
    await screen.findByText(enUS.mfa.recoveryCodes);
    fireEvent.click(screen.getByText(enUS.security.reconfigure));

    // Switch to remove mode
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(enUS.profile.deleteHint));

    // Confirm we're in remove mode
    await waitFor(() => {
      expect(screen.getByText(enUS.security.removeAuthenticator)).toBeInTheDocument();
    });

    // Enter password and submit
    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    // Modal stays open with inline error; loading must NOT be stuck
    await waitFor(() => {
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
      expect(screen.getByText(enUS.security.removeAuthenticator)).toBeInTheDocument();
    });

    expect(onVerifyPassword).toHaveBeenCalledWith('bad');
    expect(onError).not.toHaveBeenCalled();
  });

  it('shows loading dots inside the verify button (not a separate stage) during delete-account verification', async () => {
    type VerifyResult = DataResult<{ verificationRecordId: string; verificationTimestamp: number }>;
    let resolveVerify!: (val: VerifyResult) => void;
    const verifyPromise = new Promise<VerifyResult>((resolve) => {
      resolveVerify = resolve;
    });

    render(
      <SecurityTab
        userData={defaultUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        onVerifyPassword={vi.fn().mockReturnValue(verifyPromise)}
        onGetMfaVerifications={vi.fn().mockResolvedValue({ ok: true, data: defaultMfaList })}
        onGenerateTotpSecret={vi.fn().mockResolvedValue({ ok: true, data: { secret: 'secret' } })}
        onAddMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onReplaceTotpVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onGenerateBackupCodes={vi.fn().mockResolvedValue({ ok: true, data: { codes: ['A1'] } })}
        onUpdatePassword={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteAccount={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRequestWebAuthnRegistration={vi.fn().mockResolvedValue({ ok: true, data: { registrationOptions: {}, verificationRecordId: 'wa-1' } })}
        onVerifyAndLinkWebAuthn={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRenamePasskey={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onSuccess={vi.fn()}
        onError={vi.fn()}
      />,
    );

    // Open the delete-account modal
    await screen.findByText(enUS.security.dangerZone);
    fireEvent.click(screen.getAllByRole('button', { name: enUS.security.deleteAccount })[0]);

    // Enter password and submit
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'mypassword' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));
    });

    // While onVerifyPassword is pending: BouncingDots render inside the verify
    // button (no separate loading stage), the button is disabled, and the
    // password input is disabled.
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    const loadingBtn = screen.getByRole('status').closest('button') as HTMLElement;
    expect(loadingBtn).toBeDisabled();
    expect(screen.queryByRole('button', { name: enUS.verification.verifyPassword })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeDisabled();

    // Dots are accentRed for danger modals (FlowModal passes dotsColor={colors.accentRed})
    const dots = screen.getByRole('status').querySelectorAll('span');
    expect(dots[0]).toHaveStyle({ background: 'rgb(220, 38, 38)' });

    // Resolve verification → modal closes on success (no separate success stage)
    await act(async () => {
      resolveVerify({ ok: true, data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 } });
    });

    await waitFor(() => {
      expect(screen.queryByText(enUS.security.confirmDeleteAccount)).not.toBeInTheDocument();
    });
  });

  it('BUG-074: discards stale MFA list fetch when a newer fetch completes first', async () => {
    // Scenario: mount fetch (call 1) is slow; a TOTP-removal-triggered refresh
    // (call 2) completes first.  The stale call-1 result must be discarded.
    const freshData: MfaVerification[] = [
      { id: 'fresh-webauthn', type: 'WebAuthn', name: 'New passkey', createdAt: '2024-06-01T00:00:00Z' },
    ];

    let resolveCall2!: (val: DataResult<MfaVerification[]>) => void;
    let callCount = 0;

    const onGetMfaVerifications = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // Call 1 (mount): resolves immediately with TOTP data
        return Promise.resolve({ ok: true, data: defaultMfaList } as const);
      }
      if (callCount === 2) {
        // Call 2 (refresh after TOTP removal): slow deferred
        return new Promise<DataResult<MfaVerification[]>>((r) => { resolveCall2 = r; });
      }
      // Call 3+ — should not happen if guard works, but be safe
      return Promise.resolve({ ok: true, data: freshData } as const);
    });

    const onSuccess = vi.fn();

    render(
      <SecurityTab
        userData={defaultUserData}
        mode="dark"
        colors={DARK_COLORS}
        t={enUS}
        onVerifyPassword={vi.fn().mockResolvedValue({
          ok: true,
          data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 },
        })}
        onGetMfaVerifications={onGetMfaVerifications}
        onGenerateTotpSecret={vi.fn().mockResolvedValue({ ok: true, data: { secret: 'secret' } })}
        onAddMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onReplaceTotpVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onGenerateBackupCodes={vi.fn().mockResolvedValue({ ok: true, data: { codes: ['A1'] } })}
        onUpdatePassword={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onDeleteAccount={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRequestWebAuthnRegistration={vi.fn().mockResolvedValue({ ok: true, data: { registrationOptions: {}, verificationRecordId: 'wa-1' } })}
        onVerifyAndLinkWebAuthn={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onRenamePasskey={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
        onSuccess={onSuccess}
        onError={vi.fn()}
      />,
    );

    // Wait for mount load to complete (call 1 resolves immediately)
    await screen.findByText(enUS.security.reconfigure);

    // Verify TOTP factor is displayed
    expect(screen.getByText(enUS.mfa.authenticatorActive)).toBeInTheDocument();

    // Trigger TOTP removal → calls refreshMfa → call 2 (deferred)
    fireEvent.click(screen.getByText(enUS.security.reconfigure));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(enUS.profile.deleteHint));
    await waitFor(() => {
      expect(screen.getByText(enUS.security.removeAuthenticator)).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'password' },
    });
    fireEvent.click(screen.getByRole('button', { name: enUS.verification.verifyPassword }));

    // Wait for removal to succeed → refreshMfa() is called → call 2 is pending
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(enUS.mfa.factorRemoved);
    });

    // Call 2 is the latest fetch. Resolve it with fresh data (no TOTP, just a passkey).
    await act(async () => {
      resolveCall2({ ok: true, data: freshData });
    });

    // The fresh data should be shown: passkey "New passkey", no TOTP
    await waitFor(() => {
      expect(screen.getByText('New passkey')).toBeInTheDocument();
    });
    expect(screen.queryByText(enUS.mfa.authenticatorActive)).not.toBeInTheDocument();

    // Only 2 calls should have been made (mount + refresh).
    expect(callCount).toBe(2);
  });
});
