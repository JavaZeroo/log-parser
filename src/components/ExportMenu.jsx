import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, ChevronDown, Check } from 'lucide-react';

// Single "Export ▾" button that collapses several export actions into one
// menu. Two trigger variants:
//   - default: text + chevron (used in chart panels)
//   - iconOnly: pure icon button (used in the sidebar header utility row)
//
// items: Array<{ label, icon: LucideIcon, onClick, hint? }>
// variant 'default' = bordered card-style trigger (used inside chart panels);
// variant 'ghost' = borderless icon+text trigger (used in sidebar header).
export function ExportMenu({
  items,
  label = 'Export',
  align = 'right',
  icon: TriggerIcon = Download,
  iconOnly = false,
  tooltip,
  variant = 'default'
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const firstItemRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click + Escape. The chart toolbar lives inside a card so
  // we listen at document level rather than the local element.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    // Move focus into the menu so keyboard users can arrow-navigate.
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const onItemClick = (item) => {
    close();
    item.onClick?.();
  };

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          iconOnly
            ? 'p-1 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded'
            : variant === 'ghost'
              ? 'inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
              : 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={iconOnly ? (tooltip || label) : undefined}
        title={tooltip || label}
      >
        <TriggerIcon size={iconOnly ? 15 : 12} aria-hidden="true" />
        {!iconOnly && (
          <>
            <span>{label}</span>
            <ChevronDown
              size={11}
              className={`transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-30 min-w-[180px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg overflow-hidden`}
        >
          {items.map((item, i) => {
            const Icon = item.icon || Check;
            return (
              <button
                key={item.label}
                ref={i === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                onClick={() => onItemClick(item)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-gray-700"
              >
                <Icon size={13} className="text-gray-500 dark:text-gray-400 shrink-0" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.hint && (
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">{item.hint}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
