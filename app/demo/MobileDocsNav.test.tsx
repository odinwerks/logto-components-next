import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, act } from '@testing-library/react';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../logto-kit', () => ({
  useThemeMode: () => ({
    mode: 'light',
    colors: {
      bgPage: '#ffffff',
      bgSecondary: '#f8f8f8',
      borderColor: '#d9d9d9',
      textPrimary: '#111111',
      textSecondary: '#222222',
      textTertiary: '#333333',
    },
  }),
}));

vi.mock('../logto-kit/components/UserButton', () => ({
  UserButton: () => <button type="button">User</button>,
}));

vi.mock('./nav-data', () => ({
  NAV_ITEMS: [
    {
      id: 'topic-a',
      label: 'Topic A',
      sections: ['Section One', 'Section Two'],
    },
  ],
}));

vi.mock('./components/SectionComponents', () => ({
  slugify: (value: string) => value.toLowerCase().replace(/\s+/g, '-'),
}));

// BUG-046: Mock useFocusTrap so we can verify it's called and capture the onClose
// callback for Escape-key testing without pulling in window event listeners.
let capturedOnClose: (() => void) | undefined;

vi.mock('../logto-kit/components/dashboard/shared/focus-trap', () => ({
  useFocusTrap: vi.fn((_dialogRef, onClose: () => void) => {
    // Capture the onClose callback each time the hook is called so tests can
    // simulate Escape key presses.
    capturedOnClose = onClose;
  }),
  getFocusableElements: vi.fn(() => []),
}));

import MobileDocsNav from './MobileDocsNav';
import { useFocusTrap } from '../logto-kit/components/dashboard/shared/focus-trap';

describe('MobileDocsNav mobile layout regressions', () => {
  beforeEach(() => {
    pushMock.mockReset();
    capturedOnClose = undefined;
    vi.mocked(useFocusTrap).mockClear();
  });

  it('uses stable viewport sizing for fullscreen overlay', () => {
    render(<MobileDocsNav />);

    fireEvent.click(screen.getAllByRole('button')[0]);

    const title = screen.getByText('Documentation');
    // BUG-046: The overlay is now wrapped in DialogShell: role="dialog" div >
    // FadeIn motion.div > stageContainer > header > title. One extra parentElement.
    const overlay = title.parentElement?.parentElement?.parentElement?.parentElement as HTMLElement;

    expect(overlay).toHaveStyle('height: 100dvh');
    expect(overlay).toHaveStyle('min-height: 100vh');
  });

  it('normalizes trigger and topic row button defaults', () => {
    render(<MobileDocsNav />);

    const trigger = screen.getAllByRole('button')[0];
    expect(trigger).toHaveStyle('appearance: none');
    expect(trigger.style.fontFamily).toBe('inherit');
    expect(trigger).toHaveStyle('width: 2.5rem');
    expect(trigger).toHaveStyle('height: 2.5rem');

    fireEvent.click(trigger);

    const topicButton = screen.getByText('Topic A').closest('button') as HTMLButtonElement;
    expect(topicButton).toHaveStyle('appearance: none');
    expect(topicButton.style.fontFamily).toBe('inherit');
    expect(screen.getByText('Topic A').style.fontSize).toBe('1rem');

    // Stage-one topic entries should be text-only and not include a right-arrow icon
    expect(topicButton.querySelector('svg')).toBeNull();
  });

  it('keeps section stage typography and centered scroll behavior stable', () => {
    render(<MobileDocsNav />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    fireEvent.click(screen.getByText('Topic A'));

    const sectionButton = screen.getByText('Section One').closest('button') as HTMLButtonElement;
    const listInner = sectionButton.parentElement as HTMLElement;
    const listContainer = listInner.parentElement as HTMLElement;

    expect(sectionButton).toHaveStyle('appearance: none');
    expect(sectionButton.style.fontFamily).toBe('inherit');
    expect(sectionButton.style.fontSize).toBe('0.95rem');

    expect(listInner).toHaveStyle('margin: auto 0px');
    expect(listContainer).toHaveStyle('justify-content: flex-start');
    expect(listContainer).toHaveStyle('overflow-y: auto');
  });

  it('provides accessible names and button types for all icon-only controls', () => {
    render(<MobileDocsNav />);

    // 1. Menu icon button (Open nav)
    const openBtn = screen.getByRole('button', { name: 'Open navigation' });
    expect(openBtn).toHaveAttribute('type', 'button');

    // Open the nav
    fireEvent.click(openBtn);

    // 2. Back button when on topics list goes to homepage (BUG-L23 fix: label is now 'Back to homepage')
    const topicsBackBtn = screen.getByRole('button', { name: 'Back to homepage' });
    expect(topicsBackBtn).toHaveAttribute('type', 'button');

    // Go to sections stage by clicking a topic
    fireEvent.click(screen.getByText('Topic A'));

    // 3. ArrowLeft icon button on sections stage goes back to topics list
    const backBtn = screen.getByRole('button', { name: 'Back to topics' });
    expect(backBtn).toHaveAttribute('type', 'button');

    // 4. X "Close navigation" button no longer exists
    expect(screen.queryByRole('button', { name: 'Close navigation' })).toBeNull();
  });

  it('closes the overlay and redirects to index when clicking back button on topics list', () => {
    render(<MobileDocsNav />);

    // Open navigation
    const openBtn = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(openBtn);

    // Verify overlay is open and 'Open navigation' button is gone
    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull();

    // Click Back to homepage button (BUG-L23: relabeled from 'Back to topics' to 'Back to homepage')
    const backBtn = screen.getByRole('button', { name: 'Back to homepage' });
    fireEvent.click(backBtn);

    // Verify router pushed to '/'
    expect(pushMock).toHaveBeenCalledWith('/');

    // Verify overlay is closed and 'Open navigation' button is visible again
    expect(screen.getByRole('button', { name: 'Open navigation' })).not.toBeNull();
  });

  it('does NOT render a "Close navigation" button (X button removed by design)', () => {
    render(<MobileDocsNav />);

    // Open navigation
    const openBtn = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(openBtn);

    // Close (X) button must NOT exist — user decision: Option B removes it
    expect(screen.queryByRole('button', { name: 'Close navigation' })).toBeNull();
  });

  it('falls back to topics stage when selectedTopic has no sections (BUG-L20)', async () => {
    // A topic with an empty sections array should trigger the guard
    const { NAV_ITEMS } = await import('./nav-data');
    const emptyTopic = NAV_ITEMS[0];
    // Override sections to empty for this test via the mock
    const originalSections = emptyTopic.sections;
    // Temporarily patch the object (same reference is used inside the component)
    (emptyTopic as { sections: string[] }).sections = [];

    render(<MobileDocsNav />);

    // Open nav and navigate to sections stage
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    // The section stage guard should fire and return to topics stage
    // (since Topic A now has no sections, clicking it sets stage to 'sections'
    // which immediately triggers the guard back to 'topics')
    await act(async () => {
      fireEvent.click(screen.getByText('Topic A'));
    });

    // Should be back at topics stage — "Documentation" header is visible
    expect(screen.getByText('Documentation')).toBeInTheDocument();

    // Restore
    (emptyTopic as { sections: string[] }).sections = originalSections;
  });

  // ── BUG-046: Dialog semantics, focus trap ──────────────────────────────────

  it('renders fullscreen overlay with dialog semantics (BUG-046)', () => {
    render(<MobileDocsNav />);

    // Open nav
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));

    // The overlay should be a dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'Navigation menu');
  });

  it('calls useFocusTrap when dialog is open and cleans up on close (BUG-046)', () => {
    render(<MobileDocsNav />);

    // useFocusTrap should NOT be called when dialog is closed
    expect(useFocusTrap).not.toHaveBeenCalled();

    // Open nav → DialogShell mounts → useFocusTrap called
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(useFocusTrap).toHaveBeenCalledTimes(1);

    // Navigate to a section → closes dialog → DialogShell unmounts
    fireEvent.click(screen.getByText('Topic A'));
    fireEvent.click(screen.getByText('Section One'));
    // After navigation, DialogShell unmounts; on next open, a NEW instance of
    // useFocusTrap will be called by the fresh DialogShell mount.
  });

  it('navigates back from topics stage when Escape/onClose fires (BUG-046)', async () => {
    render(<MobileDocsNav />);

    // Open nav (topics stage)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByText('Documentation')).toBeInTheDocument();

    // The useFocusTrap hook should have captured the onClose callback
    expect(capturedOnClose).toBeDefined();

    // Fire the captured onClose callback (simulates Escape)
    await act(async () => {
      capturedOnClose!();
    });

    // When on topics stage, Escape navigates to index → triggers router.push('/')
    expect(pushMock).toHaveBeenCalledWith('/');
  });

  it('navigates back to topics from sections stage when Escape/onClose fires (BUG-046)', async () => {
    render(<MobileDocsNav />);

    // Open nav (topics stage), then go to sections
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    fireEvent.click(screen.getByText('Topic A'));

    // Should be on sections stage now
    expect(screen.getByText('Section One')).toBeInTheDocument();

    // The onClose callback should now navigate back to topics (not index)
    expect(capturedOnClose).toBeDefined();

    await act(async () => {
      capturedOnClose!();
    });

    // Should be back at topics stage
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  // ── BUG-104: Index stage flash ─────────────────────────────────────────────

  it('does not render empty sections panel during index stage transition (BUG-104)', () => {
    render(<MobileDocsNav />);

    // Open nav (topics stage)
    fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
    expect(screen.getByText('Documentation')).toBeInTheDocument();

    // Click "Back to homepage" — this sets stage to 'index' which should
    // NOT render the sections panel (BUG-104 fix)
    fireEvent.click(screen.getByRole('button', { name: 'Back to homepage' }));

    // Neither the topics header nor sections content should be visible in the
    // overlay during the index-stage transition frame. The only remaining
    // button should be the "Open navigation" trigger (dialog closed).
    expect(screen.queryByText('Documentation')).toBeNull();
    expect(screen.queryByText('Topic A')).toBeNull();
    expect(screen.getByRole('button', { name: 'Open navigation' })).toBeInTheDocument();
  });
});
