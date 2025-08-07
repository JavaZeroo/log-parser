import React from 'react';

/**
 * Extracts numerical values from text content using a regular expression.
 * The regex must contain at least one capture group `()`, and the first capture group will be used as the extracted value.
 * @param {string} content - The text content to parse.
 * @param {object} config - The configuration for this extractor.
 * @param {string} config.regex - The regular expression string.
 * @returns {Array<object>} An array of objects, each containing the extracted value and its line number.
 */
function extract(content, config) {
  if (!config || !config.regex) return [];

  const results = [];
  const lines = content.split('\n');

  try {
    const regexObj = new RegExp(config.regex, 'gi');
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
  } catch (e) {
    // Invalid regex, return no results
    console.warn("Invalid regex provided:", config.regex, e);
  }

  return results;
}

/**
 * A React component that renders the configuration UI for the regex extractor.
 * @param {object} props - The component props.
 * @param {object} props.config - The current configuration object for the metric.
 * @param {function} props.onConfigChange - A callback function to update the configuration.
 */
function ConfigUI({ config, onConfigChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        正则表达式 (Regular Expression)
      </label>
      <input
        type="text"
        value={config.regex || ''}
        onChange={(e) => onConfigChange('regex', e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
        placeholder="value:\\s*([\\d.eE+-]+)"
      />
      <p className="text-xs text-gray-500 mt-1">
        使用捕获组 `()` 来提取数值。
      </p>
    </div>
  );
}

export const regexExtractorPlugin = {
  name: 'regex',
  displayName: '正则表达式 (Regex)',
  extract,
  ConfigUI,
};
