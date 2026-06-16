'use client';

import { useState, useCallback } from 'react';
import { getClampedTooltipPosition } from '../components/dashboard/shared/tooltip-position';

/**
 * Current visibility and screen coordinates of the tooltip.
 */
export interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
}

/**
 * Event handlers to attach to a trigger element for tooltip show/hide.
 */
export interface TooltipHandlers {
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onFocus: (e: React.FocusEvent) => void;
  onBlur: () => void;
}

/** Default estimated tooltip dimensions used for viewport clamping. */
const DEFAULT_TOOLTIP_WIDTH = 288;
const DEFAULT_TOOLTIP_HEIGHT = 120;

/**
 * Manages tooltip show/hide state and computes a viewport-clamped position
 * based on the trigger element's bounding rect.
 *
 * Returned `x` / `y` are in fixed-positioning CSS coordinates (px).
 *
 * @example
 * ```tsx
 * const { tooltip, handlers } = useTooltipTrigger();
 * return (
 *   <>
 *     <button {...handlers}>Hover me</button>
 *     {tooltip.visible && (
 *       <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y }}>
 *         Tooltip content
 *       </div>
 *     )}
 *   </>
 * );
 * ```
 */
export function useTooltipTrigger() {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });

  const show = useCallback((e: React.MouseEvent | React.FocusEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { left, top } = getClampedTooltipPosition({
      left: rect.left,
      top: rect.bottom + 6,
      width: DEFAULT_TOOLTIP_WIDTH,
      height: DEFAULT_TOOLTIP_HEIGHT,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 800,
    });
    setTooltip({ visible: true, x: left, y: top });
  }, []);

  const hide = useCallback(() => {
    setTooltip(t => ({ ...t, visible: false }));
  }, []);

  const handlers: TooltipHandlers = {
    onMouseEnter: show,
    onMouseLeave: hide,
    onFocus: show,
    onBlur: hide,
  };

  return { tooltip, handlers };
}
