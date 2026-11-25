import { compileMetricMatcher, MATCH_MODES } from './ValueExtractor.js';
import { getMetricTitle } from './parseLog.js';

const candidates = [
  ['loss', 'training_loss', 'train_loss'],
  ['grad_norm', 'gradient_norm', 'gnorm', 'global_norm']
];

function compileRules(metrics) {
  return metrics.map(metric => ({
    match: compileMetricMatcher(metric),
    isKeyword: metric.mode === MATCH_MODES.KEYWORD
  }));
}

function scanFile(content, rules, exampleLimit) {
  let line;
  let lineNumber = 0;
  const results = rules.map(() => ({ count: 0, examples: [] }));
  const handlers = rules.map(({ match, isKeyword }, index) => {
    const result = results[index];
    const emit = value => {
      result.count++;
      if (result.examples.length < exampleLimit) {
        const sample = { value, line: lineNumber, text: line.trim() };
        if (isKeyword) sample.format = 'Keyword Match';
        result.examples.push(sample);
      }
    };
    return { match, emit };
  }).filter(rule => rule.match);
  if (!handlers.length) return results;

  const needsLower = rules.some(rule => rule.isKeyword);
  let offset = 0;
  while (offset < content.length) {
    const newline = content.indexOf('\n', offset);
    const end = newline < 0 ? content.length : newline;
    line = content.slice(offset, end);
    lineNumber++;
    const lower = needsLower ? line.toLowerCase() : null;
    for (const { match, emit } of handlers) match(line, lower, emit);
    offset = end + 1;
  }
  return results;
}

export function previewMatches(files, metrics) {
  const rules = compileRules(metrics);
  const titles = metrics.map(getMetricTitle);
  const groups = Object.create(null);
  for (const { name, content } of files) {
    scanFile(content, rules, 3).forEach((result, i) => {
      (groups[titles[i]] ??= []).push({ fileName: name, ...result });
    });
  }
  return groups;
}

export function recommendKeywords(files, metricCount) {
  const groups = candidates.slice(0, metricCount);
  const keywords = groups.flat();
  const rules = compileRules(keywords.map(keyword => ({ mode: MATCH_MODES.KEYWORD, keyword })));
  const counts = new Map(keywords.map(keyword => [keyword, 0]));
  for (const { content } of files) {
    scanFile(content, rules, 0).forEach(({ count }, i) => {
      counts.set(keywords[i], counts.get(keywords[i]) + count);
    });
  }
  return groups.map(group => {
    let best = null;
    let bestCount = 0;
    for (const keyword of group) {
      const count = counts.get(keyword);
      if (count > bestCount) {
        best = keyword;
        bestCount = count;
      }
    }
    return best;
  });
}
