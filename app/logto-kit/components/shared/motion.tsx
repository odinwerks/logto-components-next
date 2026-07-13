'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  forwardRef,
} from 'react';
import type {
  CSSProperties,
  ReactNode,
  ButtonHTMLAttributes,
} from 'react';
import {
  motion,
  AnimatePresence,
  MotionConfig,
  useReducedMotion,
} from 'framer-motion';
import type { Transition, TargetAndTransition } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// MotionConfigProvider
//
// Wraps the application so every motion component respects the user's
// `prefers-reduced-motion` setting automatically. When
// `NEXT_PUBLIC_FORCE_ANIMATIONS=true`, reduced motion is disabled (`"never"`)
// so animations always play — mirroring the legacy `ldd-force-animations` CSS
// override at the Framer Motion layer.
//
// Framer Motion's `reducedMotion="user"` keeps opacity animations but makes
// transform animations (x/y/scale/rotate) instant — the accessible default.
// ─────────────────────────────────────────────────────────────────────────────

const FORCE_ANIMATIONS = process.env.NEXT_PUBLIC_FORCE_ANIMATIONS === 'true';

export function MotionConfigProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion={FORCE_ANIMATIONS ? 'never' : 'user'}>
      {children}
    </MotionConfig>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FadeIn — opacity 0 → 1 entrance
// ─────────────────────────────────────────────────────────────────────────────

interface FadeInProps {
  /** Override the default 0.12s duration (in seconds). */
  duration?: number;
  /** Entrance delay in seconds. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function FadeIn({ duration = 0.12, delay = 0, className, style, children }: FadeInProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SlideIn — translateX + opacity entrance
// ─────────────────────────────────────────────────────────────────────────────

interface SlideInProps {
  direction?: 'left' | 'right';
  /** Override the default 0.32s duration (in seconds). */
  duration?: number;
  /** Entrance delay in seconds. */
  delay?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function SlideIn({ direction = 'right', duration = 0.32, delay = 0, className, style, children }: SlideInProps) {
  const x = direction === 'right' ? '100%' : '-100%';
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScaleFade — opacity + scale entrance/exit (dashboard open)
// ─────────────────────────────────────────────────────────────────────────────

interface ScaleFadeProps {
  /** Override the default 0.18s duration (in seconds). */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function ScaleFade({ duration = 0.18, className, style, children }: ScaleFadeProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CrossFade — state-preserving panel crossfade for tab switching
//
// Keeps every visited key mounted (hidden via `display: none`) so component
// state (form drafts, verification state) survives tab round-trips. On a key
// change, the outgoing panel fades out for `duration` seconds, then the
// incoming panel is revealed and fades in. This replaces the legacy
// `TabFadePanel` while preserving the BUG-010 state-preservation fix.
//
// `wrapItem` lets consumers inject per-panel wrappers (e.g. an error boundary
// that resets when visibility changes) without mounting/unmounting children.
// ─────────────────────────────────────────────────────────────────────────────

interface CrossFadeProps {
  activeKey: string;
  className?: string;
  /** Fade duration in seconds (default 0.12). */
  duration?: number;
  /** Render function returning the content for a given key. */
  children: (key: string) => ReactNode;
  /** Optional per-item wrapper (e.g. error boundary). */
  wrapItem?: (key: string, isVisible: boolean, children: ReactNode) => ReactNode;
}

export function CrossFade({ activeKey, className, duration = 0.12, children, wrapItem }: CrossFadeProps) {
  const [displayedKey, setDisplayedKey] = useState<string>(activeKey);
  const [renderedKeys, setRenderedKeys] = useState<Set<string>>(() => new Set([activeKey]));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (activeKey === displayedKey) {
      return;
    }

    // Track every key that has ever been displayed so its component state
    // survives when the user switches away and later returns. The synchronous
    // setState calls here are the canonical state-preserving crossfade pattern
    // (cf. the legacy TabFadePanel): we must record the new key and begin the
    // fade-out phase in response to the activeKey prop changing.
    /* eslint-disable react-hooks/set-state-in-effect */
    setRenderedKeys((prev) => (prev.has(activeKey) ? prev : new Set([...prev, activeKey])));

    setFading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = setTimeout(() => {
      setDisplayedKey(activeKey);
      setFading(false);
    }, Math.round(duration * 1000));

    return () => clearTimeout(timer);
  }, [activeKey, displayedKey, duration]);

  return (
    <div className={className}>
      {Array.from(renderedKeys).map((key) => {
        const isDisplayed = key === displayedKey;
        // During `fading`, the outgoing (still displayed) panel fades out;
        // the incoming panel stays hidden until `displayedKey` switches.
        const opacity = isDisplayed ? (fading ? 0 : 1) : 0;
        const content = children(key);

        return (
          <motion.div
            key={key}
            data-tab={key}
            initial={false}
            animate={{ opacity }}
            transition={{ duration, ease: 'easeOut' }}
            style={{ display: isDisplayed ? undefined : 'none' }}
            aria-hidden={isDisplayed ? undefined : true}
          >
            {wrapItem ? wrapItem(key, isDisplayed, content) : content}
          </motion.div>
        );
      })}
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
      <div className={className} style={style}>
        {children}
      </div>
    </StaggerContext.Provider>
  );
}

interface StaggerItemProps {
  /** Item index (multiplied by container stagger step to compute delay). */
  index?: number;
  /** Absolute delay in seconds (overrides index-based computation). */
  delay?: number;
  /** Initial X offset (px or %). */
  x?: number | string;
  /** Initial Y offset (px or %). */
  y?: number | string;
  /** Animation duration in seconds (default 0.5). */
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

export function StaggerItem({
  index = 0,
  delay,
  x = 0,
  y = 0,
  duration = 0.5,
  className,
  style,
  children,
}: StaggerItemProps) {
  const step = useContext(StaggerContext);
  const computedDelay = delay != null ? delay : index * step;

  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay: computedDelay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MotionButton — button with a whileTap press effect (replaces ldd-btn-press)
//
// `whileTap={{ y: 1 }}` gives the same 1px downward nudge as the legacy
// `.ldd-btn-press:active { transform: translateY(1px) }` rule, but driven by
// Framer Motion. Under reduced motion the transform is neutralised by
// MotionConfig, so the press becomes instant (still accessible).
// ─────────────────────────────────────────────────────────────────────────────

export type MotionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onAnimationStart' | 'onAnimationEnd' | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragOver'
> & {
  whileTap?: TargetAndTransition;
  transition?: Transition;
};

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ whileTap, transition, ...rest }, ref) => (
    <motion.button
      ref={ref}
      initial={false}
      whileTap={whileTap ?? { y: 1 }}
      transition={transition ?? { type: 'tween', duration: 0.08, ease: 'easeOut' }}
      {...rest}
    />
  ),
);
MotionButton.displayName = 'MotionButton';

// ─────────────────────────────────────────────────────────────────────────────
// Spinner — rotating loading indicator (icon or CSS border-spinner)
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
  // Continuous motion is fully disabled under reduced motion (matches the
  // legacy behaviour where `ldd-spin` was suppressed). `initial={false}`
  // keeps the SSR markup stable so the animate/transition values can vary
  // between server and client without a hydration mismatch.
  const reduced = useReducedMotion();
  const animate = reduced ? { rotate: 0 } : { rotate: 360 };
  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 1, ease: 'linear', repeat: Infinity };

  if (borderSpinner) {
    return (
      <motion.div
        className={className}
        style={{
          width: size,
          height: size,
          border: `2px solid ${trackColor ?? 'currentColor'}`,
          borderTopColor: color ?? 'currentColor',
          borderRadius: '50%',
          ...style,
        }}
        initial={false}
        animate={animate}
        transition={transition}
      />
    );
  }

  return (
    <motion.span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', ...style }}
      initial={false}
      animate={animate}
      transition={transition}
    >
      <Loader2 size={size} strokeWidth={strokeWidth} />
    </motion.span>
  );
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

export function Pulse({ className, style, delay = 0, children }: PulseProps) {
  // Disable the continuous pulse under reduced motion (matches the legacy
  // `ldd-pulse` suppression). `initial={false}` keeps SSR markup stable.
  const reduced = useReducedMotion();
  const animate = reduced ? { opacity: 1 } : { opacity: [1, 0.5, 1] };
  const transition: Transition = reduced
    ? { duration: 0 }
    : { duration: 1.5, ease: 'easeInOut', repeat: Infinity, delay };

  return (
    <motion.div
      className={className}
      style={style}
      initial={false}
      animate={animate}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ToastSlide — toast enter/exit slide (used inside AnimatePresence)
// ─────────────────────────────────────────────────────────────────────────────

interface ToastSlideProps {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export function ToastSlide({ className, style, children }: ToastSlideProps) {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}

// Re-export AnimatePresence so consumers can pair it with ToastSlide/ScaleFade
// without a second framer-motion import.
export { AnimatePresence };
