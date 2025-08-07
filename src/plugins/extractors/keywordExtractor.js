import React from 'react';

/**
 * Extracts numerical values from text content based on a keyword search.
 * It looks for the first number appearing after a case-insensitive keyword match on each line.
 * @param {string} content - The text content to parse.
 * @param {object} config - The configuration for this extractor.
 * @param {string} config.keyword - The keyword to search for.
 * @returns {Array<object>} An array of objects, each containing the extracted value and its line number.
 */
function extract(content, config) {
  if (!config || !config.keyword) return [];

  const results = [];
  const lines = content.split('\n');
  const keyword = config.keyword.toLowerCase();
  const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;

  lines.forEach((line, lineIndex) => {
    const keywordIndex = line.toLowerCase().indexOf(keyword);
    if (keywordIndex !== -1) {
      const afterKeyword = line.substring(keywordIndex + keyword.length);
      const numberMatch = afterKeyword.match(numberRegex);

      if (numberMatch) {
        const value = parseFloat(numberMatch[0]);
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

/**
 * A React component that renders the configuration UI for the keyword extractor.
 * @param {object} props - The component props.
 * @param {object} props.config - The current configuration object for the metric.
 * @param {function} props.onConfigChange - A callback function to update the configuration.
 */
function ConfigUI({ config, onConfigChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        关键词 (Keyword)
      </label>
      <input
        type="text"
        value={config.keyword || ''}
        onChange={(e) => onConfigChange('keyword', e.target.value)}
        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
        placeholder="e.g., loss:"
      />
      <p className="text-xs text-gray-500 mt-1">
        支持模糊匹配，如 "loss" 可匹配 "training_loss"。
      </p>
    </div>
  );
}

export const keywordExtractorPlugin = {
  name: 'keyword',
  displayName: '关键词匹配 (Keyword)',
  extract,
  ConfigUI,
};
