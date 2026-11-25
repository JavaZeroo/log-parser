import { useLayoutEffect, useRef, useState } from 'react';

function sameSources(a, b) {
  return a.length === b.length && a.every((file, i) =>
    file.id === b[i].id && file.name === b[i].name && file.content === b[i].content);
}

// Keep one scan in flight. Edits supersede queued work before it reaches the
// worker, and the files are sent only once per active analysis session.
function enqueue(session, message, onResult) {
  let cancelled = false;
  session.pending = session.pending.then(async () => {
    if (cancelled) return;
    let reply;
    try {
      if (!session.worker) {
        session.worker = new Worker(new URL('../workers/metricAnalysis.worker.js', import.meta.url), { type: 'module' });
        session.worker.postMessage({ type: 'SET_FILES', files: session.sources });
      }
      reply = await new Promise((resolve, reject) => {
        session.worker.onmessage = ({ data }) => resolve(data);
        session.worker.onerror = reject;
        session.worker.postMessage(message);
      });
    } catch {
      session.worker?.terminate();
      session.worker = null;
      reply = { error: true };
    }
    if (!cancelled) onResult(reply);
  });
  return () => { cancelled = true; };
}

export function useMetricAnalysis(files, metrics, showPreview, onConfigChange) {
  const [sources, setSources] = useState([]);
  const [request, setRequest] = useState(null);
  const [results, setResults] = useState(null);
  const [failed, setFailed] = useState(false);
  const session = useRef(null);
  const apply = useRef(onConfigChange);
  useLayoutEffect(() => { apply.current = onConfigChange; }, [onConfigChange]);

  useLayoutEffect(() => {
    const next = files.filter(f => typeof f.content === 'string' && f.content.length)
      .map(({ id, name, content }) => ({ id, name, content }));
    setSources(prev => sameSources(prev, next) ? prev : next);
  }, [files]);

  const recommending = request?.metrics === metrics && request?.sources === sources;
  const active = sources.length > 0 && (showPreview || recommending);
  useLayoutEffect(() => {
    if (!active) return;
    const current = { sources, worker: null, pending: Promise.resolve() };
    session.current = current;
    return () => {
      current.worker?.terminate();
      session.current = null;
    };
  }, [active, sources]);

  useLayoutEffect(() => {
    setResults(null);
    setFailed(false);
    if (!showPreview || !sources.length) return;
    return enqueue(session.current, { type: 'PREVIEW', metrics }, ({ result, error }) => {
      if (error) setFailed(true);
      else setResults(result);
    });
  }, [showPreview, sources, metrics]);

  useLayoutEffect(() => {
    if (!request) return;
    if (!recommending) {
      setRequest(null);
      return;
    }
    setFailed(false);
    return enqueue(session.current, { type: 'RECOMMEND', metricCount: metrics.length }, ({ result, error }) => {
      setRequest(null);
      if (error) {
        setFailed(true);
        return;
      }
      const updated = metrics.map((metric, i) => {
        const keyword = result[i];
        return keyword && (metric.mode !== 'keyword' || metric.keyword !== keyword)
          ? { ...metric, mode: 'keyword', keyword } : metric;
      });
      if (updated.some((metric, i) => metric !== metrics[i])) apply.current({ metrics: updated });
    });
  }, [request, recommending, metrics]);

  return {
    results, failed, recommending,
    hasSources: sources.length > 0,
    recommend: () => setRequest({ metrics, sources })
  };
}
