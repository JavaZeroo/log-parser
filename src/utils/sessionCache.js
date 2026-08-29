// Perfetto-style local cache for parsed logs.
//
// ui.perfetto.dev keeps every opened trace in browser storage under a UUID and
// puts that UUID in the URL (`?local_cache_key=…`), so a reload, a bookmark or
// a second tab can bring the exact same trace back without re-uploading it.
// This module is the same idea for log analyses: each snapshot (files + their
// parsed metrics + the parsing config that produced them) is written to
// IndexedDB under a cache key, and `cacheUrl.js` puts that key in the hash.
//
// Layout matters here, because people routinely open a lot of large logs:
//
//   sessionIndex  small summary per analysis — listing never reads log text
//   sessions      small metadata record — names, enabled flags, configs, refs
//   content       one record per file, holding the raw log (a Blob when the
//                 original File is still around, which stores by reference)
//   metrics       one record per file, series packed as Float64Array pairs
//
// Content and metrics are written only when they actually change, so toggling a
// checkbox or editing a range rewrites the small record and nothing else. The
// measurements that drove this (Chromium, IndexedDB): 100MB of logs in one
// record costs ~1.5s to write and was rewritten on *every* state change; split
// out, the same toggle writes ~1ms. Packing 1M points as typed arrays instead
// of {x,y} objects took writes from 779ms to 106ms and reads from 931ms to
// 191ms.
//
// Eviction is LRU with age, count and byte ceilings — a cache that grows until
// the browser kills the origin's storage is worse than one that forgets.

import {
  openDB,
  hasIDB,
  isQuotaError,
  requestToPromise,
  txDone,
  SESSIONS_STORE,
  SESSION_INDEX_STORE,
  CONTENT_STORE,
  METRICS_STORE
} from './idb.js';

export const MAX_SESSIONS = 20;
// Ceiling on everything the cache holds. Also clamped to half the origin's
// reported quota, so a small disk doesn't get filled by cached logs.
export const MAX_TOTAL_BYTES = 2 * 1024 * 1024 * 1024;
export const MIN_TOTAL_BYTES = 128 * 1024 * 1024;
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
// Two Float64s per point.
const BYTES_PER_POINT = 16;

export function isCacheAvailable() {
  return hasIDB();
}

const recordKey = (sessionId, fileId) => `${sessionId}:${fileId}`;
const sessionRange = (sessionId) => IDBKeyRange.bound(`${sessionId}:`, `${sessionId}:￿`);

// Ask the browser not to evict us under storage pressure. Best effort: it is a
// no-op where unsupported, and a denial just means the cache behaves as before.
let persistRequested = false;
function requestPersistence() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    navigator?.storage?.persist?.().catch(() => {});
  } catch { /* unsupported */ }
}

async function totalBudget() {
  try {
    const quota = (await navigator?.storage?.estimate?.())?.quota;
    if (quota) {
      return Math.max(MIN_TOTAL_BYTES, Math.min(MAX_TOTAL_BYTES, Math.floor(quota / 2)));
    }
  } catch { /* estimate unavailable */ }
  return MAX_TOTAL_BYTES;
}

export function countPoints(metricsData) {
  return Object.values(metricsData || {})
    .reduce((n, series) => n + (Array.isArray(series) ? series.length : 0), 0);
}

// Byte cost of one file's cached form: raw log plus packed series. Content is
// sized by character count — an upper bound for the UTF-8 bytes actually
// stored, for the ASCII that training logs are made of.
export function fileBytes(file) {
  return contentBytes(file) + countPoints(file.metricsData) * BYTES_PER_POINT;
}

export function estimateBytes(files) {
  return (files || []).reduce((total, file) => total + fileBytes(file), 0);
}

// Points are plain {x, y} numbers (see logParser.worker.js), so two Float64
// arrays hold them losslessly at a fraction of the structured-clone cost.
export function packMetrics(metricsData) {
  const packed = {};
  Object.keys(metricsData || {}).forEach(name => {
    const series = metricsData[name];
    if (!Array.isArray(series)) return;
    const x = new Float64Array(series.length);
    const y = new Float64Array(series.length);
    for (let i = 0; i < series.length; i += 1) {
      const point = series[i] || {};
      x[i] = point.x;
      y[i] = point.y;
    }
    packed[name] = { x, y };
  });
  return packed;
}

export function unpackMetrics(packed) {
  const out = {};
  Object.keys(packed || {}).forEach(name => {
    const entry = packed[name];
    if (!entry) return;
    if (Array.isArray(entry)) { out[name] = entry; return; }
    const { x, y } = entry;
    const points = new Array(x.length);
    for (let i = 0; i < x.length; i += 1) points[i] = { x: x[i], y: y[i] };
    out[name] = points;
  });
  return out;
}

// Cheap change detector, so an unchanged parse is not rewritten. A re-parse
// always changes the point count or the values at one of the ends.
export function metricsFingerprint(metricsData) {
  return Object.keys(metricsData || {}).sort().map(name => {
    const series = metricsData[name];
    if (!Array.isArray(series) || series.length === 0) return `${name}:0`;
    const first = series[0] || {};
    const last = series[series.length - 1] || {};
    return `${name}:${series.length}:${first.x},${first.y}:${last.x},${last.y}`;
  }).join('|');
}

function contentBytes(file) {
  const content = file.content;
  return content ? content.length : 0;
}

// The raw log, stored so that re-parsing works after a reload.
//
// Stored as UTF-8 bytes taken from the text we already hold, deliberately not
// as the original File: a File is a reference to the file on disk, so the next
// training run overwriting train.log would leave the cache serving content that
// no longer matches the metrics parsed from it — or failing to read at all.
// The encoded copy also halves the stored bytes for ASCII logs, since JS
// strings are UTF-16, and structured-clones far faster than a string does.
function contentValue(file) {
  if (file.content == null) return null;
  if (typeof TextEncoder === 'function') return new TextEncoder().encode(file.content);
  return file.content;
}

async function readContentValue(value) {
  if (value == null) return null;
  try {
    if (typeof value === 'string') return value;
    if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) {
      return new TextDecoder().decode(value);
    }
    // Blob, from a cache written by an older build.
    if (typeof value.text === 'function') return await value.text();
  } catch {
    // Unreadable record — treat it as a file that has to be re-uploaded
    // before it can be re-parsed. The parsed series still render.
  }
  return null;
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
  const tx = db.transaction(
    [SESSIONS_STORE, SESSION_INDEX_STORE, CONTENT_STORE, METRICS_STORE],
    'readwrite'
  );
  const sessions = tx.objectStore(SESSIONS_STORE);
  const index = tx.objectStore(SESSION_INDEX_STORE);
  const content = tx.objectStore(CONTENT_STORE);
  const metrics = tx.objectStore(METRICS_STORE);
  ids.forEach(id => {
    sessions.delete(id);
    index.delete(id);
    // Keys are `${sessionId}:${fileId}`, so one range clears all of a
    // session's files without reading the record first.
    content.delete(sessionRange(id));
    metrics.delete(sessionRange(id));
  });
  await txDone(tx);
}

// Enforce the age / count / byte ceilings, least-recently-used first.
// `keepId` is never evicted — dropping the analysis currently on screen would
// break the link in the address bar.
export async function pruneSessions({ keepId = null, now = Date.now(), budget } = {}) {
  if (!hasIDB()) return [];
  let entries;
  try {
    entries = await readIndex();
  } catch {
    return [];
  }
  const byteCeiling = budget ?? await totalBudget();
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
    if (count <= MAX_SESSIONS && total <= byteCeiling) break;
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

async function getRecord(store, key) {
  if (!hasIDB() || !key) return null;
  try {
    const db = await openDB();
    const tx = db.transaction(store, 'readonly');
    const result = await requestToPromise(tx.objectStore(store).get(key));
    return result || null;
  } catch {
    return null;
  }
}

export function getSummary(id) {
  return getRecord(SESSION_INDEX_STORE, id);
}

// Decide what actually has to be written. Content is immutable for a given file
// id, so it is written once; metrics are rewritten only when the parse changed.
// Exported for tests: this is the rule that keeps a checkbox toggle from
// rewriting hundreds of megabytes.
export function planWrites(files, previous, sessionId, { withContent = true } = {}) {
  const prevById = new Map((previous?.files || []).map(entry => [entry.id, entry]));
  const contentWrites = [];
  const metricsWrites = [];
  const entries = files.map(file => {
    const prev = prevById.get(file.id);
    const bytes = contentBytes(file);
    // Decide before encoding: a file already in the cache must not be re-encoded
    // just to find out it does not need writing. Encoding first is what made a
    // checkbox toggle cost seconds on a few hundred MB of logs.
    const reuseContent = !!prev?.hasContent && prev.contentBytes === bytes;
    let hasContent = reuseContent;
    if (withContent && !reuseContent) {
      const value = contentValue(file);
      if (value != null) {
        contentWrites.push([recordKey(sessionId, file.id), value]);
        hasContent = true;
      }
    }

    const fingerprint = metricsFingerprint(file.metricsData);
    const points = countPoints(file.metricsData);
    if (points > 0 && prev?.fingerprint !== fingerprint) {
      metricsWrites.push([recordKey(sessionId, file.id), packMetrics(file.metricsData)]);
    }

    return {
      id: file.id,
      name: file.name,
      enabled: file.enabled ?? true,
      config: file.config,
      hasContent,
      contentBytes: bytes,
      fingerprint,
      points
    };
  });
  const staleIds = [...prevById.keys()].filter(id => !files.some(f => f.id === id));
  return { entries, contentWrites, metricsWrites, staleIds };
}

async function commit({ record, summary, contentWrites, metricsWrites, staleIds, sessionId }) {
  const db = await openDB();
  const tx = db.transaction(
    [SESSIONS_STORE, SESSION_INDEX_STORE, CONTENT_STORE, METRICS_STORE],
    'readwrite'
  );
  const content = tx.objectStore(CONTENT_STORE);
  const metrics = tx.objectStore(METRICS_STORE);
  contentWrites.forEach(([key, value]) => content.put(value, key));
  metricsWrites.forEach(([key, value]) => metrics.put(value, key));
  staleIds.forEach(fileId => {
    content.delete(recordKey(sessionId, fileId));
    metrics.delete(recordKey(sessionId, fileId));
  });
  tx.objectStore(SESSIONS_STORE).put(record);
  tx.objectStore(SESSION_INDEX_STORE).put(summary);
  await txDone(tx);
}

/**
 * Write (or overwrite) the snapshot stored under `id`.
 * Returns the index summary, or null when caching is unavailable.
 * Throws QuotaExceededError if the browser refuses the write even after
 * evicting other analyses and giving up the raw logs.
 */
export async function saveSession({ id, files, globalParsingConfig, name, createdAt, now = Date.now() }) {
  if (!hasIDB()) return null;
  requestPersistence();

  const previous = await getRecord(SESSIONS_STORE, id);
  const existingSummary = await getSummary(id);

  const build = (opts) => {
    const plan = planWrites(files || [], previous, id, opts);
    const bytes = plan.entries.reduce(
      (total, entry) => total + (entry.hasContent ? entry.contentBytes : 0) + entry.points * BYTES_PER_POINT,
      0
    );
    return {
      plan,
      record: {
        id,
        files: plan.entries,
        globalParsingConfig: globalParsingConfig ? JSON.parse(JSON.stringify(globalParsingConfig)) : null,
        createdAt: createdAt || previous?.createdAt || existingSummary?.createdAt || now,
        updatedAt: now
      },
      summary: {
        id,
        name: name || existingSummary?.name || deriveSessionName(files),
        fileNames: plan.entries.map(f => f.name),
        fileCount: plan.entries.length,
        bytes,
        truncated: plan.entries.some(f => !f.hasContent && f.points > 0),
        createdAt: createdAt || previous?.createdAt || existingSummary?.createdAt || now,
        updatedAt: now,
        lastAccess: now
      }
    };
  };

  const write = async ({ plan, record, summary }) => {
    await commit({
      record,
      summary,
      contentWrites: plan.contentWrites,
      metricsWrites: plan.metricsWrites,
      staleIds: plan.staleIds,
      sessionId: id
    });
    return summary;
  };

  const full = build();
  try {
    const summary = await write(full);
    await pruneSessions({ keepId: id, now });
    return summary;
  } catch (err) {
    if (!isQuotaError(err)) throw err;
    // Storage is full. First give up the other cached analyses…
    const entries = await readIndex().catch(() => []);
    await removeIds(entries.map(e => e.id).filter(otherId => otherId !== id)).catch(() => {});
    try {
      return await write(build());
    } catch (retryErr) {
      if (!isQuotaError(retryErr)) throw retryErr;
      // …then the raw logs. Charts still render from the parsed series; the
      // files are flagged so the UI can ask for a re-upload before re-parsing.
      await removeIds([id]).catch(() => {});
      return write(build({ withContent: false }));
    }
  }
}

/** Read a snapshot back and mark it as most-recently used. */
export async function loadSession(id) {
  if (!hasIDB() || !id) return null;
  const record = await getRecord(SESSIONS_STORE, id);
  if (!record) return null;

  let contents = [];
  let metrics = [];
  try {
    const db = await openDB();
    const tx = db.transaction([CONTENT_STORE, METRICS_STORE], 'readonly');
    const contentStore = tx.objectStore(CONTENT_STORE);
    const metricsStore = tx.objectStore(METRICS_STORE);
    const keys = (record.files || []).map(entry => recordKey(id, entry.id));
    contents = await Promise.all(keys.map(key => requestToPromise(contentStore.get(key))));
    metrics = await Promise.all(keys.map(key => requestToPromise(metricsStore.get(key))));
  } catch {
    return null;
  }

  const files = await Promise.all((record.files || []).map(async (entry, i) => {
    const content = await readContentValue(contents[i]);
    return {
      id: entry.id,
      name: entry.name,
      enabled: entry.enabled ?? true,
      config: entry.config,
      content,
      metricsData: unpackMetrics(metrics[i]),
      // Mirrors the working set's own flag: no raw log means re-parsing needs
      // the file back, even though the charts render fine without it.
      isLargeFile: content == null
    };
  }));

  await touchSession(id).catch(() => {});
  return { id: record.id, files, globalParsingConfig: record.globalParsingConfig };
}

async function putSummary(summary) {
  const db = await openDB();
  const tx = db.transaction(SESSION_INDEX_STORE, 'readwrite');
  tx.objectStore(SESSION_INDEX_STORE).put(summary);
  await txDone(tx);
  return summary;
}

export async function touchSession(id, now = Date.now()) {
  const summary = await getSummary(id);
  if (!summary) return null;
  return putSummary({ ...summary, lastAccess: now });
}

export async function renameSession(id, name) {
  const summary = await getSummary(id);
  if (!summary) return null;
  return putSummary({ ...summary, name });
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
