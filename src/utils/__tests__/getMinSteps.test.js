import { describe, it, expect } from 'vitest';
import { getMinSteps } from '../getMinSteps.js';

describe('getMinSteps', () => {
  it('returns minimum length among enabled files', () => {
    const parsed = [
      { enabled: true, metricsData: { a: [{},{},{}], b: [{},{}] } },
      { enabled: true, metricsData: { a: [{},{},{} ,{}], b: [{},{} ,{}] } },
    ];
    expect(getMinSteps(parsed)).toBe(3);
  });

  it('ignores disabled files', () => {
    const parsed = [
      { enabled: false, metricsData: { a: [{},{},{}] } },
      { enabled: true, metricsData: { a: [{},{}] } }
    ];
    expect(getMinSteps(parsed)).toBe(2);
  });
});
