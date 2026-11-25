import { parseLog } from '../utils/parseLog.js';

self.onmessage = ({ data: { type, payload } }) => {
  if (type !== 'PARSE_FILE') return;
  const { fileId, content, config } = payload;
  try {
    const metricsData = parseLog(content, config, progress => {
      self.postMessage({ type: 'PARSE_PROGRESS', payload: { fileId, progress } });
    });
    self.postMessage({ type: 'PARSE_COMPLETE', payload: { fileId, metricsData } });
  } catch (error) {
    self.postMessage({ type: 'PARSE_ERROR', payload: { fileId, error: error.message } });
  }
};
