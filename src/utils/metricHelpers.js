import { Target, Code } from 'lucide-react';
import { MATCH_MODES } from './ValueExtractor.js';
export { MATCH_MODES };
export { getMetricTitle } from './parseLog.js';

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
