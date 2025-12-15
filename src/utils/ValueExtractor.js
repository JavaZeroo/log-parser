
// Match mode enum
export const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

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
    const results = [];
    const lines = this.getLines(contentOrLines);
    if (lines.length === 0) return results;

    // Number regex supporting scientific notation
    const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
    const keywordLower = keyword.toLowerCase();

    lines.forEach((line, lineIndex) => {
      // Find keyword (case-insensitive)
      const keywordIndex = line.toLowerCase().indexOf(keywordLower);
      if (keywordIndex !== -1) {
        // Find first number after the keyword
        const afterKeyword = line.substring(keywordIndex + keyword.length);
        const numberMatch = afterKeyword.match(numberRegex);
        
        if (numberMatch) {
          const value = parseFloat(numberMatch[0]);
          if (!isNaN(value)) {
            results.push({
              value,
              line: lineIndex + 1,
              text: line.trim(),
              format: 'Keyword Match'
            });
          }
        }
      }
    });
    
    return results;
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
    const results = [];
    const lines = this.getLines(contentOrLines);
    if (lines.length === 0) return results;

    try {
      const regexObj = new RegExp(regex, 'gi');
      lines.forEach((line, lineIndex) => {
        const matches = [...line.matchAll(regexObj)];
        matches.forEach(match => {
          if (match[1]) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
              results.push({
                value,
                line: lineIndex + 1,
                text: line.trim()
              });
            }
          }
        });
      });
    } catch {
      // Invalid regex
    }

    return results;
  }
}
