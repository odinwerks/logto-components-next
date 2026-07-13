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
  it('hides non-displayed panels with display:none and reveals them after the fade', () => {
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

    // After the timer: 'b' revealed, 'a' hidden.
    expect(container.querySelector('[data-tab="a"]')).toHaveStyle({ display: 'none' });
    expect(container.querySelector('[data-tab="b"]')).not.toHaveStyle({ display: 'none' });
  });

  it('preserves child component state across key round-trips', () => {
    // The BUG-010 regression guard: visited panels stay mounted (hidden via
    // display:none) so their internal state survives tab round-trips.
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
    // 'a' is hidden but still mounted → its input keeps the draft value.
    expect(screen.getByTestId('input-a')).toHaveValue('draft');

    // Switch back to 'a'.
    rerender(renderTree('a'));
    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(screen.getByTestId('input-a')).toHaveValue('draft');
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
