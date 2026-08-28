// File persistence layer for the active working set. Prefers IndexedDB
// (multi-MB capacity) and falls back to localStorage where IndexedDB is
// unavailable (e.g. jsdom tests, restricted contexts). All keys are stable so
// legacy localStorage data is migrated on first IndexedDB load.
//
// Snapshots addressable by a cache key live in sessionCache.js; both share the
// database opened by idb.js.

import { openDB, hasIDB, FILES_STORE as STORE } from './idb.js';

const FILES_KEY = 'all';
export const LEGACY_LS_KEY = 'uploadedFiles';
const LS_MAX_BYTES = 5 * 1024 * 1024;

function quotaError(message) {
  const err = new Error(message);
  err.name = 'QuotaExceededError';
  return err;
}

function readLegacy() {
  try {
    const stored = localStorage.getItem(LEGACY_LS_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(FILES_KEY);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(files) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (files.length === 0) {
      tx.objectStore(STORE).delete(FILES_KEY);
    } else {
      tx.objectStore(STORE).put(files, FILES_KEY);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || quotaError('IndexedDB transaction aborted'));
  });
}

async function idbDelete() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(FILES_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadFiles() {
  if (hasIDB()) {
    try {
      const data = await idbGetAll();
      if (Array.isArray(data) && data.length > 0) {
        // Clear legacy mirror once IDB has authoritative data
        try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
        return data;
      }
      // First-time migration from legacy localStorage
      const legacy = readLegacy();
      if (legacy && legacy.length > 0) {
        try {
          await idbPut(legacy);
          localStorage.removeItem(LEGACY_LS_KEY);
        } catch { /* migration is best-effort */ }
        return legacy;
      }
      return [];
    } catch {
      // Fall through to localStorage
    }
  }
  return readLegacy() || [];
}

export async function saveFiles(files) {
  if (hasIDB()) {
    try {
      await idbPut(files);
      try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
      return;
    } catch (err) {
      if (err && (err.name === 'QuotaExceededError' || err.code === 22)) throw err;
      // Other IDB errors → fall back to localStorage
    }
  }
  if (!files || files.length === 0) {
    try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
    return;
  }
  const json = JSON.stringify(files);
  if (json.length > LS_MAX_BYTES) {
    throw quotaError('Serialized files exceed localStorage limit');
  }
  try {
    localStorage.setItem(LEGACY_LS_KEY, json);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw err;
    }
    throw err;
  }
}

export async function clearFiles() {
  if (hasIDB()) {
    try { await idbDelete(); } catch { /* ignore */ }
  }
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* ignore */ }
}

// Exposed for tests: clears in-memory DB promise so a fresh open is attempted.
export { _resetDbForTests as _resetForTests } from './idb.js';
