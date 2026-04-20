import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../../App.jsx';
import i18n from '../../i18n';
import { clearAll } from '../../utils/storage.js';

// Mock chart.js and react-chartjs-2 to avoid canvas requirements
vi.mock('chart.js', () => {
  const Chart = {
    register: vi.fn(),
    defaults: { plugins: { legend: { labels: { generateLabels: vi.fn(() => []) } } } }
  };
  return {
    Chart,
    ChartJS: Chart,
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    Title: {},
    Tooltip: {},
    Legend: {},
  };
});

vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  return {
    Line: React.forwardRef(() => <div data-testid="line-chart" />)
  };
});

vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));

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

describe('Global config override', () => {
  beforeEach(async () => {
    localStorage.clear();
    await clearAll();
  });

  it('retains file metric config after global change', async () => {
    stubFileReader('train_loss: 1');
    const user = userEvent.setup();

    render(<App />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText(i18n.t('fileUpload.aria'));
    const file = new File(['train_loss: 1'], 'a.log', { type: 'text/plain' });
    await user.upload(input, file);

    await screen.findByText('a.log');

    const configBtn = screen.getByLabelText(i18n.t('fileList.config', { name: 'a.log' }));
    await user.click(configBtn);

    const modal = screen.getByRole('dialog');
    const keywordInputs = within(modal).getAllByPlaceholderText('keyword');
    await user.clear(keywordInputs[0]);
    await user.type(keywordInputs[0], 'train_loss:');

    const saveBtn = screen.getByText(i18n.t('configModal.save'));
    await user.click(saveBtn);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Update global config
    const globalKeyword = screen.getAllByPlaceholderText('keyword')[0];
    await user.clear(globalKeyword);
    await user.type(globalKeyword, 'val_loss:');
    expect(globalKeyword.value).toBe('val_loss:');

    // Reopen file config to verify keyword remains
    const configBtn2 = screen.getByLabelText(i18n.t('fileList.config', { name: 'a.log' }));
    await user.click(configBtn2);

    const modal2 = screen.getByRole('dialog');
    const updatedInputs = within(modal2).getAllByPlaceholderText('keyword');
    expect(updatedInputs[0].value).toBe('train_loss:');
  });
});

