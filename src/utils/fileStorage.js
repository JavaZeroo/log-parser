// IndexedDB keeps list order and configuration separate from raw text or cached
// points. Each save applies a delta against the last successful transaction.
const DB_NAME = 'log-parser';
const META = 'fileMetadata';
const DATA = 'fileData';
export const LEGACY_LS_KEY = 'uploadedFiles';
const LS_MAX_BYTES = 5 * 1024 * 1024;

let connection;
let committed;
let queue = Promise.resolve();

function inOrder(operation) {
  const result = queue.then(operation);
  queue = result.catch(() => {});
  return result;
}

function splitFiles(files) {
  return new Map(files.map(({ content, metricsData, ...file }, position) => {
    const id = file.id ?? crypto.randomUUID();
    return [id, {
      meta: { ...file, id, position },
      data: { id, content, metricsData }
    }];
  }));
}

function openDB() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (!connection) {
    connection = new Promise(resolve => {
      const request = indexedDB.open(DB_NAME, 2);
      let blocked = false;
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
        if (blocked) { db.close(); return; }
        db.onversionchange = () => { db.close(); connection = null; committed = null; };
        resolve(db);
      };
      request.onerror = () => resolve(null);
      request.onblocked = () => { blocked = true; resolve(null); };
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
        // A stale tab toggling visibility must not recreate a deleted file.
        const exists = metadata.getKey(id);
        exists.onsuccess = () => { if (exists.result !== undefined) metadata.put(meta); };
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
      return { files: files.map(f => f.id != null ? f : { ...f, id: crypto.randomUUID() }), pending: !!value.pending };
    }
  } catch { /* absent or inaccessible */ }
  return { files: [], pending: false };
}

function removeFallback() {
  try { localStorage.removeItem(LEGACY_LS_KEY); } catch { /* unavailable */ }
}

function writeFallback(files) {
  // If IDB was blocked, this snapshot must take precedence when it reopens,
  // including an explicit clear. A single setItem is atomic on quota failure.
  const pending = typeof indexedDB !== 'undefined';
  if (!pending && !files.length) { removeFallback(); return; }
  const json = JSON.stringify(pending ? { pending, files } : files);
  if (json.length > LS_MAX_BYTES) {
    throw new DOMException('Serialized files exceed localStorage limit', 'QuotaExceededError');
  }
  localStorage.setItem(LEGACY_LS_KEY, json);
}

export function loadFiles() {
  return inOrder(async () => {
    const fallback = readFallback();
    const db = await openDB();
    if (!db) return fallback.files;
    let files;
    try {
      files = await readDatabase(db);
    } catch (error) {
      if (fallback.pending || fallback.files.length) return fallback.files;
      throw error;
    }
    if (fallback.pending || (!files.length && fallback.files.length)) {
      try {
        await writeDatabase(db, fallback.files, null);
        removeFallback();
      } catch { committed = null; } // retry migration on the next save
      return fallback.files;
    }
    committed = splitFiles(files);
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
        removeFallback();
        return;
      } catch (error) {
        if (error?.name === 'QuotaExceededError' || error?.code === 22) throw error;
      }
    }
    writeFallback(files);
    committed = null;
  });
}

export function clearFiles() {
  return inOrder(async () => {
    const db = await openDB();
    if (db) {
      await writeDatabase(db, [], null);
      removeFallback();
    } else {
      writeFallback([]);
    }
  });
}
