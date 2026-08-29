// Shared IndexedDB handle for the app.
//
// The object stores live in one database and therefore must be created by a
// single upgrade path — two modules opening the same database at different
// versions would make the older opener fail with a VersionError:
//   files        – the single active working set (fileStorage.js)
//   sessionIndex – lightweight summaries, so listing cached analyses never
//                  touches log text
//   sessions     – per-analysis metadata: file names, enabled flags, configs,
//                  and references into the two stores below
//   content      – one record per file, holding the raw log
//   metrics      – one record per file, holding parsed series as typed arrays
//
// Content and metrics are split out of the session record on purpose: they are
// large and rarely change, while the session record is small and rewritten on
// every checkbox toggle. Keeping them together made a toggle rewrite hundreds
// of megabytes (measured at ~1.5s per 100MB); split, it writes ~1ms.

const DB_NAME = 'log-parser';
const DB_VERSION = 3;

export const FILES_STORE = 'files';
export const SESSIONS_STORE = 'sessions';
export const SESSION_INDEX_STORE = 'sessionIndex';
export const CONTENT_STORE = 'content';
export const METRICS_STORE = 'metrics';

export function hasIDB() {
  return typeof indexedDB !== 'undefined';
}

let dbPromise = null;

export function openDB() {
  if (!hasIDB()) return Promise.reject(new Error('IndexedDB unavailable'));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          db.createObjectStore(FILES_STORE);
        }
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(SESSION_INDEX_STORE)) {
          const idx = db.createObjectStore(SESSION_INDEX_STORE, { keyPath: 'id' });
          idx.createIndex('lastAccess', 'lastAccess');
        }
        if (!db.objectStoreNames.contains(CONTENT_STORE)) {
          db.createObjectStore(CONTENT_STORE);
        }
        if (!db.objectStoreNames.contains(METRICS_STORE)) {
          db.createObjectStore(METRICS_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('IndexedDB open blocked'));
    });
    dbPromise.catch(() => { dbPromise = null; });
  }
  return dbPromise;
}

// Promisify a request inside a transaction the caller owns.
export function requestToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

export function isQuotaError(err) {
  return !!err && (err.name === 'QuotaExceededError' || err.code === 22);
}

// Exposed for tests: forces a fresh open on the next call.
export function _resetDbForTests() {
  dbPromise = null;
}
