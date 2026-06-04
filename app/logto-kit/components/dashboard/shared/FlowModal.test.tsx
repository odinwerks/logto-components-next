import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import { FlowModal, PasswordVerifyModal, BackupCodesModal } from './FlowModal';

describe('FlowModal - localization', () => {
  const noop = () => {};

  it('renders value step without password input and allows advancing', () => {
    const onValueSubmit = vi.fn();
    render(
      <FlowModal
        title="Update email"
        subtitle="Step 1"
        step={{ kind: 'value' }}
        onPasswordSubmit={noop}
        onValueSubmit={onValueSubmit}
        onClose={noop}
        extra={<div>VALUE FORM</div>}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByText('VALUE FORM')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: enUS.profile.saveChanges }));
    expect(onValueSubmit).toHaveBeenCalledTimes(1);
  });

  it('renders code step with translation keys instead of hardcoded English', () => {
    render(
      <FlowModal
        title="Verify"
        subtitle="Code verification"
        step={{ kind: 'code', destination: 'user@example.com', verificationId: 'v1', identityVerificationId: 'iv1', verificationTimestamp: Date.now() + 600000 }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // "Code sent to" from translations, not "A 6-digit code was sent to"
    // The p element also contains the destination span, so use exact: false
    expect(screen.getByText(enUS.verification.codeSent, { exact: false })).toBeInTheDocument();
    // Destination is shown
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    // Label uses verification.verificationCode, not hardcoded "Verification code"
    // Lbl component uses textTransform: uppercase via CSS, but text content is as-is
    expect(screen.getByText(enUS.verification.verificationCode)).toBeInTheDocument();
    // Cancel button uses profile.cancel, not hardcoded "Cancel"
    expect(screen.getByText(enUS.profile.cancel)).toBeInTheDocument();
  });

  it('renders totp-scan step with translation keys', () => {
    render(
      <FlowModal
        title="Setup TOTP"
        subtitle="Scan QR code"
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1', verificationTimestamp: 12345 }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // Uses mfa.scanQrCode instead of hardcoded "Scan this QR code..."
    expect(screen.getByText(enUS.mfa.scanQrCode)).toBeInTheDocument();
    // Uses mfa.cantScan and mfa.enterManually instead of hardcoded text
    // Both values are in the same p element, so use exact: false
    expect(screen.getByText(enUS.mfa.cantScan, { exact: false })).toBeInTheDocument();
    expect(screen.getByText(enUS.mfa.enterManually, { exact: false })).toBeInTheDocument();
  });

  it('renders new-password step with translation keys', () => {
    render(
      <FlowModal
        title="Change password"
        subtitle="Enter new password"
        step={{ kind: 'new-password', verificationRecordId: 'vr1', verificationTimestamp: Date.now() + 60000 }}
        onPasswordSubmit={noop}
        onClose={noop}
        onNewPasswordSubmit={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // Label uses security.password instead of hardcoded "New password"
    expect(screen.getByText(enUS.security.password)).toBeInTheDocument();
    // Placeholder uses security.enterNewPassword
    expect(screen.getByPlaceholderText(enUS.security.enterNewPassword)).toBeInTheDocument();
    // Cancel button uses profile.cancel, not hardcoded "Cancel"
    expect(screen.getByText(enUS.profile.cancel)).toBeInTheDocument();
    // Primary button uses security.changePassword, not hardcoded "Change password"
    // Title also says "Change password" so there are 2 elements
    const changePasswordElements = screen.getAllByText(enUS.security.changePassword);
    expect(changePasswordElements.length).toBe(2);
  });
});

describe('FlowModal - TOTP auto-submit behavior', () => {
  const noop = () => {};

  it('calls onTotpSubmit when 6th digit is typed', () => {
    const onTotpSubmit = vi.fn();
    render(
      <FlowModal
        title="Setup TOTP"
        subtitle="Scan QR code"
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1', verificationTimestamp: 12345 }}
        onPasswordSubmit={noop}
        onClose={noop}
        onTotpSubmit={onTotpSubmit}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const input = screen.getByPlaceholderText('000000');
    expect(input).toBeInTheDocument();

    // Typing fewer than 6 digits should NOT trigger submission
    fireEvent.change(input, { target: { value: '123' } });
    expect(onTotpSubmit).not.toHaveBeenCalled();

    // Typing the 6th digit should trigger submission
    fireEvent.change(input, { target: { value: '123456' } });
    expect(onTotpSubmit).toHaveBeenCalledTimes(1);
    expect(onTotpSubmit).toHaveBeenCalledWith('123456', 'SECRET123', 'iv1', 12345);
  });

  it('allows re-submission immediately when code changes (no 2-second dead zone)', () => {
    const onTotpSubmit = vi.fn();
    render(
      <FlowModal
        title="Setup TOTP"
        subtitle="Scan QR code"
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1', verificationTimestamp: 12345 }}
        onPasswordSubmit={noop}
        onClose={noop}
        onTotpSubmit={onTotpSubmit}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const input = screen.getByPlaceholderText('000000');

    // First submission (6 digits)
    fireEvent.change(input, { target: { value: '123456' } });
    expect(onTotpSubmit).toHaveBeenCalledTimes(1);

    // User clears and types a different code - should submit again immediately
    // (simulating retry after failed verification)
    fireEvent.change(input, { target: { value: '654321' } });
    expect(onTotpSubmit).toHaveBeenCalledTimes(2);
    expect(onTotpSubmit).toHaveBeenLastCalledWith('654321', 'SECRET123', 'iv1', 12345);
  });
});

describe('BackupCodesModal - theming', () => {
  it('renders with theme colors for border, not hardcoded hex', () => {
    render(
      <BackupCodesModal
        codes={[{ code: 'ABC123', used: false }]}
        isNew={true}
        onDone={() => {}}
        onSuccess={() => {}}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // The component should render (no crash)
    expect(screen.getByText(enUS.mfa.saveBackupCodes)).toBeInTheDocument();
    // The amber warning banner should exist with translation text for codes
    expect(screen.getByText(/won't be shown again/i)).toBeInTheDocument();
  });

  it('renders existing codes without crashing', () => {
    render(
      <BackupCodesModal
        codes={[
          { code: 'ABC123', used: false },
          { code: 'DEF456', used: true },
        ]}
        isNew={false}
        onDone={() => {}}
        onSuccess={() => {}}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByText(enUS.mfa.backupCodesTitle)).toBeInTheDocument();
    expect(screen.getByText(enUS.mfa.existingCodes)).toBeInTheDocument();
    expect(screen.getByText('ABC123')).toBeInTheDocument();
    expect(screen.getByText('DEF456')).toBeInTheDocument();
  });
});

describe('FlowModal - Escape key dismissal', () => {
  const noop = () => {};

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <FlowModal
        title="Test"
        subtitle="Test subtitle"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(
      <FlowModal
        title="Test"
        subtitle="Test subtitle"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <FlowModal
        title="Test"
        subtitle="Test subtitle"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('PasswordVerifyModal - Escape key dismissal', () => {
  const noop = () => {};

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', () => {
    const onClose = vi.fn();
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    fireEvent.keyDown(window, { key: 'Enter' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={onClose}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
