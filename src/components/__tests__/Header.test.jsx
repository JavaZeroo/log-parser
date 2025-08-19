import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Header } from '../Header';

describe('Header', () => {
  it('renders nothing', () => {
    const { container } = render(<Header />);
    expect(container.firstChild).toBeNull();
  });
});
