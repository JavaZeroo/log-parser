import { describe, it, expect } from 'vitest';
import { movingAverage, exponentialMovingAverage, applySmoothing } from '../smoothing.js';

describe('smoothing utilities', () => {
  it('calculates moving average', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 }
    ];
    const result = movingAverage(data, 2);
    expect(result.map(p => p.y)).toEqual([1, 1.5, 2.5, 3.5]);
  });

  it('calculates exponential moving average', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 }
    ];
    const result = exponentialMovingAverage(data, 0.5);
    const expected = [1, 1.5, 2.25, 3.125];
    result.forEach((p, i) => {
      expect(p.y).toBeCloseTo(expected[i]);
    });
  });

  it('applies smoothing via config', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 }
    ];
    const result = applySmoothing(data, { type: 'movingAverage', windowSize: 2 });
    expect(result[3].y).toBe(3.5);
  });
});
