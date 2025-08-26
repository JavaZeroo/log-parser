import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ComparisonControls } from '../ComparisonControls';
import i18n from '../../i18n';

describe('ComparisonControls', () => {
  it('triggers callbacks for mode, strategy, and baseline changes', async () => {
    const user = userEvent.setup();
    const handleMode = vi.fn();
    const handleBaseline = vi.fn();
    const handleStrategy = vi.fn();
    const files = [{ name: 'a.log' }, { name: 'b.log' }];

    render(
      <ComparisonControls
        compareMode="normal"
        onCompareModeChange={handleMode}
        files={files}
        baseline="a.log"
        onBaselineChange={handleBaseline}
        multiFileMode="baseline"
        onMultiFileModeChange={handleStrategy}
      />
    );

    const absoluteOption = screen.getByLabelText(i18n.t('comparison.absolute'), { exact: false });
    await user.click(absoluteOption);
    expect(handleMode).toHaveBeenCalledWith('absolute');

    const strategySelect = screen.getByLabelText(i18n.t('comparison.multiFileMode'));
    await user.selectOptions(strategySelect, 'pairwise');
    expect(handleStrategy).toHaveBeenCalledWith('pairwise');

    const baselineSelect = screen.getByLabelText(i18n.t('comparison.baselineFile'));
    await user.selectOptions(baselineSelect, 'b.log');
    expect(handleBaseline).toHaveBeenCalledWith('b.log');
  });
});
