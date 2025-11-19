import { describe, it, expect } from 'vitest';
import { ValueExtractor } from '../../utils/ValueExtractor';

const sampleContent = `loss: 0.123\nstep2 loss 0.234\n{"loss": 0.345, "global_norm": 1.23}`;

describe('ValueExtractor', () => {
  it('extracts values by keyword', () => {
    const results = ValueExtractor.extractByKeyword(sampleContent, 'loss:');
    expect(results.length).toBe(1);
    expect(results[0].value).toBeCloseTo(0.123);
  });

  it('extracts values by regex', () => {
    const results = ValueExtractor.extractByRegex(sampleContent, 'loss[:\\s]+([\\d.]+)');
    expect(results.length).toBe(2);
    expect(results[1].value).toBeCloseTo(0.234);
  });

  it('extracts values by smart detection', () => {
    const gradContent = 'global_norm: [1.5]';
    const results = ValueExtractor.extractBySmart(gradContent, 'grad_norm');
    expect(results.length).toBe(1);
    expect(results[0].value).toBeCloseTo(1.5);
  });
});
