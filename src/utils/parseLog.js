import { compileKeyword, compileMetricMatcher, MATCH_MODES } from './ValueExtractor.js';

export function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  if (metric.keyword) return metric.keyword.replace(/[:：]/g, '').trim();
  if (metric.regex) {
    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
    return sanitized || `metric${index + 1}`;
  }
  return `metric${index + 1}`;
}

export function parseLog(content, config, onProgress) {
  if (typeof content !== 'string') throw new TypeError('Expected log content to be a string');
  const series = config.metrics.map((metric, index) => ({
    name: getMetricTitle(metric, index),
    match: compileMetricMatcher(metric),
    isKeyword: metric.mode === MATCH_MODES.KEYWORD,
    points: []
  }));
  const matchStep = config.useStepKeyword
    ? compileKeyword(config.stepKeyword || 'step:', /[+-]?\d+/g)
    : null;
  const needsLowerCase = matchStep || series.some(metric => metric.isKeyword);

  // Report the same progress fractions as the worker's original metric loop.
  // Each chunk ends on a line boundary so no line is split or visited twice.
  let offset = 0;
  for (let chunk = 1; chunk <= series.length; chunk++) {
    const limit = Math.ceil(content.length * chunk / series.length);
    while (offset < limit) {
      const newline = content.indexOf('\n', offset);
      const end = newline === -1 ? content.length : newline;
      const line = content.slice(offset, end);
      offset = end + 1;
      const lowerLine = needsLowerCase ? line.toLowerCase() : null;
      let step;
      for (const { match, points } of series) {
        if (!match) continue;
        match(line, lowerLine, value => {
          if (matchStep && step === undefined) {
            const number = matchStep(line.trim(), lowerLine.trim());
            step = number === null ? null : parseInt(number, 10);
          }
          points.push({ x: step ?? points.length, y: value });
        });
      }
    }
    if (chunk < series.length) onProgress?.(chunk / series.length);
  }
  return Object.fromEntries(series.map(({ name, points }) => [name, points]));
}
