import { useEffect, useRef } from 'react';

// Lightweight global shortcut hook.
// Usage:
//   useKeyboardShortcuts({
//     '?':       () => setHelpOpen(true),
//     'Escape':  () => closeAllOverlays(),
//     's':       () => setSidebarVisible(v => !v),
//     'mod+o':   () => fileInputRef.current?.click(),
//   })
//
// Key syntax:
//   - Plain letter/digit: 'a', '1'
//   - Special:            'Escape', '?', 'ArrowUp', etc.
//   - Modifiers (case-insensitive, joined by '+'):
//       'mod' = ⌘ on macOS, Ctrl elsewhere
//       'ctrl', 'meta', 'alt', 'shift'
//
// Behaviour:
//   - Listener is attached to `window` once.
//   - Shortcuts are ignored when focus is on an editable element (input,
//     textarea, contenteditable) unless the binding is 'Escape' — Escape
//     always reaches handlers so dialogs/menus can close.
//   - Latest bindings object is read via a ref so React state inside
//     handlers stays fresh without re-binding the listener every render.

const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  return false;
}

function normalizeBinding(binding) {
  // Preserve the key's original casing ('Escape' stays 'Escape') so the help
  // modal can render multi-char key names without ugly lower-cased labels.
  // Modifiers are matched case-insensitively.
  const parts = binding.split('+').map(p => p.trim());
  const key = parts.pop();
  const lowerMods = parts.map(p => p.toLowerCase());
  return {
    key,
    ctrl: lowerMods.includes('ctrl'),
    meta: lowerMods.includes('meta'),
    mod: lowerMods.includes('mod'),
    alt: lowerMods.includes('alt'),
    shift: lowerMods.includes('shift')
  };
}

function eventMatches(spec, event) {
  // Mod is ⌘ on Mac, Ctrl elsewhere.
  const needCtrl = spec.ctrl || (spec.mod && !isMac);
  const needMeta = spec.meta || (spec.mod && isMac);
  if (Boolean(event.ctrlKey) !== needCtrl) return false;
  if (Boolean(event.metaKey) !== needMeta) return false;
  if (Boolean(event.altKey) !== spec.alt) return false;
  // Shift is implied by some keys (e.g. '?'). Only enforce shift when explicit.
  if (spec.shift && !event.shiftKey) return false;

  const ek = event.key;
  const sk = spec.key;
  if (sk.length === 1) {
    // Single character: case-insensitive match.
    return ek.toLowerCase() === sk.toLowerCase();
  }
  return ek === sk || ek.toLowerCase() === sk.toLowerCase();
}

export function useKeyboardShortcuts(shortcuts, options = {}) {
  const ref = useRef(shortcuts);
  const optsRef = useRef(options);
  ref.current = shortcuts;
  optsRef.current = options;

  useEffect(() => {
    const handler = (event) => {
      const bindings = ref.current || {};
      const opts = optsRef.current || {};
      if (opts.enabled === false) return;

      const editable = isEditableTarget(event.target);

      for (const binding of Object.keys(bindings)) {
        const spec = normalizeBinding(binding);
        // Allow Escape through editable elements; block other shortcuts.
        if (editable && spec.key !== 'escape') continue;
        if (eventMatches(spec, event)) {
          const fn = bindings[binding];
          if (typeof fn === 'function') {
            event.preventDefault();
            fn(event);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}

// Helper to render a single shortcut binding as one or more <kbd>-friendly tokens.
// Returns a string array suitable for joining with '+'.
export function formatBinding(binding) {
  const spec = normalizeBinding(binding);
  const tokens = [];
  if (spec.mod) tokens.push(isMac ? '⌘' : 'Ctrl');
  if (spec.ctrl) tokens.push('Ctrl');
  if (spec.meta) tokens.push(isMac ? '⌘' : 'Meta');
  if (spec.alt) tokens.push(isMac ? '⌥' : 'Alt');
  if (spec.shift) tokens.push(isMac ? '⇧' : 'Shift');
  tokens.push(spec.key.length === 1 ? spec.key.toUpperCase() : spec.key);
  return tokens;
}
