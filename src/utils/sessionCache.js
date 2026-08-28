// Perfetto-style local cache for parsed logs.
//
// ui.perfetto.dev keeps every opened trace in browser storage under a UUID and
// puts that UUID in the URL (`?local_cache_key=…`), so a reload, a bookmark or
// a second tab can bring the exact same trace back without re-uploading it.
// This module is the same idea for log analyses: each snapshot (files + their
// parsed metrics + the parsing config that produced them) is written to
// IndexedDB under a cache key, and `cacheUrl.js` puts that key in the hash.
//
// Two stores back it: `sessions` holds the full payload, `sessionIndex` holds a
// small summary so listing cached analyses never has to deserialize log text.
// Eviction is LRU with age, count and byte ceilings — a cache that grows until
// the browser kills the origin's storage is worse than one that forgets.

import {
  openDB,
  hasIDB,
  isQuotaError,
  requestToPromise,
  txDone,
  SESSIONS_STORE,
  SESSION_INDEX_STORE
} from './idb.js';

export const MAX_SESSIONS = 20;
export const MAX_TOTAL_BYTES = 192 * 1024 * 1024;
export const MAX_SESSION_BYTES = 64 * 1024 * 1024;
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export function isCacheAvailable() {
  return hasIDB();
}

// Rough byte cost of a snapshot. Deliberately cheap: JSON.stringify on a
// multi-megabyte log on every keystroke-triggered save would cost more than the
// write it is sizing.
export function estimateBytes(files) {
  return (files || []).reduce((total, file) => {
    let n = (file.content ? file.content.length : 0) + (file.name ? file.name.length : 0);
    const metrics = file.metricsData || {};
    Object.keys(metrics).forEach(key => {
      const series = metrics[key];
      if (Array.isArray(series)) n += series.length * 40;
    });
    return total + n;
  }, 0);
}

// Strip runtime-only fields (worker progress, File handles, transient errors)
// and drop raw content for snapshots too large to be worth caching whole — the
// parsed metrics still render, the file is just flagged for re-upload if the
// user wants to re-parse it.
export function snapshotFiles(files) {
  const list = (files || []).map(({ id, name, enabled, content, config, metricsData }) => ({
    id,
    name,
    enabled: enabled ?? true,
    content: content ?? null,
    config,
    metricsData: metricsData || {},
    isLargeFile: false
  }));
  if (estimateBytes(list) <= MAX_SESSION_BYTES) return list;
  return list.map(file => ({ ...file, content: null, isLargeFile: true }));
}

export function deriveSessionName(files) {
  const names = (files || []).map(f => f.name).filter(Boolean);
  if (names.length === 0) return 'Untitled';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

async function readIndex() {
  const db = await openDB();
  const tx = db.transaction(SESSION_INDEX_STORE, 'readonly');
  const all = await requestToPromise(tx.objectStore(SESSION_INDEX_STORE).getAll());
  return Array.isArray(all) ? all : [];
}

async function removeIds(ids) {
  if (ids.length === 0) return;
  const db = await openDB();
  const tx = db.transaction([SESSIONS_STORE, SESSION_INDEX_STORE], 'readwrite');
  const sessions = tx.objectStore(SESSIONS_STORE);
  const index = tx.objectStore(SESSION_INDEX_STORE);
  ids.forEach(id => {
    sessions.delete(id);
    index.delete(id);
  });
  await txDone(tx);
}

// Enforce the age / count / byte ceilings, least-recently-used first.
// `keepId` is never evicted — dropping the analysis currently on screen would
// break the link in the address bar.
export async function pruneSessions({ keepId = null, now = Date.now() } = {}) {
  if (!hasIDB()) return [];
  let entries;
  try {
    entries = await readIndex();
  } catch {
    return [];
  }
  const evict = new Set();
  const survivors = [];
  entries.forEach(entry => {
    if (entry.id !== keepId && now - (entry.lastAccess || entry.updatedAt || 0) > MAX_AGE_MS) {
      evict.add(entry.id);
    } else {
      survivors.push(entry);
    }
  });
  // Oldest access first, so the tail of this list is what we drop.
  survivors.sort((a, b) => (a.lastAccess || 0) - (b.lastAccess || 0));
  let total = survivors.reduce((n, e) => n + (e.bytes || 0), 0);
  let count = survivors.length;
  for (const entry of survivors) {
    if (count <= MAX_SESSIONS && total <= MAX_TOTAL_BYTES) break;
    if (entry.id === keepId) continue;
    evict.add(entry.id);
    total -= entry.bytes || 0;
    count -= 1;
  }
  const ids = [...evict];
  try {
    await removeIds(ids);
  } catch {
    return [];
  }
  return ids;
}

async function writeSession(record, summary) {
  const db = await openDB();
  const tx = db.transaction([SESSIONS_STORE, SESSION_INDEX_STORE], 'readwrite');
  tx.objectStore(SESSIONS_STORE).put(record);
  tx.objectStore(SESSION_INDEX_STORE).put(summary);
  await txDone(tx);
}

/**
 * Write (or overwrite) the snapshot stored under `id`.
 * Returns the index summary, or null when caching is unavailable.
 * Throws QuotaExceededError if the browser refuses the write even after evicting.
 */
export async function saveSession({ id, files, globalParsingConfig, name, createdAt, now = Date.now() }) {
  if (!hasIDB()) return null;
  const snapshot = snapshotFiles(files);
  const bytes = estimateBytes(snapshot);
  const existing = await getSummary(id);
  const record = {
    id,
    files: snapshot,
    globalParsingConfig: globalParsingConfig ? JSON.parse(JSON.stringify(globalParsingConfig)) : null,
    createdAt: createdAt || existing?.createdAt || now,
    updatedAt: now
  };
  const summary = {
    id,
    name: name || existing?.name || deriveSessionName(snapshot),
    fileNames: snapshot.map(f => f.name),
    fileCount: snapshot.length,
    bytes,
    truncated: snapshot.some(f => f.isLargeFile),
    createdAt: record.createdAt,
    updatedAt: now,
    lastAccess: now
  };

  try {
    await writeSession(record, summary);
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    // Storage is full: evict everything but the snapshot being written, then
    // give it exactly one more try before surfacing the failure.
    const entries = await readIndex().catch(() => []);
    await removeIds(entries.map(e => e.id).filter(otherId => otherId !== id)).catch(() => {});
    await writeSession(record, summary);
  }
  await pruneSessions({ keepId: id, now });
  return summary;
}

export async function getSummary(id) {
  if (!hasIDB() || !id) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(SESSION_INDEX_STORE, 'readonly');
    const result = await requestToPromise(tx.objectStore(SESSION_INDEX_STORE).get(id));
    return result || null;
  } catch {
    return null;
  }
}

/** Read a snapshot back and mark it as most-recently used. */
export async function loadSession(id) {
  if (!hasIDB() || !id) return null;
  let record;
  try {
    const db = await openDB();
    const tx = db.transaction(SESSIONS_STORE, 'readonly');
    record = await requestToPromise(tx.objectStore(SESSIONS_STORE).get(id));
  } catch {
    return null;
  }
  if (!record) return null;
  await touchSession(id).catch(() => {});
  return record;
}

export async function touchSession(id, now = Date.now()) {
  const summary = await getSummary(id);
  if (!summary) return null;
  const next = { ...summary, lastAccess: now };
  const db = await openDB();
  const tx = db.transaction(SESSION_INDEX_STORE, 'readwrite');
  tx.objectStore(SESSION_INDEX_STORE).put(next);
  await txDone(tx);
  return next;
}

export async function renameSession(id, name) {
  const summary = await getSummary(id);
  if (!summary) return null;
  const next = { ...summary, name };
  const db = await openDB();
  const tx = db.transaction(SESSION_INDEX_STORE, 'readwrite');
  tx.objectStore(SESSION_INDEX_STORE).put(next);
  await txDone(tx);
  return next;
}

/** Summaries for the cache list, most recently updated first. */
export async function listSessions() {
  if (!hasIDB()) return [];
  try {
    const entries = await readIndex();
    return entries.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch {
    return [];
  }
}

export async function deleteSession(id) {
  if (!hasIDB() || !id) return;
  await removeIds([id]).catch(() => {});
}

export async function clearSessions() {
  if (!hasIDB()) return;
  const entries = await readIndex().catch(() => []);
  await removeIds(entries.map(e => e.id)).catch(() => {});
}
