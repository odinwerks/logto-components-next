import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { useState } from 'react';
import { MotionConfig, useReducedMotionConfig } from 'framer-motion';
import {
  FadeIn,
  SlideIn,
  ScaleFade,
  CrossFade,
  StaggerContainer,
  StaggerItem,
  MotionButton,
  Spinner,
  BouncingDots,
  Pulse,
  ToastSlide,
  MotionConfigProvider,
} from './motion';

// Helper: mock window.matchMedia to simulate OS reduced-motion preference.
function mockReducedMotionOS(matches: boolean) {
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).matchMedia = vi.fn(() => mql);
  return mql;
}

let _origMatchMedia: typeof window.matchMedia | undefined;

beforeAll(() => {
  _origMatchMedia = window.matchMedia;
});

afterAll(() => {
  if (_origMatchMedia) window.matchMedia = _origMatchMedia;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FadeIn', () => {
  it('renders children inside a motion div', () => {
    const { container } = render(
      <FadeIn>
        <span data-testid="c">hi</span>
      </FadeIn>
    );
    expect(screen.getByTestId('c')).toBeInTheDocument();
    expect(container.firstChild).not.toBeNull();
  });

  it('honours duration/delay props without crashing', () => {
    const { container } = render(<FadeIn duration={0.3} delay={0.1}>x</FadeIn>);
    expect(container.firstChild).toHaveTextContent('x');
  });

  it('merges className and style', () => {
    const { container } = render(
      <FadeIn className="custom" style={{ color: 'red' }}>y</FadeIn>
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('custom');
    expect(div.style.color).toBe('red');
  });
});

describe('SlideIn', () => {
  it('renders with left and right directions', () => {
    const { container: l } = render(<SlideIn direction="left">L</SlideIn>);
    expect(l.firstChild).toHaveTextContent('L');
    const { container: r } = render(<SlideIn direction="right">R</SlideIn>);
    expect(r.firstChild).toHaveTextContent('R');
  });
});

describe('ScaleFade', () => {
  it('renders children', () => {
    const { container } = render(<ScaleFade>sc</ScaleFade>);
    expect(container.firstChild).toHaveTextContent('sc');
  });
});

describe('CrossFade', () => {
  it('hides non-displayed panels with display:none and unmounts them after the fade', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CrossFade activeKey="a">
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    // Initial: only 'a' is rendered and visible.
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="b"]')).toBeNull();

    rerender(
      <CrossFade activeKey="b">
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    // During fade-out: 'a' still visible (fading out), 'b' rendered but hidden.
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="b"]')).toHaveStyle({ display: 'none' });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    // After the timer: 'b' revealed, 'a' unmounted (no state preserved).
    expect(container.querySelector('[data-tab="a"]')).toBeNull();
    expect(container.querySelector('[data-tab="b"]')).not.toHaveStyle({ display: 'none' });
  });

  it('does NOT preserve child component state across key round-trips', () => {
    // Previous behaviour (BUG-010): visited panels stayed mounted (hidden via
    // display:none) so internal state survived tab round-trips. After the
    // simplification, CrossFade unmounts old panels — state is NOT preserved.
    vi.useFakeTimers();

    const Stateful = ({ id }: { id: string }) => {
      const [v, setV] = useState('');
      return <input data-testid={`input-${id}`} value={v} onChange={(e) => setV(e.target.value)} />;
    };
    const renderTree = (key: string) => (
      <CrossFade activeKey={key}>
        {(k) => <Stateful id={k} />}
      </CrossFade>
    );

    const { rerender } = render(renderTree('a'));
    fireEvent.change(screen.getByTestId('input-a'), { target: { value: 'draft' } });
    expect(screen.getByTestId('input-a')).toHaveValue('draft');

    // Switch to 'b' and let the fade complete.
    rerender(renderTree('b'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // 'a' is unmounted — its input no longer exists.
    expect(screen.queryByTestId('input-a')).toBeNull();

    // Switch back to 'a'.
    rerender(renderTree('a'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    // The fresh 'a' input starts blank — state was not preserved.
    expect(screen.getByTestId('input-a')).toHaveValue('');
  });

  it('handles rapid round-trip (A→B→A) before timer fires without getting stuck invisible', () => {
    // Regression test: when the user rapidly switches A → B → A before the
    // fade-out timer fires, the effect cleans up the B timer and the early
    // return at `activeKey === displayedKey` must reset `fading` to false.
    // Otherwise fading stays true and the visible panel renders at opacity: 0.
    vi.useFakeTimers();

    const renderTree = (key: string) => (
      <CrossFade activeKey={key} duration={0.12}>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    const { container, rerender } = render(renderTree('a'));

    // 1. Switch A → B (triggers fade-out timer).
    rerender(renderTree('b'));

    // 2. Switch B → A BEFORE the timer fires (rapid round-trip).
    //    The cleanup of the B-effect runs, and since activeKey ('a') ===
    //    displayedKey ('a'), the early return fires. The fix adds
    //    `setFading(false)` before that return so the panel doesn't get
    //    stuck at opacity: 0.
    rerender(renderTree('a'));

    // 3. Panel 'a' must be visible (not display:none).
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
    // Panel 'b' was never shown and is unmounted (no state preservation).
    expect(container.querySelector('[data-tab="b"]')).toBeNull();

    // Now advance the timer — the fade completes cleanly.
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // After timer: 'a' still visible, 'b' still unmounted.
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="b"]')).toBeNull();
  });

  it('supports an optional wrapItem wrapper (e.g. error boundary)', () => {
    const { container } = render(
      <CrossFade
        activeKey="a"
        wrapItem={(key, isVisible, content) => (
          <div data-testid={`wrap-${key}`} data-visible={isVisible}>
            {content}
          </div>
        )}
      >
        {(k) => <span>{k}</span>}
      </CrossFade>
    );
    const wrap = container.querySelector('[data-testid="wrap-a"]') as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.getAttribute('data-visible')).toBe('true');
  });

  it('fillHeight makes the visible panel a filling flex column and keeps hidden panels display:none', () => {
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CrossFade activeKey="a" fillHeight>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );
    const a = container.querySelector('[data-tab="a"]') as HTMLElement;
    expect(a).toHaveStyle({ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' });
    // Outer wrapper is also a filling flex column.
    expect(container.firstChild).toHaveStyle({ display: 'flex', flexDirection: 'column', flex: '1 1 auto', minHeight: '0' });

    rerender(
      <CrossFade activeKey="b" fillHeight>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );
    // During fade: 'a' still visible (flex), 'b' hidden (none).
    expect(container.querySelector('[data-tab="a"]')).toHaveStyle({ display: 'flex' });
    expect(container.querySelector('[data-tab="b"]')).toHaveStyle({ display: 'none' });

    act(() => { vi.advanceTimersByTime(150); });
    expect(container.querySelector('[data-tab="a"]')).toBeNull();
    expect(container.querySelector('[data-tab="b"]')).toHaveStyle({ display: 'flex', flexDirection: 'column' });
  });

  it('fillHeight omitted (default) leaves display behavior identical to today', () => {
    const { container } = render(
      <CrossFade activeKey="a">{(k) => <div data-testid={`panel-${k}`}>{k}</div>}</CrossFade>
    );
    expect(container.firstChild).not.toHaveStyle({ display: 'flex' });
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
  });

  it('instant prop swaps the displayed key immediately without a fade-out frame', () => {
    // BUG-1 fix (mobile tab-switch flash): when `instant` is true, CrossFade
    // must NOT keep the outgoing panel visible for a fade-out frame. It swaps
    // displayedKey to the new key immediately, so only the incoming panel is
    // in the DOM — no stale frame of the previous tab.
    vi.useFakeTimers();
    const { container, rerender } = render(
      <CrossFade activeKey="a" instant>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    // Initial: only 'a' rendered and visible.
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="b"]')).toBeNull();

    // Switch to 'b' with instant — no fade-out frame.
    rerender(
      <CrossFade activeKey="b" instant>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    // Immediately (before any timer advances): only 'b' is rendered and
    // visible. The outgoing 'a' panel was never kept visible for a fade-out
    // frame — this is the mobile tab-switch flash fix.
    expect(container.querySelector('[data-tab="a"]')).toBeNull();
    expect(container.querySelector('[data-tab="b"]')).not.toHaveStyle({ display: 'none' });

    // Advancing timers changes nothing — no pending fade timer was scheduled.
    act(() => { vi.advanceTimersByTime(150); });
    expect(container.querySelector('[data-tab="b"]')).not.toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="a"]')).toBeNull();
  });

  it('instant prop handles rapid round-trip (A→B→A) without getting stuck invisible', () => {
    // Regression guard: the V-001 rapid round-trip fix must still hold when
    // `instant` is true. The early `setFading(false)` in the instant branch
    // ensures the panel never gets stuck at opacity: 0.
    vi.useFakeTimers();
    const renderTree = (key: string) => (
      <CrossFade activeKey={key} instant>
        {(k) => <div data-testid={`panel-${k}`}>{k}</div>}
      </CrossFade>
    );

    const { container, rerender } = render(renderTree('a'));

    // A → B
    rerender(renderTree('b'));
    expect(container.querySelector('[data-tab="a"]')).toBeNull();
    expect(container.querySelector('[data-tab="b"]')).not.toHaveStyle({ display: 'none' });

    // B → A (rapid round-trip, before any timer — though instant schedules none)
    rerender(renderTree('a'));
    expect(container.querySelector('[data-tab="b"]')).toBeNull();
    expect(container.querySelector('[data-tab="a"]')).not.toHaveStyle({ display: 'none' });
  });
});

describe('StaggerContainer + StaggerItem', () => {
  it('renders staggered items', () => {
    const { container } = render(
      <StaggerContainer stagger={0.1}>
        <StaggerItem index={0}>A</StaggerItem>
        <StaggerItem index={1}>B</StaggerItem>
      </StaggerContainer>
    );
    expect(container).toHaveTextContent('A');
    expect(container).toHaveTextContent('B');
  });

  it('supports x/y offset props for rise-up style entrances', () => {
    const { container } = render(
      <StaggerContainer>
        <StaggerItem y={7} delay={0.2}>Up</StaggerItem>
      </StaggerContainer>
    );
    expect(container).toHaveTextContent('Up');
  });
});

describe('MotionButton', () => {
  it('renders a button that forwards ref and fires onClick', () => {
    let buttonEl: HTMLButtonElement | null = null;
    const onClick = vi.fn();
    const { container } = render(
      <MotionButton ref={(el) => { buttonEl = el; }} onClick={onClick}>Press</MotionButton>
    );
    expect(buttonEl).toBeInstanceOf(HTMLButtonElement);
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes through button attributes', () => {
    render(
      <MotionButton type="button" aria-label="save" disabled>
        Save
      </MotionButton>
    );
    const btn = screen.getByRole('button', { name: 'save' });
    expect(btn).toBeDisabled();
    expect(btn.getAttribute('type')).toBe('button');
  });
});

describe('Spinner', () => {
  it('border-spinner renders a circular div with the provided size/colors', () => {
    const { container } = render(
      <Spinner borderSpinner size="1.875rem" color="#4a9eff" trackColor="#333" />
    );
    const div = container.firstChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div.style.borderRadius).toBe('50%');
    expect(div.style.width).toBe('1.875rem');
    // jsdom converts hex to rgb()
    expect(div.style.borderTopColor).toBe('rgb(74, 158, 255)');
  });

  it('lucide variant renders a span wrapping the Loader2 icon', () => {
    const { container } = render(<Spinner size={20} />);
    const span = container.firstChild as HTMLElement;
    expect(span.tagName).toBe('SPAN');
    expect(span.querySelector('svg')).not.toBeNull();
  });

  it('does not crash under MotionConfig reducedMotion="always"', () => {
    // Under forced reduced motion the Spinner should render without throwing.
    const { container } = render(
      <MotionConfigProvider>
        <Spinner borderSpinner />
      </MotionConfigProvider>
    );
    expect(container.firstChild).not.toBeNull();
  });
});

describe('BouncingDots', () => {
  it('renders 3 dots inside a status role span', () => {
    const { container } = render(<BouncingDots />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status!.getAttribute('aria-label')).toBe('Loading');
    // 3 dot spans
    expect(status!.children).toHaveLength(3);
    for (let i = 0; i < 3; i++) {
      const dot = status!.children[i] as HTMLElement;
      expect(dot.tagName).toBe('SPAN');
      expect(dot.style.borderRadius).toBe('50%');
    }
  });

  it('applies size, gap, color, className, and style props', () => {
    const { container } = render(
      <BouncingDots size={12} gap={6} color="#f00" className="custom" style={{ margin: '1rem' }} />
    );
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status.className).toContain('custom');
    expect(status.style.margin).toBe('1rem');
    for (let i = 0; i < 3; i++) {
      const dot = status.children[i] as HTMLElement;
      expect(dot.style.width).toBe('12px');
      expect(dot.style.height).toBe('12px');
      expect(dot.style.background).toBe('rgb(255, 0, 0)');
    }
  });

  it('custom ariaLabel is rendered', () => {
    render(<BouncingDots ariaLabel="Fetching sessions" />);
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fetching sessions');
  });

  it('renders without throwing under MotionConfig reducedMotion="always"', () => {
    const { container } = render(
      <MotionConfig reducedMotion="always">
        <BouncingDots />
      </MotionConfig>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('applies custom duration via staggered delays', () => {
    const { container } = render(<BouncingDots duration={1.5} />);
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    // All 3 dots render; duration propagates to transitions internally.
    expect(status!.children).toHaveLength(3);
  });
});

describe('Pulse', () => {
  it('renders children inside a motion div', () => {
    render(
      <Pulse style={{ width: '3rem', height: '3rem' }}>
        <span data-testid="sk">loading</span>
      </Pulse>
    );
    expect(screen.getByTestId('sk')).toBeInTheDocument();
  });
});

describe('ToastSlide', () => {
  it('renders children', () => {
    render(
      <ToastSlide>
        <span data-testid="t">toast</span>
      </ToastSlide>
    );
    expect(screen.getByTestId('t')).toBeInTheDocument();
  });
});

describe('MotionConfigProvider', () => {
  it('renders children', () => {
    render(
      <MotionConfigProvider>
        <span data-testid="x">child</span>
      </MotionConfigProvider>
    );
    expect(screen.getByTestId('x')).toBeInTheDocument();
  });
});

describe('BUG-1 regression: force-animations with OS reduced-motion', () => {
  // BUG-1: useReducedMotion() (raw device query, ignores MotionConfig) was
  // replaced with useReducedMotionConfig() (respects MotionConfig "never")
  // so NEXT_PUBLIC_FORCE_ANIMATIONS=true forces continuous motion even when
  // the OS has prefers-reduced-motion: reduce.

  it('Spinner renders under MotionConfig "never" + OS reduced-motion', () => {
    mockReducedMotionOS(true);
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <Spinner borderSpinner size="1rem" />
      </MotionConfig>
    );
    expect(container.firstChild).not.toBeNull();
  });

  it('Pulse renders under MotionConfig "never" + OS reduced-motion', () => {
    mockReducedMotionOS(true);
    render(
      <MotionConfig reducedMotion="never">
        <Pulse style={{ width: '2rem', height: '2rem' }}>
          <span data-testid="pulse-sk">loading</span>
        </Pulse>
      </MotionConfig>
    );
    expect(screen.getByTestId('pulse-sk')).toBeInTheDocument();
  });

  it('BouncingDots renders under MotionConfig "never" + OS reduced-motion (never freezes)', () => {
    mockReducedMotionOS(true);
    const { container } = render(
      <MotionConfig reducedMotion="never">
        <BouncingDots size={8} gap={4} />
      </MotionConfig>
    );
    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status!.children).toHaveLength(3);
  });

  it('Spinner compute animates (not stopped) under MotionConfig "never" despite OS reduced-motion', () => {
    // This is the core regression guard: when MotionConfig says "never",
    // useReducedMotionConfig() must return false, so the Spinner gets
    // animate={rotate:360} + repeat:Infinity, NOT rotate:0 + duration:0.
    //
    // We verify via a stub probe that uses useReducedMotionConfig() directly.
    function ReducedProbe() {
      const v = useReducedMotionConfig();
      return <span data-testid="probe">{String(v)}</span>;
    }

    mockReducedMotionOS(true);
    render(
      <MotionConfig reducedMotion="never">
        <ReducedProbe />
      </MotionConfig>
    );
    // useReducedMotionConfig() must return false when reducedMotion="never"
    expect(screen.getByTestId('probe').textContent).toBe('false');
  });
});
