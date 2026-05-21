import { Target, Code } from 'lucide-react';

export const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

export const MODE_CONFIG = {
  [MATCH_MODES.KEYWORD]: {
    nameKey: 'regex.mode.keyword',
    icon: Target,
    descriptionKey: 'regex.mode.keywordDesc',
    example: 'input "loss" matches "loss: 0.123"'
  },
  [MATCH_MODES.REGEX]: {
    nameKey: 'regex.mode.regex',
    icon: Code,
    descriptionKey: 'regex.mode.regexDesc',
    example: 'loss:\\s*([\\d.eE+-]+)'
  }
};

export function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  if (metric.keyword) return metric.keyword.replace(/[:：]/g, '').trim();
  if (metric.regex) {
    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
    return sanitized || `metric${index + 1}`;
  }
  return `metric${index + 1}`;
}
