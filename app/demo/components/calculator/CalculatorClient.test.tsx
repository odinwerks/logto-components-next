import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseOrgMode = vi.fn().mockReturnValue({ asOrg: '5b6sw6p5uzti' });
const mockUseUserDataContext = vi.fn().mockReturnValue({
  id: 'user_123', organizations: [],
});
const mockLoadOrganizationPermissions = vi.fn().mockResolvedValue({
  ok: true,
  data: ['calc:basic', 'calc:scientific'],
});

vi.mock('../../../logto-kit', () => ({
  useOrgMode: () => mockUseOrgMode(),
  useUserDataContext: () => mockUseUserDataContext(),
}));

vi.mock('../../../logto-kit/server-actions', () => ({
  loadOrganizationPermissions: (orgId: string) => mockLoadOrganizationPermissions(orgId),
}));

import { CalculatorClient } from './CalculatorClient';

describe('CalculatorClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseOrgMode.mockReturnValue({ asOrg: '5b6sw6p5uzti' });
    mockUseUserDataContext.mockReturnValue({ id: 'user_123', organizations: [] });
    mockLoadOrganizationPermissions.mockResolvedValue({
      ok: true,
      data: ['calc:basic', 'calc:scientific'],
    });
    if (typeof window !== 'undefined') {
      window.sessionStorage.clear();
    }
  });

  it('correctly calculates 66+5555 and updates UI to 5621', async () => {
    // Mock global fetch to return the API response
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: { answer: 5621 } }),
      } as Response)
    );
    global.fetch = fetchMock;

    render(<CalculatorClient />);

    // Get buttons by their visible text
    const btn6 = screen.getByRole('button', { name: '6' });
    const btn5 = screen.getByRole('button', { name: '5' });
    const btnPlus = screen.getByRole('button', { name: '+' });
    const btnEquals = screen.getByRole('button', { name: '=' });

    // Click 6, 6, +, 5, 5, 5, 5
    fireEvent.click(btn6);
    fireEvent.click(btn6);
    fireEvent.click(btnPlus);
    fireEvent.click(btn5);
    fireEvent.click(btn5);
    fireEvent.click(btn5);
    fireEvent.click(btn5);

    // Verify current state before calculation
    // Main line should show "5555" (the current token being entered)
    // Expr display line should show "66+ 5555"
    expect(screen.getByText('5555')).toBeInTheDocument();
    expect(screen.getByText('66+ 5555')).toBeInTheDocument();

    // Trigger equals to calculate
    fireEvent.click(btnEquals);

    // Wait for display to update to the evaluated answer 5621
    await waitFor(() => {
      expect(screen.getByText('5621')).toBeInTheDocument();
    });

    // Verify fetch call parameters
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/api/protected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'calc/add',
        payload: { a: 66, b: 5555 },
      }),
    });
  });

  it('disables scientific keypad buttons if calc:scientific permission is lacking', async () => {
    mockLoadOrganizationPermissions.mockResolvedValueOnce({
      ok: true,
      data: ['calc:basic'], // lacks calc:scientific
    });

    render(<CalculatorClient />);

    // Since drawer is closed by default, click f(x) to open the drawer
    const btnFx = screen.getByText('f(x)');
    fireEvent.click(btnFx);

    // Now look for scientific buttons like "sin" inside waitFor to get the fresh DOM state
    await waitFor(() => {
      const btnSin = screen.getByRole('button', { name: 'sin' });
      expect(btnSin).toBeDisabled();
    });
  });

  it('enables scientific keypad buttons if calc:scientific permission is present', async () => {
    mockLoadOrganizationPermissions.mockResolvedValueOnce({
      ok: true,
      data: ['calc:basic', 'calc:scientific'],
    });

    render(<CalculatorClient />);

    const btnFx = screen.getByText('f(x)');
    fireEvent.click(btnFx);

    await waitFor(() => {
      const btnSin = screen.getByRole('button', { name: 'sin' });
      expect(btnSin).not.toBeDisabled();
    });
  });

  it('loads state from sessionStorage in useEffect on mount to avoid hydration mismatch', async () => {
    const savedState = {
      expr: '123+',
      curToken: '456',
      isRad: false,
      invOn: false,
      justEvaled: false,
      openParens: 0,
      lastWasOp: true,
      lastWasClose: false,
      isCalculating: false,
    };
    window.sessionStorage.setItem('calc-state', JSON.stringify(savedState));

    render(<CalculatorClient />);

    await waitFor(() => {
      expect(screen.getByText('456')).toBeInTheDocument();
      expect(screen.getByText('123+ 456')).toBeInTheDocument();
    });
  });

  it('avoids double-firing backspace on mobile touch events', async () => {
    render(<CalculatorClient />);

    // Enter "123"
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));

    expect(screen.getAllByText('123').length).toBeGreaterThan(0);

    const backspaceBtn = screen.getByText('⌫');

    // Simulate mobile touch sequence:
    // 1. touchstart
    fireEvent.touchStart(backspaceBtn);
    // 2. mousedown (browser emulates this unless preventDefault() is called in touchstart)
    fireEvent.mouseDown(backspaceBtn);

    // 3. touchend
    fireEvent.touchEnd(backspaceBtn);
    // 4. mouseup (emulated)
    fireEvent.mouseUp(backspaceBtn);

    // If fixed, only ONE delete should have occurred, leaving "12"
    // If bug exists, TWO deletes occurred, leaving "1"
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
  });
});
