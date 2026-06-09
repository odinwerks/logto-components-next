'use client';

import { ReactNode } from 'react';

// ─── SectionContainer ────────────────────────────────────────────────────────

interface SectionContainerProps {
  children: ReactNode;
}

export function SectionContainer({ children }: SectionContainerProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '32px',
      paddingBottom: '160px',
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
    }}>
      {children}
    </div>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  id?: number;
  children: ReactNode;
}

export function Section({ id: _id, children }: SectionProps) {
  return (
    <div style={{
      width: '100%',
    }}>
      {children}
    </div>
  );
}
