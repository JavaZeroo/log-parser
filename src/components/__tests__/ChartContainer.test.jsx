import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChartContainer from '../ChartContainer';
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
  const charts = [];
  const lineProps = [];
  return {
    Line: React.forwardRef((props, ref) => {
      lineProps.push(props);
      const chart = {
        data: props.data,
        setActiveElements: vi.fn(),
        tooltip: { setActiveElements: vi.fn() },
        draw: vi.fn(),
        scales: { x: { getPixelForValue: vi.fn(() => 0) } },
      };
      charts.push(chart);
      if (typeof ref === 'function') ref(chart);
      return <div data-testid="line-chart" />;
    }),
    __charts: charts,
    __lineProps: lineProps,
  };
});
import { __charts, __lineProps } from 'react-chartjs-2';

vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));

describe('ChartContainer', () => {
  it('prompts to upload files when none provided', () => {
    const onXRangeChange = vi.fn();
    const onMaxStepChange = vi.fn();
    render(
      <ChartContainer
        files={[]}
        metrics={[{ name: 'loss', keyword: 'loss', mode: 'keyword' }]}
        compareMode="normal"
        onXRangeChange={onXRangeChange}
        onMaxStepChange={onMaxStepChange}
      />
    );
    screen.getByText(i18n.t('chart.uploadPrompt'));
    expect(onMaxStepChange).toHaveBeenCalledWith(0);
  });

  it('prompts to select metrics when none provided', () => {
    const onXRangeChange = vi.fn();
    const onMaxStepChange = vi.fn();
    const files = [{ name: 'a.log', enabled: true, content: 'loss: 1' }];
    render(
      <ChartContainer
        files={files}
        metrics={[]}
        compareMode="normal"
        onXRangeChange={onXRangeChange}
        onMaxStepChange={onMaxStepChange}
      />
    );
    screen.getByText(i18n.t('chart.selectPrompt'));
  });

  it('renders charts and statistics', async () => {
    const onXRangeChange = vi.fn();
    const onMaxStepChange = vi.fn();
    const files = [
      {
        name: 'a.log',
        enabled: true,
        content: 'loss: 1\nloss: 2',
        metricsData: { 'loss': [{ x: 0, y: 1 }, { x: 1, y: 2 }] }
      },
      {
        name: 'b.log',
        enabled: true,
        content: 'loss: 1.5\nloss: 2.5',
        metricsData: { 'loss': [{ x: 0, y: 1.5 }, { x: 1, y: 2.5 }] }
      },
    ];
    render(
      <ChartContainer
        files={files}
        metrics={[{ name: 'loss', keyword: 'loss', mode: 'keyword' }]}
        compareMode="relative"
        onXRangeChange={onXRangeChange}
        onMaxStepChange={onMaxStepChange}
      />
    );

    screen.getByText('📊 loss');
    screen.getByText(new RegExp(i18n.t('chart.diffStats')));
    expect(onMaxStepChange).toHaveBeenCalledWith(1);

    // interaction and tooltip should use nearest mode for precise point selection
    const opts = __lineProps[0].options;
    expect(opts.interaction.mode).toBe('nearest');
    expect(opts.interaction.axis).toBe('x');
    expect(opts.plugins.tooltip.mode).toBe('nearest');
    expect(opts.plugins.tooltip.axis).toBe('x');

    // simulate hover to trigger sync
    const hover = __lineProps[0].options.onHover;
    hover({}, [{ index: 0, datasetIndex: 0 }]);
    expect(__charts[1].setActiveElements).toHaveBeenCalled();
    expect(__charts[1].draw).toHaveBeenCalled();
  });

  it('parses metrics, applies range and triggers callbacks', () => {
    const onXRangeChange = vi.fn();
    const onMaxStepChange = vi.fn();
    const files = [
      {
        name: 'a.log',
        enabled: true,
        content: 'loss: 1\nloss: 2\nloss: 3\nacc: 4\nacc: 5',
        config: { dataRange: { start: 1, end: 3 } },
        metricsData: {
          'loss': [{ x: 0, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 3 }],
          'metric2': [{ x: 3, y: 4 }, { x: 4, y: 5 }]
        }
      },
      {
        name: 'b.log',
        enabled: true,
        content: 'loss: 2\nloss: 4\nacc: 6\nacc: 8',
        config: { dataRange: { start: 1, end: 3 } },
        metricsData: {
          'loss': [{ x: 0, y: 2 }, { x: 1, y: 4 }],
          'metric2': [{ x: 2, y: 6 }, { x: 3, y: 8 }]
        }
      }
    ];
    const metrics = [
      { keyword: 'loss', mode: 'keyword' },
      { regex: 'acc:(\\d+)', mode: 'regex' },
      {}
    ];

    render(
      <ChartContainer
        files={files}
        metrics={metrics}
        compareMode="relative"
        onXRangeChange={onXRangeChange}
        onMaxStepChange={onMaxStepChange}
      />
    );

    // metric titles
    expect(screen.getAllByText(/loss/)[0]).toBeTruthy();
    screen.getByText(/metric2/);
    screen.getByText(/metric3/);

    // data range applied (start 1 end 3 => 2 points for loss)
    const currentProps = __lineProps.slice(-5);
    expect(currentProps[0].data.datasets[0].data).toHaveLength(2);

    // trigger container mouse leave
    const container = screen.getAllByTestId('line-chart')[0].parentElement;
    fireEvent.mouseLeave(container);

    // invoke legend and tooltip callbacks
    const opts = currentProps[0].options;
    opts.plugins.legend.labels.generateLabels({ data: { datasets: [{}, { borderDash: [5, 5] }] } });
    const tt = opts.plugins.tooltip.callbacks;
    tt.title([{ parsed: { x: 1 } }]);
    tt.label({ parsed: { y: 1.2345 } });
    tt.labelColor({ dataset: { borderColor: '#fff' } });

    // invoke zoom callbacks
    opts.plugins.zoom.pan.onPanComplete({ chart: { scales: { x: { min: 0, max: 10 } } } });
    opts.plugins.zoom.zoom.onZoomComplete({ chart: { scales: { x: { min: 2, max: 4 } } } });
  });

  it('uses per-file metric configuration when provided', () => {
    const onXRangeChange = vi.fn();
    const onMaxStepChange = vi.fn();
    const files = [
      { name: 'a.log', enabled: true, content: 'loss: 1\nloss: 2', metricsData: { 'loss': [{ x: 0, y: 1 }, { x: 1, y: 2 }] } },
      {
        name: 'b.log',
        enabled: true,
        content: 'train_loss: 3\ntrain_loss: 4',
        config: { metrics: [{ mode: 'keyword', keyword: 'train_loss:' }] },
        metricsData: { 'loss': [{ x: 0, y: 3 }, { x: 1, y: 4 }] } // Note: key is 'loss' because metric name is 'loss'
      }
    ];
    const metrics = [{ name: 'loss', mode: 'keyword', keyword: 'loss:' }];

    render(
      <ChartContainer
        files={files}
        metrics={metrics}
        compareMode="normal"
        onXRangeChange={onXRangeChange}
        onMaxStepChange={onMaxStepChange}
      />
    );

    const mainChart = [...__lineProps].reverse().find(p =>
      p.data.datasets && p.data.datasets.some(d => d.label === 'b')
    );
    const ds = mainChart.data.datasets.find(d => d.label === 'b');
    expect(ds.data).toEqual([
      { x: 0, y: 3 },
      { x: 1, y: 4 }
    ]);
  });
});
