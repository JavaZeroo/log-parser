import { describe, it, expect } from 'vitest';
import { movingAverage, ema, smooth } from '../smoothing';

const series = [
  { x: 0, y: 10 },
  { x: 1, y: 20 },
  { x: 2, y: 30 },
  { x: 3, y: 40 },
  { x: 4, y: 50 }
];

describe('movingAverage', () => {
  it('returns original for window <= 1', () => {
    expect(movingAverage(series, 1)).toBe(series);
    expect(movingAverage(series, 0)).toBe(series);
  });

  it('preserves x values', () => {
    const result = movingAverage(series, 3);
    expect(result.map(p => p.x)).toEqual([0, 1, 2, 3, 4]);
  });

  it('smooths trailing window of 3', () => {
    const result = movingAverage(series, 3);
    // y[0] = 10 (one-element avg)
    // y[1] = (10+20)/2 = 15
    // y[2] = (10+20+30)/3 = 20
    // y[3] = (20+30+40)/3 = 30
    // y[4] = (30+40+50)/3 = 40
    expect(result.map(p => p.y)).toEqual([10, 15, 20, 30, 40]);
  });

  it('handles empty / non-array input', () => {
    expect(movingAverage([], 3)).toEqual([]);
    expect(movingAverage(null, 3)).toBe(null);
  });
});

describe('ema', () => {
  it('keeps first point as anchor', () => {
    const result = ema(series, 5);
    expect(result[0].y).toBe(10);
  });

  it('alpha derived from window', () => {
    // window = 1 → alpha = 1 → result === input y
    const r1 = ema(series, 1);
    expect(r1.map(p => p.y)).toEqual([10, 20, 30, 40, 50]);
  });

  it('produces monotonically increasing values for monotonic input', () => {
    const result = ema(series, 3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].y).toBeGreaterThan(result[i - 1].y);
    }
  });

  it('handles empty input', () => {
    expect(ema([], 5)).toEqual([]);
  });
});

describe('smooth dispatch', () => {
  it('returns original on "none"', () => {
    expect(smooth(series, 'none', 3)).toBe(series);
  });
  it('routes to ma', () => {
    expect(smooth(series, 'ma', 3)).toEqual(movingAverage(series, 3));
  });
  it('routes to ema', () => {
    expect(smooth(series, 'ema', 3)).toEqual(ema(series, 3));
  });
  it('passes through unknown methods', () => {
    expect(smooth(series, 'wat', 3)).toBe(series);
  });
});
