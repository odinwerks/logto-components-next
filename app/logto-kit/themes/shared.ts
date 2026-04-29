// =============================================================================
// Shared Theme Utilities — themes/shared.ts
//
// Common utility functions used across theme variants.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// Color manipulation utilities
// ─────────────────────────────────────────────────────────────────────────────

/** Append a 2-char hex alpha to a 6-char hex color.  alpha('#3b82f6', 0.15) → '#3b82f626' */
export function alpha(hex: string, opacity: number): string {
  const a = Math.round(Math.min(1, Math.max(0, opacity)) * 255)
    .toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * Adjust the perceived lightness of a hex color by shifting each RGB channel.
 * Positive delta brightens; negative darkens.
 * adj('#ef4444', -30) → a darker red suitable for borders / shadows.
 */
export function adj(hex: string, delta: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const clamp = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  const r = clamp(parseInt(c.slice(0, 2), 16) + delta);
  const g = clamp(parseInt(c.slice(2, 4), 16) + delta);
  const b = clamp(parseInt(c.slice(4, 6), 16) + delta);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
