'use client';

import { useEffect } from 'react';

export default function ScrollToSection({ section }: { section: string }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      const element = document.getElementById(section);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [section]);

  return null;
}
