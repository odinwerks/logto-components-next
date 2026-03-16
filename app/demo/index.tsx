'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import ContentArea from './ContentArea';
import { NAV_ITEMS } from './nav-data';

const appStyle: React.CSSProperties = {
  display: 'flex',
  height: '100vh',
  overflow: 'hidden',
};

export default function DemoApp() {
  const [activeId, setActiveId] = useState('dashboard');

  const activeItem = NAV_ITEMS.find((item) => item.id === activeId) || NAV_ITEMS[0];

  return (
    <div style={appStyle}>
      <Sidebar
        items={NAV_ITEMS}
        activeId={activeId}
        onSelect={setActiveId}
      />
      <ContentArea key={activeId} item={activeItem} />
    </div>
  );
}
