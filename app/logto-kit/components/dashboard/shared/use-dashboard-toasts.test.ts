import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardToasts } from './use-dashboard-toasts';
import { enUS } from '../../../locales/en-US';

describe('useDashboardToasts', () => {
  it('creates success and error toasts with expected durations', () => {
    const { result } = renderHook(() => useDashboardToasts(enUS));

    act(() => {
      result.current.showToast('success', 'Saved');
      result.current.showToast('error', 'Failed');
    });

    expect(result.current.toasts).toHaveLength(2);
    expect(result.current.toasts[0]?.duration).toBe(3000);
    expect(result.current.toasts[1]?.duration).toBe(8000);
  });

  it('dismisses a toast by id', () => {
    const { result } = renderHook(() => useDashboardToasts(enUS));

    act(() => {
      result.current.showToast('info', 'Hello');
    });

    const id = result.current.toasts[0]?.id;
    expect(id).toBeDefined();

    act(() => {
      result.current.dismissToast(id!);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('maps PHONE_COUNTRY_NOT_ALLOWED to localized copy', () => {
    const { result } = renderHook(() => useDashboardToasts(enUS));

    expect(result.current.mapErrorToast('PHONE_COUNTRY_NOT_ALLOWED')).toBe(
      enUS.validation.phoneCountryNotAllowed,
    );
    expect(result.current.mapErrorToast('OTHER_ERROR')).toBe('OTHER_ERROR');
  });

  it('creates unique toast ids', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);

    const { result } = renderHook(() => useDashboardToasts(enUS));

    act(() => {
      result.current.showToast('info', 'A');
      result.current.showToast('info', 'B');
    });

    expect(result.current.toasts[0]?.id).not.toBe(result.current.toasts[1]?.id);
  });
});
