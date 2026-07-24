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
// CrossFade — simple crossfade transition between panels
//
// Renders only the currently active panel. During a key change, the outgoing
// panel fades out while the incoming panel renders (hidden) alongside it, then
// the old panel unmounts and the new one fades in. No state is preserved across
// tab switches — each unmounted panel loses its internal state (form drafts,
// verification state, etc.).
//
// `wrapItem` lets consumers inject per-panel wrappers (e.g. an error boundary
// that resets when visibility changes) without mounting/unmounting children
// during the same-key renders.
// ─────────────────────────────────────────────────────────────────────────────

interface CrossFadeProps {
  activeKey: string;
  className?: string;
  /** Fade duration in seconds (default 0.12). */
  duration?: number;
  /**
   * When true, swap the displayed panel instantly with no fade-out frame.
   * Used by the mobile shell (full-viewport tabpanel) where the 50ms
   * fade-out of the outgoing panel reads as a jarring flash of the previous
   * tab. When `instant` is true, no `setTimeout` is scheduled and `fading`
   * never flips — `displayedKey` is set to `activeKey` synchronously, so
   * only the incoming panel is in the DOM at any time.
   *
   * The V-001 rapid round-trip (A→B→A) fix is preserved: when `instant` is
   * true and `activeKey === displayedKey`, the effect still calls
   * `setFading(false)` before returning, so a panel can never get stuck at
   * opacity: 0.
   */
  instant?: boolean;
  /**
   * When true, the outer wrapper and the currently-visible panel become a
   * flex column that fills its parent's height (flex:1 1 auto; minHeight:0).
   * Used only by the Security tab so its danger zone can pin to the bottom.
   *
   * @deprecated Use `fillHeightKeys` instead for correct crossfade behavior.
   *   When `fillHeight` is a static boolean driven by the *incoming* `activeKey`,
   *   the outgoing panel loses its flex container context mid-fade. The per-key
   *   `fillHeightKeys` array derives fill behaviour from `displayedKey` so the
   *   outgoing panel keeps its layout until the fade completes.
   */
  fillHeight?: boolean;
  /**
   * Per-key fillHeight behaviour. When the currently displayed key
   * (`displayedKey`) matches any entry in this array, the wrapper and that
   * panel become a flex column during the fade so the layout does not
   * collapse mid-transition.  Only the *displayed* (visible) panel gets the
   * fill; kept-but-hidden panels stay collapsed.
   */
  fillHeightKeys?: string[];
  /**
   * Keys that should ALWAYS be rendered (hidden via `display:none` when not
   * active), preserving their internal state and hook subscriptions across
   * tab switches. The shell maintains this set (e.g. visited tabs). Keys
   * not in this set use the existing unmount-on-switch behavior.
   *
   * Use to avoid re-fetching/re-mounting tabs the user has already visited.
   * Combined with the instant-fetch `initialData` pattern, a visited tab's
   * `use()` of an already-resolved promise is synchronous (no Suspense flash)
   * and its hook state survives the round-trip.
   *
   * Additive: when omitted, `CrossFade` behaves exactly as today (no kept
   * panels). Only visited tabs stay mounted — unvisited tabs (e.g. Sessions,
   * Security on first load) do NOT mount until the user opens them, so their
   * lazy fetches (MFA, sessions) don't fire on page load.
   */
  keepMountedKeys?: string[];
  /** Render function returning the content for a given key. */
  children: (key: string) => ReactNode;
  /** Optional per-item wrapper (e.g. error boundary). */
  wrapItem?: (key: string, isVisible: boolean, children: ReactNode) => ReactNode;
}

export function CrossFade({ activeKey, className, duration = 0.12, instant = false, fillHeight, fillHeightKeys, keepMountedKeys, children, wrapItem }: CrossFadeProps) {
  const [displayedKey, setDisplayedKey] = useState<string>(activeKey);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */

    if (activeKey === displayedKey) {
      // Rapid round-trip (A → B → A): reset fading so the panel doesn't stay
      // stuck at opacity: 0. Runs for both `instant` and the normal fade path
      // (V-001 fix).
      setFading(false);
      return;
    }

    if (instant) {
      // BUG-1 fix (mobile tab-switch flash): skip the fade-out frame entirely.
      // Swap `displayedKey` to the incoming key synchronously and keep
      // `fading` false, so only the new panel is rendered — no stale frame of
      // the outgoing tab. No `setTimeout` is scheduled.
      setDisplayedKey(activeKey);
      setFading(false);
      return;
    }

    setFading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const timer = setTimeout(() => {
      setDisplayedKey(activeKey);
      setFading(false);
    }, Math.round(duration * 1000));

    return () => clearTimeout(timer);
  }, [activeKey, displayedKey, duration, instant]);

  // Derive fillHeight from displayedKey (not activeKey) so the outgoing
  // panel keeps its flex container context until the fade completes (BUG-L04).
  const isFillHeight = fillHeight === true || (fillHeightKeys != null && fillHeightKeys.includes(displayedKey));

  // When fillHeight is on, the wrapper chain becomes a flex column so a child
  // tab can fill the tabpanel height (used by SecurityTab's sticky footer).
  const wrapperStyle: CSSProperties | undefined = isFillHeight
    ? { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }
    : undefined;

  // Only render the displayed panel (plus the incoming panel during fade).
  // When `keepMountedKeys` is provided, also keep those panels mounted
  // (hidden via display:none) so their internal state and hook
  // subscriptions survive tab switches — even DURING a fade (the 50ms
  // fade-out frame must not unmount kept panels, or their state is lost).
  const extraKept =
    keepMountedKeys?.filter((k) => k !== displayedKey && k !== activeKey) ?? [];
  const renderKeys = fading
    ? [displayedKey, activeKey, ...extraKept]
    : keepMountedKeys && keepMountedKeys.length > 0
      ? [displayedKey, ...keepMountedKeys.filter((k) => k !== displayedKey)]
      : [displayedKey];
  const uniqueKeys = [...new Set(renderKeys)];

  return (
    <div className={className} style={wrapperStyle}>
      {uniqueKeys.map((key) => {
        const isDisplayed = key === displayedKey;
        // During fade: outgoing (displayed) panel fades to 0, incoming hidden.
        const opacity = isDisplayed ? (fading ? 0 : 1) : 0;
        const content = children(key);

        // A kept-mounted-but-not-displayed panel (from `keepMountedKeys`)
        // gets `display:none` + `aria-hidden`. A displayed panel keeps its
        // existing display/fillHeight behavior. During a fade, the incoming
        // panel is hidden via `display:none` until the fade completes.
        const isKeptMounted = !isDisplayed && !!keepMountedKeys && keepMountedKeys.includes(key);
        const itemStyle: CSSProperties =
          isFillHeight && isDisplayed
            ? { display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: 0 }
            : isKeptMounted
              ? { display: 'none' }
              : { display: isDisplayed ? undefined : 'none' };

        return (
          <motion.div
            key={key}
            data-tab={key}
            data-kept-mounted={isKeptMounted ? 'true' : undefined}
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
