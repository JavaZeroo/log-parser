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
