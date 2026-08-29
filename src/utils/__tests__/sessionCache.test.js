// jsdom has no IndexedDB, so this suite runs the real store logic against
// fake-indexeddb — the same code path browsers take.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  clearSessions,
  pruneSessions,
  renameSession,
  snapshotFiles,
  estimateBytes,
  deriveSessionName,
  isCacheAvailable,
  MAX_SESSIONS,
  MAX_SESSION_BYTES,
  MAX_AGE_MS
} from '../sessionCache';

function file(name, content = 'loss: 1\n', metrics = { Loss: [{ x: 0, y: 1 }] }) {
  return {
    id: name,
    name,
    enabled: true,
    content,
    config: { metrics: [] },
    metricsData: metrics,
    // runtime-only fields that must not be persisted
    isParsing: true,
    progress: 0.5,
    file: { fake: true }
  };
}

describe('sessionCache', () => {
  beforeEach(async () => {
    await clearSessions();
  });

  it('reports availability when IndexedDB exists', () => {
    expect(isCacheAvailable()).toBe(true);
  });

  it('round-trips a snapshot under its cache key', async () => {
    await saveSession({
      id: 'key-1',
      files: [file('a.log')],
      globalParsingConfig: { stepKeyword: 'iter:' }
    });
    const record = await loadSession('key-1');
    expect(record.files).toHaveLength(1);
    expect(record.files[0].name).toBe('a.log');
    expect(record.files[0].content).toBe('loss: 1\n');
    expect(record.files[0].metricsData.Loss).toEqual([{ x: 0, y: 1 }]);
    expect(record.globalParsingConfig.stepKeyword).toBe('iter:');
  });

  it('strips runtime-only fields from the snapshot', async () => {
    await saveSession({ id: 'key-1', files: [file('a.log')] });
    const record = await loadSession('key-1');
    expect(record.files[0].isParsing).toBeUndefined();
    expect(record.files[0].progress).toBeUndefined();
    expect(record.files[0].file).toBeUndefined();
  });

  it('returns null for an unknown key', async () => {
    expect(await loadSession('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('overwrites in place and keeps the original creation time', async () => {
    const first = await saveSession({ id: 'key-1', files: [file('a.log')] });
    await saveSession({ id: 'key-1', files: [file('a.log'), file('b.log')] });
    const list = await listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].fileCount).toBe(2);
    expect(list[0].createdAt).toBe(first.createdAt);
  });

  it('lists summaries newest first, without file contents', async () => {
    const t0 = Date.now();
    await saveSession({ id: 'key-1', files: [file('a.log')], now: t0 });
    await saveSession({ id: 'key-2', files: [file('b.log'), file('c.log')], now: t0 + 1000 });
    const list = await listSessions();
    expect(list.map(s => s.id)).toEqual(['key-2', 'key-1']);
    expect(list[0].name).toBe('b.log +1');
    expect(list[0].fileNames).toEqual(['b.log', 'c.log']);
    expect(list[0].files).toBeUndefined();
  });

  it('renames a snapshot without touching its payload', async () => {
    await saveSession({ id: 'key-1', files: [file('a.log')] });
    await renameSession('key-1', 'ResNet sweep');
    const [summary] = await listSessions();
    expect(summary.name).toBe('ResNet sweep');
    expect((await loadSession('key-1')).files).toHaveLength(1);
    // A later save keeps the chosen name rather than reverting to file names.
    await saveSession({ id: 'key-1', files: [file('a.log'), file('b.log')] });
    expect((await listSessions())[0].name).toBe('ResNet sweep');
  });

  it('deletes a snapshot and its summary', async () => {
    await saveSession({ id: 'key-1', files: [file('a.log')] });
    await deleteSession('key-1');
    expect(await loadSession('key-1')).toBeNull();
    expect(await listSessions()).toEqual([]);
  });

  it('evicts the least recently used snapshot past the count ceiling', async () => {
    for (let i = 0; i < MAX_SESSIONS + 2; i += 1) {
      await saveSession({ id: `key-${String(i).padStart(3, '0')}`, files: [file(`f${i}.log`)] });
    }
    const list = await listSessions();
    expect(list).toHaveLength(MAX_SESSIONS);
    expect(list.some(s => s.id === 'key-000')).toBe(false);
    expect(list.some(s => s.id === `key-${String(MAX_SESSIONS + 1).padStart(3, '0')}`)).toBe(true);
  });

  it('never evicts the snapshot being written', async () => {
    await saveSession({ id: 'keep-me', files: [file('a.log')] });
    const evicted = await pruneSessions({
      keepId: 'keep-me',
      now: Date.now() + MAX_AGE_MS * 2
    });
    expect(evicted).toEqual([]);
    expect(await loadSession('keep-me')).not.toBeNull();
  });

  it('evicts snapshots older than the age ceiling', async () => {
    await saveSession({ id: 'key-old', files: [file('a.log')] });
    const evicted = await pruneSessions({ now: Date.now() + MAX_AGE_MS + 1000 });
    expect(evicted).toEqual(['key-old']);
    expect(await listSessions()).toEqual([]);
  });

  it('drops raw content for snapshots over the per-session ceiling', async () => {
    const huge = 'x'.repeat(MAX_SESSION_BYTES + 1);
    const snapshot = snapshotFiles([file('big.log', huge)]);
    expect(snapshot[0].content).toBeNull();
    expect(snapshot[0].isLargeFile).toBe(true);
    // Parsed metrics survive, so charts still render after a reload.
    expect(snapshot[0].metricsData.Loss).toHaveLength(1);

    await saveSession({ id: 'key-big', files: [file('big.log', huge)] });
    const [summary] = await listSessions();
    expect(summary.truncated).toBe(true);
  });

  it('sizes a snapshot from content and point counts', () => {
    expect(estimateBytes([])).toBe(0);
    const bytes = estimateBytes([{ name: 'a', content: 'abcde', metricsData: { L: [1, 2, 3] } }]);
    expect(bytes).toBe(5 + 1 + 3 * 40);
  });

  it('names a session after its files', () => {
    expect(deriveSessionName([])).toBe('Untitled');
    expect(deriveSessionName([{ name: 'a.log' }])).toBe('a.log');
    expect(deriveSessionName([{ name: 'a.log' }, { name: 'b.log' }])).toBe('a.log +1');
  });
});
