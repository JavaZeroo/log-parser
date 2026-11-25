import { getMetricTitle } from './parseLog.js';

const stepPattern = config => config.useStepKeyword ? (config.stepKeyword || 'step:') : null;
const pattern = metric => metric.mode === 'keyword' ? metric.keyword : metric.regex;

export function updateFileConfig(file, config) {
  const previous = file.config;
  const sameRules = stepPattern(previous) === stepPattern(config) &&
    previous.metrics.length === config.metrics.length &&
    previous.metrics.every((metric, i) =>
      metric.mode === config.metrics[i].mode && pattern(metric) === pattern(config.metrics[i]));

  if (sameRules && !file.isParsing && !file.error) {
    const oldKeys = previous.metrics.map(getMetricTitle);
    const newKeys = config.metrics.map(getMetricTitle);
    if (oldKeys.every((key, i) => key === newKeys[i])) return { ...file, config };
    // A duplicate old title hides the earlier series in the parser's result.
    // Only a fresh parse can recover that series when its title changes.
    if (new Set(oldKeys).size === oldKeys.length) {
      const entries = newKeys.flatMap((key, i) =>
        Object.hasOwn(file.metricsData, oldKeys[i]) ? [[key, file.metricsData[oldKeys[i]]]] : []);
      return { ...file, config, metricsData: Object.fromEntries(entries) };
    }
  }

  if (typeof file.content === 'string') return { ...file, config, isParsing: true, progress: 0 };
  // A metrics-only cache must keep the parsing rules that produced its points.
  return { ...file, config: { ...previous, dataRange: config.dataRange } };
}
