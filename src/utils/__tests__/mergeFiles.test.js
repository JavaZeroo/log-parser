import { describe, it, expect } from 'vitest';
import { mergeFilesWithReplacement } from '../mergeFiles.js';

describe('mergeFilesWithReplacement', () => {
  it('replaces file with same name and keeps config', () => {
    const prev = [{ name: 'log1.txt', id: '1', enabled: true, config: { a: 1 }, content: 'old' }];
    const newFile = { name: 'log1.txt', id: '2', enabled: true, config: {}, content: 'new' };
    const result = mergeFilesWithReplacement(prev, [newFile]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('new');
    expect(result[0].config).toEqual({ a: 1 });
  });

  it('adds new file when name does not exist', () => {
    const prev = [{ name: 'log1.txt', id: '1', enabled: true, config: {}, content: 'old' }];
    const newFile = { name: 'log2.txt', id: '2', enabled: true, config: {}, content: 'new' };
    const result = mergeFilesWithReplacement(prev, [newFile]);
    expect(result).toHaveLength(2);
  });
});
