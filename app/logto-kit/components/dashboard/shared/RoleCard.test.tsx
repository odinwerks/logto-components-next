import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { DARK_COLORS } from '../../../themes';
import { enUS } from '../../../locales/en-US';
import { RoleCard } from './RoleCard';

const { mockGetRoleDetails } = vi.hoisted(() => ({
  mockGetRoleDetails: vi.fn().mockResolvedValue({ ok: true, data: { id: 'role-1', description: 'My Role Description' } }),
}));

vi.mock('../../../logic/actions/roles', () => ({
  getRoleDetails: (...args: unknown[]) => mockGetRoleDetails(...args),
}));

describe('RoleCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders role name', () => {
    render(
      <RoleCard
        name="Admin"
        roleId="role-1"
        colors={DARK_COLORS}
        t={enUS}
      />
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('triggers tooltip when focusing the info button', async () => {
    render(
      <RoleCard
        name="Admin"
        roleId="role-1"
        colors={DARK_COLORS}
        t={enUS}
      />
    );

    // Get the unstyled button that serves as the trigger
    const infoButton = screen.getByRole('button');
    expect(infoButton).toBeInTheDocument();

    // Description is not shown yet
    expect(screen.queryByText('My Role Description')).toBeNull();

    // Focus on the info button
    await act(async () => {
      fireEvent.focus(infoButton);
    });

    // Tooltip should be rendered
    await waitFor(() => {
      expect(screen.getByText(/My Role Description/)).toBeInTheDocument();
    });

    // Blur the info button
    await act(async () => {
      fireEvent.blur(infoButton);
    });

    // Tooltip should be gone
    await waitFor(() => {
      expect(screen.queryByText('My Role Description')).toBeNull();
    });
  });

  it('triggers tooltip when hovering', async () => {
    render(
      <RoleCard
        name="Admin"
        roleId="role-1"
        colors={DARK_COLORS}
        t={enUS}
      />
    );

    const infoButton = screen.getByRole('button');

    // Hover
    await act(async () => {
      fireEvent.mouseEnter(infoButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/My Role Description/)).toBeInTheDocument();
    });

    // Mouse leave
    await act(async () => {
      fireEvent.mouseLeave(infoButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('My Role Description')).toBeNull();
    });
  });
});
