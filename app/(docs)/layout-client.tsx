'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '../demo/Sidebar';
import MobileDocsNav from '../demo/MobileDocsNav';
import { NAV_ITEMS } from '../demo/nav-data';

const appStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
};

export default function DocsLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;
    container.scrollTop = 0;
  }, [pathname]);

  return (
    <div style={appStyle}>
      <div className="desktop-only-sidebar">
        <Sidebar items={NAV_ITEMS} />
      </div>
      <div 
        ref={contentContainerRef}
        className="docs-content-container" 
        style={{ 
          flex: 1, 
          overflowY: 'auto', 
          background: 'var(--ldd-bg-page)',
        }}
      >
        {children}
      </div>
      <div className="mobile-only-nav">
        <MobileDocsNav />
      </div>
    </div>
  );
}
