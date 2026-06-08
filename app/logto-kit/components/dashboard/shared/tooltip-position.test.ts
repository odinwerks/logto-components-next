import { describe, it, expect } from 'vitest';
import { getClampedTooltipPosition } from './tooltip-position';

describe('getClampedTooltipPosition', () => {
  it('returns original position when fully within viewport', () => {
    const result = getClampedTooltipPosition({
      left: 100,
      top: 80,
      width: 120,
      height: 60,
      viewportWidth: 800,
      viewportHeight: 600,
    });

    expect(result.left).toBe(100);
    expect(result.top).toBe(80);
  });

  it('clamps right overflow', () => {
    const result = getClampedTooltipPosition({
      left: 760,
      top: 80,
      width: 120,
      height: 60,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    });

    expect(result.left).toBe(672);
  });

  it('clamps left and top overflow', () => {
    const result = getClampedTooltipPosition({
      left: -20,
      top: -10,
      width: 120,
      height: 60,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    });

    expect(result.left).toBe(8);
    expect(result.top).toBe(8);
  });

  it('clamps bottom overflow', () => {
    const result = getClampedTooltipPosition({
      left: 100,
      top: 580,
      width: 120,
      height: 40,
      viewportWidth: 800,
      viewportHeight: 600,
      margin: 8,
    });

    expect(result.top).toBe(552);
  });
});
