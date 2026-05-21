import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, afterEach, describe, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { FileList } from '../FileList.jsx';
import i18n from '../../i18n';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FileList', () => {
  it('shows empty state when no files', () => {
    render(<FileList files={[]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    expect(screen.getByText(i18n.t('fileList.empty'))).toBeInTheDocument();
  });

  it('renders file and triggers actions', async () => {
    const user = userEvent.setup();
    const file = { id: '1', name: 'test.log', enabled: true };
    const onFileRemove = vi.fn();
    const onFileToggle = vi.fn();
    const onFileConfig = vi.fn();
    render(<FileList files={[file]} onFileRemove={onFileRemove} onFileToggle={onFileToggle} onFileConfig={onFileConfig} />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(onFileToggle).toHaveBeenCalledWith(0, false);

    const configButton = screen.getByRole('button', { name: i18n.t('fileList.config', { name: file.name }) });
    await user.click(configButton);
    expect(onFileConfig).toHaveBeenCalledWith(file);

    const removeButton = screen.getByRole('button', { name: i18n.t('fileList.delete', { name: file.name }) });
    await user.click(removeButton);
    expect(onFileRemove).toHaveBeenCalledWith(0);
  });

  it('disables config when file disabled', () => {
    const file = { id: '2', name: 'off.log', enabled: false };
    render(<FileList files={[file]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    const configButton = screen.getByRole('button', { name: i18n.t('fileList.config', { name: file.name }) });
    expect(configButton).toBeDisabled();
  });

  it('renders progress bar while parsing', () => {
    const file = { id: '3', name: 'wip.log', enabled: true, isParsing: true, progress: 0.42 };
    render(<FileList files={[file]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('omits progress bar when not parsing', () => {
    const file = { id: '4', name: 'done.log', enabled: true, isParsing: false, progress: 1 };
    render(<FileList files={[file]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
