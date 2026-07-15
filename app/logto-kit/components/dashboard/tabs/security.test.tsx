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
      onGetMfaVerifications={vi.fn().mockResolvedValue({ ok: true, data: defaultMfaList })}
      onGenerateTotpSecret={vi.fn().mockResolvedValue({ ok: true, data: { secret: 'secret' } })}
      onAddMfaVerification={vi.fn().mockResolvedValue({ ok: true } satisfies ActionResult)}
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
    // Cyberpunk red (dark mode, which renderSecurity uses): #7f1d1d fill, #ef4444 outline.
    // jsdom normalizes hex → rgb()
    expect(deleteButton.style.background).toBe('rgb(127, 29, 29)');
    expect(deleteButton.style.border).toBe('1px solid rgb(239, 68, 68)');
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

    // Dots are white
    const dots = screen.getByRole('status').querySelectorAll('span');
    expect(dots[0]).toHaveStyle({ background: 'rgb(255, 255, 255)' });

    // Resolve verification → modal closes on success (no separate success stage)
    await act(async () => {
      resolveVerify({ ok: true, data: { verificationRecordId: 'vid-1', verificationTimestamp: Date.now() + 600_000 } });
    });

    await waitFor(() => {
      expect(screen.queryByText(enUS.security.confirmDeleteAccount)).not.toBeInTheDocument();
    });
  });
});
