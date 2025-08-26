import { describe, it, expect } from 'vitest';
import { encodeConfig, decodeConfig } from '../shareConfig.js';

describe('shareConfig', () => {
  it('encodes and decodes data', () => {
    const data = {
      globalParsingConfig: { metrics: [], useStepKeyword: false, stepKeyword: 'step:' },
      uploadedFiles: [{ name: 'a.log', content: 'loss:1', enabled: true }]
    };
    const encoded = encodeConfig(data);
    const decoded = decodeConfig(encoded);
    expect(decoded).toEqual(data);
  });

  it('returns null for invalid input', () => {
    expect(decodeConfig('%')).toBeNull();
  });
});
