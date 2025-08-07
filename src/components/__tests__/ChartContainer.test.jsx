import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, expect, describe, it, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { useStore } from '../../store';
import ChartContainer from '../ChartContainer.jsx';

// Mocks
vi.mock('react-chartjs-2', () => ({
  Line: ({ options }) => {
    // Mock call to onHover to test sync
    if (options.onHover) {
      options.onHover({}, [{ index: 0 }]);
      options.onHover({}, []);
    }
    return <div data-testid="chart" />;
  }
}));

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn(), defaults: { plugins: { legend: { labels: { generateLabels: () => [] } } } } },
  ChartJS: { register: vi.fn() },
  CategoryScale: vi.fn(), LinearScale: vi.fn(), PointElement: vi.fn(), LineElement: vi.fn(), Title: vi.fn(), Tooltip: vi.fn(), Legend: vi.fn()
}));
vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));

const mockSetXRange = vi.fn();
const mockSetMaxStep = vi.fn();
vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));
const mockUseStore = useStore;

const sampleFile = {
  name: 'test.log', id: '1', content: 'loss: 1\nloss: 2', enabled: true,
  config: { metrics: [{ name: 'loss', mode: 'keyword', keyword: 'loss:' }] }
};
const metric = { name: 'loss', mode: 'keyword', keyword: 'loss:' };

const initialStoreState = {
  uploadedFiles: [],
  globalParsingConfig: { metrics: [] },
  compareMode: 'normal',
  relativeBaseline: 0.002,
  absoluteBaseline: 0.005,
  xRange: { min: undefined, max: undefined },
  setXRange: mockSetXRange,
  setMaxStep: mockSetMaxStep,
};

// Helper to setup mock store
const setupStore = (state) => {
  mockUseStore.mockImplementation(selector => selector({ ...initialStoreState, ...state }));
};

describe('ChartContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty message when no files', () => {
    setupStore({ uploadedFiles: [] });
    render(<ChartContainer />);
    expect(screen.getByText('📊 暂无数据')).toBeInTheDocument();
  });

  it('shows metric selection message when no metrics', () => {
    setupStore({ uploadedFiles: [sampleFile], globalParsingConfig: { metrics: [] } });
    render(<ChartContainer />);
    expect(screen.getByText('🎯 请选择要显示的图表')).toBeInTheDocument();
  });

  it('renders charts and triggers callbacks', async () => {
    setupStore({ uploadedFiles: [sampleFile], globalParsingConfig: { metrics: [metric] }, xRange: {min: 0, max: 1} });
    render(<ChartContainer />);

    // Check for the resizable panel title using a regex to be more flexible
    expect(await screen.findByText(new RegExp(metric.name, "i"))).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSetMaxStep).toHaveBeenCalledWith(1);
      expect(mockSetXRange).toHaveBeenCalled();
    });

    const cb = mockSetXRange.mock.calls[0][0];
    expect(cb({ min: 0, max: 1 })).toEqual({ min: 0, max: 1 });
  });
});
