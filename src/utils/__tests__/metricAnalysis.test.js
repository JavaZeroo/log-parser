import { describe, expect, it } from 'vitest';
import { previewMatches, recommendKeywords } from '../metricAnalysis.js';
import { parseLog } from '../parseLog.js';

describe('metric analysis', () => {
  it('counts every parser match and keeps three examples per file and metric', () => {
    const files = [
      { name: 'first', content: '  LOSS: 1e-2 r1 r2\r\n\nLoss: -3 r3 r4\nloss: 4\nloss: 5' },
      { name: 'second', content: 'loss: 6 r5' }
    ];
    const metrics = [
      { name: '', keyword: 'loss:', mode: 'keyword' },
      { name: 'digits', regex: '(?=r(\\d))', mode: 'regex' },
      { name: '__proto__', regex: '[', mode: 'regex' }
    ];
    const preview = previewMatches(files, metrics);
    files.forEach((file, i) => {
      const actual = parseLog(file.content, { metrics });
      for (const [name, points] of Object.entries(actual)) {
        expect(preview[name][i].count).toBe(points.length);
        expect(preview[name][i].examples.map(s => s.value)).toEqual(points.slice(0, 3).map(p => p.y));
      }
    });
    expect(preview.loss.map(row => row.fileName)).toEqual(['first', 'second']);
    expect(preview.loss[0].examples[0]).toEqual({
      value: 0.01, line: 1, text: 'LOSS: 1e-2 r1 r2', format: 'Keyword Match'
    });
    expect(preview.digits[0].examples.map(s => s.line)).toEqual([1, 1, 3]);
    expect(preview.digits[0].examples[0]).not.toHaveProperty('format');
  });

  it('counts recommendation candidates across files and preserves tie order and unmatched slots', () => {
    const files = [{ content: 'training_loss: 1 grad_norm: 2\ngnorm: 3' }, { content: 'GNORM: 4' }];
    expect(recommendKeywords(files, 2)).toEqual(['loss', 'gnorm']);
    expect(recommendKeywords(files, 1)).toEqual(['loss']);
    expect(recommendKeywords([{ content: 'global_norm: [1.5]' }], 3)).toEqual([null, 'global_norm']);
    expect(recommendKeywords([], 0)).toEqual([]);
  });
});
