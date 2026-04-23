'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useThemeMode } from '../../logto-kit/components/handlers/preferences';

// ─── Context ─────────────────────────────────────────────────────────────────

interface SectionContextValue {
  register: (id: number) => void;
  unregister: (id: number) => void;
  currentIdx: number;
  total: number;
  next: () => void;
  prev: () => void;
}

const SectionContext = createContext<SectionContextValue | null>(null);

function useSectionContext() {
  const ctx = useContext(SectionContext);
  if (!ctx) throw new Error('useSectionContext must be used inside <SectionContainer>');
  return ctx;
}

// ─── SectionContainer ────────────────────────────────────────────────────────

interface SectionContainerProps {
  children: ReactNode;
}

export function SectionContainer({ children }: SectionContainerProps) {
  const [sections, setSections] = useState<number[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);

  const register = useCallback((id: number) => {
    setSections((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      next.sort((a, b) => a - b);
      return next;
    });
  }, []);

  const unregister = useCallback((id: number) => {
    setSections((prev) => prev.filter((s) => s !== id));
  }, []);

  const total = sections.length;

  const next = useCallback(() => {
    setCurrentIdx((i) => (i < total - 1 ? i + 1 : i));
  }, [total]);

  const prev = useCallback(() => {
    setCurrentIdx((i) => (i > 0 ? i - 1 : i));
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIdx((i) => (i < total - 1 ? i + 1 : i));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIdx((i) => (i > 0 ? i - 1 : i));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [total]);

  // Clamp currentIdx
  useEffect(() => {
    if (total > 0 && currentIdx >= total) setCurrentIdx(total - 1);
  }, [total, currentIdx]);

  const ctx: SectionContextValue = { register, unregister, currentIdx, total, next, prev };

  return (
    <SectionContext value={ctx}>
      <div ref={viewportRef} style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          transform: `translateY(-${currentIdx * 100}%)`,
          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}>
          {children}
        </div>
      </div>
      {total > 1 && <SectionNav />}
    </SectionContext>
  );
}

// ─── Section ─────────────────────────────────────────────────────────────────

interface SectionProps {
  id: number;
  children: ReactNode;
}

export function Section({ id, children }: SectionProps) {
  const ctx = useSectionContext();

  useEffect(() => {
    ctx.register(id);
    return () => ctx.unregister(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      flexShrink: 0,
      overflowY: 'auto',
      overflowX: 'auto',
    }}>
      {children}
    </div>
  );
}

// ─── SectionNav ──────────────────────────────────────────────────────────────

function SectionNav() {
  const { currentIdx, total, next, prev } = useSectionContext();
  const { theme } = useThemeMode();
  const atStart = currentIdx === 0;
  const atEnd = currentIdx === total - 1;
  const isDark = theme === 'dark';

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: isDark ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.92)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
    borderRadius: '6px',
    cursor: 'pointer',
    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
    transition: 'color 0.15s ease, background 0.15s ease',
    backdropFilter: 'blur(8px)',
    padding: 0,
    outline: 'none',
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '28px',
      right: '28px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
      zIndex: 100,
    }}>
      <button
        style={{ ...btnStyle, opacity: atStart ? 0.25 : 1, cursor: atStart ? 'not-allowed' : 'pointer' }}
        onClick={() => { if (!atStart) prev(); }}
        disabled={atStart}
        title="Previous (ArrowUp)"
      >
        <ChevronUp size={14} strokeWidth={2} />
      </button>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '0.5625rem',
        color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
        letterSpacing: '0.05em',
        userSelect: 'none',
      }}>
        {currentIdx + 1}/{total}
      </span>
      <button
        style={{ ...btnStyle, opacity: atEnd ? 0.25 : 1, cursor: atEnd ? 'not-allowed' : 'pointer' }}
        onClick={() => { if (!atEnd) next(); }}
        disabled={atEnd}
        title="Next (ArrowDown)"
      >
        <ChevronDown size={14} strokeWidth={2} />
      </button>
    </div>
  );
}