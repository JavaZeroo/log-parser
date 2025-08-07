import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useStore } from '../../store';
import { FileList } from '../FileList.jsx';

// Mock the store
const mockHandleFileRemove = vi.fn();
const mockHandleFileToggle = vi.fn();
const mockHandleFileConfig = vi.fn();

vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

const mockUseStore = useStore;

describe('FileList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no files', () => {
    mockUseStore.mockImplementation(selector => selector({
      uploadedFiles: [],
      handleFileRemove: mockHandleFileRemove,
      handleFileToggle: mockHandleFileToggle,
      handleFileConfig: mockHandleFileConfig,
    }));
    render(<FileList />);
    expect(screen.getByText('📂 暂无文件')).toBeInTheDocument();
  });

  it('renders file and triggers actions', async () => {
    const user = userEvent.setup();
    const file = { id: '1', name: 'test.log', enabled: true };
    mockUseStore.mockImplementation(selector => selector({
      uploadedFiles: [file],
      handleFileRemove: mockHandleFileRemove,
      handleFileToggle: mockHandleFileToggle,
      handleFileConfig: mockHandleFileConfig,
    }));

    render(<FileList />);

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(mockHandleFileToggle).toHaveBeenCalledWith(0, false);

    const configButton = screen.getByRole('button', { name: `配置文件 ${file.name}` });
    await user.click(configButton);
    expect(mockHandleFileConfig).toHaveBeenCalledWith(file);

    const removeButton = screen.getByRole('button', { name: `删除文件 ${file.name}` });
    await user.click(removeButton);
    expect(mockHandleFileRemove).toHaveBeenCalledWith(0);
  });

  it('disables config when file disabled', () => {
    const file = { id: '2', name: 'off.log', enabled: false };
    mockUseStore.mockImplementation(selector => selector({
      uploadedFiles: [file],
      handleFileRemove: mockHandleFileRemove,
      handleFileToggle: mockHandleFileToggle,
      handleFileConfig: mockHandleFileConfig,
    }));
    render(<FileList />);
    const configButton = screen.getByRole('button', { name: `配置文件 ${file.name}` });
    expect(configButton).toBeDisabled();
  });
});
