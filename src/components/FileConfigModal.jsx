import React, { useState, useEffect } from 'react';
import { X, Settings, TrendingDown, TrendingUp, Sliders, BarChart3, Target, Code, Zap } from 'lucide-react';
import { METRIC_PRESETS } from '../metricPresets.js';
import { useTranslation, Trans } from 'react-i18next';

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

function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  if (metric.keyword) return metric.keyword.replace(/[:：]/g, '').trim();
  if (metric.regex) {
    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
    return sanitized || `Metric ${index + 1}`;
  }
  return `Metric ${index + 1}`;
}

export function FileConfigModal({ file, isOpen, onClose, onSave, globalParsingConfig }) {
    const { t } = useTranslation();
    const [config, setConfig] = useState({
      metrics: [],
      dataRange: {
        start: 0,        // start position, default first data point
        end: undefined,  // end position, default last data point
        useRange: false  // kept for backward compatibility
      },
      useStepKeyword: false,
      stepKeyword: 'step:'
    });

  useEffect(() => {
    if (file && isOpen) {
      // If file has config, use it; otherwise use global config
      const fileConfig = file.config || {};
        setConfig({
          metrics: fileConfig.metrics || globalParsingConfig.metrics,
          dataRange: fileConfig.dataRange || {
            start: 0,
            end: undefined,
            useRange: false
          },
          useStepKeyword:
            fileConfig.useStepKeyword !== undefined
              ? fileConfig.useStepKeyword
              : globalParsingConfig.useStepKeyword,
          stepKeyword: fileConfig.stepKeyword || globalParsingConfig.stepKeyword || 'step:'
        });
    }
  }, [file, isOpen, globalParsingConfig]);

  const handleSave = () => {
    onSave(file.id, config);
    onClose();
  };

  const handleMetricChange = (index, field, value) => {
    setConfig(prev => ({
      ...prev,
      metrics: prev.metrics.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      )
    }));
  };

  const applyPreset = (index, presetLabel) => {
    const preset = METRIC_PRESETS.find(p => p.label === presetLabel);
    if (!preset) return;
    setConfig(prev => ({
      ...prev,
      metrics: prev.metrics.map((m, i) =>
        i === index ? { ...m, ...preset } : m
      )
    }));
  };

  const handleRangeChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      dataRange: {
        ...prev.dataRange,
        [field]: value
      }
    }));
  };

  // Sync from global config
  const syncFromGlobal = () => {
    setConfig(prev => ({
      ...prev,
      metrics: globalParsingConfig.metrics.map(m => ({ ...m })),
      useStepKeyword: globalParsingConfig.useStepKeyword,
      stepKeyword: globalParsingConfig.stepKeyword
    }));
  };

  // Render configuration panel
  const renderConfigPanel = (type, configItem, index) => {
    const ModeIcon = MODE_CONFIG[configItem.mode].icon;

    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('regex.preset')}</label>
          <select
            onChange={(e) => applyPreset(index, e.target.value)}
            className="input-field"
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
            value={configItem.mode}
            onChange={(e) => handleMetricChange(index, 'mode', e.target.value)}
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
            {t(MODE_CONFIG[configItem.mode].descriptionKey)}
          </p>
        </div>

        {/* Fields based on mode */}
        {configItem.mode === MATCH_MODES.KEYWORD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('regex.keyword')}
            </label>
            <input
              type="text"
              value={configItem.keyword}
              onChange={(e) => handleMetricChange(index, 'keyword', e.target.value)}
              className="input-field text-sm"
              placeholder="keyword"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('regex.keywordHint')}
            </p>
          </div>
        )}

        {configItem.mode === MATCH_MODES.REGEX && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('regex.regex')}
            </label>
            <input
              type="text"
              value={configItem.regex}
              onChange={(e) => handleMetricChange(index, 'regex', e.target.value)}
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

  if (!isOpen || !file) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-labelledby="config-modal-title"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-600" aria-hidden="true" />
            <h2 id="config-modal-title" className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              {t('configModal.configFile', { name: file.name })}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label={t('configModal.close')}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Parsing config */}
          <section>
            {/* Global sync button */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" aria-hidden="true" />
                {t('configModal.parsingConfig')}
              </h3>
              <button
                onClick={syncFromGlobal}
                className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-800 border border-blue-200 dark:border-blue-700 rounded-md transition-colors"
                title={t('configModal.syncFromGlobalTitle')}
              >
                <Zap size={12} />
                {t('configModal.syncFromGlobal')}
              </button>
            </div>
            
            <div className="space-y-4">
              {config.metrics.map((cfg, idx) => (
                <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
                    <TrendingDown size={16} className="text-red-500" aria-hidden="true" />
                    {t('regex.metricConfig', { title: getMetricTitle(cfg, idx) })}
                  </h4>
                  {renderConfigPanel(`metric-${idx}`, cfg, idx)}
                </div>
              ))}
            </div>
          </section>

          {/* Data range config */}
          <section>
            <h3 className="text-base font-medium text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" aria-hidden="true" />
              {t('configModal.dataRange')}
            </h3>

            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('configModal.rangeDesc')}
              </p>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="range-start"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('configModal.start')}
                    </label>
                    <input
                      id="range-start"
                      type="number"
                      min="0"
                      placeholder={t('configModal.startPlaceholder')}
                      value={config.dataRange.start || ''}
                      onChange={(e) => handleRangeChange('start', parseInt(e.target.value) || 0)}
                      className="input-field text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('configModal.startHint')}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="range-end"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                    >
                      {t('configModal.end')}
                    </label>
                    <input
                      id="range-end"
                      type="number"
                      min="0"
                      placeholder={t('configModal.endPlaceholder')}
                      value={config.dataRange.end || ''}
                      onChange={(e) => handleRangeChange('end', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="input-field text-sm"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('configModal.endHint')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
                  <p className="text-sm text-blue-800 font-medium">
                    {t('configModal.examplesHeading')}
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>• {t('configModal.example1')}</li>
                    <li>• {t('configModal.example2')}</li>
                    <li>• {t('configModal.example3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('configModal.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {t('configModal.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
