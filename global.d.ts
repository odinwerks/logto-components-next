declare module '*.css';
declare module '*.scss';
declare module '*.sass';

export {};

// D12: Dashboard-open signal shared between LogtoProvider and AuthWatcher
// to suppress router.refresh() while the dashboard overlay is mounted.
declare global {
  interface Window {
    __LDD_DASHBOARD_OPEN__?: boolean;
  }
}
