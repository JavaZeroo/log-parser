
// Match mode enum
export const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

// Value extractor class
export class ValueExtractor {
  // Keyword match
  static extractByKeyword(content, keyword) {
    const results = [];
    // Handle empty content
    if (!content) return results;
    
    const lines = content.split('\n');
    
    // Number regex supporting scientific notation
    const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
    
    lines.forEach((line, lineIndex) => {
      // Find keyword (case-insensitive)
      const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
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

  // Column position match
  static extractByColumn(content, columnIndex, separator = ' ') {
    const results = [];
    if (!content) return results;

    const lines = content.split('\n');
    
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

  // Smart parsing
  static extractBySmart(content, type = 'loss') {
    const results = [];
    if (!content) return results;

    const lines = content.split('\n');
    
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

  // Regex match (original functionality)
  static extractByRegex(content, regex) {
    const results = [];
    if (!content) return results;

    const lines = content.split('\n');
    
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
