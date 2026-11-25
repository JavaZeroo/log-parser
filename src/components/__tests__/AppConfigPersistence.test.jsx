import React from 'react';
import { render, screen, waitFor, fireEvent, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../../App.jsx';
import i18n from '../../i18n';
import * as storage from '../../utils/fileStorage.js';
import * as anomalies from '../../utils/anomalyDetection.js';
import { parseLog } from '../../utils/parseLog.js';

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

  it('waits for hydration and recovers source-only and metrics-only files across two reloads', async ({ onTestFinished }) => {
    const config = { metrics: [{ name: 'Loss', mode: 'keyword', keyword: 'loss:' }], useStepKeyword: true };
    const points = [{ x: 100, y: 2 }, { x: 200, y: 1 }];
    const initial = [
      { id: 'a', name: 'small.log', content: 'step: 100 loss: 2\nstep: 200 loss: 1', config },
      { id: 'b', name: 'large.log', content: null, isLargeFile: true, metricsData: { Loss: points }, config }
    ];
    let finishLoad;
    const load = vi.spyOn(storage, 'loadFiles').mockImplementationOnce(() => new Promise(resolve => { finishLoad = resolve; }));
    const save = vi.spyOn(storage, 'saveFiles');
    const parsed = [];
    const post = vi.spyOn(Worker.prototype, 'postMessage').mockImplementation(function ({ payload }) {
      const metricsData = parseLog(payload.content, payload.config);
      parsed.push({ fileId: payload.fileId, metricsData });
      this.onmessage({ data: { type: 'PARSE_COMPLETE', payload: { fileId: payload.fileId, metricsData } } });
    });
    onTestFinished(() => { load.mockRestore(); save.mockRestore(); post.mockRestore(); });
    for (let i = 0; i < 2; i++) {
      const { unmount } = render(<App />);
      if (i === 0) {
        expect(save).not.toHaveBeenCalled();
        finishLoad(initial);
      }
      await screen.findByRole('checkbox', { name: i18n.t('filesPanel.enabledAria', { name: 'large.log' }) });
      await waitFor(() => expect(parsed).toHaveLength(i + 1));
      expect(parsed[i]).toEqual({ fileId: 'a', metricsData: { Loss: points } });
      const saved = JSON.parse(localStorage.getItem('uploadedFiles'));
      expect(saved[1]).toMatchObject({ content: null, isLargeFile: true, metricsData: { Loss: points } });
      unmount();
    }
  });

  it('renames cached series without a parse and keeps the configured step axis', async ({ onTestFinished }) => {
    const metric = { name: '', mode: 'keyword', keyword: 'loss:' };
    const config = { metrics: [metric], useStepKeyword: true, stepKeyword: 'iter:' };
    const points = [{ x: 100, y: 2 }, { x: 300, y: 1 }];
    localStorage.setItem('globalParsingConfig', JSON.stringify(config));
    localStorage.setItem('uploadedFiles', JSON.stringify([
      { id: 'large', name: 'cache.log', config, content: null, isLargeFile: true, metricsData: { loss: points } }
    ]));
    const post = vi.spyOn(Worker.prototype, 'postMessage');
    onTestFinished(() => post.mockRestore());
    render(<App />);
    await screen.findByText('cache.log');
    fireEvent.change(screen.getByLabelText(i18n.t('regex.metricName')), { target: { value: 'Train loss' } });
    await waitFor(() => {
      const [file] = JSON.parse(localStorage.getItem('uploadedFiles'));
      expect(file.metricsData).toEqual({ 'Train loss': points });
      expect(file.config).toMatchObject({ useStepKeyword: true, stepKeyword: 'iter:' });
      expect(JSON.parse(localStorage.getItem('globalParsingConfig'))).toEqual(file.config);
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('updates progress without rewriting files and scans for anomalies only when enabled', async ({ onTestFinished }) => {
    stubFileReader('loss: 1');
    const post = vi.spyOn(Worker.prototype, 'postMessage');
    const save = vi.spyOn(storage, 'saveFiles');
    const detect = vi.spyOn(anomalies, 'detectAnomalies');
    onTestFinished(() => {
      post.mockRestore();
      save.mockRestore();
      detect.mockRestore();
    });
    const user = userEvent.setup();
    render(<App />);
    await user.upload(screen.getByLabelText(i18n.t('fileUpload.aria')), new File(['loss: 1'], 'run.log'));
    const { fileId } = post.mock.calls[0][0].payload;
    const worker = post.mock.instances[0];
    save.mockClear();
    act(() => worker.onmessage({ data: { type: 'PARSE_PROGRESS', payload: { fileId, progress: 0.5 } } }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(save).not.toHaveBeenCalled();
    const points = [{ x: 0, y: 1 }];
    act(() => worker.onmessage({ data: { type: 'PARSE_COMPLETE', payload: { fileId, metricsData: { Loss: points } } } }));
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(detect).not.toHaveBeenCalled();

    await user.click(screen.getByLabelText(i18n.t('settings.aria')));
    await user.click(screen.getByRole('tab', { name: i18n.t('settings.tabExperimental') }));
    await user.click(screen.getByRole('checkbox', { name: new RegExp(i18n.t('anomalies.title')) }));
    expect(detect).toHaveBeenCalledWith(points);
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

    expect(await screen.findByText('saved.log')).toBeInTheDocument();
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

