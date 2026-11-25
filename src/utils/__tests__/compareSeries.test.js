import { describe, expect, it } from 'vitest';
import { compareSeries } from '../compareSeries.js';

const base = [{ x: 7, y: -2 }, { x: 3, y: 0 }, { x: 9, y: 25 }, { x: 7, y: 4 }];
const target = [{ x: 3, y: -2 }, { x: 7, y: 2 }, { x: 4, y: 20 }, { x: 7, y: -4 }];

describe('compareSeries', () => {
  it.each([
    ['normal', [-2, -2, -8]],
    ['absolute', [2, 2, 8]],
    ['relative-normal', [1, 0, -2]],
    ['relative', [1, 0, 2]]
  ])('aligns repeated and out-of-order steps in %s mode', (mode, values) => {
    const { points, stats } = compareSeries(base, target, mode);
    expect(points).toEqual([7, 3, 7].map((x, i) => ({ x, y: values[i] })));
    expect(stats).toEqual({
      meanNormal: -4, meanAbsolute: 4, relativeError: -1 / 3,
      meanRelative: 1, maxAbsolute: 8, maxRelative: 2
    });
  });

  it('returns zero statistics when there are no shared steps', () => {
    const { points, stats } = compareSeries(base, [{ x: 100, y: 1 }], 'normal');
    expect(points).toEqual([]);
    expect(Object.values(stats)).toEqual([0, 0, 0, 0, 0, 0]);
  });
});
