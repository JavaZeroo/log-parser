import { useState, useEffect } from 'react';

// Tiny hook that persists a section's open/closed state to localStorage.
// Keyed by section id so each card remembers independently across reloads.
export function useCollapsedSection(id, defaultOpen = true) {
  const [open, setOpen] = useState(() => {
    if (!id) return defaultOpen;
    try {
      const stored = localStorage.getItem(`ui.section.${id}`);
      if (stored === null) return defaultOpen;
      return stored === '1';
    } catch {
      return defaultOpen;
    }
  });

  useEffect(() => {
    if (!id) return;
    try {
      localStorage.setItem(`ui.section.${id}`, open ? '1' : '0');
    } catch {
      /* ignore quota errors */
    }
  }, [id, open]);

  return [open, setOpen];
}
