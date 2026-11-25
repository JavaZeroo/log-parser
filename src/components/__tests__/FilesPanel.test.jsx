import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { FilesPanel } from '../FilesPanel.jsx';
import i18n from '../../i18n';

describe('FilesPanel', () => {
  it('accepts repeated picker selections and drops from the empty state', async () => {
    const selected = vi.fn(files => Array.from(files));
    const user = userEvent.setup();
    render(<FilesPanel files={[]} onFilesSelected={selected} />);
    const input = screen.getByLabelText(i18n.t('fileUpload.aria'));
    const dropZone = screen.getByRole('button', { name: i18n.t('fileUpload.drag') });
    const file = new File(['loss: 1'], 'run.log');
    expect(screen.queryByRole('list')).toBeNull();
    await user.upload(input, file);
    await user.upload(input, file);
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
    expect(selected.mock.results.map(call => call.value)).toEqual([[file], [file], [file]]);
  });

  it('toggles, configures, removes and clears listed files', async () => {
    const file = { id: 'a', name: 'run.log', enabled: true };
    const onFileToggle = vi.fn();
    const onFileConfig = vi.fn();
    const onFileRemove = vi.fn();
    const onClearAll = vi.fn();
    const props = { files: [file], onFileToggle, onFileConfig, onFileRemove, onClearAll };
    const user = userEvent.setup();
    const { rerender } = render(<FilesPanel {...props} />);
    const config = screen.getByRole('button', { name: i18n.t('fileList.config', { name: file.name }) });
    await user.click(screen.getByRole('checkbox'));
    await user.click(config);
    await user.click(screen.getByRole('button', { name: i18n.t('fileList.delete', { name: file.name }) }));
    await user.click(screen.getByRole('button', { name: i18n.t('filesPanel.clearAll') }));
    expect(onFileToggle).toHaveBeenCalledWith(0, false);
    expect(onFileConfig).toHaveBeenCalledWith(file);
    expect(onFileRemove).toHaveBeenCalledWith(0);
    expect(onClearAll).toHaveBeenCalledOnce();
    rerender(<FilesPanel {...props} files={[{ ...file, enabled: false }]} />);
    expect(config).toBeDisabled();
  });

  it('shows worker progress on the active file until parsing finishes', () => {
    const file = { id: 'a', name: 'run.log', isParsing: true, progress: 0 };
    const { rerender } = render(<FilesPanel files={[file]} parseProgress={{ fileId: 'a', progress: 0.42 }} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    rerender(<FilesPanel files={[{ ...file, isParsing: false }]} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});
