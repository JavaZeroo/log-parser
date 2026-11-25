import { previewMatches, recommendKeywords } from '../utils/metricAnalysis.js';

let files = [];

self.onmessage = ({ data }) => {
  if (data.type === 'SET_FILES') {
    files = data.files;
    return;
  }
  try {
    if (data.type === 'PREVIEW') {
      self.postMessage({ result: previewMatches(files, data.metrics) });
    } else if (data.type === 'RECOMMEND') {
      self.postMessage({ result: recommendKeywords(files, data.metricCount) });
    }
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
