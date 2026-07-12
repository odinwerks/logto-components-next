import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FadeIn, SlideIn, Spinner, Pulse, StaggerContainer, StaggerItem } from './animations';

// Default: no matchMedia → reduced motion is false (animations apply)

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('FadeIn', () => {
  it('applies ldd-fade-in class when motion is allowed', () => {
    mockMatchMedia(false);
    const { container } = render(<FadeIn>Content</FadeIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('ldd-fade-in');
  });

  it('does not apply animation class when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(<FadeIn>Content</FadeIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain('ldd-fade-in');
  });

  it('overrides animation duration via prop', () => {
    mockMatchMedia(false);
    const { container } = render(<FadeIn duration={0.3}>Content</FadeIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.style.animationDuration).toBe('0.3s');
  });

  it('merges className and style', () => {
    mockMatchMedia(false);
    const { container } = render(
      <FadeIn className="custom" style={{ color: 'red' }}>Content</FadeIn>
    );
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('ldd-fade-in');
    expect(div.className).toContain('custom');
    expect(div.style.color).toBe('red');
  });
});

describe('SlideIn', () => {
  it('applies ldd-slide-in-right class by default', () => {
    mockMatchMedia(false);
    const { container } = render(<SlideIn>Content</SlideIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('ldd-slide-in-right');
  });

  it('applies ldd-slide-in-left class when direction is left', () => {
    mockMatchMedia(false);
    const { container } = render(<SlideIn direction="left">Content</SlideIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('ldd-slide-in-left');
  });

  it('does not apply animation class when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(<SlideIn>Content</SlideIn>);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain('ldd-slide-in');
  });
});

describe('Spinner', () => {
  it('renders a lucide Loader2 icon with ldd-spin class', () => {
    mockMatchMedia(false);
    const { container } = render(<Spinner size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('class')).toContain('ldd-spin');
  });

  it('renders a border-spinner div with ldd-spin class', () => {
    mockMatchMedia(false);
    const { container } = render(
      <Spinner borderSpinner size="1.875rem" color="#4a9eff" trackColor="#333" />
    );
    const div = container.firstChild as HTMLElement;
    expect(div.tagName).toBe('DIV');
    expect(div.className).toContain('ldd-spin');
    // jsdom converts hex colors to rgb() format
    expect(div.style.borderTopColor).toBe('rgb(74, 158, 255)');
    expect(div.style.width).toBe('1.875rem');
  });

  it('does not apply ldd-spin class when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(<Spinner size={16} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).not.toContain('ldd-spin');
  });

  it('does not apply ldd-spin class to border-spinner when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(<Spinner borderSpinner />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain('ldd-spin');
  });
});

describe('Pulse', () => {
  it('applies ldd-pulse class when motion is allowed', () => {
    mockMatchMedia(false);
    const { container } = render(<Pulse style={{ width: '3rem', height: '3rem' }} />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).toContain('ldd-pulse');
    expect(div.style.width).toBe('3rem');
  });

  it('sets animation delay via prop', () => {
    mockMatchMedia(false);
    const { container } = render(<Pulse delay={0.15} />);
    const div = container.firstChild as HTMLElement;
    expect(div.style.animationDelay).toBe('0.15s');
  });

  it('does not apply animation class when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(<Pulse />);
    const div = container.firstChild as HTMLElement;
    expect(div.className).not.toContain('ldd-pulse');
  });

  it('renders children when provided', () => {
    mockMatchMedia(false);
    render(<Pulse><span data-testid="child">Loading</span></Pulse>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

describe('StaggerContainer + StaggerItem', () => {
  it('applies ldd-stagger class with computed delay from index', () => {
    mockMatchMedia(false);
    const { container } = render(
      <StaggerContainer stagger={0.1}>
        <StaggerItem index={2}>Item</StaggerItem>
      </StaggerContainer>
    );
    const item = container.querySelector('.ldd-stagger') as HTMLElement;
    expect(item).not.toBeNull();
    expect(item.style.animationDelay).toBe('0.2s'); // 2 * 0.1
  });

  it('uses absolute delay prop when provided', () => {
    mockMatchMedia(false);
    const { container } = render(
      <StaggerContainer stagger={0.1}>
        <StaggerItem delay={0.5}>Item</StaggerItem>
      </StaggerContainer>
    );
    const item = container.querySelector('.ldd-stagger') as HTMLElement;
    expect(item.style.animationDelay).toBe('0.5s');
  });

  it('supports custom animation class', () => {
    mockMatchMedia(false);
    const { container } = render(
      <StaggerContainer>
        <StaggerItem animation="ldd-demo-rise-up">Item</StaggerItem>
      </StaggerContainer>
    );
    const item = container.querySelector('.ldd-demo-rise-up') as HTMLElement;
    expect(item).not.toBeNull();
  });

  it('does not apply animation class when reduced motion is preferred', () => {
    mockMatchMedia(true);
    const { container } = render(
      <StaggerContainer>
        <StaggerItem index={1}>Item</StaggerItem>
      </StaggerContainer>
    );
    const item = container.firstChild?.firstChild as HTMLElement;
    expect(item.className).not.toContain('ldd-stagger');
  });
});
