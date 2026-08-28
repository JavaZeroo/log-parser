// End-to-end check of the Perfetto-style cache: uploading a log mints a
// `local_cache_key`, and that key brings the same analysis back on reload.
import 'fake-indexeddb/auto';
import React from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import App from '../../App.jsx';
import { ToastProvider } from '../ToastContext.jsx';
import i18n from '../../i18n';
import { clearSessions, listSessions } from '../../utils/sessionCache.js';
import { readCacheKey } from '../../utils/cacheUrl.js';

vi.mock('chart.js', () => {
  const Chart = {
    register: vi.fn(),
    defaults: { plugins: { legend: { labels: { generateLabels: vi.fn(() => []) } } } }
  };
  return {
    Chart, ChartJS: Chart, CategoryScale: {}, LinearScale: {}, LogarithmicScale: {},
    PointElement: {}, LineElement: {}, BarElement: {}, BarController: {},
    LineController: {}, ScatterController: {}, Title: {}, Tooltip: {}, Legend: {}
  };
});
vi.mock('react-chartjs-2', async () => {
  const ReactMod = await import('react');
  const Stub = ReactMod.forwardRef(() => <div data-testid="line-chart" />);
  return { Chart: Stub, Line: Stub, Scatter: Stub, Bar: Stub };
});
vi.mock('chartjs-plugin-zoom', () => ({ default: {} }));
vi.mock('chartjs-plugin-annotation', () => ({ default: {} }));

// The setup-file Worker mock echoes messages back unchanged, which leaves files
// stuck "parsing"; the cache deliberately waits for metrics, so answer properly.
class ParsingWorker {
  constructor() { this.onmessage = () => {}; }
  postMessage({ type, payload }) {
    if (type !== 'PARSE_FILE') return;
    setTimeout(() => {
      this.onmessage({
        data: {
          type: 'PARSE_COMPLETE',
          payload: { fileId: payload.fileId, metricsData: { Loss: [{ x: 0, y: 1 }] } }
        }
      });
    }, 0);
  }
  terminate() {}
}

function stubFileReader(result) {
  class FileReaderMock {
    constructor() { this.onload = null; }
    readAsText() { this.onload({ target: { result } }); }
  }
  global.FileReader = FileReaderMock;
}

async function uploadLog(user, name = 'train.log') {
  const input = screen.getByLabelText(i18n.t('fileUpload.aria'));
  await user.upload(input, new File(['loss: 1'], name, { type: 'text/plain' }));
}

describe('local_cache_key session cache', () => {
  beforeEach(async () => {
    localStorage.clear();
    window.location.hash = '';
    global.Worker = ParsingWorker;
    stubFileReader('loss: 1');
    await clearSessions();
  });

  afterEach(() => {
    cleanup();
  });

  it('mints a cache key in the URL after a log is parsed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await uploadLog(user);

    await waitFor(() => expect(readCacheKey()).not.toBeNull(), { timeout: 4000 });
    const key = readCacheKey();
    expect(window.location.hash).toContain('local_cache_key=');

    const sessions = await listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(key);
    expect(sessions[0].fileNames).toEqual(['train.log']);
  }, 15000);

  it('restores the analysis from the cache key on reload', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await uploadLog(user);
    await waitFor(() => expect(readCacheKey()).not.toBeNull(), { timeout: 4000 });
    const key = readCacheKey();
    unmount();
    cleanup();

    // Simulate a reload landing on the cache link: no localStorage working set,
    // only the key in the URL.
    localStorage.removeItem('uploadedFiles');
    window.location.hash = `#!/viewer?local_cache_key=${key}`;
    render(<App />);

    expect(await screen.findByText('train.log', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(readCacheKey()).toBe(key);
  }, 15000);

  it('warns and drops the key when the link is not cached in this browser', async () => {
    window.location.hash = '#!/viewer?local_cache_key=11111111-2222-3333-4444-555555555555';
    render(<ToastProvider><App /></ToastProvider>);

    expect(await screen.findByText(i18n.t('sessions.notFound'), {}, { timeout: 4000 })).toBeInTheDocument();
    await waitFor(() => expect(readCacheKey()).toBeNull());
  }, 15000);
});
