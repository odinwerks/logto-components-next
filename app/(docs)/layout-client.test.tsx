import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

let pathname = '/topic-a/section-one';

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

vi.mock('../logto-kit', () => ({
  useIsPortrait: () => false,
}));

vi.mock('../demo/nav-data', () => ({
  NAV_ITEMS: [],
}));

vi.mock('../demo/Sidebar', () => ({
  default: () => <aside data-testid="sidebar" />,
}));

vi.mock('../demo/MobileDocsNav', () => ({
  default: () => <nav data-testid="mobile-nav" />,
}));

import DocsLayoutClient from './layout-client';

describe('DocsLayoutClient scroll restoration', () => {
  it('resets docs container scrollTop when pathname changes', () => {
    const { rerender } = render(
      <DocsLayoutClient>
        <div style={{ height: '2000px' }}>Long docs content</div>
      </DocsLayoutClient>
    );

    const container = document.querySelector('.docs-content-container') as HTMLDivElement;
    container.scrollTop = 280;

    pathname = '/topic-a/section-two';
    rerender(
      <DocsLayoutClient>
        <div style={{ height: '2000px' }}>Long docs content</div>
      </DocsLayoutClient>
    );

    expect(container.scrollTop).toBe(0);
  });

  it('renders both sidebar and mobile nav unconditionally in the DOM to avoid layout flash', () => {
    const { queryByTestId } = render(
      <DocsLayoutClient>
        <div>Content</div>
      </DocsLayoutClient>
    );

    expect(queryByTestId('sidebar')).not.toBeNull();
    expect(queryByTestId('mobile-nav')).not.toBeNull();
  });

  it('wraps sidebar and mobile nav in responsive layout divs', () => {
    const { container } = render(
      <DocsLayoutClient>
        <div>Content</div>
      </DocsLayoutClient>
    );

    const desktopWrapper = container.querySelector('.desktop-only-sidebar');
    const mobileWrapper = container.querySelector('.mobile-only-nav');

    expect(desktopWrapper).not.toBeNull();
    expect(desktopWrapper!.querySelector('[data-testid="sidebar"]')).not.toBeNull();

    expect(mobileWrapper).not.toBeNull();
    expect(mobileWrapper!.querySelector('[data-testid="mobile-nav"]')).not.toBeNull();
  });
});
