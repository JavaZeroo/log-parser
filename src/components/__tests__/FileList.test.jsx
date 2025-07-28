import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, afterEach, describe, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { FileList } from '../FileList.jsx';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileList', () => {
  it('shows empty state when no files', () => {
    render(<FileList files={[]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    expect(screen.getByText('📂 暂无文件')).toBeInTheDocument();
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

    const configButton = screen.getByRole('button', { name: `配置文件 ${file.name}` });
    await user.click(configButton);
    expect(onFileConfig).toHaveBeenCalledWith(file);

    const removeButton = screen.getByRole('button', { name: `删除文件 ${file.name}` });
    await user.click(removeButton);
    expect(onFileRemove).toHaveBeenCalledWith(0);
  });

  it('disables config when file disabled', () => {
    const file = { id: '2', name: 'off.log', enabled: false };
    render(<FileList files={[file]} onFileRemove={vi.fn()} onFileToggle={vi.fn()} onFileConfig={vi.fn()} />);
    const configButton = screen.getByRole('button', { name: `配置文件 ${file.name}` });
    expect(configButton).toBeDisabled();
  });
});
