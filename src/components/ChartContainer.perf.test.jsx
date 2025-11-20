import { describe, expect, test } from 'vitest';
import { performance } from 'node:perf_hooks';
import { computeActiveElementsForStep } from './ChartContainer.jsx';

const createMockChart = (datasetCount = 50, pointsPerDataset = 2000) => {
  const datasets = Array.from({ length: datasetCount }, (_, datasetIndex) => ({
    label: `dataset-${datasetIndex}`,
    data: Array.from({ length: pointsPerDataset }, (_, pointIndex) => ({
      x: pointIndex,
      y: datasetIndex + pointIndex
    }))
  }));

  return {
    data: { datasets },
    tooltip: { setActiveElements: () => {} },
    setActiveElements: () => {},
    scales: { x: { getPixelForValue: () => 0 } },
    draw: () => {}
  };
};

describe('computeActiveElementsForStep performance', () => {
  test('processes large datasets within an acceptable time budget', () => {
    const chart = createMockChart();
    const targetStep = 1500; // exists in every dataset

    const start = performance.now();
    const activeElements = computeActiveElementsForStep(chart, targetStep);
    const durationMs = performance.now() - start;

    // Each dataset should yield one active element for the target step
    expect(activeElements.length).toBe(chart.data.datasets.length);

    // Guardrail to catch regressions; high enough to avoid flakiness in CI
    expect(durationMs).toBeLessThan(50);
  });
});
