'use client';

import React from 'react';
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

  return (
    <div style={appStyle}>
      {/* Global CSS override to make page paddings fully responsive in portrait/mobile mode */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 768px) or (orientation: portrait) {
          .docs-content-container > div {
            padding: 1.25rem 1rem 5rem !important;
          }
        }
      `}} />

      {!isPortrait && <Sidebar items={NAV_ITEMS} />}
      <div 
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
