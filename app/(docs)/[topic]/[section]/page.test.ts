import { describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '../../../demo/nav-data';

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

import DocPage from './page';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

describe('docs section content registry', () => {
  it('resolves every anatomy nav-data section without falling into notFound', async () => {
    const anatomyNavItem = NAV_ITEMS.find((item) => item.id === 'anatomy');

    expect(anatomyNavItem).toBeDefined();

    for (const sectionName of anatomyNavItem!.sections) {
      const sectionSlug = slugify(sectionName);

      await expect(
        DocPage({
          params: Promise.resolve({
            topic: 'anatomy',
            section: sectionSlug,
          }),
        })
      ).resolves.toBeDefined();

      expect(notFoundMock, `Unexpected notFound for anatomy/${sectionSlug}`).not.toHaveBeenCalled();
    }
  });
});
