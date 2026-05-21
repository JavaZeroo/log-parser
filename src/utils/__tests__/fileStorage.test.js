import { describe, it, expect, beforeEach } from 'vitest';
import { loadFiles, saveFiles, clearFiles, LEGACY_LS_KEY } from '../fileStorage';

// jsdom has no IndexedDB, so these tests exercise the localStorage fallback —
// which is also the path real browsers hit when IDB is blocked/private mode.

describe('fileStorage (localStorage fallback)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty array when nothing stored', async () => {
    expect(await loadFiles()).toEqual([]);
  });

  it('round-trips files via localStorage', async () => {
    const files = [
      { id: 'a', name: 'a.log', enabled: true, content: 'hello' },
      { id: 'b', name: 'b.log', enabled: false, content: 'world' }
    ];
    await saveFiles(files);
    const stored = JSON.parse(localStorage.getItem(LEGACY_LS_KEY));
    expect(stored).toEqual(files);
    expect(await loadFiles()).toEqual(files);
  });

  it('removes storage entry when saving empty array', async () => {
    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify([{ id: 'a' }]));
    await saveFiles([]);
    expect(localStorage.getItem(LEGACY_LS_KEY)).toBeNull();
  });

  it('clearFiles wipes localStorage', async () => {
    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify([{ id: 'a' }]));
    await clearFiles();
    expect(localStorage.getItem(LEGACY_LS_KEY)).toBeNull();
  });

  it('throws QuotaExceededError when payload exceeds 5MB', async () => {
    // Build a 6MB string (rough — JSON overhead extra)
    const giant = 'x'.repeat(6 * 1024 * 1024);
    await expect(saveFiles([{ id: 'big', content: giant }])).rejects.toMatchObject({
      name: 'QuotaExceededError'
    });
  });

  it('tolerates corrupt JSON on load', async () => {
    localStorage.setItem(LEGACY_LS_KEY, '{not json');
    expect(await loadFiles()).toEqual([]);
  });
});
