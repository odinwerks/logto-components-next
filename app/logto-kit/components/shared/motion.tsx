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
  useReducedMotionConfig,
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
  /**
   * When true, the outer wrapper and the currently-visible panel become a
   * flex column that fills its parent's height (flex:1 1 auto; minHeight:0).
   * Hidden panels keep display:none. Default false → current behavior.
   * Used only by the Security tab so its danger zone can pin to the bottom.
   */
  fillHeight?: boolean;
  /** Render function returning the content for a given key. */
  children: (key: string) => ReactNode;
  /** Optional per-item wrapper (e.g. error boundary). */
  wrapItem?: (key: string, isVisible: boolean, children: ReactNode) => ReactNode;
}

export function CrossFade({ activeKey, className, duration = 0.12, fillHeight, children, wrapItem }: CrossFadeProps) {
  const [displayedKey, setDisplayedKey] = useState<string>(activeKey);
  const [renderedKeys, setRenderedKeys] = useState<Set<string>>(() => new Set([activeKey]));
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // The synchronous setState calls in this effect are the canonical
    // state-preserving crossfade pattern (cf. the legacy TabFadePanel):
    // we must reset fading (on early return) or record the new key and
    // begin the fade-out phase in response to the activeKey prop changing.
    /* eslint-disable react-hooks/set-state-in-effect */

    if (activeKey === displayedKey) {
      // Reset fading in case the user switched back to the original key before
      // the previous fade-out timer fired (rapid round-trip: A → B → A).
      // Without this, fading stays true and the visible panel renders at
      // opacity: 0 (invisible).
      setFading(false);
      return;
    }

    setRenderedKeys((prev) => (prev.has(activeKey) ? prev : new Set([...prev, activeKey])));

    setFading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = setTimeout(() => {
      setDisplayedKey(activeKey);
      setFading(false);
    }, Math.round(duration * 1000));

    return () => clearTimeout(timer);
  }, [activeKey, displayedKey, duration]);

  // When fillHeight is on, the wrapper chain becomes a flex column so a child
  // tab can fill the tabpanel height (used by SecurityTab's sticky footer).
  // The outer wrapper keeps its className so BUG-010's `.dashboard-tabpanel-content`
  // selector still resolves; only its display model changes.
  const wrapperStyle: CSSProperties | undefined = fillHeight
    ? { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }
    : undefined;

  return (
    <div className={className} style={wrapperStyle}>
      {Array.from(renderedKeys).map((key) => {
        const isDisplayed = key === displayedKey;
        // During `fading`, the outgoing (still displayed) panel fades out;
        // the incoming panel stays hidden until `displayedKey` switches.
        const opacity = isDisplayed ? (fading ? 0 : 1) : 0;
        const content = children(key);

        // Visible panel: fill the wrapper when fillHeight is on, else unchanged.
        // Hidden panel: always display:none (state-preservation intact).
        const itemStyle: CSSProperties =
          fillHeight && isDisplayed
            ? { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }
            : { display: isDisplayed ? undefined : 'none' };

        return (
          <motion.div
            key={key}
            data-tab={key}
            initial={false}
            animate={{ opacity }}
            transition={{ duration, ease: 'easeOut' }}
            style={itemStyle}
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
//
// @deprecated Use BouncingDots instead. Spinner freezes under
// prefers-reduced-motion (rotate: 0, duration: 0), while BouncingDots degrades
// to a visible opacity pulse that never freezes.
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
  //
  // NOTE: useReducedMotionConfig() (not useReducedMotion()) is used so the
  // Spinner respects the parent <MotionConfig reducedMotion="never"> set by
  // MotionConfigProvider when NEXT_PUBLIC_FORCE_ANIMATIONS=true. The raw
  // useReducedMotion() hook only reads the OS media query and ignores
  // MotionConfig context, so force-animations would not override it.
  const reduced = useReducedMotionConfig();
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
  //
  // NOTE: useReducedMotionConfig() (not useReducedMotion()) is used so the
  // Pulse respects the parent <MotionConfig reducedMotion="never"> set by
  // MotionConfigProvider when NEXT_PUBLIC_FORCE_ANIMATIONS=true. The raw
  // useReducedMotion() hook only reads the OS media query and ignores
  // MotionConfig context, so force-animations would not override it.
  const reduced = useReducedMotionConfig();
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
// BouncingDots — three-dot loading indicator (replaces Spinner / SpinnerIcon)
//
// Three dots bounce sequentially under normal conditions. Under
// prefers-reduced-motion, the bounce is replaced with an opacity pulse so the
// indicator is always visible — it never freezes.
//
// Uses `role="status"` for screen-reader announcement; customize the label via
// `ariaLabel`. When a visible text label already sits next to the dots, set
// `ariaLabel=""` to avoid redundant announcements.
// ─────────────────────────────────────────────────────────────────────────────

export interface BouncingDotsProps {
  /** Dot diameter in px. Default: 8 */
  size?: number;
  /** Gap between dots in px. Default: 4 */
  gap?: number;
  /** Dot fill color. Default: 'currentColor' */
  color?: string;
  /** Full bounce cycle duration in seconds. Default: 0.9 */
  duration?: number;
  /** Accessible label. Default: 'Loading' */
  ariaLabel?: string;
  /** Additional CSS class */
  className?: string;
  /** Additional inline style */
  style?: CSSProperties;
}

export function BouncingDots({
  size = 8,
  gap = 4,
  color = 'currentColor',
  duration = 0.9,
  ariaLabel = 'Loading',
  className,
  style,
}: BouncingDotsProps) {
  const reduced = useReducedMotionConfig();

  return (
    <span
      role="status"
      aria-label={ariaLabel || undefined}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap,
        lineHeight: 0,
        ...style,
      }}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          initial={false}
          animate={
            reduced
              ? { opacity: [1, 0.3, 1] }
              : { y: [0, -size * 0.7, 0] }
          }
          transition={
            reduced
              ? {
                  duration: duration * 1.5,
                  repeat: Infinity,
                  delay: i * (duration / 3),
                  ease: 'easeInOut',
                }
              : {
                  duration,
                  repeat: Infinity,
                  delay: i * (duration / 3),
                  ease: 'easeInOut',
                }
          }
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: color,
            display: 'inline-block',
          }}
        />
      ))}
    </span>
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

// Re-export motion and AnimatePresence so consumers can use framer-motion
// primitives without a second framer-motion import.
export { motion, AnimatePresence };
