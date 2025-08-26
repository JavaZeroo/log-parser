import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Header } from '../Header';

  describe('Header', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('allows language selection and persists', async () => {
      const user = userEvent.setup();
      render(<Header />);
      const enButton = screen.getByRole('button', { name: 'English' });
      expect(enButton).toHaveAttribute('aria-pressed', 'false');
      expect(localStorage.getItem('language')).toBe('zh');
      await user.click(enButton);
      expect(enButton).toHaveAttribute('aria-pressed', 'true');
      expect(localStorage.getItem('language')).toBe('en');
    });
  });
