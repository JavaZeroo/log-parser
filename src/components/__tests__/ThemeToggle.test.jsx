import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  it('toggles dark class on document element', () => {
    document.documentElement.classList.remove('dark');
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: '切换主题' });
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
