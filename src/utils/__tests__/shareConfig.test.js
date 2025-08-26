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

  it('compresses data compared to base64', () => {
    const data = { text: 'a'.repeat(1000) };
    const encoded = encodeConfig(data);
    const json = JSON.stringify(data);
    const base64 = Buffer.from(json, 'utf-8').toString('base64');
    const raw = encodeURIComponent(base64);
    expect(encoded.length).toBeLessThan(raw.length);
  });

  it('returns null for invalid input', () => {
    expect(decodeConfig('%')).toBeNull();
  });
});
