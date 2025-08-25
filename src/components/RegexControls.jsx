import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Eye, ChevronDown, ChevronUp, Target, Code, ZoomIn } from 'lucide-react';
import { METRIC_PRESETS } from '../metricPresets.js';

// 匹配模式枚举
const MATCH_MODES = {
  KEYWORD: 'keyword',
  REGEX: 'regex'
};

// 模式配置
const MODE_CONFIG = {
  [MATCH_MODES.KEYWORD]: {
    name: '关键词匹配',
    icon: Target,
    description: '输入关键词，自动查找并提取数值',
    example: '输入 "loss" 匹配 "loss: 0.123"'
  },
  [MATCH_MODES.REGEX]: {
    name: '正则表达式',
    icon: Code,
    description: '使用正则表达式进行高级匹配',
    example: 'loss:\\s*([\\d.eE+-]+)'
  }
};

// 根据配置生成友好的标题
function getMetricTitle(metric, index) {
  if (metric.name && metric.name.trim()) return metric.name.trim();
  if (metric.keyword) return metric.keyword.replace(/[:：]/g, '').trim();
  if (metric.regex) {
    const sanitized = metric.regex.replace(/[^a-zA-Z0-9_]/g, '').trim();
    return sanitized || `Metric ${index + 1}`;
  }
  return `Metric ${index + 1}`;
}

// 数值提取器类
export class ValueExtractor {
  // 关键词匹配
  static extractByKeyword(content, keyword) {
    const results = [];
    const lines = content.split('\n');
    
    // 数值正则：支持各种数值格式，包括科学计数法
    const numberRegex = /[+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/;
    
    lines.forEach((line, lineIndex) => {
      // 查找关键词（忽略大小写）
      const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
      if (keywordIndex !== -1) {
        // 从关键词后开始查找第一个数字
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

  // 列位置匹配
  static extractByColumn(content, columnIndex, separator = ' ') {
    const results = [];
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

  // 智能解析
  static extractBySmart(content, type = 'loss') {
    const results = [];
    const lines = content.split('\n');
    
    // 智能关键词列表
    const keywords = type === 'loss' 
      ? ['loss', 'training_loss', 'train_loss', 'val_loss', 'validation_loss']
      : ['grad_norm', 'gradient_norm', 'gnorm', 'grad norm', 'gradient norm', 'global_norm'];
    
    lines.forEach((line, lineIndex) => {
      // 尝试JSON解析
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
        // 不是JSON，继续其他格式
      }
      
      // 尝试键值对格式和特殊格式
      for (const keyword of keywords) {
        const patterns = [
          // 标准键值对格式
          new RegExp(`${keyword}\\s*[:=]\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`"${keyword}"\\s*:\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`${keyword}\\s+([\\d.eE+-]+)`, 'i'),
          // MindFormers特殊格式：global_norm: [1.6887678]
          new RegExp(`${keyword}\\s*:\\s*\\[([\\d.eE+-]+)\\]`, 'i'),
          // 其他可能的数组格式
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

  // 正则表达式匹配（原有功能）
  static extractByRegex(content, regex) {
    const results = [];
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
      // 无效正则表达式
    }
    
    return results;
  }
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

  // 提取数值的通用函数
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

  // 预览匹配结果
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

  // 智能推荐最佳配置
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

  // 当配置变化时更新预览
  useEffect(() => {
    if (showPreview) {
      previewMatches();
    }
  }, [showPreview, previewMatches]);

  // 处理配置变化
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

  // 渲染配置项的函数
  const renderConfigPanel = (type, config, onConfigChange, index) => {
    const ModeIcon = MODE_CONFIG[config.mode].icon;

    return (
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">指标名称</label>
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
            <option value="">选择预设</option>
            {METRIC_PRESETS.map(p => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </div>
        {/* 模式选择 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            匹配模式
          </label>
          <select
            value={config.mode}
            onChange={(e) => onConfigChange('mode', e.target.value)}
            className="input-field"
          >
            {Object.entries(MODE_CONFIG).map(([key, modeConfig]) => (
              <option key={key} value={key}>
                {modeConfig.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            <ModeIcon size={10} className="inline mr-1" />
            {MODE_CONFIG[config.mode].description}
          </p>
        </div>

        {/* 根据模式显示不同的配置项 */}
        {config.mode === MATCH_MODES.KEYWORD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              关键词
            </label>
            <input
              type="text"
              value={config.keyword}
              onChange={(e) => onConfigChange('keyword', e.target.value)}
              className="input-field text-sm"
              placeholder="keyword"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              支持模糊匹配，如 "loss" 可匹配 "training_loss"
            </p>
          </div>
        )}

        {config.mode === MATCH_MODES.REGEX && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              正则表达式
            </label>
            <input
              type="text"
              value={config.regex}
              onChange={(e) => onConfigChange('regex', e.target.value)}
              className="input-field text-sm font-mono"
              placeholder="value:\\s*([\\d.eE+-]+)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              使用捕获组 () 来提取数值
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
            数据解析配置
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          {uploadedFiles.length > 0 && (
            <button
              onClick={smartRecommend}
              className="p-1 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900 rounded transition-colors"
              title="智能推荐最佳配置"
            >
              <Zap size={14} />
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
            title="预览匹配结果"
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
                title="删除配置"
              >
                ×
              </button>
              <h4 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                {getMetricTitle(cfg, idx)} 解析配置
              </h4>
              {renderConfigPanel(`metric-${idx}`, cfg, (field, value) => handleMetricChange(idx, field, value), idx)}
            </div>
          ))}
          <button
            onClick={addMetric}
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            + 添加指标
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
                使用 Step 关键字
              </label>
              {globalParsingConfig.useStepKeyword && (
                <input
                  type="text"
                  className="flex-1 input-field"
                  value={globalParsingConfig.stepKeyword || 'step:'}
                  onChange={(e) => handleStepKeywordChange(e.target.value)}
                  placeholder="step:"
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
                    X轴范围
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
                    复位
                </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                在图表上按住 <kbd>Shift</kbd> 键并拖动鼠标可选择范围，或直接输入数值。
            </p>
        </div>

        {/* 预览结果 */}
        {showPreview && uploadedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700">
            <h4 className="text-sm font-medium text-blue-800 mb-2">匹配预览</h4>
            <div className="space-y-3 text-xs">
              {Object.entries(previewResults).map(([key, results]) => (
                results.map((result, idx) => (
                  <div key={`${key}-${idx}`} className="border-l-4 border-blue-300 dark:border-blue-700 pl-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-700">{key} - {result.fileName}</span>
                      <span className="text-gray-600 dark:text-gray-300">({result.count} 个匹配)</span>
                    </div>
                    {result.examples.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {result.examples.map((example, exIdx) => (
                          <div key={exIdx} className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-1 rounded text-xs">
                            <span className="font-mono text-blue-600">{example.value}</span>
                            <span className="text-gray-500 dark:text-gray-400 ml-2">(第{example.line}行)</span>
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
          aria-label="功能说明"
        >
          <p><strong>🎯 增强解析功能：</strong></p>
          <ul role="list" className="mt-1 space-y-1">
            <li>• <Target size={10} className="inline" /> <strong>关键词匹配</strong>：简单输入关键词，自动提取数值（默认模式）</li>
            <li>• <Code size={10} className="inline" /> <strong>正则表达式</strong>：高级用户可使用复杂模式</li>
            <li>• <Zap size={10} className="inline" /> <strong>智能推荐</strong>：一键获得最佳解析配置</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
