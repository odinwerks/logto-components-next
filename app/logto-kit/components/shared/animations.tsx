'use client';

import React, { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/use-prefers-reduced-motion';

// ─────────────────────────────────────────────────────────────────────────────
// FadeIn — opacity 0 → 1 entrance animation
// ─────────────────────────────────────────────────────────────────────────────

interface FadeInProps {
  /** Override the default 0.12s duration (in seconds). */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function FadeIn({ duration, className, style, children }: FadeInProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <div
      className={`ldd-fade-in${className ? ` ${className}` : ''}`}
      style={{ ...style, ...(duration != null ? { animationDuration: `${duration}s` } : {}) }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideIn — translateX + opacity entrance animation
// ─────────────────────────────────────────────────────────────────────────────

interface SlideInProps {
  direction?: 'left' | 'right';
  /** Override the default 0.32s duration (in seconds). */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function SlideIn({ direction = 'right', duration, className, style, children }: SlideInProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  const animClass = direction === 'left' ? 'ldd-slide-in-left' : 'ldd-slide-in-right';
  return (
    <div
      className={`${animClass}${className ? ` ${className}` : ''}`}
      style={{ ...style, ...(duration != null ? { animationDuration: `${duration}s` } : {}) }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Spinner — loading indicator (icon or CSS border-spinner)
// ─────────────────────────────────────────────────────────────────────────────

interface SpinnerProps {
  /** Size in px or CSS string. Defaults to 16. */
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  /** When true, render a CSS border-spinner div instead of a lucide Loader2 icon. */
  borderSpinner?: boolean;
  /** Border-top (indicator) color for the border-spinner variant. */
  color?: string;
  /** Track (border) color for the border-spinner variant. */
  trackColor?: string;
  /** Stroke width for the lucide icon variant (default: 2). */
  strokeWidth?: number;
}

export function Spinner({
  size = 16,
  className,
  style,
  borderSpinner = false,
  color,
  trackColor,
  strokeWidth,
}: SpinnerProps) {
  const reduced = usePrefersReducedMotion();
  const animClass = reduced ? '' : 'ldd-spin';
  const fullClass = `${animClass}${className ? ` ${className}` : ''}`.trim() || undefined;

  if (borderSpinner) {
    return (
      <div
        className={fullClass}
        style={{
          width: size,
          height: size,
          border: `2px solid ${trackColor ?? 'currentColor'}`,
          borderTopColor: color ?? 'currentColor',
          borderRadius: '50%',
          ...style,
        }}
      />
    );
  }

  return <Loader2 size={size} strokeWidth={strokeWidth} className={fullClass} style={style} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse — skeleton shimmer / loading placeholder
// ─────────────────────────────────────────────────────────────────────────────

interface PulseProps {
  className?: string;
  style?: CSSProperties;
  /** Animation delay in seconds. */
  delay?: number;
  children?: ReactNode;
}

export function Pulse({ className, style, delay, children }: PulseProps) {
  const reduced = usePrefersReducedMotion();
  if (reduced) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <div
      className={`ldd-pulse${className ? ` ${className}` : ''}`}
      style={{ ...style, ...(delay != null ? { animationDelay: `${delay}s` } : {}) }}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StaggerContainer + StaggerItem — staggered entrance for lists
// ─────────────────────────────────────────────────────────────────────────────

const StaggerContext = createContext<number>(0.08);

interface StaggerContainerProps {
  /** Delay step between items, in seconds. Default: 0.08. */
  stagger?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function StaggerContainer({ stagger = 0.08, className, style, children }: StaggerContainerProps) {
  return (
    <StaggerContext.Provider value={stagger}>
      <div className={className} style={style}>{children}</div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps {
  /** Item index (multiplied by container stagger step to compute delay). */
  index?: number;
  /** Absolute delay in seconds (overrides index-based computation). */
  delay?: number;
  /** CSS animation class to apply. Default: 'ldd-stagger'. */
  animation?: string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function StaggerItem({
  index = 0,
  delay,
  animation = 'ldd-stagger',
  className,
  style,
  children,
}: StaggerItemProps) {
  const reduced = usePrefersReducedMotion();
  const step = useContext(StaggerContext);

  if (reduced) {
    return <div className={className} style={style}>{children}</div>;
  }

  const computedDelay = delay != null ? delay : index * step;
  return (
    <div
      className={`${animation}${className ? ` ${className}` : ''}`}
      style={{ ...style, animationDelay: `${computedDelay}s` }}
    >
      {children}
    </div>
  );
}
