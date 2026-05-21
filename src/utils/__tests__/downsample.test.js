import { describe, it, expect } from 'vitest';
import { lttb, maybeDownsample, DEFAULT_DOWNSAMPLE_THRESHOLD } from '../downsample';

function makeSeries(n, fn = (i) => Math.sin(i / 10)) {
  return Array.from({ length: n }, (_, i) => ({ x: i, y: fn(i) }));
}

describe('lttb', () => {
  it('returns original when length <= threshold', () => {
    const data = makeSeries(100);
    expect(lttb(data, 200)).toBe(data);
    expect(lttb(data, 100)).toBe(data);
  });

  it('returns original for trivial thresholds', () => {
    const data = makeSeries(100);
    expect(lttb(data, 2)).toBe(data);
    expect(lttb(data, 0)).toBe(data);
  });

  it('downsamples to exact threshold size', () => {
    const data = makeSeries(10000);
    const result = lttb(data, 500);
    expect(result.length).toBe(500);
  });

  it('preserves first and last points', () => {
    const data = makeSeries(5000);
    const result = lttb(data, 100);
    expect(result[0]).toBe(data[0]);
    expect(result[result.length - 1]).toBe(data[data.length - 1]);
  });

  it('preserves x-ordering', () => {
    const data = makeSeries(5000);
    const result = lttb(data, 200);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].x).toBeGreaterThanOrEqual(result[i - 1].x);
    }
  });

  it('keeps spike near peak when downsampling sparse signal', () => {
    const data = makeSeries(2000, (i) => (i === 1000 ? 1000 : 0));
    const result = lttb(data, 100);
    const maxY = Math.max(...result.map(p => p.y));
    expect(maxY).toBe(1000);
  });

  it('handles empty array', () => {
    expect(lttb([], 100)).toEqual([]);
  });

  it('handles non-array input', () => {
    expect(lttb(null, 100)).toBe(null);
    expect(lttb(undefined, 100)).toBe(undefined);
  });
});

describe('maybeDownsample', () => {
  it('returns original below threshold', () => {
    const data = makeSeries(100);
    expect(maybeDownsample(data, 500)).toBe(data);
  });

  it('downsamples above threshold', () => {
    const data = makeSeries(5000);
    const result = maybeDownsample(data, 500);
    expect(result.length).toBe(500);
    expect(result).not.toBe(data);
  });

  it('uses default threshold', () => {
    const data = makeSeries(DEFAULT_DOWNSAMPLE_THRESHOLD + 100);
    const result = maybeDownsample(data);
    expect(result.length).toBe(DEFAULT_DOWNSAMPLE_THRESHOLD);
  });

  it('passes through non-arrays', () => {
    expect(maybeDownsample(null)).toBe(null);
  });
});
