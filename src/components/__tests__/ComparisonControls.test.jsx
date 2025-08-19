import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonControls } from '../ComparisonControls';

describe('ComparisonControls', () => {
  it('calls handler when mode changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <ComparisonControls compareMode="normal" onCompareModeChange={handleChange} />
    );

    const absoluteOption = screen.getByLabelText(/平均误差 \(absolute\)/);
    await user.click(absoluteOption);
    expect(handleChange).toHaveBeenCalledWith('absolute');
  });
});
