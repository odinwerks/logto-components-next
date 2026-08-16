import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import type { UserData, PatToken, VerificationPurpose } from '../../../logic/types';
import type { ActionResult, DataResult } from '../../../logic/actions/safe';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';

import { DevTab } from './dev';
import { AUTO_VERIFY_TABS, resolveAutoVerifyFallbackTab } from '../tab-utils';

// ── Stubs ────────────────────────────────────────────────────
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

const existingTokens: PatToken[] = [
  { name: 'ci-token', createdAt: 1_700_000_000_000, expiresAt: null },
  { name: 'legacy', createdAt: 1_600_000_000_000, expiresAt: 1_700_000_000_000 },
];

const freshVerify = () => ({
  ok: true as const,
  data: { verificationRecordId: 'vid-fresh', verificationTimestamp: Date.now() + 10 * 60 * 1000 },
});

const createdValue = () => ({
  token: { name: 'new-token', createdAt: Date.now(), expiresAt: null },
  value: 'pat_new_generated_value',
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface RenderDevOptions {
  onGetPatTokens?: (verificationRecordId: string) => Promise<DataResult<PatToken[]>>;
  onCreatePatToken?: (name: string, expiresAt: number | null, verificationRecordId: string) => Promise<DataResult<{ token: PatToken; value: string }>>;
  onRenamePatToken?: (currentName: string, name: string, verificationRecordId: string) => Promise<ActionResult>;
  onDeletePatToken?: (name: string, verificationRecordId: string) => Promise<ActionResult>;
  onVerifyPassword?: (password: string, purpose?: VerificationPurpose) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
  onVerificationDismissed?: () => void;
  isActive?: boolean;
  mobmode?: number;
}

type CreatePatFn = (name: string, expiresAt: number | null, verificationRecordId: string) => Promise<DataResult<{ token: PatToken; value: string }>>;
type RenamePatFn = (currentName: string, name: string, verificationRecordId: string) => Promise<ActionResult>;
type DeletePatFn = (name: string, verificationRecordId: string) => Promise<ActionResult>;
type VerifyPasswordFn = (password: string, purpose?: VerificationPurpose) => Promise<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>;
type GetPatsFn = (verificationRecordId: string) => Promise<DataResult<PatToken[]>>;

function renderDevTab({
  onGetPatTokens,
  onCreatePatToken,
  onRenamePatToken,
  onDeletePatToken,
  onVerifyPassword,
  onVerificationDismissed,
  isActive = true,
  mobmode,
}: RenderDevOptions = {}) {
  const getTokensFn = (onGetPatTokens ??
    vi.fn<GetPatsFn>().mockResolvedValue({
      ok: true,
      data: existingTokens,
    })) as GetPatsFn;

  const createFn = (onCreatePatToken ??
    vi.fn<CreatePatFn>().mockResolvedValue({
      ok: true,
      data: createdValue(),
    })) as CreatePatFn;

  const renameFn = (onRenamePatToken ??
    vi.fn<RenamePatFn>().mockResolvedValue({ ok: true })) as RenamePatFn;

  const deleteFn = (onDeletePatToken ??
    vi.fn<DeletePatFn>().mockResolvedValue({ ok: true })) as DeletePatFn;

  const verifyFn = (onVerifyPassword ??
    vi.fn<VerifyPasswordFn>().mockResolvedValue(freshVerify())) as VerifyPasswordFn;

  const onSuccess = vi.fn();
  const onError = vi.fn();

  const buildElement = (active: boolean) => (
    <DevTab
      userData={defaultUserData}
      mode="dark"
      colors={DARK_COLORS}
      t={enUS}
      mobmode={mobmode}
      isActive={active}
      onGetPatTokens={getTokensFn}
      onCreatePatToken={createFn}
      onRenamePatToken={renameFn}
      onDeletePatToken={deleteFn}
      onVerifyPassword={verifyFn}
      onSuccess={onSuccess}
      onError={onError}
      onVerificationDismissed={onVerificationDismissed}
    />
  );

  const result = render(buildElement(isActive));
  const rerenderWith = (active: boolean) => result.rerender(buildElement(active));

  return { ...result, rerenderWith, getTokensFn, createFn, renameFn, deleteFn, verifyFn, onSuccess, onError };
}

async function submitPassword(password = 'test-password') {
  await waitFor(() => {
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
  });
  const passwordInput = screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder);
  fireEvent.change(passwordInput, { target: { value: password } });
  const submitBtn = screen.getByRole('button', { name: enUS.verification.verifyPassword });
  await act(async () => { fireEvent.click(submitBtn); });
}

const verifyAndLoad = () => submitPassword();
const submitPasswordAgain = () => submitPassword();

/** Closes the PasswordVerifyModal via its header close button. */
const closePasswordModal = () => {
  const closeButtons = screen.getAllByRole('button', { name: 'Close dialog' });
  fireEvent.click(closeButtons[closeButtons.length - 1]);
};

/** Opens the create modal, fills `name`, and submits it (stages the mutation). */
async function stageCreate(name: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(enUS.dev.createToken) }));
  const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
  fireEvent.change(within(dialog).getByPlaceholderText(enUS.dev.namePlaceholder), { target: { value: name } });
  await act(async () => {
    fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.createToken }));
  });
}

describe('DevTab (personal access tokens)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Scenario 1: inactive tab ─────────────────────────────────────────────
  it('shows the skeleton without auto-opening the password modal when inactive', () => {
    renderDevTab({ isActive: false });

    expect(screen.getByText(enUS.dev.description)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // ── Scenario 2: view verification loads the list ────────────────────────
  it('auto-opens the password modal when active and unverified, then loads tokens with purpose=view', async () => {
    const { getTokensFn, verifyFn } = renderDevTab({ isActive: true });

    await verifyAndLoad();

    await waitFor(() => {
      expect(screen.getByText('ci-token')).toBeInTheDocument();
    });
    expect(screen.getByText('legacy')).toBeInTheDocument();
    expect(screen.getByText(enUS.dev.neverExpires)).toBeInTheDocument();
    expect(verifyFn).toHaveBeenCalledWith('test-password', 'view');
    expect(getTokensFn).toHaveBeenCalledWith('vid-fresh');
  });

  it('renders desktop toolbar and card actions as stock text-only buttons with Card/IconBox structure', async () => {
    const { container } = renderDevTab();
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    const createButton = screen.getByRole('button', { name: enUS.dev.createToken });
    const refreshButton = screen.getByRole('button', { name: enUS.dev.refreshData });
    const renameButton = screen.getAllByRole('button', { name: enUS.dev.rename })[0];
    const deleteButton = screen.getAllByRole('button', { name: enUS.dev.delete })[0];
    for (const button of [createButton, refreshButton, renameButton, deleteButton]) {
      expect(button).toHaveClass('ldd-btn');
      expect(button).toHaveStyle({ padding: '0.3125rem 0.8125rem' });
      expect(button.querySelector('svg')).toBeNull();
    }

    const keyIcons = container.querySelectorAll('svg.lucide-key-round');
    expect(keyIcons).toHaveLength(existingTokens.length);
    const iconBox = keyIcons[0].parentElement;
    expect(iconBox).toHaveStyle({ width: '2rem', height: '2rem' });
    const card = iconBox?.parentElement?.parentElement;
    expect(card).toHaveStyle({ marginBottom: '0px', overflow: 'hidden' });
    const tokenName = screen.getByText('ci-token');
    expect(tokenName).toHaveStyle({ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
    expect(screen.getAllByText(new RegExp(`^${enUS.dev.created}:`)).length).toBeGreaterThan(0);
  });

  it('keeps mobile toolbar and card actions compact, icon-only, and fully labelled', async () => {
    renderDevTab({ mobmode: 1 });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    const controls = [
      screen.getByRole('button', { name: enUS.dev.createToken }),
      screen.getByRole('button', { name: enUS.dev.refreshData }),
      screen.getByRole('button', { name: `${enUS.dev.rename} ci-token` }),
      screen.getByRole('button', { name: `${enUS.dev.delete} ci-token` }),
    ];
    for (const button of controls) {
      expect(button).toHaveAttribute('title', button.getAttribute('aria-label'));
      expect(button).toHaveStyle({ width: '2rem', height: '2rem' });
      expect(button.textContent).toBe('');
      expect(button.querySelector('svg')).not.toBeNull();
    }
  });

  it('uses primary verification styling for view and create password checks, titled per action', async () => {
    renderDevTab();
    const viewDialog = await screen.findByRole('dialog', { name: enUS.dev.verifyToView });
    expect(within(viewDialog).getByText(enUS.dev.verifyToViewDesc)).toBeInTheDocument();
    expect(within(viewDialog).getByRole('button', { name: enUS.verification.verifyPassword })).toHaveClass('ldd-btn-primary');

    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());
    await stageCreate('primary-action');

    // The create form hands off (closes) and the password prompt takes the
    // action's title; only one dialog is mounted at a time.
    await waitFor(() => expect(screen.queryByPlaceholderText(enUS.dev.namePlaceholder)).toBeNull());
    const actionDialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    expect(within(actionDialog).getByText(enUS.dev.verifyToActionDesc)).toBeInTheDocument();
    const verifyButton = within(actionDialog).getByRole('button', { name: enUS.verification.verifyPassword });
    expect(verifyButton).toHaveClass('ldd-btn-primary');
    expect(verifyButton).not.toHaveClass('ldd-btn-danger');
  });

  it('opens the delete password check directly as a red danger modal (no confirmation step)', async () => {
    const { deleteFn } = renderDevTab();
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: enUS.dev.delete })[0]);

    // No intermediate confirm dialog: the danger password challenge opens
    // immediately, titled like the Sessions revoke modal and naming the token.
    const verifyDialog = await screen.findByRole('dialog', { name: enUS.dev.deleteTitle });
    expect(within(verifyDialog).getByText(enUS.dev.deleteDesc.replace('{name}', 'ci-token'))).toBeInTheDocument();
    const verifyButton = within(verifyDialog).getByRole('button', { name: enUS.verification.verifyPassword });
    expect(verifyButton).toHaveClass('ldd-btn-danger');
    expect(verifyButton).not.toHaveClass('ldd-btn-primary');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);

    await submitPassword();
    await waitFor(() => expect(deleteFn).toHaveBeenCalledWith('ci-token', 'vid-fresh'));
  });

  it('uses the shared dialog shell for create and restores focus after Escape', async () => {
    renderDevTab();
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    const createButton = screen.getByRole('button', { name: enUS.dev.createToken });
    createButton.focus();
    fireEvent.click(createButton);
    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByText(enUS.dev.createDesc)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog', { name: enUS.dev.createToken })).toBeNull());
    expect(createButton).toHaveFocus();
  });

  // ── Scenario 3: fresh, purpose-scoped password before create ────────────
  it('requires a FRESH password verification (pat.create) before creating a PAT; the form hands off without stacking', async () => {
    const { createFn, verifyFn, getTokensFn } = renderDevTab({ isActive: true });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    // Open the create modal and submit a name + expiry.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(enUS.dev.createToken) }));

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    const nameInput = within(dialog).getByPlaceholderText(enUS.dev.namePlaceholder);
    fireEvent.change(nameInput, { target: { value: 'my-new-token' } });
    fireEvent.click(within(dialog).getByRole('radio', { name: enUS.dev.expiry30Days }));
    fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.createToken }));

    // Single-modal flow: the create form CLOSES (no stacked overlay) and the
    // password prompt takes the action title. Creation must NEVER reuse the
    // view-purpose record.
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(enUS.dev.namePlaceholder)).toBeNull();
    });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(createFn).not.toHaveBeenCalled();
    expect(verifyFn).toHaveBeenCalledTimes(1); // still only the view verification

    await submitPasswordAgain();

    await waitFor(() => {
      expect(createFn).toHaveBeenCalledTimes(1);
    });
    const [name, expiresAt, vid] = vi.mocked(createFn).mock.calls[0];
    expect(name).toBe('my-new-token');
    expect(typeof expiresAt).toBe('number');
    expect(expiresAt).toBeGreaterThan(Date.now() - 60_000);
    expect(vid).toBe('vid-fresh');
    // The verify function was called a SECOND time, purpose-scoped to create.
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.create');

    // The one-time value modal shows the token value exactly once; the create
    // modal handed off at staging and never reopens on success.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: enUS.dev.createToken })).toBeNull();
    });
    expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    const resultDialog = screen.getByRole('dialog', { name: enUS.dev.valueTitle });
    expect(within(resultDialog).queryByText('new-token')).toBeNull();
    expect(resultDialog).not.toHaveAttribute('aria-describedby');
    // List refreshes afterwards.
    await waitFor(() => {
      expect(getTokensFn).toHaveBeenCalledTimes(2);
    });
    expect(verifyFn).toHaveBeenCalledTimes(2);
    expect(createFn).toHaveBeenCalledTimes(1);
  });

  // ── Scenario 4: failed mutation-verification keeps the staged create ────
  it('keeps the pending create when the fresh password check fails and retries on resubmit', async () => {
    const verifyFn = vi.fn<VerifyPasswordFn>()
      .mockResolvedValueOnce(freshVerify())
      .mockResolvedValueOnce({ ok: false, error: 'VERIFICATION_FAILED' })
      .mockResolvedValue(freshVerify());
    const { createFn } = renderDevTab({ isActive: true, onVerifyPassword: verifyFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('retry-token');

    await submitPasswordAgain(); // fails with VERIFICATION_FAILED
    await waitFor(() => {
      expect(screen.getByText(enUS.errors.VERIFICATION_FAILED)).toBeInTheDocument();
    });
    expect(createFn).not.toHaveBeenCalled();

    await submitPasswordAgain(); // retry succeeds
    await waitFor(() => {
      expect(createFn).toHaveBeenCalledTimes(1);
    });
    expect(vi.mocked(createFn).mock.calls[0][0]).toBe('retry-token');
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.create');
    expect(verifyFn).toHaveBeenNthCalledWith(3, 'test-password', 'pat.create');
  });

  // ── Scenario 5: fresh password before delete ────────────────────────────
  it('requires a FRESH password verification (pat.delete) before deleting a PAT', async () => {
    const { deleteFn, verifyFn, getTokensFn } = renderDevTab({ isActive: true });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.delete}$`) })[0]);

    // The delete button opens the danger password challenge directly — no
    // intermediate confirmation dialog.
    const verifyDialog = await screen.findByRole('dialog', { name: enUS.dev.deleteTitle });
    expect(within(verifyDialog).getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    expect(deleteFn).not.toHaveBeenCalled();

    await submitPasswordAgain();

    await waitFor(() => {
      expect(deleteFn).toHaveBeenCalledWith('ci-token', 'vid-fresh');
    });
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.delete');
    await waitFor(() => expect(getTokensFn).toHaveBeenCalledTimes(2));
    expect(verifyFn).toHaveBeenCalledTimes(2);
    expect(deleteFn).toHaveBeenCalledTimes(1);
  });

  // ── Scenario 6: fresh password before rename ────────────────────────────
  it('requires a FRESH password verification (pat.rename) before renaming a PAT', async () => {
    const { renameFn, verifyFn, getTokensFn } = renderDevTab({ isActive: true });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) })[0]);

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    fireEvent.change(within(dialog).getByDisplayValue('ci-token'), { target: { value: 'renamed-token' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.save }));
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    expect(renameFn).not.toHaveBeenCalled();

    await submitPasswordAgain();

    await waitFor(() => {
      expect(renameFn).toHaveBeenCalledWith('ci-token', 'renamed-token', 'vid-fresh');
    });
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.rename');
    await waitFor(() => expect(getTokensFn).toHaveBeenCalledTimes(2));
    expect(verifyFn).toHaveBeenCalledTimes(2);
    expect(renameFn).toHaveBeenCalledTimes(1);
  });

  // ── Scenario 7: empty state ─────────────────────────────────────────────
  it('shows the empty state when the user has no tokens', async () => {
    const emptyGet = vi.fn<GetPatsFn>().mockResolvedValue({ ok: true, data: [] });
    renderDevTab({ isActive: true, onGetPatTokens: emptyGet });
    await verifyAndLoad();

    await waitFor(() => {
      expect(screen.getByText(enUS.dev.noTokens)).toBeInTheDocument();
    });
  });

  it('renders a literal token-only result with one full value, copy, and close controls', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderDevTab();
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());
    await stageCreate('result-only');
    await submitPasswordAgain();

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.valueTitle });
    expect(within(dialog).getAllByText('pat_new_generated_value')).toHaveLength(1);
    expect(dialog).not.toHaveAttribute('aria-describedby');
    const copyButton = within(dialog).getByRole('button', { name: enUS.common.copy });
    expect(copyButton).toHaveAttribute('title', enUS.common.copy);
    fireEvent.click(copyButton);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('pat_new_generated_value'));
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toBeInTheDocument();
    // No footer buttons: the header X (plus Escape/backdrop) is the only way out.
    expect(within(dialog).queryByRole('button', { name: enUS.common.close })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: enUS.profile.saveChanges })).toBeNull();

    for (const forbidden of [
      'new-token',
      'Make sure to copy your token now.',
      'Use the token',
      '<your-logto-endpoint>',
      '<your-app-id>',
      'subject_token=',
    ]) {
      expect(within(dialog).queryByText(new RegExp(forbidden, 'i'))).toBeNull();
    }
    expect(within(dialog).queryByText(new RegExp(`^${enUS.dev.created}:`))).toBeNull();
    expect(within(dialog).queryByText(new RegExp(`^${enUS.dev.expires}:`))).toBeNull();
    expect(within(dialog).queryByText(enUS.dev.neverExpires)).toBeNull();
  });

  // ── Scenario 8: one-time value survives a rejected list refresh ─────────
  it('shows the value modal over the loading skeleton after create success and keeps it after a rejected list refresh', async () => {
    let rejectRefresh!: (reason: unknown) => void;
    const pendingRefresh = new Promise<DataResult<PatToken[]>>((_, reject) => {
      rejectRefresh = reject;
    });
    const getTokensFn = vi.fn<GetPatsFn>()
      .mockResolvedValueOnce({ ok: true, data: existingTokens })
      .mockImplementationOnce(() => pendingRefresh);

    const { onError } = renderDevTab({ isActive: true, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('refresh-fail-token');
    await submitPasswordAgain();

    // Value modal appears while the refresh is still pending (loading skeleton).
    await waitFor(() => {
      expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog', { name: enUS.dev.valueTitle })).not.toHaveAttribute('aria-describedby');
    // Skeleton branch: the toolbar create button is absent while loading.
    expect(screen.queryByRole('button', { name: new RegExp(enUS.dev.createToken) })).toBeNull();

    // The refresh rejects — generic mapped error, but the value modal SURVIVES.
    await act(async () => {
      rejectRefresh(new Error('network down'));
    });
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(enUS.errors.FETCH_FAILED);
    });
    expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    // List settles back to the loaded branch with the stale (still-valid) data.
    await waitFor(() => {
      expect(screen.getByText('ci-token')).toBeInTheDocument();
    });
  });

  // ── Scenario 9: drafts preserved across recoverable failures ────────────
  it('preserves the create draft and shows a localized error after a recoverable create failure', async () => {
    const createFn = vi.fn<CreatePatFn>().mockResolvedValue({ ok: false, error: 'PAT_NAME_IN_USE' });
    renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('draft-token');
    await submitPasswordAgain();

    // Password overlay closes; the source modal reappears with the draft
    // intact and the LOCALIZED error (never the raw code).
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();
    });
    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    const input = within(dialog).getByPlaceholderText(enUS.dev.namePlaceholder);
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('draft-token');
    const alert = within(dialog).getByRole('alert');
    expect(alert).toHaveTextContent(enUS.errors.PAT_NAME_IN_USE);
    expect(alert.textContent).not.toContain('PAT_NAME_IN_USE');
  });

  it('preserves the rename draft after a recoverable rename failure', async () => {
    const renameFn = vi.fn<RenamePatFn>().mockResolvedValue({ ok: false, error: 'PAT_RENAME_FAILED' });
    renderDevTab({ isActive: true, onRenamePatToken: renameFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) })[0]);
    const dialog = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    fireEvent.change(within(dialog).getByDisplayValue('ci-token'), { target: { value: 'renamed-draft' } });
    await act(async () => {
      fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.save }));
    });

    await submitPasswordAgain();

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();
    });
    const reopened = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    const input = within(reopened).getByDisplayValue('renamed-draft');
    expect(input).not.toBeDisabled();
    expect(within(reopened).getByRole('alert')).toHaveTextContent(enUS.errors.PAT_RENAME_FAILED);
  });

  // ── Scenario 10: create ambiguity (PAT_CREATE_FAILED but name present) ─
  it('surfaces mayHaveCreated when a failed create actually landed server-side', async () => {
    const refreshedTokens: PatToken[] = [...existingTokens, { name: 'ambiguous', createdAt: Date.now(), expiresAt: null }];
    const getTokensFn = vi.fn<GetPatsFn>()
      .mockResolvedValueOnce({ ok: true, data: existingTokens })
      .mockResolvedValueOnce({ ok: true, data: refreshedTokens });
    const createFn = vi.fn<CreatePatFn>().mockResolvedValue({ ok: false, error: 'PAT_CREATE_FAILED' });
    renderDevTab({ isActive: true, onCreatePatToken: createFn, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('ambiguous');
    await submitPasswordAgain();

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    // The ambiguity message replaces the raw/mapped generic failure, and the
    // refreshed list shows the token that actually landed.
    expect(within(dialog).getByRole('alert')).toHaveTextContent(enUS.dev.mayHaveCreated);
    expect(within(dialog).getByRole('alert').textContent).not.toContain(enUS.errors.PAT_CREATE_FAILED);
    await waitFor(() => {
      expect(getTokensFn).toHaveBeenCalledTimes(2);
    });
  });

  // ── Scenario 10b: verification rejection keeps mutation + re-verifies ────
  it('keeps the mutation and password step on VERIFICATION_EXPIRED and re-verifies with the same purpose', async () => {
    const createFn = vi.fn<CreatePatFn>()
      .mockResolvedValueOnce({ ok: false, error: 'VERIFICATION_EXPIRED' })
      .mockResolvedValueOnce({ ok: true, data: createdValue() });
    const { verifyFn } = renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('expiry-retry-token');
    await submitPasswordAgain();

    // Rejection: mapped error, password step KEPT, create attempted once.
    await waitFor(() => {
      expect(screen.getByText(enUS.errors.VERIFICATION_EXPIRED)).toBeInTheDocument();
    });
    expect(createFn).toHaveBeenCalledTimes(1);
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    // Verification rejection also removes the sensitive cached inventory.
    expect(screen.queryByText('ci-token')).toBeNull();

    // Resubmit re-verifies with the SAME purpose and re-runs the mutation.
    await submitPasswordAgain();
    await waitFor(() => {
      expect(createFn).toHaveBeenCalledTimes(2);
    });
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.create');
    expect(verifyFn).toHaveBeenNthCalledWith(3, 'test-password', 'pat.create');
    await waitFor(() => {
      expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    });
  });

  // ── Scenario 11: dismissal while the mutation is loading is a no-op ────
  it('ignores dismissal of the password modal while a mutation is in flight', async () => {
    let resolveCreate!: (v: DataResult<{ token: PatToken; value: string }>) => void;
    const createFn = vi.fn<CreatePatFn>().mockImplementation(
      () => new Promise((res) => { resolveCreate = res; }),
    );
    renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('non-cancelable-token');
    await submitPasswordAgain();
    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1)); // in flight

    closePasswordModal(); // must be a no-op

    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();

    await act(async () => {
      resolveCreate({ ok: true, data: createdValue() });
    });
    await waitFor(() => {
      expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    });
  });

  // ── Scenario 12: verification close is inert; stale unmount is safe ─────
  it('ignores close during verification and makes its completion inert after unmount', async () => {
    let resolveVerify!: (v: DataResult<{ verificationRecordId: string; verificationTimestamp: number }>) => void;
    const verifyFn = vi.fn<VerifyPasswordFn>()
      .mockResolvedValueOnce(freshVerify())
      .mockImplementationOnce(() => new Promise((res) => { resolveVerify = res; }));
    const createFn = vi.fn<CreatePatFn>().mockResolvedValue({ ok: true, data: createdValue() });
    const { unmount } = renderDevTab({ isActive: true, onVerifyPassword: verifyFn, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('stale-token');
    await submitPasswordAgain(); // mutation verify promise now pending

    // Close is a no-op for the entire verification await, not only once the
    // mutation server action has started.
    closePasswordModal();
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeDisabled();

    // Unmount bumps the generation. A late success must not start the staged
    // action after its UI owner no longer exists.
    unmount();

    // Late success is inert: no mutation call, no value modal.
    await act(async () => {
      resolveVerify(freshVerify());
    });
    expect(createFn).not.toHaveBeenCalled();
    expect(screen.queryByText('pat_new_generated_value')).toBeNull();
  });

  it('latches rapid Enter and click submissions to one deferred view verification', async () => {
    const pendingVerify = deferred<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>();
    const verifyFn = vi.fn<VerifyPasswordFn>().mockImplementation(() => pendingVerify.promise);
    const { getTokensFn } = renderDevTab({ onVerifyPassword: verifyFn });
    const input = await screen.findByPlaceholderText(enUS.mfa.enterPasswordPlaceholder);
    fireEvent.change(input, { target: { value: 'rapid-password' } });
    const button = screen.getByRole('button', { name: enUS.verification.verifyPassword });

    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(verifyFn).toHaveBeenCalledTimes(1);
    expect(verifyFn).toHaveBeenCalledWith('rapid-password', 'view');
    await act(async () => pendingVerify.resolve(freshVerify()));
    await waitFor(() => expect(getTokensFn).toHaveBeenCalledTimes(1));
  });

  it('latches rapid mutation verification submissions to one verify and one mutation', async () => {
    const pendingVerify = deferred<DataResult<{ verificationRecordId: string; verificationTimestamp: number }>>();
    const verifyFn = vi.fn<VerifyPasswordFn>()
      .mockResolvedValueOnce(freshVerify())
      .mockImplementationOnce(() => pendingVerify.promise);
    const { createFn } = renderDevTab({ onVerifyPassword: verifyFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());
    await stageCreate('rapid-create');

    const input = screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder);
    fireEvent.change(input, { target: { value: 'rapid-password' } });
    const button = screen.getByRole('button', { name: enUS.verification.verifyPassword });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(verifyFn).toHaveBeenCalledTimes(2);
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'rapid-password', 'pat.create');
    expect(createFn).not.toHaveBeenCalled();
    await act(async () => pendingVerify.resolve(freshVerify()));
    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1));
    expect(createFn).toHaveBeenCalledWith('rapid-create', null, 'vid-fresh');
  });

  // ── Scenario 13: second mutation blocked while one is staged/in flight ──
  it('blocks starting a second mutation while one is in flight', async () => {
    let resolveCreate!: (v: DataResult<{ token: PatToken; value: string }>) => void;
    const createFn = vi.fn<CreatePatFn>().mockImplementation(
      () => new Promise((res) => { resolveCreate = res; }),
    );
    renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('first-token');
    await submitPasswordAgain();
    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(1)); // in flight

    // Rename buttons are locked while the mutation overlay is up.
    const renameBtn = screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) })[0];
    expect(renameBtn).toBeDisabled();
    fireEvent.click(renameBtn);
    expect(screen.queryByRole('dialog', { name: enUS.dev.renameTitle })).toBeNull();

    await act(async () => {
      resolveCreate({ ok: true, data: createdValue() });
    });
    await waitFor(() => {
      expect(screen.getByText('pat_new_generated_value')).toBeInTheDocument();
    });
  });

  // ── Scenario 14: stored names with whitespace pass through verbatim ────
  it('passes the exact stored name (with surrounding whitespace) verbatim to rename and delete', async () => {
    const spacedTokens: PatToken[] = [{ name: '  spaced  ', createdAt: 1_700_000_000_000, expiresAt: null }];
    const getTokensFn = vi.fn<GetPatsFn>().mockResolvedValue({ ok: true, data: spacedTokens });
    const { renameFn, deleteFn } = renderDevTab({ isActive: true, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    // getByText normalizes whitespace — match the exact textContent instead.
    await waitFor(() => {
      expect(screen.getByText((_, el) => el?.textContent === '  spaced  ')).toBeInTheDocument();
    });

    // Rename: the stored name (untrimmed) is the currentName argument.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) }));
    const renameDialog = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    // NB: getByDisplayValue normalizes whitespace — query the textbox directly.
    fireEvent.change(within(renameDialog).getByRole('textbox'), { target: { value: 'new-name' } });
    await act(async () => {
      fireEvent.click(within(renameDialog).getByRole('button', { name: enUS.dev.save }));
    });
    await submitPasswordAgain();
    await waitFor(() => {
      expect(renameFn).toHaveBeenCalledWith('  spaced  ', 'new-name', 'vid-fresh');
    });

    // Delete: same verbatim name — the danger password check opens directly.
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${enUS.dev.delete}$`) }));
    const deleteDialog = await screen.findByRole('dialog', { name: enUS.dev.deleteTitle });
    // Raw textContent comparison — the stored name's whitespace is verbatim.
    expect(within(deleteDialog).getByText(
      (_, el) => el?.textContent === enUS.dev.deleteDesc.replace('{name}', '  spaced  '),
    )).toBeInTheDocument();
    await submitPasswordAgain();
    await waitFor(() => {
      expect(deleteFn).toHaveBeenCalledWith('  spaced  ', 'vid-fresh');
    });
  });

  // ── Scenario 15: aria-describedby linkage on error ─────────────────────
  it('links the create input to its error block via aria-describedby', async () => {
    const createFn = vi.fn<CreatePatFn>().mockResolvedValue({ ok: false, error: 'PAT_NAME_IN_USE' });
    renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('aria-token');
    await submitPasswordAgain();

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    const input = within(dialog).getByPlaceholderText(enUS.dev.namePlaceholder);
    const alert = within(dialog).getByRole('alert');
    expect(input.getAttribute('aria-describedby')).toBe(alert.id);
  });

  // ── Scenario 16: dismissal latch + manual unlock + re-entry ────────────
  it('latches auto-open after dismissal, reopens via the unlock button, and resets on re-entry', async () => {
    const onVerificationDismissed = vi.fn();
    const { rerenderWith } = renderDevTab({ isActive: true, onVerificationDismissed });

    // Auto-opened on entry.
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });

    closePasswordModal();
    expect(onVerificationDismissed).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();
    });

    // Auto-open does NOT re-trigger while latched…
    await act(async () => {});
    expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();

    // …but the skeleton unlock button reopens verification.
    fireEvent.click(screen.getByRole('button', { name: enUS.dev.verifyToView }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });

    // Dismiss again — still latched.
    closePasswordModal();
    await waitFor(() => {
      expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();
    });

    // Re-entry (tab left and returned to) resets the latch and auto-opens.
    rerenderWith(false);
    rerenderWith(true);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
  });

  it('refreshes with the existing view record without another password verification', async () => {
    const { verifyFn, getTokensFn } = renderDevTab();
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());
    await waitFor(() => expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: enUS.dev.refreshData }));

    await waitFor(() => expect(getTokensFn).toHaveBeenCalledTimes(2));
    expect(getTokensFn).toHaveBeenNthCalledWith(2, 'vid-fresh');
    expect(verifyFn).toHaveBeenCalledTimes(1);
    expect(screen.queryByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeNull();
  });

  it.each([
    'VERIFICATION_FAILED',
    'VERIFICATION_EXPIRED',
    'VERIFICATION_REQUIRED',
    'MISSING_VERIFICATION',
    'UNAUTHORIZED',
  ] as const)('clears cached rows and re-locks when refresh returns %s', async (error) => {
    const getTokensFn = vi.fn<GetPatsFn>()
      .mockResolvedValueOnce({ ok: true, data: existingTokens })
      .mockResolvedValueOnce({ ok: false, error });
    renderDevTab({ isActive: true, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: enUS.dev.refreshData }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(enUS.mfa.enterPasswordPlaceholder)).toBeInTheDocument();
    });
    expect(screen.queryByText('ci-token')).toBeNull();
  });

  it.each([
    'VERIFICATION_FAILED',
    'VERIFICATION_EXPIRED',
    'VERIFICATION_REQUIRED',
    'MISSING_VERIFICATION',
    'UNAUTHORIZED',
  ] as const)('clears cached rows when mutation password verification returns %s', async (error) => {
    const verifyFn = vi.fn<VerifyPasswordFn>()
      .mockResolvedValueOnce(freshVerify())
      .mockResolvedValueOnce({ ok: false, error });
    const { createFn } = renderDevTab({ isActive: true, onVerifyPassword: verifyFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate(`verify-${error.toLowerCase()}`);
    await submitPasswordAgain();

    await waitFor(() => expect(screen.queryByText('ci-token')).toBeNull());
    expect(screen.getByText(enUS.errors[error])).toBeInTheDocument();
    expect(createFn).not.toHaveBeenCalled();
  });

  it('keeps a rejected mutation staged, localizes the error, and retries the same target', async () => {
    const createFn = vi.fn<CreatePatFn>()
      .mockRejectedValueOnce(new Error('PAT_CREATE_FAILED'))
      .mockResolvedValueOnce({ ok: true, data: createdValue() });
    const { verifyFn } = renderDevTab({ isActive: true, onCreatePatToken: createFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('rejected-action');
    await submitPasswordAgain();
    await waitFor(() => {
      expect(screen.getByText(enUS.errors.PAT_CREATE_FAILED)).toBeInTheDocument();
    });
    expect(createFn).toHaveBeenCalledTimes(1);

    await submitPasswordAgain();
    await waitFor(() => expect(createFn).toHaveBeenCalledTimes(2));
    expect(createFn).toHaveBeenNthCalledWith(1, 'rejected-action', null, 'vid-fresh');
    expect(createFn).toHaveBeenNthCalledWith(2, 'rejected-action', null, 'vid-fresh');
    expect(verifyFn).toHaveBeenNthCalledWith(2, 'test-password', 'pat.create');
    expect(verifyFn).toHaveBeenNthCalledWith(3, 'test-password', 'pat.create');
  });

  it('falls back to the localized create error when ambiguity refresh rejects', async () => {
    const getTokensFn = vi.fn<GetPatsFn>()
      .mockResolvedValueOnce({ ok: true, data: existingTokens })
      .mockRejectedValueOnce(new Error('network down'));
    const createFn = vi.fn<CreatePatFn>().mockResolvedValue({ ok: false, error: 'PAT_CREATE_FAILED' });
    renderDevTab({ isActive: true, onCreatePatToken: createFn, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('ambiguous-rejection');
    await submitPasswordAgain();

    const dialog = await screen.findByRole('dialog', { name: enUS.dev.createToken });
    expect(within(dialog).getByRole('alert')).toHaveTextContent(enUS.errors.PAT_CREATE_FAILED);
    expect(within(dialog).getByPlaceholderText(enUS.dev.namePlaceholder)).toHaveValue('ambiguous-rejection');
  });

  it('keeps the one-time value through verification invalidation until explicit close', async () => {
    const getTokensFn = vi.fn<GetPatsFn>()
      .mockResolvedValueOnce({ ok: true, data: existingTokens })
      .mockResolvedValueOnce({ ok: false, error: 'VERIFICATION_EXPIRED' });
    renderDevTab({ isActive: true, onGetPatTokens: getTokensFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    await stageCreate('value-survivor');
    await submitPasswordAgain();

    const valueDialog = await screen.findByRole('dialog', { name: enUS.dev.valueTitle });
    expect(within(valueDialog).getByText('pat_new_generated_value')).toBeInTheDocument();
    expect(screen.queryByText('ci-token')).toBeNull();

    // X-only close (no footer close control exists anymore).
    fireEvent.click(within(valueDialog).getByRole('button', { name: 'Close dialog' }));
    await waitFor(() => {
      expect(screen.queryByText('pat_new_generated_value')).toBeNull();
    });
  });

  it('preserves a rejected rename target and retries that exact target', async () => {
    const renameFn = vi.fn<RenamePatFn>()
      .mockRejectedValueOnce(new Error('PAT_RENAME_FAILED'))
      .mockResolvedValueOnce({ ok: true });
    const { verifyFn } = renderDevTab({ isActive: true, onRenamePatToken: renameFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) })[0]);
    const dialog = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    fireEvent.change(within(dialog).getByDisplayValue('ci-token'), { target: { value: 'rename-retry' } });
    fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.save }));
    await submitPasswordAgain();
    await waitFor(() => expect(screen.getByText(enUS.errors.PAT_RENAME_FAILED)).toBeInTheDocument());

    await submitPasswordAgain();
    await waitFor(() => expect(renameFn).toHaveBeenCalledTimes(2));
    expect(renameFn).toHaveBeenNthCalledWith(1, 'ci-token', 'rename-retry', 'vid-fresh');
    expect(renameFn).toHaveBeenNthCalledWith(2, 'ci-token', 'rename-retry', 'vid-fresh');
    expect(verifyFn).toHaveBeenNthCalledWith(3, 'test-password', 'pat.rename');
  });

  it('links the rename input to its stable localized error block', async () => {
    const renameFn = vi.fn<RenamePatFn>().mockResolvedValue({ ok: false, error: 'PAT_RENAME_FAILED' });
    renderDevTab({ isActive: true, onRenamePatToken: renameFn });
    await verifyAndLoad();
    await waitFor(() => expect(screen.getByText('ci-token')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: new RegExp(`^${enUS.dev.rename}$`) })[0]);
    const dialog = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    const input = within(dialog).getByDisplayValue('ci-token');
    fireEvent.change(input, { target: { value: 'aria-rename' } });
    fireEvent.click(within(dialog).getByRole('button', { name: enUS.dev.save }));
    await submitPasswordAgain();

    const reopened = await screen.findByRole('dialog', { name: enUS.dev.renameTitle });
    const alert = within(reopened).getByRole('alert');
    expect(within(reopened).getByRole('textbox')).toHaveAttribute('aria-describedby', alert.id);
    expect(alert).toHaveTextContent(enUS.errors.PAT_RENAME_FAILED);
  });

  it('uses typed auto-verify fallback semantics', () => {
    expect(AUTO_VERIFY_TABS).toEqual(['sessions', 'dev']);
    expect(resolveAutoVerifyFallbackTab({
      loadedTabs: ['profile', 'security', 'sessions', 'dev'],
      lastTab: 'security',
      currentTab: 'dev',
    })).toBe('security');
    expect(resolveAutoVerifyFallbackTab({
      loadedTabs: ['sessions', 'dev'],
      lastTab: 'sessions',
      currentTab: 'dev',
    })).toBeNull();
  });
});
