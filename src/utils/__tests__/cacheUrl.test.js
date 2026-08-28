import { describe, it, expect } from 'vitest';
import {
  parseCacheKey,
  buildCacheHash,
  isValidCacheKey,
  generateCacheKey,
  buildShareUrl,
  CACHE_KEY_PARAM
} from '../cacheUrl';

const KEY = '00000000-0000-0000-1343-6d0de2416d47';

describe('cacheUrl', () => {
  it('parses a key out of a viewer hash', () => {
    expect(parseCacheKey(`#!/viewer?${CACHE_KEY_PARAM}=${KEY}`)).toBe(KEY);
  });

  it('ignores hashes without a key', () => {
    expect(parseCacheKey('')).toBeNull();
    expect(parseCacheKey('#!/viewer')).toBeNull();
    expect(parseCacheKey('#!/viewer?other=1')).toBeNull();
  });

  it('rejects keys that are not cache-key shaped', () => {
    expect(parseCacheKey(`#!/viewer?${CACHE_KEY_PARAM}=../etc/passwd`)).toBeNull();
    expect(parseCacheKey(`#!/viewer?${CACHE_KEY_PARAM}=abc`)).toBeNull();
    expect(isValidCacheKey(KEY)).toBe(true);
    expect(isValidCacheKey(undefined)).toBe(false);
  });

  it('builds a hash and round-trips through the parser', () => {
    const hash = buildCacheHash(KEY);
    expect(hash).toBe(`#!/viewer?${CACHE_KEY_PARAM}=${KEY}`);
    expect(parseCacheKey(hash)).toBe(KEY);
  });

  it('preserves other params already in the hash', () => {
    const hash = buildCacheHash(KEY, '#!/viewer?tab=stats');
    expect(hash).toContain('tab=stats');
    expect(parseCacheKey(hash)).toBe(KEY);
  });

  it('drops the key (and the hash entirely) when clearing', () => {
    expect(buildCacheHash(null, `#!/viewer?${CACHE_KEY_PARAM}=${KEY}`)).toBe('');
    expect(buildCacheHash(null, `#!/viewer?${CACHE_KEY_PARAM}=${KEY}&tab=stats`)).toBe('#!/viewer?tab=stats');
  });

  it('generates unique, valid keys', () => {
    const a = generateCacheKey();
    const b = generateCacheKey();
    expect(isValidCacheKey(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it('builds an absolute share url from a location', () => {
    const loc = { origin: 'https://log.javazero.top', pathname: '/', search: '', hash: '#whatever' };
    expect(buildShareUrl(KEY, loc)).toBe(`https://log.javazero.top/#!/viewer?${CACHE_KEY_PARAM}=${KEY}`);
  });
});
