import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, expect, afterEach, describe, it, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useStore } from '../../store';
import { FileUpload } from '../FileUpload.jsx';

// Mock the store
const processGlobalFiles = vi.fn();
vi.mock('../../store', () => ({
  useStore: vi.fn(selector => selector({ processGlobalFiles })),
}));

function mockFileReader(text) {
  const onload = vi.fn();
  const readAsText = vi.fn(function () {
    this.onload({ target: { result: text } });
  });
  globalThis.FileReader = vi.fn(() => ({ onload, readAsText }));
}

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFileReader('content');
  });

  it('uploads files and calls the store action', async () => {
    const file = new File(['content'], 'test.log', { type: 'text/plain' });
    render(<FileUpload />);

    const input = screen.getByLabelText('选择日志文件，支持所有文本格式');
    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(processGlobalFiles).toHaveBeenCalledOnce();
    });

    const calledWith = processGlobalFiles.mock.calls[0][0];
    expect(calledWith[0]).toBe(file);
  });
});
