import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Eye, ChevronDown, ChevronUp, Target, Grid, Brain, Code } from 'lucide-react';

// 匹配模式枚举
const MATCH_MODES = {
  KEYWORD: 'keyword',
  COLUMN: 'column', 
  SMART: 'smart',
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
  [MATCH_MODES.COLUMN]: {
    name: '列位置匹配', 
    icon: Grid,
    description: '指定列号和分隔符来提取数值',
    example: '第2列，以空格分隔'
  },
  [MATCH_MODES.SMART]: {
    name: '智能解析',
    icon: Brain, 
    description: '自动识别各种常见格式',
    example: '自动检测JSON、键值对等格式'
  },
  [MATCH_MODES.REGEX]: {
    name: '正则表达式',
    icon: Code,
    description: '使用正则表达式进行高级匹配',
    example: 'loss:\\s*([\\d.eE+-]+)'
  }
};

// 数值提取器类
class ValueExtractor {
  // 关键词匹配
  static extractByKeyword(content, keyword) {
    const results = [];
    const lines = content.split('\n');
    
    // 数值正则：支持各种数值格式
    const numberRegex = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
    
    lines.forEach((line, lineIndex) => {
      // 模糊匹配关键词（忽略大小写、下划线、空格）
      const normalizedLine = line.toLowerCase().replace(/[_\s]/g, '');
      const normalizedKeyword = keyword.toLowerCase().replace(/[_\s]/g, '');
      
      if (normalizedLine.includes(normalizedKeyword)) {
        // 查找关键词后的数值
        const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
        if (keywordIndex !== -1) {
          const afterKeyword = line.substring(keywordIndex + keyword.length);
          const numberMatch = afterKeyword.match(numberRegex);
          if (numberMatch) {
            results.push({
              value: parseFloat(numberMatch[0]),
              line: lineIndex + 1,
              text: line.trim()
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
      : ['grad_norm', 'gradient_norm', 'gnorm', 'grad norm', 'gradient norm'];
    
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
      } catch (e) {
        // 不是JSON，继续其他格式
      }
      
      // 尝试键值对格式
      for (const keyword of keywords) {
        const patterns = [
          new RegExp(`${keyword}\\s*[:=]\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`"${keyword}"\\s*:\\s*([\\d.eE+-]+)`, 'i'),
          new RegExp(`${keyword}\\s+([\\d.eE+-]+)`, 'i')
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
                format: 'Key-Value'
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
    } catch (e) {
      // 无效正则表达式
    }
    
    return results;
  }
}

export function RegexControls({ lossRegex, gradNormRegex, onRegexChange, uploadedFiles = [] }) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewResults, setPreviewResults] = useState({ loss: [], gradNorm: [] });
  
  // 新增状态：匹配模式和配置
  const [lossMode, setLossMode] = useState(MATCH_MODES.REGEX);
  const [gradNormMode, setGradNormMode] = useState(MATCH_MODES.REGEX);
  const [lossConfig, setLossConfig] = useState({
    keyword: 'loss',
    columnIndex: 1,
    separator: ' ',
    regex: lossRegex
  });
  const [gradNormConfig, setGradNormConfig] = useState({
    keyword: 'grad_norm', 
    columnIndex: 2,
    separator: ' ',
    regex: gradNormRegex
  });

  // 提取数值的通用函数
  const extractValues = useCallback((content, mode, config, type) => {
    switch (mode) {
      case MATCH_MODES.KEYWORD:
        return ValueExtractor.extractByKeyword(content, config.keyword);
      case MATCH_MODES.COLUMN:
        return ValueExtractor.extractByColumn(content, config.columnIndex, config.separator);
      case MATCH_MODES.SMART:
        return ValueExtractor.extractBySmart(content, type);
      case MATCH_MODES.REGEX:
        return ValueExtractor.extractByRegex(content, config.regex);
      default:
        return [];
    }
  }, []);

  // 预览匹配结果
  const previewMatches = useCallback(() => {
    const results = { loss: [], gradNorm: [] };

    uploadedFiles.forEach(file => {
      if (file.content) {
        // Loss匹配
        const lossMatches = extractValues(file.content, lossMode, lossConfig, 'loss');
        results.loss.push({
          fileName: file.name,
          count: lossMatches.length,
          examples: lossMatches.slice(0, 3).map(m => ({
            value: m.value,
            line: m.line,
            text: m.text,
            format: m.format
          }))
        });

        // Grad Norm匹配
        const gradNormMatches = extractValues(file.content, gradNormMode, gradNormConfig, 'gradnorm');
        results.gradNorm.push({
          fileName: file.name,
          count: gradNormMatches.length,
          examples: gradNormMatches.slice(0, 3).map(m => ({
            value: m.value,
            line: m.line,
            text: m.text,
            format: m.format
          }))
        });
      }
    });

    setPreviewResults(results);
  }, [uploadedFiles, lossMode, lossConfig, gradNormMode, gradNormConfig, extractValues]);

  // 智能推荐最佳配置
  const smartRecommend = useCallback(() => {
    if (uploadedFiles.length === 0) return;

    let bestLossConfig = null;
    let bestGradNormConfig = null;
    let maxLossCount = 0;
    let maxGradNormCount = 0;

    const allContent = uploadedFiles.map(f => f.content).join('\n');
    
    // 测试不同模式和配置
    Object.values(MATCH_MODES).forEach(mode => {
      if (mode === MATCH_MODES.KEYWORD) {
        // 测试不同关键词
        ['loss', 'training_loss', 'train_loss'].forEach(keyword => {
          const matches = ValueExtractor.extractByKeyword(allContent, keyword);
          if (matches.length > maxLossCount) {
            maxLossCount = matches.length;
            bestLossConfig = { mode, config: { keyword } };
          }
        });
        
        ['grad_norm', 'gradient_norm', 'gnorm'].forEach(keyword => {
          const matches = ValueExtractor.extractByKeyword(allContent, keyword);
          if (matches.length > maxGradNormCount) {
            maxGradNormCount = matches.length;
            bestGradNormConfig = { mode, config: { keyword } };
          }
        });
      } else if (mode === MATCH_MODES.SMART) {
        const lossMatches = ValueExtractor.extractBySmart(allContent, 'loss');
        const gradNormMatches = ValueExtractor.extractBySmart(allContent, 'gradnorm');
        
        if (lossMatches.length > maxLossCount) {
          maxLossCount = lossMatches.length;
          bestLossConfig = { mode, config: {} };
        }
        
        if (gradNormMatches.length > maxGradNormCount) {
          maxGradNormCount = gradNormMatches.length;
          bestGradNormConfig = { mode, config: {} };
        }
      }
    });

    // 应用最佳配置
    if (bestLossConfig) {
      setLossMode(bestLossConfig.mode);
      if (bestLossConfig.config.keyword) {
        setLossConfig(prev => ({ ...prev, keyword: bestLossConfig.config.keyword }));
      }
    }
    
    if (bestGradNormConfig) {
      setGradNormMode(bestGradNormConfig.mode);
      if (bestGradNormConfig.config.keyword) {
        setGradNormConfig(prev => ({ ...prev, keyword: bestGradNormConfig.config.keyword }));
      }
    }
  }, [uploadedFiles]);

  // 当配置变化时更新预览
  useEffect(() => {
    if (showPreview) {
      previewMatches();
    }
  }, [showPreview, previewMatches]);

  // 当正则表达式从外部更新时同步到内部状态
  useEffect(() => {
    setLossConfig(prev => ({ ...prev, regex: lossRegex }));
  }, [lossRegex]);

  useEffect(() => {
    setGradNormConfig(prev => ({ ...prev, regex: gradNormRegex }));
  }, [gradNormRegex]);

  // 处理配置变化
  const handleLossConfigChange = (field, value) => {
    setLossConfig(prev => ({ ...prev, [field]: value }));
    if (lossMode === MATCH_MODES.REGEX && field === 'regex') {
      onRegexChange('loss', value);
    }
  };

  const handleGradNormConfigChange = (field, value) => {
    setGradNormConfig(prev => ({ ...prev, [field]: value }));
    if (gradNormMode === MATCH_MODES.REGEX && field === 'regex') {
      onRegexChange('gradNorm', value);
    }
  };
  // 渲染配置项的函数
  const renderConfigPanel = (type, mode, config, onModeChange, onConfigChange) => {
    const ModeIcon = MODE_CONFIG[mode].icon;
    
    return (
      <div className="space-y-2">
        {/* 模式选择 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            匹配模式
          </label>
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(MODE_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            <ModeIcon size={10} className="inline mr-1" />
            {MODE_CONFIG[mode].description}
          </p>
        </div>

        {/* 根据模式显示不同的配置项 */}
        {mode === MATCH_MODES.KEYWORD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              关键词
            </label>
            <input
              type="text"
              value={config.keyword}
              onChange={(e) => onConfigChange('keyword', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              placeholder={type === 'loss' ? 'loss' : 'grad_norm'}
            />
            <p className="text-xs text-gray-500 mt-1">
              支持模糊匹配，如 "loss" 可匹配 "training_loss"
            </p>
          </div>
        )}

        {mode === MATCH_MODES.COLUMN && (
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                列索引 (从0开始)
              </label>
              <input
                type="number"
                min="0"
                value={config.columnIndex}
                onChange={(e) => onConfigChange('columnIndex', parseInt(e.target.value) || 0)}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                分隔符
              </label>
              <select
                value={config.separator}
                onChange={(e) => onConfigChange('separator', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              >
                <option value=" ">空格</option>
                <option value=",">逗号</option>
                <option value="\t">制表符</option>
                <option value="|">竖线</option>
              </select>
            </div>
          </div>
        )}

        {mode === MATCH_MODES.SMART && (
          <div className="p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-700">
              <Brain size={12} className="inline mr-1" />
              智能模式会自动检测JSON、键值对等格式，无需额外配置
            </p>
          </div>
        )}

        {mode === MATCH_MODES.REGEX && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              正则表达式
            </label>
            <input
              type="text"
              value={config.regex}
              onChange={(e) => onConfigChange('regex', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
              placeholder={type === 'loss' ? 'loss:\\s*([\\d.eE+-]+)' : 'grad[\\s_]norm:\\s*([\\d.eE+-]+)'}
            />
            <p className="text-xs text-gray-500 mt-1">
              使用捕获组 () 来提取数值
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="regex-controls-heading">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Settings 
            size={16} 
            className="text-gray-600" 
            aria-hidden="true"
          />
          <h3 
            id="regex-controls-heading"
            className="text-base font-semibold text-gray-800"
          >
            数据解析配置
          </h3>
        </div>
        
        <div className="flex items-center gap-1">
          {uploadedFiles.length > 0 && (
            <button
              onClick={smartRecommend}
              className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
              title="智能推荐最佳配置"
            >
              <Zap size={14} />
            </button>
          )}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="预览匹配结果"
          >
            <Eye size={14} />
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Loss 配置 */}
        <div className="border rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            Loss 解析配置
          </h4>
          {renderConfigPanel('loss', lossMode, lossConfig, setLossMode, handleLossConfigChange)}
        </div>
        
        {/* Grad Norm 配置 */}
        <div className="border rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            Grad Norm 解析配置
          </h4>
          {renderConfigPanel('gradnorm', gradNormMode, gradNormConfig, setGradNormMode, handleGradNormConfigChange)}
        </div>

        {/* 预览结果 */}
        {showPreview && uploadedFiles.length > 0 && (
          <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800 mb-2">匹配预览</h4>
            <div className="space-y-3 text-xs">
              {previewResults.loss.map((result, idx) => (
                <div key={`loss-${idx}`} className="border-l-4 border-red-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-700">Loss - {result.fileName}</span>
                    <span className="text-gray-600">({result.count} 个匹配)</span>
                  </div>
                  {result.examples.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {result.examples.map((example, exIdx) => (
                        <div key={exIdx} className="text-gray-600 bg-white p-1 rounded text-xs">
                          <span className="font-mono text-blue-600">{example.value}</span>
                          <span className="text-gray-500 ml-2">(第{example.line}行)</span>
                          {example.format && (
                            <span className="text-purple-600 ml-2">[{example.format}]</span>
                          )}
                          <div className="text-gray-400 truncate">{example.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {previewResults.gradNorm.map((result, idx) => (
                <div key={`gradnorm-${idx}`} className="border-l-4 border-green-300 pl-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-green-700">Grad Norm - {result.fileName}</span>
                    <span className="text-gray-600">({result.count} 个匹配)</span>
                  </div>
                  {result.examples.length > 0 && (
                    <div className="mt-1 space-y-1">
                      {result.examples.map((example, exIdx) => (
                        <div key={exIdx} className="text-gray-600 bg-white p-1 rounded text-xs">
                          <span className="font-mono text-blue-600">{example.value}</span>
                          <span className="text-gray-500 ml-2">(第{example.line}行)</span>
                          {example.format && (
                            <span className="text-purple-600 ml-2">[{example.format}]</span>
                          )}
                          <div className="text-gray-400 truncate">{example.text}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div 
          className="text-xs text-gray-500 p-2 bg-gray-50 rounded"
          role="region"
          aria-label="功能说明"
        >
          <p><strong>🎯 增强解析功能：</strong></p>
          <ul role="list" className="mt-1 space-y-1">
            <li>• <Target size={10} className="inline" /> <strong>关键词匹配</strong>：简单输入关键词，自动提取数值</li>
            <li>• <Grid size={10} className="inline" /> <strong>列位置匹配</strong>：适合结构化日志，指定列号和分隔符</li>
            <li>• <Brain size={10} className="inline" /> <strong>智能解析</strong>：自动识别JSON、键值对等格式</li>
            <li>• <Code size={10} className="inline" /> <strong>正则表达式</strong>：高级用户可使用复杂模式</li>
            <li>• <Zap size={10} className="inline" /> <strong>智能推荐</strong>：一键获得最佳解析配置</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
