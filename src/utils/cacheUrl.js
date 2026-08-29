// URL plumbing for Perfetto-style cache links.
//
// A cached analysis is addressed by an opaque key carried in the location hash:
//   https://log.javazero.top/#!/viewer?local_cache_key=<uuid>
// The hash (rather than a query string) keeps this a purely client-side route,
// so it works unchanged on GitHub Pages, Vercel and `vite preview`.
//
// The key names a snapshot in *this browser's* IndexedDB — it is a bookmark,
// not a share link. Opening it elsewhere yields "not found" by design; nothing
// ever leaves the machine.

export const CACHE_KEY_PARAM = 'local_cache_key';
export const VIEWER_ROUTE = '!/viewer';

const KEY_RE = /^[0-9a-fA-F][0-9a-fA-F-]{7,63}$/;

export function isValidCacheKey(key) {
  return typeof key === 'string' && KEY_RE.test(key);
}

export function generateCacheKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older/insecure contexts where randomUUID is unavailable.
  const rnd = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${rnd()}${rnd()}-${rnd()}-${rnd()}-${rnd()}-${rnd()}${rnd()}${rnd()}`;
}

// Pull the key out of a raw location hash (with or without the leading '#').
export function parseCacheKey(hash) {
  if (!hash) return null;
  const q = String(hash).indexOf('?');
  if (q === -1) return null;
  let value = null;
  try {
    value = new URLSearchParams(String(hash).slice(q + 1)).get(CACHE_KEY_PARAM);
  } catch {
    return null;
  }
  return isValidCacheKey(value) ? value : null;
}

// Build the hash for a key, preserving any other params already in `hash`.
export function buildCacheHash(key, hash = '') {
  const q = String(hash).indexOf('?');
  const params = new URLSearchParams(q === -1 ? '' : String(hash).slice(q + 1));
  if (key) {
    params.set(CACHE_KEY_PARAM, key);
  } else {
    params.delete(CACHE_KEY_PARAM);
  }
  const qs = params.toString();
  if (!qs) return '';
  return `#${VIEWER_ROUTE}?${qs}`;
}

export function readCacheKey(loc = typeof window !== 'undefined' ? window.location : null) {
  return loc ? parseCacheKey(loc.hash) : null;
}

// Rewrite the address bar without reloading or adding history noise.
export function writeCacheKey(key, { replace = true } = {}) {
  if (typeof window === 'undefined' || !window.history) return;
  const { pathname, search, hash } = window.location;
  const nextHash = buildCacheHash(key, hash);
  const url = `${pathname}${search}${nextHash}`;
  if (url === `${pathname}${search}${hash}`) return;
  if (replace) {
    window.history.replaceState(window.history.state, '', url);
  } else {
    window.history.pushState(window.history.state, '', url);
  }
}

export function clearCacheKey() {
  writeCacheKey(null);
}

export function buildShareUrl(key, loc = typeof window !== 'undefined' ? window.location : null) {
  if (!loc) return '';
  return `${loc.origin}${loc.pathname}${loc.search}${buildCacheHash(key, '')}`;
}
