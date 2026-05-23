import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    LogarithmicScale: {},
    PointElement: {},
    LineElement: {},
    BarElement: {},
    BarController: {},
    LineController: {},
    ScatterController: {},
    Title: {},
    Tooltip: {},
    Legend: {},
  };
});

vi.mock('react-chartjs-2', async () => {
  const React = await import('react');
  const Stub = React.forwardRef(() => <div data-testid="line-chart" />);
  return { Chart: Stub, Line: Stub, Scatter: Stub, Bar: Stub };
});

vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));
vi.mock('chartjs-plugin-annotation', () => ({ default: {} }));

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

  afterEach(() => {
    cleanup();
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

    // Reset lives in Settings → Experimental → Danger zone now. Open it via the
    // gear button, switch to that tab, then click the Reset button.
    const gearBtn = screen.getAllByLabelText(i18n.t('settings.aria'))[0];
    await user.click(gearBtn);
    const expTab = await screen.findByRole('tab', { name: i18n.t('settings.tabExperimental') });
    await user.click(expTab);
    const resetBtn = await screen.findByRole('button', { name: i18n.t('settings.resetButton') });
    await user.click(resetBtn);

    await waitFor(() => {
      expect(localStorage.getItem('uploadedFiles')).toBeNull();
      expect(localStorage.getItem('globalParsingConfig')).toBeNull();
      expect(screen.queryByText('saved.log')).not.toBeInTheDocument();
    });

    // Settings modal auto-closes on reset (onResetAll closes it). The step
    // keyword toggle in the sidebar should reflect the cleared state.
    expect(screen.getAllByLabelText(i18n.t('useStepKeyword'))[0]).not.toBeChecked();
  });
});

