import { describe, it, expect } from 'vitest';
import { formatBinding } from '../useKeyboardShortcuts';

// formatBinding is pure and platform-aware; we exercise the platform-neutral
// paths since jsdom's navigator.platform isn't macOS-like by default.

describe('formatBinding', () => {
  it('returns the uppercase letter for single-key bindings', () => {
    expect(formatBinding('s')).toEqual(['S']);
  });

  it('returns the verbatim name for special keys', () => {
    expect(formatBinding('Escape')).toEqual(['Escape']);
  });

  it('orders modifiers before the key', () => {
    const tokens = formatBinding('shift+k');
    expect(tokens[tokens.length - 1]).toBe('K');
    expect(tokens.length).toBe(2);
  });

  it('handles digit keys', () => {
    expect(formatBinding('1')).toEqual(['1']);
  });
});
