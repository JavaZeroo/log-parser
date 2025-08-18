import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, expect, describe, it } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Mock react-chartjs-2 Line component
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart" />
}));

// Mock chart.js to avoid heavy setup
vi.mock('chart.js', () => {
  const Chart = { register: vi.fn(), defaults: { plugins: { legend: { labels: { generateLabels: () => [] } } } } };
  return {
    ChartJS: Chart,
    Chart,
    CategoryScale: {},
    LinearScale: {},
    PointElement: {},
    LineElement: {},
    Title: {},
    Tooltip: {},
    Legend: {}
  };
});

vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));

import ChartContainer, { getComparisonData, getActiveElementsAtStep, syncHoverToCharts } from '../ChartContainer.jsx';

const sampleFile = {
  name: 'test.log',
  id: '1',
  content: 'loss: 1\nloss: 2',
};

const metric = { name: 'loss', mode: 'keyword', keyword: 'loss:' };

function renderComponent(props = {}) {
  const onXRangeChange = vi.fn();
  const onMaxStepChange = vi.fn();
  const result = render(
    <ChartContainer
      files={[]}
      metrics={[]}
      compareMode="normal"
      onXRangeChange={onXRangeChange}
      onMaxStepChange={onMaxStepChange}
      {...props}
    />
  );
  return { ...result, onXRangeChange, onMaxStepChange };
}

describe('ChartContainer', () => {
  it('shows empty message when no files', () => {
    renderComponent();
    expect(screen.getByText('📊 暂无数据')).toBeInTheDocument();
  });

  it('shows metric selection message when no metrics', () => {
    renderComponent({ files: [sampleFile] });
    expect(screen.getByText('🎯 请选择要显示的图表')).toBeInTheDocument();
  });

    it('renders charts and triggers callbacks', async () => {
      const { onXRangeChange, onMaxStepChange } = renderComponent({ files: [sampleFile], metrics: [metric] });
      expect(await screen.findByText('📊 loss')).toBeInTheDocument();
      await waitFor(() => {
        expect(onMaxStepChange).toHaveBeenCalledWith(1);
        expect(onXRangeChange).toHaveBeenCalled();
      });
      const cb = onXRangeChange.mock.calls[0][0];
      expect(cb({})).toEqual({ min: 0, max: 1 });
    });

  it('uses step keyword for x positions when enabled', async () => {
      const file = { name: 's.log', id: '2', content: 'step: 2 loss: 1\nstep: 4 loss: 2' };
      const { onXRangeChange, onMaxStepChange } = renderComponent({ files: [file], metrics: [metric], useStepKeyword: true, stepKeyword: 'step:' });
      await waitFor(() => {
        expect(onMaxStepChange).toHaveBeenCalledWith(4);
        expect(onXRangeChange).toHaveBeenCalled();
      });
      const cb = onXRangeChange.mock.calls[0][0];
      expect(cb({})).toEqual({ min: 2, max: 4 });
    });

    it('expands range when only a single overlapping step exists', async () => {
      const files = [
        { name: 'a.log', id: 'a', content: 'step:1 loss:1\nstep:2 loss:2\nstep:3 loss:3' },
        { name: 'b.log', id: 'b', content: 'step:2 loss:4\nstep:3 loss:5' },
        { name: 'c.log', id: 'c', content: 'step:3 loss:6\nstep:4 loss:7' }
      ];
      const { onXRangeChange } = renderComponent({ files, metrics: [metric], useStepKeyword: true, stepKeyword: 'step:' });
      await waitFor(() => {
        expect(onXRangeChange).toHaveBeenCalled();
      });
      const cb = onXRangeChange.mock.calls.at(-1)[0];
      expect(cb({})).toEqual({ min: 2, max: 4 });
    });

    it('computes comparison only on overlapping steps', () => {
      const d1 = [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }];
      const d2 = [{ x: 2, y: 2 }, { x: 3, y: 4 }, { x: 4, y: 5 }];
      const res = getComparisonData(d1, d2, 'normal');
      expect(res).toEqual([
        { x: 2, y: 0 },
        { x: 3, y: 1 }
      ]);
    });

    it('finds active elements by step value', () => {
      const datasets = [
        { data: [{ x: 2, y: 1 }, { x: 4, y: 2 }] },
        { data: [{ x: 1, y: 3 }, { x: 2, y: 4 }, { x: 5, y: 6 }] }
      ];
      const result = getActiveElementsAtStep(datasets, 2);
      expect(result).toEqual([{ datasetIndex: 0, index: 0 }, { datasetIndex: 1, index: 1 }]);
    });

    it('returns empty array when no dataset contains the step', () => {
      const datasets = [
        { data: [{ x: 210, y: 1 }, { x: 220, y: 2 }] },
        { data: [{ x: 5, y: 3 }, { x: 6, y: 4 }] }
      ];
      const result = getActiveElementsAtStep(datasets, 0);
      expect(result).toEqual([]);
    });

    it('clears highlights when step is absent', () => {
      const chart = {
        setActiveElements: vi.fn(),
        tooltip: { setActiveElements: vi.fn() },
        update: vi.fn(),
        data: { datasets: [{ data: [{ x: 210, y: 1 }] }] }
      };
      const charts = new Map([["a", chart]]);
      syncHoverToCharts(charts, 0);
      expect(chart.setActiveElements).toHaveBeenCalledWith([]);
      expect(chart.tooltip.setActiveElements).toHaveBeenCalledWith([]);
      expect(chart.update).toHaveBeenCalledWith('none');
    });

    it('positions tooltip at matching step', () => {
      const chart = {
        setActiveElements: vi.fn(),
        tooltip: { setActiveElements: vi.fn() },
        update: vi.fn(),
        data: { datasets: [{ data: [{ x: 210, y: 1 }] }] },
        scales: { x: { getPixelForValue: vi.fn().mockReturnValue(123) } }
      };
      const charts = new Map([["a", chart]]);
      syncHoverToCharts(charts, 210);
      expect(chart.setActiveElements).toHaveBeenCalledWith([{ datasetIndex: 0, index: 0 }]);
      expect(chart.tooltip.setActiveElements).toHaveBeenCalledWith([{ datasetIndex: 0, index: 0 }], { x: 123, y: 0 });
      expect(chart.update).toHaveBeenCalledWith('none');
    });
  });
