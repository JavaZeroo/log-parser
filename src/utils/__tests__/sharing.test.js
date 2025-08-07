import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { serializeStateForURL, deserializeStateFromURL } from '../sharing.js';
import LZString from 'lz-string';

// Mock lz-string to make tests deterministic
vi.mock('lz-string', () => ({
  default: {
    compressToEncodedURIComponent: vi.fn(str => `compressed_${str}`),
    decompressFromEncodedURIComponent: vi.fn(str => str.replace('compressed_', '')),
  }
}));

describe('sharing utilities', () => {
  const mockState = { a: 1, b: 'test' };

  afterEach(() => {
    vi.clearAllMocks();
    window.location.hash = '';
  });

  describe('serializeStateForURL', () => {
    it('should serialize and compress state', () => {
      const result = serializeStateForURL(mockState);
      const expectedJSON = JSON.stringify(mockState);
      expect(LZString.compressToEncodedURIComponent).toHaveBeenCalledWith(expectedJSON);
      expect(result).toBe(`compressed_${expectedJSON}`);
    });

    it('should return an empty string on serialization error', () => {
      const circularState = {};
      circularState.a = circularState;
      const result = serializeStateForURL(circularState);
      expect(result).toBe('');
    });
  });

  describe('deserializeStateFromURL', () => {
    it('should deserialize and decompress state from URL hash', () => {
      const json = JSON.stringify(mockState);
      window.location.hash = `#s=compressed_${json}`;
      const result = deserializeStateFromURL();
      expect(LZString.decompressFromEncodedURIComponent).toHaveBeenCalledWith(`compressed_${json}`);
      expect(result).toEqual(mockState);
    });

    it('should return null if no hash is present', () => {
      expect(deserializeStateFromURL()).toBeNull();
    });

    it('should return null if share param "s" is not present', () => {
      window.location.hash = '#other=value';
      expect(deserializeStateFromURL()).toBeNull();
    });

    it('should return null on decompression failure', () => {
      LZString.decompressFromEncodedURIComponent.mockReturnValueOnce(null);
      window.location.hash = '#s=invalid_data';
      expect(deserializeStateFromURL()).toBeNull();
    });

    it('should return null on JSON parsing error', () => {
      window.location.hash = '#s=compressed_invalid_json';
      expect(deserializeStateFromURL()).toBeNull();
    });
  });
});
