import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mail } from 'lucide-react';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import type { DataResult, ActionResult } from '../../../logic/actions/safe';

// Store FlowModal handlers so tests can invoke them directly
let flowModalHandlers: {
  onValueSubmit?: () => void;
  onPasswordSubmit?: (pw: string) => void;
  onCodeSubmit?: (code: string) => void;
  onClose?: () => void;
} = {};

let flowModalStep: string = 'password';
let flowModalValueSubmitDisabled: boolean | undefined;

vi.mock('./FlowModal', () => ({
  FlowModal: ({
    step, onValueSubmit, onPasswordSubmit, onCodeSubmit, onClose, passwordError, extra, headerExtra, valueSubmitDisabled,
  }: Record<string, unknown>) => {
    // Expose handlers for test access
    flowModalHandlers = {
      onValueSubmit: onValueSubmit as () => void,
      onPasswordSubmit: onPasswordSubmit as (pw: string) => void,
      onCodeSubmit: onCodeSubmit as (code: string) => void,
      onClose: onClose as () => void,
    };
    flowModalStep = (step as { kind: string }).kind;
    flowModalValueSubmitDisabled = valueSubmitDisabled as boolean | undefined;
    return (
      <div data-testid="flow-modal" data-step={flowModalStep}>
        {passwordError ? <div data-testid="password-error">{passwordError as string}</div> : null}
        {extra ? <div data-testid="extra">{extra as React.ReactNode}</div> : null}
        {headerExtra ? <div data-testid="header-extra">{headerExtra as React.ReactNode}</div> : null}
      </div>
    );
  },
  Overlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ContactRow } from './ContactRow';
import type { ContactRowProps } from './ContactRow';

const noop = vi.fn();
const buildDefaults = () => ({
  label: 'Email',
  Icon: Mail,
  currentValue: 'user@example.com',
  type: 'email' as const,
  placeholder: 'you@example.com',
  onVerifyPassword: vi.fn() as ContactRowProps['onVerifyPassword'],
  onSendVerification: vi.fn() as ContactRowProps['onSendVerification'],
  onVerifyCodeAndUpdate: vi.fn() as ContactRowProps['onVerifyCodeAndUpdate'],
  onRemove: vi.fn() as ContactRowProps['onRemove'],
  onSuccess: vi.fn(),
  onError: vi.fn(),
  t: enUS,
  mode: 'dark' as const,
  colors: DARK_COLORS,
});

// ── Helpers ──
function openEditModal() {
  fireEvent.click(screen.getByText(enUS.profile.edit));
}

function openAddModal() {
  fireEvent.click(screen.getByText(enUS.profile.add));
}

function openRemoveModal() {
  openEditModal();
  fireEvent.click(screen.getByText(enUS.profile.deleteHint));
}

describe('ContactRow - result-checking (ActionResult/DataResult)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flowModalHandlers = {};
    flowModalStep = 'password';
    flowModalValueSubmitDisabled = undefined;
  });

  // ══════════════════════════════════════════════════════════
  // EDIT Flow - data-result callbacks
  // ══════════════════════════════════════════════════════════

  it('handles edit-flow: onVerifyPassword success → onSendVerification success → shows code step', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);

    render(<ContactRow {...props} />);
    openEditModal();
    expect(screen.getByTestId('flow-modal')).toBeInTheDocument();
    expect(screen.getByTestId('extra')).toBeInTheDocument(); // value-entry input
    expect(flowModalStep).toBe('value');

    await act(async () => flowModalHandlers.onValueSubmit!());
    expect(flowModalStep).toBe('password');

    // Submit password (triggers handlePassword)
    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    // Should have called onVerifyPassword and onSendVerification
    await waitFor(() => {
      expect(props.onVerifyPassword).toHaveBeenCalledWith('pw123');
      expect(props.onSendVerification).toHaveBeenCalledWith('user@example.com');
      // onSuccess should have been called with "code sent" message
      expect(props.onSuccess).toHaveBeenCalled();
      // Step should have advanced to 'code'
      expect(flowModalStep).toBe('code');
    });
  });

  it('handles edit-flow: onVerifyPassword returns error → shows password error', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Wrong password',
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);

    render(<ContactRow {...props} />);
    openEditModal();
    await act(async () => flowModalHandlers.onValueSubmit!());

    await act(async () => flowModalHandlers.onPasswordSubmit!('badpw'));

    await waitFor(() => {
      // Password errors are shown via pwErr state (FlowModal passwordError prop),
      // NOT via onError callback - onError is only for send/verify/remove errors.
      expect(screen.getByTestId('password-error')).toHaveTextContent('Wrong password');
      expect(props.onSendVerification).not.toHaveBeenCalled();
      expect(flowModalStep).toBe('password');
    });
  });

  it('handles edit-flow: onSendVerification returns error after successful password', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Rate limited',
    } satisfies DataResult<{ verificationId: string }>);

    render(<ContactRow {...props} />);
    openEditModal();
    await act(async () => flowModalHandlers.onValueSubmit!());

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Rate limited');
      expect(props.onVerifyPassword).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════
  // EDIT Flow - code verification (ActionResult - void)
  // ══════════════════════════════════════════════════════════

  it('handles code verification: success calls onSuccess and closes', async () => {
    const props = buildDefaults();

    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);
    (props.onVerifyCodeAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openEditModal();
    await act(async () => flowModalHandlers.onValueSubmit!());

    // Submit password to get to code step
    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));
    await waitFor(() => { expect(flowModalStep).toBe('code'); });

    // Now submit the code
    await act(async () => flowModalHandlers.onCodeSubmit!('123456'));

    await waitFor(() => {
      expect(props.onVerifyCodeAndUpdate).toHaveBeenCalledWith(
        'user@example.com', 'vid-1', 'vr-1', '123456', expect.any(Number),
      );
      expect(props.onSuccess).toHaveBeenCalledWith(enUS.profile.emailUpdated);
    });
  });

  it('handles code verification: error calls onError and closes', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);
    (props.onVerifyCodeAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Invalid code',
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openEditModal();
    await act(async () => flowModalHandlers.onValueSubmit!());

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));
    await waitFor(() => { expect(flowModalStep).toBe('code'); });

    await act(async () => flowModalHandlers.onCodeSubmit!('000000'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Invalid code');
    });
  });

  // ══════════════════════════════════════════════════════════
  // REMOVE Flow
  // ══════════════════════════════════════════════════════════

  it('handles remove-flow: onVerifyPassword success → onRemove success → onSuccess', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onRemove as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openRemoveModal();
    expect(screen.getByTestId('flow-modal')).toBeInTheDocument();

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    await waitFor(() => {
      expect(props.onVerifyPassword).toHaveBeenCalledWith('pw123');
      expect(props.onRemove).toHaveBeenCalledWith('vr-1', expect.any(Number));
      expect(props.onSuccess).toHaveBeenCalledWith(enUS.profile.emailRemoved);
    });
  });

  it('handles remove-flow: onVerifyPassword error → shows password error', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Wrong password',
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);

    render(<ContactRow {...props} />);
    openRemoveModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('badpw'));

    await waitFor(() => {
      // Password errors are shown via pwErr state (FlowModal passwordError prop),
      // NOT via onError callback - onError is only for send/verify/remove errors.
      expect(screen.getByTestId('password-error')).toHaveTextContent('Wrong password');
      expect(props.onRemove).not.toHaveBeenCalled();
      expect(flowModalStep).toBe('password');
    });
  });

  it('handles remove-flow: onRemove error after successful password → onError', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1', verificationTimestamp: Date.now() + 600000 },
    } satisfies DataResult<{ verificationRecordId: string; verificationTimestamp: number }>);
    (props.onRemove as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Cannot remove last email',
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openRemoveModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Cannot remove last email');
      expect(props.onVerifyPassword).toHaveBeenCalled();
    });
  });

  it('renders PhoneCountrySelect and tel input when type is phone and currentValue is not set', async () => {
    const props = buildDefaults() as unknown as ContactRowProps;
    props.type = 'phone';
    props.currentValue = undefined;
    props.label = 'Phone';
    props.placeholder = 'Enter phone number';

    render(<ContactRow {...props} />);
    openAddModal();

    expect(flowModalStep).toBe('value');

    // The tel input should be rendered
    const telInput = screen.getByPlaceholderText('Enter phone number');
    expect(telInput).toBeInTheDocument();
    expect(telInput).toHaveAttribute('type', 'tel');

    // PhoneCountrySelect button has text content including "+995"
    const countryButton = screen.getByRole('button', { name: /995/ });
    expect(countryButton).toBeInTheDocument();
  });

  it('keeps add-phone flow on value step when local phone digits are cleared', async () => {
    const props = buildDefaults() as unknown as ContactRowProps;
    props.type = 'phone';
    props.currentValue = undefined;
    props.label = 'Phone';
    props.placeholder = 'Enter phone number';

    render(<ContactRow {...props} />);
    openAddModal();

    expect(flowModalStep).toBe('value');

    const telInput = screen.getByPlaceholderText('Enter phone number');
    fireEvent.change(telInput, { target: { value: '5551234' } });
    fireEvent.change(telInput, { target: { value: '' } });

    await waitFor(() => {
      expect(flowModalValueSubmitDisabled).toBe(true);
    });

    await act(async () => flowModalHandlers.onValueSubmit!());

    expect(flowModalStep).toBe('value');
    expect(screen.getByTestId('password-error')).toHaveTextContent(enUS.security.enterValueFirst);
  });

  it('continues add-phone flow when local phone digits are provided', async () => {
    const props = buildDefaults() as unknown as ContactRowProps;
    props.type = 'phone';
    props.currentValue = undefined;
    props.label = 'Phone';
    props.placeholder = 'Enter phone number';

    render(<ContactRow {...props} />);
    openAddModal();

    fireEvent.change(screen.getByPlaceholderText('Enter phone number'), { target: { value: '5551234' } });

    await act(async () => flowModalHandlers.onValueSubmit!());

    expect(flowModalStep).toBe('password');
  });
});
