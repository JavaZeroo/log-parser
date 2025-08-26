import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonControls } from '../ComparisonControls';
import i18n from '../../i18n';

describe('ComparisonControls', () => {
  it('calls handler when mode changes', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <ComparisonControls compareMode="normal" onCompareModeChange={handleChange} />
    );

    const absoluteOption = screen.getByLabelText(i18n.t('comparison.absolute'), { exact: false });
    await user.click(absoluteOption);
    expect(handleChange).toHaveBeenCalledWith('absolute');
  });
});
