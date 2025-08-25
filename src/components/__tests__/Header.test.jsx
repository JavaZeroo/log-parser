import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { Header } from '../Header';

  describe('Header', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('allows language selection and persists', async () => {
      const user = userEvent.setup();
      render(<Header />);
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('zh');
      await user.selectOptions(select, 'en');
      expect(select.value).toBe('en');
      expect(localStorage.getItem('language')).toBe('en');
    });
  });
