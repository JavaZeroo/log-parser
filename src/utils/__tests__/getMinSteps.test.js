import { describe, it, expect } from 'vitest';
import { getMinSteps } from '../getMinSteps.js';

describe('getMinSteps', () => {
  it('returns minimum length among enabled files', () => {
    const parsed = [
      {
        enabled: true,
        metricsData: { a: [{ x: 0 }, { x: 1 }, { x: 2 }], b: [{ x: 0 }, { x: 1 }] }
      },
      {
        enabled: true,
        metricsData: {
          a: [{ x: 0 }, { x: 1 }, { x: 2 }, { x: 3 }],
          b: [{ x: 0 }, { x: 1 }, { x: 2 }]
        }
      },
    ];
    expect(getMinSteps(parsed)).toBe(3);
  });

  it('ignores disabled files', () => {
    const parsed = [
      { enabled: false, metricsData: { a: [{ x: 0 }, { x: 1 }, { x: 2 }] } },
      { enabled: true, metricsData: { a: [{ x: 0 }, { x: 1 }] } }
    ];
    expect(getMinSteps(parsed)).toBe(2);
  });
});
