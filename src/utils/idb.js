// Shared IndexedDB handle for the app.
//
// Three object stores live in one database and therefore must be created by a
// single upgrade path — two modules opening the same database at different
// versions would make the older opener fail with a VersionError:
//   files        – the single active working set (fileStorage.js)
//   sessions     – full cached snapshots keyed by cache key (sessionCache.js)
//   sessionIndex – lightweight summaries so the session list can render
//                  without deserializing megabytes of log content

const DB_NAME = 'log-parser';
const DB_VERSION = 2;

export const FILES_STORE = 'files';
export const SESSIONS_STORE = 'sessions';
export const SESSION_INDEX_STORE = 'sessionIndex';

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
