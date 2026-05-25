import { describe, it, expect } from 'vitest';
import { chartToSmallPNG, buildCombinedReport } from '../chartExport';

// jsdom canvas is a stub — image encoding is not actually implemented, so we
// can only assert the safety/guard paths here. Real visual verification
// happens manually in the browser.

describe('chartToSmallPNG — guards', () => {
  it('returns null when chart is missing or canvas-less', async () => {
    expect(await chartToSmallPNG(null)).toBeNull();
    expect(await chartToSmallPNG({})).toBeNull();
    expect(await chartToSmallPNG({ canvas: null })).toBeNull();
    expect(await chartToSmallPNG({ canvas: {} })).toBeNull();
  });
});

describe('buildCombinedReport — guards', () => {
  it('returns null for empty input', async () => {
    expect(await buildCombinedReport([])).toBeNull();
    expect(await buildCombinedReport(null)).toBeNull();
    expect(await buildCombinedReport(undefined)).toBeNull();
  });

  it('returns null when every entry is invalid', async () => {
    const entries = [
      ['a', null],
      ['b', { chart: null }],
      ['c', { chart: { canvas: null } }],
      ['d', { chart: {} }]
    ];
    expect(await buildCombinedReport(entries)).toBeNull();
  });
});
