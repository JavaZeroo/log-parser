import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Eye, ChevronDown, ChevronUp, Target, Code, ZoomIn } from 'lucide-react';
import { METRIC_PRESETS } from '../metricPresets.js';
import { useTranslation, Trans } from 'react-i18next';
import { ValueExtractor } from '../utils/ValueExtractor';

// Match mode enum
const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

// Mode configuration
const MODE_CONFIG = {
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

// Generate title from config
function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  if (metric.keyword) return metric.keyword.replace(/[:：]/g, '').trim();
  if (metric.regex) {
    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
    return sanitized || `Metric ${index + 1}`;
  }
  return `Metric ${index + 1}`;
}



export function RegexControls({
  globalParsingConfig,
  onGlobalParsingConfigChange,
  uploadedFiles = [],
  xRange,
  onXRangeChange,
  maxStep
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState({});
  const { t } = useTranslation();

  const handleStepToggle = useCallback((checked) => {
    onGlobalParsingConfigChange({
      ...globalParsingConfig,
      useStepKeyword: checked
    });
  }, [globalParsingConfig, onGlobalParsingConfigChange]);

  const handleStepKeywordChange = useCallback((value) => {
    onGlobalParsingConfigChange({
      ...globalParsingConfig,
      stepKeyword: value
    });
  }, [globalParsingConfig, onGlobalParsingConfigChange]);

  // Generic function to extract numbers
  const extractValues = useCallback((content, mode, config) => {
    switch (mode) {
      case MATCH_MODES.KEYWORD:
        return ValueExtractor.extractByKeyword(content, config.keyword);
      case MATCH_MODES.REGEX:
        return ValueExtractor.extractByRegex(content, config.regex);
      default:
        return [];
    }
  }, []);

  // Preview match results
  const previewMatches = useCallback(() => {
    const results = {};

    uploadedFiles.forEach(file => {
      if (file.content) {
        globalParsingConfig.metrics.forEach((cfg, idx) => {
          const matches = extractValues(file.content, cfg.mode, cfg);
          const key = getMetricTitle(cfg, idx);
          if (!results[key]) results[key] = [];
          results[key].push({
            fileName: file.name,
            count: matches.length,
            examples: matches.slice(0, 3).map(m => ({
              value: m.value,
              line: m.line,
              text: m.text,
              format: m.format
            }))
          });
        });
      }
    });

    setPreviewResults(results);
  }, [uploadedFiles, globalParsingConfig, extractValues]);

  // Smartly recommend best config
  const smartRecommend = useCallback(() => {
    if (uploadedFiles.length === 0) return;

    const allContent = uploadedFiles.map(f => f.content).join('\n');

    const newMetrics = globalParsingConfig.metrics.map(m => ({ ...m }));

    if (newMetrics[0]) {
      let maxCount = 0;
      ['loss', 'training_loss', 'train_loss'].forEach(keyword => {
        const matches = ValueExtractor.extractByKeyword(allContent, keyword);
        if (matches.length > maxCount) {
          maxCount = matches.length;
          newMetrics[0] = { ...newMetrics[0], mode: MATCH_MODES.KEYWORD, keyword };
        }
      });
    }

    if (newMetrics[1]) {
      let maxCount = 0;
      ['grad_norm', 'gradient_norm', 'gnorm', 'global_norm'].forEach(keyword => {
        const matches = ValueExtractor.extractByKeyword(allContent, keyword);
        if (matches.length > maxCount) {
          maxCount = matches.length;
          newMetrics[1] = { ...newMetrics[1], mode: MATCH_MODES.KEYWORD, keyword };
        }
      });
    }

    onGlobalParsingConfigChange({ metrics: newMetrics });
  }, [uploadedFiles, globalParsingConfig, onGlobalParsingConfigChange]);

  // Update preview when config changes
  useEffect(() => {
    if (showPreview) {
      previewMatches();
    }
  }, [showPreview, previewMatches]);

  // Handle config change
  const handleMetricChange = (index, field, value) => {
    const newMetrics = [...globalParsingConfig.metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const addMetric = () => {
    const newMetrics = [
      ...globalParsingConfig.metrics,
      {
        name: `metric${globalParsingConfig.metrics.length + 1}`,
        mode: 'keyword',
        keyword: '',
        regex: ''
      }
    ];
    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const removeMetric = (index) => {
    const newMetrics = globalParsingConfig.metrics.filter((_, i) => i !== index);
    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const applyPreset = (index, presetLabel) => {
    const preset = METRIC_PRESETS.find(p => p.label === presetLabel);
    if (!preset) return;
    const newMetrics = [...globalParsingConfig.metrics];
    newMetrics[index] = { ...newMetrics[index], ...preset };
    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const handleXRangeChange = (field, value) => {
    const newRange = { ...xRange, [field]: value === '' ? undefined : Number(value) };
    onXRangeChange(newRange);
  };

  // Function to render config panel
  const renderConfigPanel = (type, config, onConfigChange, index) => {
    const ModeIcon = MODE_CONFIG[config.mode].icon;

    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('regex.metricName')}</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onConfigChange('name', e.target.value)}
            className="input-field text-sm"
          />
          <select
            onChange={(e) => applyPreset(index, e.target.value)}
            className="input-field mt-1"
            defaultValue=""
          >
            <option value="">{t('regex.selectPreset')}</option>
            {METRIC_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>
        {/* Mode selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('regex.mode')}
          </label>
          <select
            value={config.mode}
            onChange={(e) => onConfigChange('mode', e.target.value)}
            className="input-field"
          >
            {Object.entries(MODE_CONFIG).map(([key, modeConfig]) => (
              <option key={key} value={key}>
                {t(modeConfig.nameKey)}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <ModeIcon size={10} className="inline mr-1" />
            {t(MODE_CONFIG[config.mode].descriptionKey)}
          </p>
        </div>

        {/* Config fields based on mode */}
        {config.mode === MATCH_MODES.KEYWORD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('regex.keyword')}
            </label>
            <input
              type="text"
              value={config.keyword}
              onChange={(e) => onConfigChange('keyword', e.target.value)}
              className="input-field text-sm"
              placeholder="keyword"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('regex.keywordHint')}
            </p>
          </div>
        )}

        {config.mode === MATCH_MODES.REGEX && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('regex.regex')}
            </label>
            <input
              type="text"
              value={config.regex}
              onChange={(e) => onConfigChange('regex', e.target.value)}
              className="input-field text-sm font-mono"
              placeholder="value:\\s*([\\d.eE+-]+)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('regex.regexHint')}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3" aria-labelledby="regex-controls-heading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings
            size={16}
            className="text-gray-600 dark:text-gray-300"
            aria-hidden="true"
          />
          <h3
            id="regex-controls-heading"
            className="text-base font-semibold text-gray-800 dark:text-gray-100"
          >
            {t('regex.dataParsing')}
          </h3>
        </div>

        <div className="flex items-center gap-1">
          {uploadedFiles.length > 0 && (
            <button
              onClick={smartRecommend}
              className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 rounded transition-colors"
              title={t('regex.smartRecommend')}
            >
              <Zap size={14} />
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
            title={t('regex.previewMatches')}
          >
            <Eye size={14} />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {globalParsingConfig.metrics.map((cfg, idx) => (
          <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 relative">
            <button
              onClick={() => removeMetric(idx)}
              className="absolute top-1 right-1 text-red-500"
              title={t('regex.deleteConfig')}
            >
              ×
            </button>
            <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              {t('regex.metricConfig', { title: getMetricTitle(cfg, idx) })}
            </h4>
            {renderConfigPanel(`metric-${idx}`, cfg, (field, value) => handleMetricChange(idx, field, value), idx)}
          </div>
        ))}
        <button
          onClick={addMetric}
          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t('regex.addMetric')}
        </button>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="mr-2 checkbox"
                checked={globalParsingConfig.useStepKeyword || false}
                onChange={(e) => handleStepToggle(e.target.checked)}
              />
              {t('useStepKeyword')}
            </label>
            {globalParsingConfig.useStepKeyword && (
              <input
                type="text"
                className="flex-1 input-field"
                value={globalParsingConfig.stepKeyword || t('placeholder.step')}
                onChange={(e) => handleStepKeywordChange(e.target.value)}
                placeholder={t('placeholder.step')}
              />
            )}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <ZoomIn
              size={16}
              className="text-gray-600 dark:text-gray-300"
              aria-hidden="true"
            />
            <h4 className="text-base font-semibold text-gray-800 dark:text-gray-100">
              {t('regex.xRange')}
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={xRange.min === undefined ? 0 : xRange.min}
              onChange={(e) => handleXRangeChange('min', e.target.value)}
              className="input-field"
            />
            <span className="text-gray-500 dark:text-gray-400">-</span>
            <input
              type="number"
              placeholder={xRange.max === undefined && maxStep !== undefined ? `${maxStep}` : 'Max'}
              value={xRange.max === undefined ? maxStep : xRange.max}
              onChange={(e) => handleXRangeChange('max', e.target.value)}
              className="input-field"
            />
            <button
              onClick={() => onXRangeChange({ min: undefined, max: undefined })}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
            >
              {t('regex.reset')}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Trans i18nKey="regex.xRangeHint">
              Hold <kbd>Shift</kbd> and drag on the chart to select range, or input values directly.
            </Trans>
          </p>
        </div>

        {/* Preview results */}
        {showPreview && uploadedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
            <h4 className="text-sm font-medium text-blue-800 mb-2">{t('regex.matchPreview')}</h4>
            <div className="space-y-3 text-xs">
              {Object.entries(previewResults).map(([key, results]) => (
                results.map((result, idx) => (
                  <div key={`${key}-${idx}`} className="border-l-4 border-blue-300 dark:border-blue-700 pl-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-700">{key} - {result.fileName}</span>
                      <span className="text-gray-600 dark:text-gray-300">{t('regex.matchCount', { count: result.count })}</span>
                    </div>
                    {result.examples.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {result.examples.map((example, exIdx) => (
                          <div key={exIdx} className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-1 rounded text-xs">
                            <span className="font-mono text-blue-600">{example.value}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">{t('regex.lineNumber', { line: example.line })}</span>
                            {example.format && (
                              <span className="text-purple-600 ml-2">[{example.format}]</span>
                            )}
                            <div className="text-gray-400 dark:text-gray-500 truncate">{example.text}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        <div
          className="text-xs text-gray-500 dark:text-gray-400 p-2 bg-gray-50 dark:bg-gray-700 rounded"
          role="region"
          aria-label={t('regex.featureDescAria')}
        >
          <p><strong>{t('regex.featureHeading')}</strong></p>
          <ul role="list" className="mt-1 space-y-1">
            <li>• <Target size={10} className="inline" /> <strong>{t('regex.featureKeywordTitle')}</strong>: {t('regex.featureKeywordDesc')}</li>
            <li>• <Code size={10} className="inline" /> <strong>{t('regex.featureRegexTitle')}</strong>: {t('regex.featureRegexDesc')}</li>
            <li>• <Zap size={10} className="inline" /> <strong>{t('regex.featureSmartTitle')}</strong>: {t('regex.featureSmartDesc')}</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
