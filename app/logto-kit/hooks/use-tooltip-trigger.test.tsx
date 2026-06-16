import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTooltipTrigger } from './use-tooltip-trigger';

// Mock the tooltip-position module since it accesses window dimensions
vi.mock('../components/dashboard/shared/tooltip-position', () => ({
  getClampedTooltipPosition: vi.fn(({ left, top }: { left: number; top: number }) => ({
    left,
    top,
  })),
}));

function makeMockMouseEvent(x: number, y: number, width = 100, height = 30) {
  return {
    currentTarget: {
      getBoundingClientRect: () => ({ left: x, top: y, right: x + width, bottom: y + height, width, height }),
    },
  } as unknown as React.MouseEvent;
}

function makeMockFocusEvent(x: number, y: number, width = 100, height = 30) {
  return {
    currentTarget: {
      getBoundingClientRect: () => ({ left: x, top: y, right: x + width, bottom: y + height, width, height }),
    },
  } as unknown as React.FocusEvent;
}

describe('useTooltipTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with tooltip invisible at origin', () => {
    const { result } = renderHook(() => useTooltipTrigger());

    expect(result.current.tooltip.visible).toBe(false);
    expect(result.current.tooltip.x).toBe(0);
    expect(result.current.tooltip.y).toBe(0);
  });

  it('onMouseEnter shows the tooltip with position', () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => {
      result.current.handlers.onMouseEnter(makeMockMouseEvent(200, 100));
    });

    expect(result.current.tooltip.visible).toBe(true);
    // Position should be set (exact values depend on the clamping mock)
    expect(typeof result.current.tooltip.x).toBe('number');
    expect(typeof result.current.tooltip.y).toBe('number');
  });

  it('onMouseLeave hides the tooltip', () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => {
      result.current.handlers.onMouseEnter(makeMockMouseEvent(200, 100));
    });
    expect(result.current.tooltip.visible).toBe(true);

    act(() => {
      result.current.handlers.onMouseLeave();
    });
    expect(result.current.tooltip.visible).toBe(false);
  });

  it('onFocus shows the tooltip', () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => {
      result.current.handlers.onFocus(makeMockFocusEvent(50, 80));
    });

    expect(result.current.tooltip.visible).toBe(true);
  });

  it('onBlur hides the tooltip', () => {
    const { result } = renderHook(() => useTooltipTrigger());

    act(() => {
      result.current.handlers.onFocus(makeMockFocusEvent(50, 80));
    });
    act(() => {
      result.current.handlers.onBlur();
    });

    expect(result.current.tooltip.visible).toBe(false);
  });

  it('maintains stable handler references across renders', () => {
    const { result, rerender } = renderHook(() => useTooltipTrigger());

    const handlers1 = result.current.handlers;
    rerender();
    const handlers2 = result.current.handlers;

    // The handlers object itself may be new, but individual functions should be stable
    expect(handlers1.onMouseEnter).toBe(handlers2.onMouseEnter);
    expect(handlers1.onMouseLeave).toBe(handlers2.onMouseLeave);
    expect(handlers1.onFocus).toBe(handlers2.onFocus);
    expect(handlers1.onBlur).toBe(handlers2.onBlur);
  });
});
