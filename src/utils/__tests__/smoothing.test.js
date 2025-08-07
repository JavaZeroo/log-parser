import { describe, it, expect } from 'vitest';
import { movingAverage } from '../smoothing.js';

describe('movingAverage', () => {
  it('should not smooth data if window size is 1 or less', () => {
    const data = [{ x: 0, y: 10 }, { x: 1, y: 20 }];
    expect(movingAverage(data, 1)).toEqual(data);
    expect(movingAverage(data, 0)).toEqual(data);
  });

  it('should not smooth data if data length is less than window size', () => {
    const data = [{ x: 0, y: 10 }, { x: 1, y: 20 }];
    expect(movingAverage(data, 3)).toEqual(data);
  });

  it('should calculate moving average correctly', () => {
    const data = [
      { x: 0, y: 10 },
      { x: 1, y: 20 },
      { x: 2, y: 30 },
      { x: 3, y: 40 },
      { x: 4, y: 50 },
    ];
    const expected = [
      { x: 0, y: 20 },
      { x: 1, y: 20 },
      { x: 2, y: 20 },
      { x: 3, y: 30 },
      { x: 4, y: 40 },
    ];
    const result = movingAverage(data, 3);
    // Rounding to handle potential floating point inaccuracies
    result.forEach(p => p.y = Math.round(p.y));
    expect(result).toEqual(expected);
  });

  it('should handle an empty array', () => {
    expect(movingAverage([], 5)).toEqual([]);
  });
});
