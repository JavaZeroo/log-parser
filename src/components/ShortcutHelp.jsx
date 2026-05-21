import React, { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatBinding } from '../utils/useKeyboardShortcuts.js';

// Visual representation of one or more keys, optionally joined by '+'.
function KeyCombo({ binding }) {
  const tokens = formatBinding(binding);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={binding}>
      {tokens.map((tok, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-400 dark:text-gray-500 text-xs">+</span>}
          <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 text-[11px] font-medium font-mono text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-[inset_0_-1px_0_rgb(0,0,0,0.06)]">
            {tok}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

// Display a sequence of bindings, e.g. ['g', 'd'] = press g then d.
function KeySequence({ keys }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-gray-400 dark:text-gray-500 text-xs">then</span>}
          <KeyCombo binding={k} />
        </React.Fragment>
      ))}
    </span>
  );
}

export function ShortcutHelp({ isOpen, onClose, groups }) {
  const { t } = useTranslation();
  const closeBtnRef = useRef(null);

  // Send focus to the close button on open so screen readers announce the
  // dialog, and Escape always lands somewhere useful.
  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 drag-overlay-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-help-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto drag-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Keyboard size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="shortcut-help-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('shortcuts.title')}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('shortcuts.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {groups.map((group) => (
            <section key={group.title} aria-labelledby={`group-${group.title}`}>
              <h3
                id={`group-${group.title}`}
                className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2"
              >
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300"
                  >
                    <span>{item.label}</span>
                    {item.sequence
                      ? <KeySequence keys={item.sequence} />
                      : <KeyCombo binding={item.key} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {t('shortcuts.hint')}
        </div>
      </div>
    </div>
  );
}
