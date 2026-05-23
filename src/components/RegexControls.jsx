import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Eye, Plus, X } from 'lucide-react';
import { METRIC_PRESETS } from '../metricPresets.js';
import { useTranslation, Trans } from 'react-i18next';
import { ValueExtractor } from '../utils/ValueExtractor';
import { MATCH_MODES, getMetricTitle } from '../utils/metricHelpers';
import { CollapsibleCardHeader } from './CollapsibleCardHeader.jsx';
import { SmoothCollapse } from './SmoothCollapse.jsx';
import { useCollapsedSection } from '../utils/useCollapsedSection.js';



export function RegexControls({
  globalParsingConfig,
  onGlobalParsingConfigChange,
  uploadedFiles = [],
  xRange,
  onXRangeChange,
  yRange,
  onYRangeChange,
  maxStep,
  collapseId
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState({});
  const { t } = useTranslation();
  const [open, setOpen] = useCollapsedSection(collapseId, true);
  const collapsible = Boolean(collapseId);

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

  // Add a new metric pre-filled from a preset, then return the select to its
  // placeholder so the same preset can be added again.
  const addMetricFromPreset = (presetLabel) => {
    const preset = METRIC_PRESETS.find(p => p.label === presetLabel);
    if (!preset) return;
    onGlobalParsingConfigChange({
      metrics: [...globalParsingConfig.metrics, { ...preset, regex: preset.regex || '' }]
    });
  };

  const handleXRangeChange = (field, value) => {
    const newRange = { ...xRange, [field]: value === '' ? undefined : Number(value) };
    onXRangeChange(newRange);
  };

  const handleYRangeChange = (field, value) => {
    const newRange = { ...yRange, [field]: value === '' ? undefined : Number(value) };
    onYRangeChange(newRange);
  };

  // Single metric row — 2 lines, each input prefixed with a short text label
  // so first-time users can tell the two boxes apart at a glance.
  const renderMetricRow = (cfg, idx) => (
    <div
      key={idx}
      className="pl-2 border-l-2 border-blue-400 dark:border-blue-500 space-y-1"
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 shrink-0">
          {t('regex.labelName')}
        </span>
        <input
          type="text"
          value={cfg.name || ''}
          onChange={(e) => handleMetricChange(idx, 'name', e.target.value)}
          className="input-field flex-1 min-w-0"
          placeholder={t('regex.metricNamePlaceholder')}
          aria-label={t('regex.metricName')}
        />
        <select
          value={cfg.mode}
          onChange={(e) => handleMetricChange(idx, 'mode', e.target.value)}
          className="input-field w-auto"
          aria-label={t('regex.mode')}
        >
          <option value={MATCH_MODES.KEYWORD}>{t('regex.modeShortKw')}</option>
          <option value={MATCH_MODES.REGEX}>{t('regex.modeShortRgx')}</option>
        </select>
        <button
          type="button"
          onClick={() => removeMetric(idx)}
          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded shrink-0"
          aria-label={t('regex.deleteConfig')}
          title={t('regex.deleteConfig')}
        >
          <X size={12} aria-hidden="true" />
        </button>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-14 shrink-0">
          {t('regex.labelPattern')}
        </span>
        <input
          type="text"
          value={(cfg.mode === MATCH_MODES.REGEX ? cfg.regex : cfg.keyword) || ''}
          onChange={(e) =>
            handleMetricChange(
              idx,
              cfg.mode === MATCH_MODES.REGEX ? 'regex' : 'keyword',
              e.target.value
            )
          }
          className="input-field flex-1 min-w-0 font-mono"
          placeholder={
            cfg.mode === MATCH_MODES.REGEX
              ? t('regex.regexPlaceholder')
              : t('regex.keywordPlaceholder')
          }
          aria-label={cfg.mode === MATCH_MODES.REGEX ? t('regex.regex') : t('regex.keyword')}
        />
      </div>
    </div>
  );

  const headerActions = (
    <>
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
    </>
  );

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3" aria-labelledby="regex-controls-heading">
      <CollapsibleCardHeader
        title={t('regex.dataParsing')}
        titleId="regex-controls-heading"
        icon={<Settings size={16} />}
        actions={headerActions}
        collapsible={collapsible}
        open={open}
        onToggle={() => setOpen(o => !o)}
        className="mb-3"
      />
      <SmoothCollapse open={!collapsible || open}>
      <div className="space-y-2.5">
        {/* Metric rows */}
        <div className="space-y-2">
          {globalParsingConfig.metrics.map((cfg, idx) => renderMetricRow(cfg, idx))}
        </div>

        {/* Add metric controls — empty button on the left, preset select on the right */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={addMetric}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Plus size={12} aria-hidden="true" />
            {t('regex.addMetric')}
          </button>
          <select
            onChange={(e) => {
              if (e.target.value) {
                addMetricFromPreset(e.target.value);
                e.target.value = '';
              }
            }}
            className="input-field w-auto text-xs"
            aria-label={t('regex.selectPreset')}
            defaultValue=""
          >
            <option value="">{t('regex.fromPreset')}</option>
            {METRIC_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Step keyword — single inline row */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center text-xs text-gray-700 dark:text-gray-300 shrink-0">
            <input
              type="checkbox"
              className="mr-1.5 checkbox"
              checked={globalParsingConfig.useStepKeyword || false}
              onChange={(e) => handleStepToggle(e.target.checked)}
            />
            {t('useStepKeyword')}
          </label>
          {globalParsingConfig.useStepKeyword && (
            <input
              type="text"
              className="flex-1 input-field font-mono min-w-0"
              value={globalParsingConfig.stepKeyword || ''}
              onChange={(e) => handleStepKeywordChange(e.target.value)}
              placeholder={t('placeholder.step')}
              aria-label={t('useStepKeyword')}
            />
          )}
        </div>

        {/* Axis range — compact, one row each */}
        <div className="space-y-1.5 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 w-4 shrink-0">X</span>
            <input
              type="number"
              placeholder={t('regex.min')}
              value={xRange.min === undefined ? '' : xRange.min}
              onChange={(e) => handleXRangeChange('min', e.target.value)}
              className="input-field min-w-0 tabular"
              aria-label={`X ${t('regex.min')}`}
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">–</span>
            <input
              type="number"
              placeholder={
                xRange.max === undefined && maxStep !== undefined ? `${maxStep}` : t('regex.max')
              }
              value={xRange.max === undefined ? '' : xRange.max}
              onChange={(e) => handleXRangeChange('max', e.target.value)}
              className="input-field min-w-0 tabular"
              aria-label={`X ${t('regex.max')}`}
            />
            <button
              type="button"
              onClick={() => onXRangeChange({ min: undefined, max: undefined })}
              className="px-1.5 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              {t('regex.reset')}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 w-4 shrink-0">Y</span>
            <input
              type="number"
              placeholder={t('regex.min')}
              value={yRange?.min ?? ''}
              onChange={(e) => handleYRangeChange('min', e.target.value)}
              className="input-field min-w-0 tabular"
              aria-label={`Y ${t('regex.min')}`}
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">–</span>
            <input
              type="number"
              placeholder={t('regex.max')}
              value={yRange?.max ?? ''}
              onChange={(e) => handleYRangeChange('max', e.target.value)}
              className="input-field min-w-0 tabular"
              aria-label={`Y ${t('regex.max')}`}
            />
            <button
              type="button"
              onClick={() => onYRangeChange({ min: undefined, max: undefined })}
              className="px-1.5 py-0.5 text-[11px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
            >
              {t('regex.auto')}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
            <Trans i18nKey="regex.rangeHint">
              Hold <kbd>Shift</kbd> + drag on the chart to zoom.
            </Trans>
          </p>
        </div>

        {/* Preview results — only when toggled via eye icon */}
        {showPreview && uploadedFiles.length > 0 && (
          <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1.5">{t('regex.matchPreview')}</h4>
            <div className="space-y-2 text-xs">
              {Object.entries(previewResults).map(([key, results]) => (
                results.map((result, idx) => (
                  <div key={`${key}-${idx}`} className="border-l-2 border-blue-300 dark:border-blue-700 pl-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-blue-700 dark:text-blue-300 truncate">{key} · {result.fileName}</span>
                      <span className="text-gray-600 dark:text-gray-400 tabular shrink-0">{t('regex.matchCount', { count: result.count })}</span>
                    </div>
                    {result.examples.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {result.examples.map((example, exIdx) => (
                          <div key={exIdx} className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded text-[11px]">
                            <span className="font-mono text-blue-600 dark:text-blue-400 tabular">{example.value}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-1.5">L{example.line}</span>
                            {example.format && (
                              <span className="text-purple-600 dark:text-purple-400 ml-1.5">[{example.format}]</span>
                            )}
                            <div className="text-gray-400 dark:text-gray-500 truncate font-mono text-[10px]">{example.text}</div>
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
      </div>
      </SmoothCollapse>
    </section>
  );
}
