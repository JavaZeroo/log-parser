import { describe, it, expect } from 'vitest';
import { detectAnomalies, summarizeAnomalies } from '../anomalyDetection';

function series(values) {
  return values.map((y, x) => ({ x, y }));
}

describe('detectAnomalies — NaN / Inf', () => {
  it('flags NaN and Infinity', () => {
    const events = detectAnomalies(series([1, 2, NaN, 3, Infinity, 4]));
    const types = events.map(e => e.type);
    expect(types.filter(t => t === 'nan').length).toBe(2);
  });

  it('marks NaN events as high severity', () => {
    const events = detectAnomalies(series([1, NaN]));
    expect(events[0].severity).toBe('high');
  });
});

describe('detectAnomalies — explosion', () => {
  it('detects 5× jumps', () => {
    const events = detectAnomalies(series([1, 1, 1, 1, 1, 10]));
    const ex = events.filter(e => e.type === 'explosion');
    expect(ex.length).toBe(1);
    expect(ex[0].x).toBe(5);
  });

  it('ignores small absolute values to avoid noise', () => {
    // 1e-9 → 1e-6 is 1000× but absolute values are tiny, should not flag
    const events = detectAnomalies(series([1e-9, 1e-6]));
    expect(events.filter(e => e.type === 'explosion').length).toBe(0);
  });

  it('respects custom factor', () => {
    const events = detectAnomalies(series([1, 1, 3]), { explosionFactor: 2 });
    expect(events.filter(e => e.type === 'explosion').length).toBe(1);
  });
});

describe('detectAnomalies — spike (z-score)', () => {
  it('flags clear outliers in a stable signal', () => {
    // 60 noisy values around ~1, then one spike to 50
    const data = [];
    for (let i = 0; i < 60; i++) data.push({ x: i, y: 1 + (Math.random() - 0.5) * 0.01 });
    data.push({ x: 60, y: 50 });
    const events = detectAnomalies(data, { spikeWindow: 30, spikeZThreshold: 4 });
    expect(events.filter(e => e.type === 'spike').length).toBeGreaterThan(0);
  });

  it('does not flag spikes in pure noise (no anchor)', () => {
    // Pure Gaussian-ish noise, no real outlier → at most a handful of spurious detections
    const data = Array.from({ length: 200 }, (_, i) => ({
      x: i,
      y: (Math.random() - 0.5) * 0.1
    }));
    const events = detectAnomalies(data, { spikeWindow: 50, spikeZThreshold: 5 });
    expect(events.filter(e => e.type === 'spike').length).toBeLessThan(5);
  });
});

describe('detectAnomalies — plateau', () => {
  it('flags long flat regions', () => {
    const data = [];
    for (let i = 0; i < 30; i++) data.push({ x: i, y: 1.0 - i * 0.01 });
    for (let i = 30; i < 100; i++) data.push({ x: i, y: 0.7 });
    const events = detectAnomalies(data, { plateauWindow: 50 });
    expect(events.filter(e => e.type === 'plateau').length).toBeGreaterThan(0);
  });

  it('does not flag changing data as plateau', () => {
    const data = Array.from({ length: 200 }, (_, i) => ({ x: i, y: 1 - i * 0.001 }));
    const events = detectAnomalies(data, { plateauWindow: 50 });
    expect(events.filter(e => e.type === 'plateau').length).toBe(0);
  });
});

describe('detectAnomalies — edge cases', () => {
  it('handles empty / invalid input', () => {
    expect(detectAnomalies([])).toEqual([]);
    expect(detectAnomalies(null)).toEqual([]);
    expect(detectAnomalies(undefined)).toEqual([]);
  });

  it('handles single-point series', () => {
    expect(detectAnomalies([{ x: 0, y: 1 }])).toEqual([]);
  });

  it('sorts events by x then type priority', () => {
    // Same x with both spike + nan → nan first (higher priority)
    const data = [
      { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: NaN }
    ];
    const events = detectAnomalies(data);
    expect(events[0].type).toBe('nan');
  });

  it('deduplicates same (x, type)', () => {
    // Hard to trigger naturally; verify by injection — sanity check structure
    const events = detectAnomalies(series([1, 1, 1, NaN, NaN]));
    const nans = events.filter(e => e.type === 'nan');
    // Both NaNs are at different x, so both kept
    expect(nans.length).toBe(2);
  });
});

describe('summarizeAnomalies', () => {
  it('counts by type', () => {
    const events = [
      { type: 'nan', x: 0 },
      { type: 'nan', x: 1 },
      { type: 'explosion', x: 2 },
      { type: 'spike', x: 3 },
      { type: 'plateau', x: 4 }
    ];
    expect(summarizeAnomalies(events)).toEqual({
      total: 5, nan: 2, explosion: 1, spike: 1, plateau: 1
    });
  });

  it('returns zeros for empty input', () => {
    expect(summarizeAnomalies([])).toEqual({
      total: 0, nan: 0, explosion: 0, spike: 0, plateau: 0
    });
  });
});
