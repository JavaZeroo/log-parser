// IndexedDB keeps list order and configuration separate from raw text or cached
// points. Each save applies a delta against the last successful transaction.
import { newFileId } from './readLogFiles.js';
const DB_NAME = 'log-parser';
const META = 'fileMetadata';
const DATA = 'fileData';
export const LEGACY_LS_KEY = 'uploadedFiles';
const LS_MAX_BYTES = 5 * 1024 * 1024;

let connection;
let committed;
let fallbackMode = 'merge';
let queue = Promise.resolve();

function inOrder(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

function splitFiles(files) {
  return new Map(files.map(({ content, metricsData, ...file }, position) => {
    const id = file.id ?? newFileId();
    return [id, {
      meta: { ...file, id, position },
      data: { id, content, metricsData }
    }];
  }));
}

function openDB(onBlocked) {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!connection) {
    connection = new Promise(resolve => {
      const request = indexedDB.open(DB_NAME, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        const metadata = db.createObjectStore(META, { keyPath: 'id' });
        const payloads = db.createObjectStore(DATA, { keyPath: 'id' });
        if (db.objectStoreNames.contains('files')) {
          const legacy = request.transaction.objectStore('files').get('all');
          legacy.onsuccess = () => {
            for (const { meta, data } of splitFiles(legacy.result || []).values()) {
              metadata.put(meta);
              payloads.put(data);
            }
            db.deleteObjectStore('files');
          };
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = null; committed = null; };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      // The browser resumes this upgrade when the older tab closes.
      request.onblocked = () => onBlocked?.();
    }).catch(() => null);
  }
  return connection;
}

function finished(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error || new Error('File cache transaction aborted'));
  });
}

async function readDatabase(db) {
  const tx = db.transaction([META, DATA]);
  const metadata = tx.objectStore(META).getAll();
  const payloads = tx.objectStore(DATA).getAll();
  await finished(tx);
  const byId = new Map(payloads.result.map(data => [data.id, data]));
  return metadata.result.sort((a, b) => a.position - b.position).map(({ position: _position, ...meta }) => ({
    ...meta, ...byId.get(meta.id)
  }));
}

function sameFields(a, b) {
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.hasOwn(b, key) && a[key] === b[key]);
}

async function writeDatabase(db, files, previous) {
  const next = splitFiles(files);
  const tx = db.transaction([META, DATA], 'readwrite');
  const done = finished(tx);
  const metadata = tx.objectStore(META);
  const payloads = tx.objectStore(DATA);
  try {
    if (!previous) {
      metadata.clear();
      payloads.clear();
    } else {
      for (const id of previous.keys()) {
        if (!next.has(id)) { metadata.delete(id); payloads.delete(id); }
      }
    }
    for (const [id, { meta, data }] of next) {
      const old = previous?.get(id);
      if (!old || !sameFields(data, old.data)) {
        metadata.put(meta);
        payloads.put(data);
      } else if (!sameFields(meta, old.meta)) {
        // Apply only this tab's edits. A different tab may have renamed a
        // cached series or removed the file since this snapshot was loaded.
        const request = metadata.get(id);
        request.onsuccess = () => {
          const row = request.result;
          if (!row) return;
          for (const key of Object.keys(old.meta)) {
            if (!Object.hasOwn(meta, key)) delete row[key];
          }
          for (const [key, value] of Object.entries(meta)) {
            if (value !== old.meta[key] || !Object.hasOwn(old.meta, key)) row[key] = value;
          }
          metadata.put(row);
        };
      }
    }
  } catch (error) {
    tx.abort();
    await done.catch(() => {});
    throw error;
  }
  await done;
  committed = next;
}

function readFallback() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_LS_KEY));
    const files = Array.isArray(value) ? value : value?.files;
    if (Array.isArray(files)) {
      return {
        files: files.map(f => f.id != null ? f : { ...f, id: newFileId() }),
        mode: value.pending === true ? 'replace' : value.pending
      };
    }
  } catch { /* absent or inaccessible */ }
  return { files: [] };
}

function removeFallback() {
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* unavailable */ }
}

function writeFallback(files) {
  const pending = typeof indexedDB !== 'undefined' && fallbackMode;
  if (!files.length && pending !== 'replace') { removeFallback(); return; }
  const json = JSON.stringify(pending ? { pending, files } : files);
  if (json.length > LS_MAX_BYTES) {
    throw new DOMException('Serialized files exceed localStorage limit', 'QuotaExceededError');
  }
  localStorage.setItem(LEGACY_LS_KEY, json);
}

export function loadFiles(onBlocked) {
  return inOrder(async () => {
    const db = await openDB(onBlocked);
    const fallback = readFallback();
    fallbackMode = fallback.mode === 'replace' ? 'replace' : 'merge';
    if (!db) return fallback.files;

    let files;
    try {
      files = await readDatabase(db);
    } catch {
      // Keep new imports in the fallback until the existing cache can be read.
      db.close();
      connection = Promise.resolve(null);
      committed = null;
      return fallback.files;
    }

    committed = splitFiles(files);
    fallbackMode = 'replace';
    if (fallback.mode || (!files.length && fallback.files.length)) {
      if (fallback.mode === 'merge') {
        const byName = new Map(files.map(file => [file.name ?? file.id, file]));
        for (const file of fallback.files) byName.set(file.name ?? file.id, file);
        files = [...byName.values()];
      } else {
        files = fallback.files;
      }
      try {
        await writeDatabase(db, files, committed);
      } catch {
        return files; // Keep the fallback and retry from the last commit on save.
      }
    }
    removeFallback();
    return files;
  });
}

export function saveFiles(files) {
  return inOrder(async () => {
    const db = await openDB();
    if (db) {
      try {
        await writeDatabase(db, files, committed);
        fallbackMode = 'replace';
        removeFallback();
        return;
      } catch (error) {
        if (error?.name === 'QuotaExceededError' || error?.code === 22) throw error;
      }
    }
    writeFallback(files);
  });
}

export function clearFiles() {
  return inOrder(async () => {
    const db = await openDB();
    fallbackMode = 'replace';
    if (db) {
      await writeDatabase(db, [], null);
      removeFallback();
    } else {
      writeFallback([]);
    }
  });
}
