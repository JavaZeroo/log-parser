import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

let cache;
beforeEach(async () => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  localStorage.clear();
  vi.resetModules();
  cache = await import('../fileStorage.js');
});
afterEach(() => vi.unstubAllGlobals());

async function seedV1(files) {
  await new Promise((resolve, reject) => {
    const req = indexedDB.open('log-parser', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('files').put(files, 'all');
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { req.result.close(); resolve(); };
  });
}

describe('IndexedDB file cache', () => {
  it('migrates ordered v1 records and only writes metadata on a toggle', async ({ onTestFinished }) => {
    const rows = [
      { id: 'z', name: 'first.log', enabled: true, content: 'loss: 1' },
      { id: 'a', name: 'big.log', enabled: true, isLargeFile: true, content: null, metricsData: { Loss: [{ x: 0, y: 9 }] } }
    ];
    await seedV1(rows);
    const loaded = await cache.loadFiles();
    expect(loaded).toEqual(rows);
    const put = vi.spyOn(IDBObjectStore.prototype, 'put');
    onTestFinished(() => put.mockRestore());
    await cache.saveFiles([{ ...loaded[0], enabled: false }, loaded[1]]);
    expect(put).toHaveBeenCalledTimes(1);
    expect(put.mock.instances[0].name).toBe('fileMetadata');
    expect(put.mock.calls[0][0]).not.toHaveProperty('content');
    expect((await cache.loadFiles()).map(file => file.id)).toEqual(['z', 'a']);
    await cache.saveFiles([loaded[1]]);
    expect(await cache.loadFiles()).toEqual([rows[1]]);
  });

  it('waits for an open v1 tab before hydrating the migrated files', async () => {
    const rows = [{ id: 'old', name: 'old.log', content: 'keep me' }];
    await seedV1(rows);
    const oldTab = await new Promise(resolve => {
      const req = indexedDB.open('log-parser', 1);
      req.onsuccess = () => resolve(req.result);
    });
    const notice = vi.fn();
    const loading = cache.loadFiles(notice);
    try {
      await vi.waitFor(() => expect(notice).toHaveBeenCalledOnce(), { timeout: 400, interval: 10 });
    } finally {
      oldTab.close();
    }
    expect(await loading).toEqual(rows);
    expect(localStorage.getItem(cache.LEGACY_LS_KEY)).toBeNull();
  });

  it('merges offline imports into an unread cache and honors an explicit offline clear', async () => {
    const existing = { id: 'old', name: 'old.log', content: 'keep' };
    await seedV1([existing]);
    const pending = { id: 'new', name: 'new.log', content: 'new' };
    const deny = () => vi.spyOn(indexedDB, 'open').mockImplementation(() => {
      throw new DOMException('temporarily disabled', 'SecurityError');
    });
    const reload = async () => {
      vi.resetModules();
      cache = await import('../fileStorage.js');
    };
    const denied = deny();
    expect(await cache.loadFiles()).toEqual([]);
    await cache.saveFiles([]);
    await cache.saveFiles([pending]);
    denied.mockRestore();
    await reload();
    expect(await cache.loadFiles()).toEqual([existing, pending]);

    await reload();
    const secondDenial = deny();
    await cache.loadFiles();
    await cache.clearFiles();
    secondDenial.mockRestore();
    await reload();
    expect(await cache.loadFiles()).toEqual([]);
  });

  it('migrates localStorage, serializes overlapping saves and clears both stores', async () => {
    const file = { id: '1', name: 'a', content: 'old' };
    localStorage.setItem(cache.LEGACY_LS_KEY, JSON.stringify([file]));
    expect(await cache.loadFiles()).toEqual([file]);
    expect(localStorage.getItem(cache.LEGACY_LS_KEY)).toBeNull();
    const updated = { ...file, content: 'new' };
    await Promise.all([cache.saveFiles([updated]), cache.saveFiles([{ ...updated, enabled: false }])]);
    expect(await cache.loadFiles()).toEqual([{ ...updated, enabled: false }]);
    await cache.clearFiles();
    expect(await cache.loadFiles()).toEqual([]);
  });

  it('keeps another tab’s cached metric configuration when a stale tab toggles the file', async () => {
    const file = { id: 'large', name: 'large.log', enabled: true, content: null,
      config: { metrics: [{ name: 'Old' }] }, metricsData: { Old: [{ x: 1, y: 2 }] } };
    await cache.saveFiles([file]);
    const [stale] = await cache.loadFiles();
    vi.resetModules();
    const otherTab = await import('../fileStorage.js');
    const [loaded] = await otherTab.loadFiles();
    const renamed = { ...loaded, config: { metrics: [{ name: 'New' }] }, metricsData: { New: file.metricsData.Old } };
    await otherTab.saveFiles([renamed]);
    await cache.saveFiles([{ ...stale, enabled: false }]);
    expect(await otherTab.loadFiles()).toEqual([{ ...renamed, enabled: false }]);
  });

  it('retains the previous snapshot after quota failure and retries from the last commit', async () => {
    const file = { id: '1', content: 'original', enabled: true };
    await cache.saveFiles([file]);
    const changed = { ...file, content: 'replacement', enabled: false };
    const originalPut = IDBObjectStore.prototype.put;
    const put = vi.spyOn(IDBObjectStore.prototype, 'put');
    put.mockImplementationOnce(originalPut);
    put.mockImplementationOnce(() => { throw new DOMException('full', 'QuotaExceededError'); });
    try {
      await expect(cache.saveFiles([changed])).rejects.toMatchObject({ name: 'QuotaExceededError' });
    } finally { put.mockRestore(); }
    expect(await cache.loadFiles()).toEqual([file]);
    await cache.saveFiles([changed]);
    expect(await cache.loadFiles()).toEqual([changed]);
  });
});
