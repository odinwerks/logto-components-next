import '@testing-library/jest-dom';

process.env.APP_SECRET = 'dummy-secret';

// Framer Motion (used by app/logto-kit/components/shared/motion.tsx) measures
// layout for shared `layoutId` animations and relies on ResizeObserver /
// IntersectionObserver. jsdom does not implement them, so provide no-op
// stubs so tests that render motion components (e.g. the dashboard seeker)
// don't throw or emit noisy warnings.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = NoopObserver;
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoopObserver;
}
