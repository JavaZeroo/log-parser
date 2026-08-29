// jsdom has no IndexedDB, so this suite runs the real store logic against
// fake-indexeddb — the same code path browsers take.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  clearSessions,
  pruneSessions,
  renameSession,
  planWrites,
  packMetrics,
  unpackMetrics,
  metricsFingerprint,
  estimateBytes,
  deriveSessionName,
  isCacheAvailable,
  MAX_SESSIONS,
  MAX_AGE_MS
} from '../sessionCache';

const SERIES = [{ x: 0, y: 1 }, { x: 1, y: 0.5 }];

function file(name, content = 'loss: 1\n', metrics = { Loss: SERIES }) {
  return {
    id: name,
    name,
    enabled: true,
    content,
    config: { metrics: [] },
    metricsData: metrics,
    // runtime-only fields that must not be persisted
    isParsing: true,
    progress: 0.5
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
    expect(record.files[0].metricsData.Loss).toEqual(SERIES);
    expect(record.globalParsingConfig.stepKeyword).toBe('iter:');
  });

  it('strips runtime-only fields from the snapshot', async () => {
    await saveSession({ id: 'key-1', files: [file('a.log')] });
    const record = await loadSession('key-1');
    expect(record.files[0].isParsing).toBeUndefined();
    expect(record.files[0].progress).toBeUndefined();
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

  it('drops the records of files removed from a session', async () => {
    await saveSession({ id: 'key-1', files: [file('a.log'), file('b.log')] });
    await saveSession({ id: 'key-1', files: [file('a.log')] });
    const record = await loadSession('key-1');
    expect(record.files.map(f => f.name)).toEqual(['a.log']);
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

  it('evicts past the byte ceiling, least recently used first', async () => {
    const t0 = Date.now();
    await saveSession({ id: 'small-old', files: [file('a.log', 'x'.repeat(1000))], now: t0 });
    await saveSession({ id: 'small-new', files: [file('b.log', 'x'.repeat(1000))], now: t0 + 1000 });
    const evicted = await pruneSessions({ budget: 1500, now: t0 + 2000 });
    expect(evicted).toEqual(['small-old']);
    expect((await listSessions()).map(s => s.id)).toEqual(['small-new']);
  });

  describe('incremental writes', () => {
    // Writing content and metrics on every state change is what made the first
    // version unusable with many large logs; these are the rules that stop it.
    it('writes content and metrics on the first save', () => {
      const plan = planWrites([file('a.log')], null, 'key-1');
      expect(plan.contentWrites).toHaveLength(1);
      expect(plan.metricsWrites).toHaveLength(1);
    });

    it('writes nothing but metadata when only a checkbox changed', () => {
      const first = planWrites([file('a.log')], null, 'key-1');
      const previous = { files: first.entries };
      const toggled = { ...file('a.log'), enabled: false };
      const plan = planWrites([toggled], previous, 'key-1');
      expect(plan.contentWrites).toEqual([]);
      expect(plan.metricsWrites).toEqual([]);
      expect(plan.entries[0].enabled).toBe(false);
    });

    it('does not even encode content it is not going to write', () => {
      // Encoding first and deciding after is the same cost as writing: it put
      // seconds back into every checkbox toggle once before.
      const first = planWrites([file('a.log')], null, 'key-1');
      const encode = vi.spyOn(TextEncoder.prototype, 'encode');
      planWrites([{ ...file('a.log'), enabled: false }], { files: first.entries }, 'key-1');
      expect(encode).not.toHaveBeenCalled();
      encode.mockRestore();
    });

    it('rewrites metrics — and only metrics — after a re-parse', () => {
      const first = planWrites([file('a.log')], null, 'key-1');
      const previous = { files: first.entries };
      const reparsed = { ...file('a.log'), metricsData: { Loss: [{ x: 0, y: 9 }] } };
      const plan = planWrites([reparsed], previous, 'key-1');
      expect(plan.contentWrites).toEqual([]);
      expect(plan.metricsWrites).toHaveLength(1);
    });

    it('reports files that dropped out of the session', () => {
      const first = planWrites([file('a.log'), file('b.log')], null, 'key-1');
      const plan = planWrites([file('a.log')], { files: first.entries }, 'key-1');
      expect(plan.staleIds).toEqual(['b.log']);
    });
  });

  it('packs and unpacks series losslessly', () => {
    const metrics = { Loss: [{ x: 0, y: 1.5 }, { x: 10, y: -2.25e-8 }] };
    const packed = packMetrics(metrics);
    expect(packed.Loss.x).toBeInstanceOf(Float64Array);
    expect(unpackMetrics(packed)).toEqual(metrics);
  });

  it('fingerprints a parse by count and endpoints', () => {
    const a = metricsFingerprint({ Loss: SERIES });
    expect(metricsFingerprint({ Loss: [...SERIES] })).toBe(a);
    expect(metricsFingerprint({ Loss: [...SERIES, { x: 2, y: 3 }] })).not.toBe(a);
    expect(metricsFingerprint({ Loss: [{ x: 0, y: 1 }, { x: 1, y: 0.6 }] })).not.toBe(a);
  });

  it('sizes a snapshot from content bytes and point counts', () => {
    expect(estimateBytes([])).toBe(0);
    expect(estimateBytes([{ content: 'abcde', metricsData: { L: [1, 2, 3] } }])).toBe(5 + 3 * 16);
    expect(estimateBytes([{ content: 'ab', metricsData: {} }])).toBe(2);
  });

  it('names a session after its files', () => {
    expect(deriveSessionName([])).toBe('Untitled');
    expect(deriveSessionName([{ name: 'a.log' }])).toBe('a.log');
    expect(deriveSessionName([{ name: 'a.log' }, { name: 'b.log' }])).toBe('a.log +1');
  });
});
