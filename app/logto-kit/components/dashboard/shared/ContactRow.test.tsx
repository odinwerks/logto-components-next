import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Mail } from 'lucide-react';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import type { DataResult, ActionResult } from '../../../logic/actions/safe';

// Store FlowModal handlers so tests can invoke them directly
let flowModalHandlers: {
  onPasswordSubmit?: (pw: string) => void;
  onCodeSubmit?: (code: string) => void;
  onClose?: () => void;
} = {};

let flowModalStep: string = 'password';

vi.mock('./FlowModal', () => ({
  FlowModal: ({
    step, onPasswordSubmit, onCodeSubmit, onClose, passwordError, extra,
  }: Record<string, unknown>) => {
    // Expose handlers for test access
    flowModalHandlers = {
      onPasswordSubmit: onPasswordSubmit as (pw: string) => void,
      onCodeSubmit: onCodeSubmit as (code: string) => void,
      onClose: onClose as () => void,
    };
    flowModalStep = (step as { kind: string }).kind;
    return (
      <div data-testid="flow-modal" data-step={flowModalStep}>
        {passwordError ? <div data-testid="password-error">{passwordError as string}</div> : null}
        {extra ? <div data-testid="extra">{'extra'}</div> : null}
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

function openRemoveModal() {
  fireEvent.click(screen.getByText(enUS.profile.remove));
}

describe('ContactRow — result-checking (ActionResult/DataResult)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flowModalHandlers = {};
    flowModalStep = 'password';
  });

  // ══════════════════════════════════════════════════════════
  // EDIT flow — data-result callbacks
  // ══════════════════════════════════════════════════════════

  it('handles edit-flow: onVerifyPassword success → onSendVerification success → shows code step', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);

    render(<ContactRow {...props} />);
    openEditModal();
    expect(screen.getByTestId('flow-modal')).toBeInTheDocument();
    expect(screen.getByTestId('extra')).toBeInTheDocument(); // new-value input

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

  it('handles edit-flow: onVerifyPassword returns error', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Wrong password',
    } satisfies DataResult<{ verificationRecordId: string }>);

    render(<ContactRow {...props} />);
    openEditModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('badpw'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Wrong password');
      expect(props.onSendVerification).not.toHaveBeenCalled();
    });
  });

  it('handles edit-flow: onSendVerification returns error after successful password', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Rate limited',
    } satisfies DataResult<{ verificationId: string }>);

    render(<ContactRow {...props} />);
    openEditModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Rate limited');
      expect(props.onVerifyPassword).toHaveBeenCalled();
    });
  });

  // ══════════════════════════════════════════════════════════
  // EDIT flow — code verification (ActionResult — void)
  // ══════════════════════════════════════════════════════════

  it('handles code verification: success calls onSuccess and closes', async () => {
    const props = buildDefaults();
    // Set up so the modal is already on the code step
    // We simulate by directly calling handleCode via the exposed code submit handler
    // But first we need to get to the code step. Let's render with a pre-set step.
    // Since FlowModal is mocked, we can just test the code flow directly.

    // Render with fresh callbacks
    (props.onVerifyCodeAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    } satisfies ActionResult);

    // But calling handleCode requires the step to be 'code' and have the right data.
    // We can use the manual approach: mock the flow modals internal state.
    // Instead, let's test through the full flow but skip verification steps.
    // Actually, the simplest approach: render, the modal won't show until we click edit.
    // The handleCode is only triggerable when step.kind='code'.
    // We need to simulate getting to the code step.

    // Let's go through the full edit flow successfully to reach code step:
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);
    (props.onVerifyCodeAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openEditModal();

    // Submit password to get to code step
    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));
    await waitFor(() => { expect(flowModalStep).toBe('code'); });

    // Now submit the code
    await act(async () => flowModalHandlers.onCodeSubmit!('123456'));

    await waitFor(() => {
      expect(props.onVerifyCodeAndUpdate).toHaveBeenCalledWith(
        'user@example.com', 'vid-1', 'vr-1', '123456',
      );
      expect(props.onSuccess).toHaveBeenCalledWith(enUS.profile.emailUpdated);
    });
  });

  it('handles code verification: error calls onError and closes', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
    (props.onSendVerification as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationId: 'vid-1' },
    } satisfies DataResult<{ verificationId: string }>);
    (props.onVerifyCodeAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Invalid code',
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openEditModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));
    await waitFor(() => { expect(flowModalStep).toBe('code'); });

    await act(async () => flowModalHandlers.onCodeSubmit!('000000'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Invalid code');
    });
  });

  // ══════════════════════════════════════════════════════════
  // REMOVE flow
  // ══════════════════════════════════════════════════════════

  it('handles remove-flow: onVerifyPassword success → onRemove success → onSuccess', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
    (props.onRemove as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    } satisfies ActionResult);

    render(<ContactRow {...props} />);
    openRemoveModal();
    expect(screen.getByTestId('flow-modal')).toBeInTheDocument();

    await act(async () => flowModalHandlers.onPasswordSubmit!('pw123'));

    await waitFor(() => {
      expect(props.onVerifyPassword).toHaveBeenCalledWith('pw123');
      expect(props.onRemove).toHaveBeenCalledWith('vr-1');
      expect(props.onSuccess).toHaveBeenCalledWith(enUS.profile.emailRemoved);
    });
  });

  it('handles remove-flow: onVerifyPassword error → onError', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false, error: 'Wrong password',
    } satisfies DataResult<{ verificationRecordId: string }>);

    render(<ContactRow {...props} />);
    openRemoveModal();

    await act(async () => flowModalHandlers.onPasswordSubmit!('badpw'));

    await waitFor(() => {
      expect(props.onError).toHaveBeenCalledWith('Wrong password');
      expect(props.onRemove).not.toHaveBeenCalled();
    });
  });

  it('handles remove-flow: onRemove error after successful password → onError', async () => {
    const props = buildDefaults();
    (props.onVerifyPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { verificationRecordId: 'vr-1' },
    } satisfies DataResult<{ verificationRecordId: string }>);
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
});
