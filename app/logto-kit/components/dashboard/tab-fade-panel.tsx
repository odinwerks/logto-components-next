'use client';

import { useState, useEffect } from 'react';
import type { TabId } from './types';
import { TabErrorBoundary } from './shared/TabErrorBoundary';

const FADE_OUT_MS = 100;

interface TabFadePanelProps {
  activeTab: TabId;
  prefersReducedMotion: boolean;
  fallback: React.ReactNode;
  className?: string;
  children: (tabId: TabId) => React.ReactNode;
}

/**
 * Preserves mounted tab state across switches while playing a very fast
 * fade-out/fade-in transition. Previously a `key={activeTab}` wrapper caused
 * the entire active tab subtree to remount on every switch, discarding form
 * drafts and verification state.
 */
export function TabFadePanel({
  activeTab,
  prefersReducedMotion,
  fallback,
  className = 'dashboard-tabpanel-content',
  children,
}: TabFadePanelProps) {
  const [displayedTab, setDisplayedTab] = useState<TabId>(activeTab);
  const [isFading, setIsFading] = useState(false);
  const [renderedTabs, setRenderedTabs] = useState<Set<TabId>>(() => new Set([activeTab]));

  useEffect(() => {
    if (activeTab === displayedTab) {
      return;
    }

    // Track every tab that has ever been displayed so its component state
    // survives when the user switches away and later returns.
    setRenderedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      return new Set([...prev, activeTab]);
    });

    if (prefersReducedMotion) {
      setDisplayedTab(activeTab);
      return;
    }

    setIsFading(true);
    const timer = setTimeout(() => {
      setDisplayedTab(activeTab);
      setIsFading(false);
    }, FADE_OUT_MS);

    return () => clearTimeout(timer);
  }, [activeTab, displayedTab, prefersReducedMotion]);

  return (
    <div className={className}>
      {Array.from(renderedTabs).map((tabId) => {
        const isDisplayed = tabId === displayedTab;
        const animationClass =
          prefersReducedMotion || !isDisplayed
            ? undefined
            : isFading
              ? 'ldd-tab-fade-out'
              : 'ldd-tab-fade-in';

        return (
          <div
            key={tabId}
            data-tab={tabId}
            className={animationClass}
            style={{ display: isDisplayed ? undefined : 'none' }}
          >
            <TabErrorBoundary
              // Reset the boundary when a previously hidden tab becomes visible
              // so a transient render error does not persist across visits.
              resetKey={`${tabId}-${isDisplayed ? 'visible' : 'hidden'}`}
              fallback={fallback}
            >
              {children(tabId)}
            </TabErrorBoundary>
          </div>
        );
      })}
    </div>
  );
}
