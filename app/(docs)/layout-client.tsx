'use client';

import React, { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useIsPortrait } from '../logto-kit';
import Sidebar from '../demo/Sidebar';
import MobileDocsNav from '../demo/MobileDocsNav';
import { NAV_ITEMS } from '../demo/nav-data';

const appStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
};

export default function DocsLayoutClient({ children }: { children: React.ReactNode }) {
  const isPortrait = useIsPortrait();
  const pathname = usePathname();
  const contentContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = contentContainerRef.current;
    if (!container) return;
    container.scrollTop = 0;
  }, [pathname]);

  return (
    <div style={appStyle}>
      {/* Global CSS override to make page paddings fully responsive in portrait/mobile mode */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) or (orientation: portrait) {
          .docs-content-container > div {
            padding: 1.25rem 1rem 5rem !important;
          }
          .docs-content-container table {
            display: block !important;
            width: 100% !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
          }
        }
      `}} />

      {!isPortrait && <Sidebar items={NAV_ITEMS} />}
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
      {isPortrait && <MobileDocsNav />}
    </div>
  );
}
