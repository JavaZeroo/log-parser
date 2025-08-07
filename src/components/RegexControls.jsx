import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Eye, ZoomIn } from 'lucide-react';
import { METRIC_PRESETS } from '../metricPresets.js';
import { extractorPlugins, extractorPluginOrder } from '../plugins/pluginRegistry.js';

// 根据配置生成友好的标题
function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  // Fallback title if name is empty
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

  // 提取数值的通用函数 - 现在是插件分发器
  const extractValues = useCallback((content, metricConfig) => {
    const plugin = extractorPlugins[metricConfig.mode];
    if (plugin) {
      return plugin.extract(content, metricConfig);
    }
    return [];
  }, []);

  // 预览匹配结果
  const previewMatches = useCallback(() => {
    const results = {};
    uploadedFiles.forEach(file => {
      if (file.content) {
        globalParsingConfig.metrics.forEach((cfg, idx) => {
          const matches = extractValues(file.content, cfg);
          const key = getMetricTitle(cfg, idx);
          if (!results[key]) results[key] = [];
          results[key].push({
            fileName: file.name,
            count: matches.length,
            examples: matches.slice(0, 3).map(m => ({
              value: m.value,
              line: m.line,
              text: m.text
            }))
          });
        });
      }
    });
    setPreviewResults(results);
  }, [uploadedFiles, globalParsingConfig, extractValues]);

  // 智能推荐最佳配置 (This could also be a plugin in the future)
  const smartRecommend = useCallback(() => {
    if (uploadedFiles.length === 0) return;
    // For simplicity, this logic remains here, but demonstrates where another plugin type could be used.
    // This implementation just finds the most common "loss" keyword.
    const allContent = uploadedFiles.map(f => f.content).join('\n');
    let bestKeyword = 'loss';
    let maxCount = 0;

    ['loss', 'training_loss', 'train_loss', 'val_loss'].forEach(keyword => {
      const tempConfig = { mode: 'keyword', keyword };
      const matches = extractorPlugins.keyword.extract(allContent, tempConfig);
      if (matches.length > maxCount) {
        maxCount = matches.length;
        bestKeyword = keyword;
      }
    });

    const newMetrics = [...globalParsingConfig.metrics];
    if (newMetrics[0]) {
      newMetrics[0] = { ...newMetrics[0], mode: 'keyword', keyword: bestKeyword };
      onGlobalParsingConfigChange({ metrics: newMetrics });
    }
  }, [uploadedFiles, globalParsingConfig, onGlobalParsingConfigChange]);

  // 当配置变化时更新预览
  useEffect(() => {
    if (showPreview) {
      previewMatches();
    }
  }, [showPreview, previewMatches]);

  // 处理配置变化
  const handleMetricChange = (index, field, value) => {
    const newMetrics = [...globalParsingConfig.metrics];
    const oldMetric = newMetrics[index];
    newMetrics[index] = { ...oldMetric, [field]: value };

    // If changing mode, we should preserve common fields but might want to reset specific ones.
    if (field === 'mode') {
        newMetrics[index].keyword = oldMetric.keyword || '';
        newMetrics[index].regex = oldMetric.regex || '';
    }

    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const addMetric = () => {
    const newMetrics = [
      ...globalParsingConfig.metrics,
      {
        name: `Metric ${globalParsingConfig.metrics.length + 1}`,
        mode: 'keyword', // Default mode
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

    // Create a new metric object from the preset
    const newMetricFromPreset = {
        name: preset.name,
        mode: preset.mode,
        keyword: preset.keyword || '',
        regex: preset.regex || '',
    };

    const newMetrics = [...globalParsingConfig.metrics];
    newMetrics[index] = newMetricFromPreset;
    onGlobalParsingConfigChange({ metrics: newMetrics });
  };

  const handleXRangeChange = (field, value) => {
    const newRange = { ...xRange, [field]: value === '' ? undefined : Number(value) };
    onXRangeChange(newRange);
  };

  // 渲染配置项的函数
  const renderConfigPanel = (metricConfig, onConfigChange) => {
    const selectedPlugin = extractorPlugins[metricConfig.mode];
    const ConfigComponent = selectedPlugin ? selectedPlugin.ConfigUI : null;

    return (
      <div className="space-y-2">
        {/* 模式选择 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            匹配模式 (Matching Mode)
          </label>
          <select
            value={metricConfig.mode}
            onChange={(e) => onConfigChange('mode', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          >
            {extractorPluginOrder.map(pluginName => {
                const plugin = extractorPlugins[pluginName];
                return (
                    <option key={plugin.name} value={plugin.name}>
                        {plugin.displayName}
                    </option>
                );
            })}
          </select>
        </div>

        {/* 根据模式显示不同的配置项 */}
        {ConfigComponent && <ConfigComponent config={metricConfig} onConfigChange={onConfigChange} />}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="regex-controls-heading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-gray-600" aria-hidden="true" />
          <h3 id="regex-controls-heading" className="text-base font-semibold text-gray-800">
            数据解析配置 (Data Parsing Config)
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {uploadedFiles.length > 0 && (
            <button
              onClick={smartRecommend}
              className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="智能推荐最佳配置 (Smart Recommend)"
            >
              <Zap size={14} />
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="预览匹配结果 (Preview Results)"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {globalParsingConfig.metrics.map((cfg, idx) => (
          <div key={idx} className="border rounded-lg p-3 relative bg-gray-50">
             <button
              onClick={() => removeMetric(idx)}
              className="absolute top-1 right-1 text-red-400 hover:text-red-600 transition-colors"
              title="删除此指标 (Delete Metric)"
              style={{ lineHeight: '1', padding: '0.25rem' }}
            >
              &#x2715;
            </button>
            <div className="space-y-2">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">指标名称 (Metric Name)</label>
                    <input
                        type="text"
                        value={cfg.name}
                        onChange={(e) => handleMetricChange(idx, 'name', e.target.value)}
                        placeholder={getMetricTitle(cfg, idx)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                    />
                    <select
                        onChange={(e) => applyPreset(idx, e.target.value)}
                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                        defaultValue=""
                    >
                        <option value="">或选择预设 (Or Apply a Preset...)</option>
                        {METRIC_PRESETS.map(p => (
                        <option key={p.label} value={p.label}>{p.label}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="border-t my-3"></div>
            {renderConfigPanel(cfg, (field, value) => handleMetricChange(idx, field, value))}
          </div>
        ))}
        <button
          onClick={addMetric}
          className="w-full px-2 py-2 text-sm bg-gray-100 rounded hover:bg-gray-200 border border-dashed"
        >
          + 添加指标 (Add Metric)
        </button>

        <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
                <ZoomIn size={16} className="text-gray-600" aria-hidden="true" />
                <h4 className="text-base font-semibold text-gray-800">
                    X轴范围 (X-Axis Range)
                </h4>
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    placeholder="Min"
                    value={xRange.min ?? ''}
                    onChange={(e) => handleXRangeChange('min', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
                <span className="text-gray-500">-</span>
                <input
                    type="number"
                    placeholder={maxStep ? `${maxStep}` : 'Max'}
                    value={xRange.max ?? ''}
                    onChange={(e) => handleXRangeChange('max', e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                />
                <button
                    onClick={() => onXRangeChange({ min: undefined, max: undefined })}
                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 whitespace-nowrap"
                >
                    复位 (Reset)
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
                在图表上按住 <kbd>Shift</kbd> 键并拖动鼠标可选择范围。
            </p>
        </div>

        {/* 预览结果 */}
        {showPreview && uploadedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">匹配预览 (Preview)</h4>
            <div className="space-y-3 text-xs">
              {Object.entries(previewResults).map(([key, results]) => (
                results.map((result, idx) => (
                  <div key={`${key}-${idx}`} className="border-l-4 border-blue-300 pl-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-700">{key} - {result.fileName}</span>
                      <span className="text-gray-600">({result.count} matches)</span>
                    </div>
                    {result.examples.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {result.examples.map((example, exIdx) => (
                          <div key={exIdx} className="text-gray-600 bg-white p-1 rounded text-xs">
                            <span className="font-mono text-blue-600">{example.value}</span>
                            <span className="text-gray-500 ml-2">(line {example.line})</span>
                            <div className="text-gray-400 truncate">{example.text}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                        <p className="text-gray-500 text-xs mt-1">No matches found in this file.</p>
                    )}
                  </div>
                ))
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
