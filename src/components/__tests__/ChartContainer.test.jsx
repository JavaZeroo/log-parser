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

import ChartContainer from '../ChartContainer.jsx';

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
