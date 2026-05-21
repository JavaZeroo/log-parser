import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../../App.jsx';
import i18n from '../../i18n';

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
    Decimation: {},
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

describe('App configuration persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and restores config from localStorage', async () => {
    stubFileReader('loss: 1');
    const user = userEvent.setup();

    const { unmount } = render(<App />);

    const input = screen.getByLabelText(i18n.t('fileUpload.aria'));
    const file = new File(['hello'], 'test.log', { type: 'text/plain' });
    await user.upload(input, file);

    const stepToggle = screen.getAllByLabelText(i18n.t('useStepKeyword'))[0];
    await user.click(stepToggle);
    const stepInput = screen.getByPlaceholderText(i18n.t('placeholder.step'));
    fireEvent.change(stepInput, { target: { value: 'iter:' } });

    await waitFor(() => expect(JSON.parse(localStorage.getItem('uploadedFiles'))).toHaveLength(1));
    await waitFor(() => {
      const cfg = JSON.parse(localStorage.getItem('globalParsingConfig'));
      expect(cfg.stepKeyword).toBe('iter:');
      expect(cfg.useStepKeyword).toBe(true);
    });

    unmount();

    render(<App />);

    expect(await screen.findByText('test.log')).toBeInTheDocument();
    const restoredToggle = screen.getAllByLabelText(i18n.t('useStepKeyword'))[0];
    expect(restoredToggle).toBeChecked();
    const restoredInput = screen.getByPlaceholderText(i18n.t('placeholder.step'));
    expect(restoredInput.value).toBe('iter:');
  });

  it('resets config and clears localStorage', async () => {
    localStorage.setItem('globalParsingConfig', JSON.stringify({ metrics: [], useStepKeyword: true, stepKeyword: 'foo:' }));
    localStorage.setItem('uploadedFiles', JSON.stringify([
      {
        id: '1',
        name: 'saved.log',
        enabled: true,
        content: 'loss:1',
        config: { metrics: [], dataRange: { start: 0, end: undefined, useRange: false }, useStepKeyword: true, stepKeyword: 'foo:' }
      }
    ]));

    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('saved.log')).toBeInTheDocument();
    expect(screen.getAllByLabelText(i18n.t('useStepKeyword'))[0]).toBeChecked();

    const resetButtons = screen.getAllByRole('button', { name: i18n.t('resetConfig') });
    for (const btn of resetButtons) {
      await user.click(btn);
    }

    await waitFor(() => {
      expect(localStorage.getItem('uploadedFiles')).toBeNull();
      expect(localStorage.getItem('globalParsingConfig')).toBeNull();
      expect(screen.queryByText('saved.log')).not.toBeInTheDocument();
    });

    expect(screen.getAllByLabelText(i18n.t('useStepKeyword'))[0]).not.toBeChecked();
  });
});

