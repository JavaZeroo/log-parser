import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, expect, afterEach, describe, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

import { FileUpload } from '../FileUpload.jsx';

function mockFileReader(text) {
  const onload = vi.fn();
  const readAsText = vi.fn(function () {
    this.onload({ target: { result: text } });
  });
  globalThis.FileReader = vi.fn(() => ({ onload, readAsText }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FileUpload', () => {
  it('uploads files and calls callback', async () => {
    const onFilesUploaded = vi.fn();
    mockFileReader('content');
    const file = new File(['content'], 'test.log', { type: 'text/plain' });
    render(<FileUpload onFilesUploaded={onFilesUploaded} />);

    const input = screen.getByLabelText('选择日志文件，支持所有文本格式');
    await fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(onFilesUploaded).toHaveBeenCalled());
    const uploaded = onFilesUploaded.mock.calls[0][0][0];
    expect(uploaded.name).toBe('test.log');
    expect(uploaded.content).toBe('content');
  });
});
