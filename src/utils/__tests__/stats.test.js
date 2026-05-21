import { describe, it, expect } from 'vitest';
import { computeStats } from '../stats';

describe('computeStats', () => {
  it('returns null for empty / invalid input', () => {
    expect(computeStats(null)).toBe(null);
    expect(computeStats([])).toBe(null);
    expect(computeStats([{ x: 0, y: NaN }])).toBe(null);
  });

  it('computes min/max/mean/std/last/count', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 4 }
    ];
    const s = computeStats(data);
    expect(s.min).toBe(1);
    expect(s.max).toBe(4);
    expect(s.mean).toBeCloseTo(2.5);
    expect(s.last).toBe(4);
    expect(s.count).toBe(4);
    // variance = ((1.5)^2 + (0.5)^2 + (0.5)^2 + (1.5)^2)/4 = 1.25 → std ≈ 1.118
    expect(s.std).toBeCloseTo(Math.sqrt(1.25));
  });

  it('skips NaN/Infinity values', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: NaN },
      { x: 2, y: Infinity },
      { x: 3, y: 3 }
    ];
    const s = computeStats(data);
    expect(s.count).toBe(2);
    expect(s.mean).toBe(2);
    expect(s.last).toBe(3);
  });

  it('finds last finite value when tail is NaN', () => {
    const data = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: NaN }
    ];
    expect(computeStats(data).last).toBe(2);
  });
});
