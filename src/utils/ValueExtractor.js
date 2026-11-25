
// Match mode enum
export const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

// Search the original line starting just after the case-insensitive keyword.
export function compileKeyword(keyword, numberPattern) {
  const needle = keyword.toLowerCase();
  return (line, lowerLine) => {
    const index = lowerLine.indexOf(needle);
    if (index === -1) return null;
    numberPattern.lastIndex = index + keyword.length;
    return numberPattern.exec(line)?.[0] ?? null;
  };
}

// Both the preview and the worker use these matching rules. Only the preview
// needs a match object with the source text and line number.
export function compileValueMatcher(mode, pattern) {
  if (mode === MATCH_MODES.KEYWORD) {
    const readNumber = compileKeyword(pattern, /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g);
    return (line, lowerLine, emit) => {
      const number = readNumber(line, lowerLine);
      if (number !== null) emit(parseFloat(number));
    };
  }

  let regex;
  try {
    regex = new RegExp(pattern, 'gi');
  } catch {
    return null;
  }
  return (line, _lowerLine, emit) => {
    let match;
    while ((match = regex.exec(line)) !== null) {
      // exec does not advance past a zero-width match (e.g. a lookahead).
      if (match[0].length === 0) regex.lastIndex++;
      const value = parseFloat(match[1]);
      if (!Number.isNaN(value)) emit(value);
    }
  };
}

function collectMatches(lines, mode, pattern) {
  const results = [];
  if (lines.length === 0) return results;
  const matchLine = compileValueMatcher(mode, pattern);
  if (!matchLine) return results;
  const isKeyword = mode === MATCH_MODES.KEYWORD;
  lines.forEach((line, index) => {
    matchLine(line, isKeyword ? line.toLowerCase() : null, value => {
      const match = { value, line: index + 1, text: line.trim() };
      if (isKeyword) match.format = 'Keyword Match';
      results.push(match);
    });
  });
  return results;
}

// Value extractor class
export class ValueExtractor {
  // Helper to get lines array - accepts either content string or pre-split lines array
  static getLines(contentOrLines) {
    if (!contentOrLines) return [];
    if (Array.isArray(contentOrLines)) return contentOrLines;
    return contentOrLines.split('\n');
  }

  // Keyword match - now accepts either content string or pre-split lines array
  static extractByKeyword(contentOrLines, keyword) {
    return collectMatches(this.getLines(contentOrLines), MATCH_MODES.KEYWORD, keyword);
  }

  // Column position match - now accepts either content string or pre-split lines array
  static extractByColumn(contentOrLines, columnIndex, separator = ' ') {
    const results = [];
    const lines = this.getLines(contentOrLines);
    if (lines.length === 0) return results;

    lines.forEach((line, lineIndex) => {
      if (line.trim()) {
        const columns = separator === ' ' 
          ? line.trim().split(/\s+/) 
          : line.split(separator);
          
        if (columns.length > columnIndex) {
          const value = parseFloat(columns[columnIndex]);
          if (!isNaN(value)) {
            results.push({
              value,
              line: lineIndex + 1,
              text: line.trim()
            });
          }
        }
      }
    });
    
    return results;
  }

  // Smart parsing - now accepts either content string or pre-split lines array
  static extractBySmart(contentOrLines, type = 'loss') {
    const results = [];
    const lines = this.getLines(contentOrLines);
    if (lines.length === 0) return results;

    // Smart keyword list
    const keywords = type === 'loss'
      ? ['loss', 'training_loss', 'train_loss', 'val_loss', 'validation_loss']
      : ['grad_norm', 'gradient_norm', 'gnorm', 'grad norm', 'gradient norm', 'global_norm'];

    lines.forEach((line, lineIndex) => {
      // Try JSON parsing
      try {
        const jsonMatch = line.match(/\{.*\}/);
        if (jsonMatch) {
          const obj = JSON.parse(jsonMatch[0]);
          for (const keyword of keywords) {
            if (obj[keyword] !== undefined) {
              const value = parseFloat(obj[keyword]);
              if (!isNaN(value)) {
                results.push({
                  value,
                  line: lineIndex + 1,
                  text: line.trim(),
                  format: 'JSON'
                });
                return;
              }
            }
          }
        }
      } catch {
        // Not JSON, continue other formats
      }

      // Try key-value and special formats
      for (const keyword of keywords) {
        const patterns = [
          // Standard key-value format
          new RegExp(`${keyword}\\s*[:=]\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`"${keyword}"\\s*:\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`${keyword}\\s+([\\d.eE+-]+)`, 'i'),
          // MindFormers format: global_norm: [1.6887678]
          new RegExp(`${keyword}\\s*:\\s*\\[([\\d.eE+-]+)\\]`, 'i'),
          // Other possible array formats
          new RegExp(`${keyword}\\s*:\\s*\\[\\s*([\\d.eE+-]+)\\s*\\]`, 'i')
        ];

        for (const pattern of patterns) {
          const match = line.match(pattern);
          if (match) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
              results.push({
                value,
                line: lineIndex + 1,
                text: line.trim(),
                format: keyword.includes('global_norm') ? 'MindFormers' : 'Key-Value'
              });
              return;
            }
          }
        }
      }
    });

    return results;
  }

  // Regex match (original functionality) - now accepts either content string or pre-split lines array
  static extractByRegex(contentOrLines, regex) {
    return collectMatches(this.getLines(contentOrLines), MATCH_MODES.REGEX, regex);
  }
}
