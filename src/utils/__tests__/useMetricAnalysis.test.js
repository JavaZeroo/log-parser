import { act, renderHook, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useMetricAnalysis } from '../useMetricAnalysis.js';

it('reuses source text, supersedes obsolete edits and releases workers on close', async ({ onTestFinished }) => {
  const workers = [];
  vi.stubGlobal('Worker', class {
    postMessage = vi.fn();
    terminate = vi.fn();
    constructor() { workers.push(this); }
    reply(result) { this.onmessage({ data: { result } }); }
  });
  onTestFinished(() => vi.unstubAllGlobals());
  const files = [{ id: '1', name: 'a.log', content: 'loss: 1' }];
  const metrics = [{ name: 'Loss', keyword: 'loss:', mode: 'keyword' }];
  const apply = vi.fn();
  const { result, rerender } = renderHook(
    p => useMetricAnalysis(p.files, p.metrics, p.open, apply),
    { initialProps: { files, metrics, open: false } }
  );
  expect(workers).toHaveLength(0);
  rerender({ files, metrics, open: true });
  await waitFor(() => expect(workers[0].postMessage).toHaveBeenCalledTimes(2));
  const worker = workers[0];
  const second = [{ ...metrics[0], name: 'Second' }];
  const third = [{ ...metrics[0], name: 'Third' }];
  rerender({ files, metrics: second, open: true });
  rerender({ files: [{ ...files[0], enabled: false }], metrics: third, open: true });
  await act(async () => worker.reply({ Loss: [] }));
  expect(result.current.results).toBeNull();
  expect(worker.postMessage.mock.calls.map(([m]) => m.type)).toEqual(['SET_FILES', 'PREVIEW', 'PREVIEW']);
  expect(worker.postMessage.mock.lastCall[0].metrics).toEqual(third);
  await act(async () => worker.reply({ Third: [] }));
  expect(result.current.results).toEqual({ Third: [] });

  await act(async () => result.current.recommend());
  expect(worker.postMessage.mock.lastCall[0].type).toBe('RECOMMEND');
  rerender({ files: [], metrics: third, open: false });
  await act(async () => worker.reply(['train_loss']));
  expect(apply).not.toHaveBeenCalled();
  expect(worker.terminate).toHaveBeenCalledOnce();

  rerender({ files, metrics, open: false });
  await act(async () => result.current.recommend());
  await act(async () => workers[1].reply(['train_loss']));
  expect(apply).toHaveBeenCalledWith({ metrics: [{ ...metrics[0], keyword: 'train_loss' }] });
  expect(workers[1].terminate).toHaveBeenCalledOnce();
});
