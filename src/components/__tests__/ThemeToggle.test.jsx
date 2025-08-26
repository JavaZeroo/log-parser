import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';
import i18n from '../../i18n';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('cycles through system, light, and dark themes', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: i18n.t('themeToggle.aria') });

    // system mode should follow matchMedia (dark)
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // light mode
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // dark mode
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // back to system (still dark)
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
