import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { FileUpload } from '../FileUpload';

function stubFileReader(result) {
  class FileReaderMock {
    constructor() {
      this.onload = null;
    }
    readAsText() {
      this.onload({ target: { result } });
    }
  }
  global.FileReader = FileReaderMock;
}

describe('FileUpload', () => {
  it('handles selection and drag-and-drop uploads', async () => {
    stubFileReader('file-content');
    const onFilesUploaded = vi.fn();
    const user = userEvent.setup();
    render(<FileUpload onFilesUploaded={onFilesUploaded} />);

    const input = screen.getByLabelText('选择日志文件，支持所有文本格式');
    const file = new File(['hello'], 'test.log', { type: 'text/plain' });
    await user.upload(input, file);
    await waitFor(() => expect(onFilesUploaded).toHaveBeenCalledTimes(1));
    const uploaded = onFilesUploaded.mock.calls[0][0][0];
    expect(uploaded.content).toBe('file-content');

    onFilesUploaded.mockClear();
    const dropArea = screen.getAllByRole('button', { name: /文件上传/ })[0];
    fireEvent.dragEnter(dropArea, { dataTransfer: { files: [file] } });
    fireEvent.dragOver(dropArea, { dataTransfer: { files: [file] } });
    fireEvent.dragLeave(dropArea, { dataTransfer: { files: [file] } });
    fireEvent.drop(dropArea, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(onFilesUploaded).toHaveBeenCalledTimes(1));
  });
});
