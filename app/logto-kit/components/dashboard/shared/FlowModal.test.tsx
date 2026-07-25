import React from 'react';
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
        step={{ kind: 'code', destination: 'user@example.com', verificationId: 'v1', identityVerificationId: 'iv1' }}
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
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // Uses mfa.scanQrCode instead of hardcoded "Scan this QR code..."
    const scanElements = screen.getAllByText(enUS.mfa.scanQrCode);
    expect(scanElements.length).toBeGreaterThanOrEqual(2);
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
        step={{ kind: 'new-password', verificationRecordId: 'vr1' }}
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

  it('exposes dialog semantics and labels icon-only controls', () => {
    render(
      <FlowModal
        title="Update password"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Update password' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
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
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1' }}
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
    expect(onTotpSubmit).toHaveBeenCalledWith('123456', 'SECRET123', 'iv1');
  });

  it('allows re-submission immediately when code changes (no 2-second dead zone)', () => {
    const onTotpSubmit = vi.fn();
    render(
      <FlowModal
        title="Setup TOTP"
        subtitle="Scan QR code"
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1' }}
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
    expect(onTotpSubmit).toHaveBeenLastCalledWith('654321', 'SECRET123', 'iv1');
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

  it('downloads backup codes with delayed URL revocation', async () => {
    vi.useFakeTimers();
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLMock = vi.fn();

    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;

    URL.createObjectURL = createObjectURLMock;
    URL.revokeObjectURL = revokeObjectURLMock;

    try {
      render(
        <BackupCodesModal
          codes={[{ code: 'ABC123', used: false }]}
          isNew={true}
          onDone={() => {}}
          onSuccess={() => {}}
          t={enUS}
          mode="dark"
          colors={DARK_COLORS}
        />
      );

      const txtButton = screen.getByRole('button', { name: /\.txt/i });
      fireEvent.click(txtButton);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLMock).not.toHaveBeenCalled();

      vi.advanceTimersByTime(150);

      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      vi.useRealTimers();
    }
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

  it('exposes dialog semantics and icon-button labels', () => {
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByRole('dialog', { name: 'Verify' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close dialog/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
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

describe('Password modal error interaction', () => {
  const noop = () => {};

  it('hides FlowModal inline password error after typing', () => {
    render(
      <FlowModal
        title="Verify"
        subtitle="Enter password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        passwordError="Wrong password"
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByText('Wrong password')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'n' },
    });

    expect(screen.queryByText('Wrong password')).not.toBeInTheDocument();
  });

  it('hides PasswordVerifyModal inline password error after typing', () => {
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        passwordError="Wrong password"
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    expect(screen.getByText('Wrong password')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder), {
      target: { value: 'n' },
    });

    expect(screen.queryByText('Wrong password')).not.toBeInTheDocument();
  });
});

describe('FlowModal - focus management', () => {
  const noop = () => {};

  it('traps keyboard focus within the FlowModal dialog', () => {
    render(
      <FlowModal
        title="Trap test"
        subtitle="Focus trap"
        step={{ kind: 'value' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const iconClose = screen.getByRole('button', { name: /close dialog/i });
    const footerClose = screen.getByRole('button', { name: enUS.common.close });
    const save = screen.getByRole('button', { name: enUS.profile.saveChanges });

    save.focus();
    expect(document.activeElement).toBe(save);

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(iconClose);

    iconClose.focus();
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(save);

    footerClose.focus();
    expect(document.activeElement).toBe(footerClose);
  });

  it('restores focus to the previously focused element when closed', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open flow</button>
          {open && (
            <FlowModal
              title="Restore"
              subtitle="Focus restoration"
              step={{ kind: 'value' }}
              onPasswordSubmit={noop}
              onClose={() => setOpen(false)}
              t={enUS}
              mode="dark"
              colors={DARK_COLORS}
            />
          )}
        </>
      );
    }

    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Open flow' });
    openButton.focus();
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Restore' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Restore' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });

  it('restores focus when BackupCodesModal closes with Escape', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open backup</button>
          {open && (
            <BackupCodesModal
              codes={[{ code: 'ABC123', used: false }]}
              isNew
              onDone={() => setOpen(false)}
              onSuccess={noop}
              t={enUS}
              mode="dark"
              colors={DARK_COLORS}
            />
          )}
        </>
      );
    }

    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Open backup' });
    openButton.focus();
    fireEvent.click(openButton);

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });

  // BUG-030: Focus restoration with steps that previously had autoFocus.
  // Before the fix, autoFocus fired during React's commit phase (mutation),
  // stealing focus from the trigger before the passive useEffect could capture
  // document.activeElement. After removing autoFocus and capturing during render,
  // these steps must restore focus to the trigger on close.
  it('BUG-030: restores focus on close for password step (was autoFocus)', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open password</button>
          {open && (
            <FlowModal
              title="Verify"
              subtitle="Enter password"
              step={{ kind: 'password' }}
              onPasswordSubmit={noop}
              onClose={() => setOpen(false)}
              t={enUS}
              mode="dark"
              colors={DARK_COLORS}
            />
          )}
        </>
      );
    }

    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Open password' });
    openButton.focus();
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Verify' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Verify' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });

  it('BUG-030: restores focus on close for code step (was autoFocus)', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open code</button>
          {open && (
            <FlowModal
              title="Verify code"
              subtitle="Enter code"
              step={{ kind: 'code', destination: 'user@example.com', verificationId: 'v1', identityVerificationId: 'iv1' }}
              onPasswordSubmit={noop}
              onClose={() => setOpen(false)}
              t={enUS}
              mode="dark"
              colors={DARK_COLORS}
            />
          )}
        </>
      );
    }

    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Open code' });
    openButton.focus();
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Verify code' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Verify code' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });

  it('BUG-030: PasswordVerifyModal restores focus on close (was autoFocus)', () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open verify</button>
          {open && (
            <PasswordVerifyModal
              title="Verify"
              subtitle="Enter your password"
              step={{ kind: 'password' }}
              onPasswordSubmit={noop}
              onClose={() => setOpen(false)}
              t={enUS}
              mode="dark"
              colors={DARK_COLORS}
            />
          )}
        </>
      );
    }

    render(<Harness />);

    const openButton = screen.getByRole('button', { name: 'Open verify' });
    openButton.focus();
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Verify' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Verify' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
  });
});

// BUG-031: Overlay must allow scrolling when dialog content is taller than
// the viewport (e.g. short/landscape viewports with TOTP/MFA modals).
// Fix: Overlay gets overflowY:'auto' + alignItems:'flex-start';
// dialog gets maxHeight:'100%'.
describe('FlowModal - BUG-031 overlay scroll and maxHeight', () => {
  const noop = () => {};

  it('Overlay has overflowY auto and alignItems flex-start', () => {
    render(
      <FlowModal
        title="Test"
        subtitle="Test subtitle"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    // The Overlay is the outermost motion.div with position:fixed
    const overlay = document.querySelector('[style*="position: fixed"]') as HTMLElement;
    expect(overlay).toBeInTheDocument();
    expect(overlay.style.overflowY).toBe('auto');
    expect(overlay.style.alignItems).toBe('center');
  });

  it('dialog container has maxHeight 100%', () => {
    render(
      <FlowModal
        title="Test"
        subtitle="Test subtitle"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Test' });
    expect(dialog.style.maxHeight).toBe('100%');
  });

  it('BackupCodesModal dialog has maxHeight 100%', () => {
    render(
      <BackupCodesModal
        codes={[{ code: 'ABC123', used: false }]}
        isNew
        onDone={noop}
        onSuccess={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.style.maxHeight).toBe('100%');
  });

  it('PasswordVerifyModal dialog has maxHeight 100%', () => {
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
      />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Verify' });
    expect(dialog.style.maxHeight).toBe('100%');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Loading state: BouncingDots render inside the triggering button instead of
// a separate modal loading stage. The button text disappears, white dots
// appear inside the same button, the button retains its width and is disabled,
// and inputs are disabled while loading.
// ─────────────────────────────────────────────────────────────────────────────
describe('FlowModal - loading state (in-button BouncingDots)', () => {
  const noop = () => {};

  /** Find the submit button that currently contains the BouncingDots status. */
  function getLoadingButton(): HTMLElement {
    const status = screen.getByRole('status');
    return status.closest('button') as HTMLElement;
  }

  it('PasswordVerifyModal: replaces verify button text with white BouncingDots and disables input when loading', () => {
    render(
      <PasswordVerifyModal
        title="Verify"
        subtitle="Enter your password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    // The verify button text is gone — replaced by dots.
    expect(screen.queryByRole('button', { name: enUS.verification.verifyPassword })).not.toBeInTheDocument();

    // BouncingDots (role=status) render inside the button.
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    const btn = status.closest('button') as HTMLElement;
    expect(btn).toBeDisabled();

    // Dots are white.
    const dots = status.querySelectorAll('span');
    expect(dots.length).toBe(3);
    expect(dots[0]).toHaveStyle({ background: 'rgb(255, 255, 255)' });

    // Password input is disabled.
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeDisabled();
  });

  it('FlowModal password step: shows dots in verify button, disables input, retains min-width', () => {
    render(
      <FlowModal
        title="Verify"
        subtitle="Enter password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    expect(screen.queryByRole('button', { name: enUS.verification.verifyPassword })).not.toBeInTheDocument();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '8rem' });
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeDisabled();
  });

  it('FlowModal value step: shows dots in save button and retains min-width', () => {
    render(
      <FlowModal
        title="Update email"
        subtitle="Step 1"
        step={{ kind: 'value' }}
        onPasswordSubmit={noop}
        onValueSubmit={noop}
        onClose={noop}
        extra={<div>VALUE FORM</div>}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    // Value form (modal body) stays visible — no separate loading stage.
    expect(screen.getByText('VALUE FORM')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: enUS.profile.saveChanges })).not.toBeInTheDocument();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '6.5rem' });
  });

  it('FlowModal code step: shows dots in verify button and disables code input', () => {
    render(
      <FlowModal
        title="Verify"
        subtitle="Code verification"
        step={{ kind: 'code', destination: 'user@example.com', verificationId: 'v1', identityVerificationId: 'iv1' }}
        onPasswordSubmit={noop}
        onCodeSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    const codeInput = screen.getByPlaceholderText('000000');
    expect(codeInput).toBeDisabled();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '5.5rem' });
  });

  it('FlowModal totp-scan step: shows dots in activate button and disables totp input', () => {
    render(
      <FlowModal
        title="Setup TOTP"
        subtitle="Scan QR code"
        step={{ kind: 'totp-scan', secret: 'SECRET123', totpUri: 'otpauth://totp/test?secret=TEST', identityVerificationId: 'iv1' }}
        onPasswordSubmit={noop}
        onTotpSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    expect(screen.getByPlaceholderText('000000')).toBeDisabled();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '7rem' });
  });

  it('FlowModal new-password step: shows dots in change-password button and disables input', () => {
    render(
      <FlowModal
        title="Change password"
        subtitle="Enter new password"
        step={{ kind: 'new-password', verificationRecordId: 'vr1' }}
        onPasswordSubmit={noop}
        onNewPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    expect(screen.getByPlaceholderText(enUS.security.enterNewPassword)).toBeDisabled();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '7.5rem' });
  });

  it('FlowModal rename-passkey step: shows dots in rename button and disables input', () => {
    render(
      <FlowModal
        title="Rename passkey"
        subtitle="Enter new name"
        step={{ kind: 'rename-passkey', verificationRecordId: 'vr1', passkeyId: 'pk1' }}
        onPasswordSubmit={noop}
        onRenamePasskeySubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    // The rename input is labelled by t.mfa.newPasskeyName (Lbl → htmlFor).
    expect(screen.getByLabelText(enUS.mfa.newPasskeyName)).toBeDisabled();
    const btn = getLoadingButton();
    expect(btn).toBeDisabled();
    expect(btn).toHaveStyle({ minWidth: '6rem' });
  });

  it('does not render a separate centered loading stage — modal body content remains visible', () => {
    render(
      <FlowModal
        title="Verify"
        subtitle="Enter password"
        step={{ kind: 'password' }}
        onPasswordSubmit={noop}
        onClose={noop}
        t={enUS}
        mode="dark"
        colors={DARK_COLORS}
        loading
      />,
    );

    // The password input (modal body) is still present, just disabled —
    // it is NOT replaced by a centered BouncingDots + message div.
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
  });
});
