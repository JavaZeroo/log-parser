import React, { useState, useEffect } from 'react';
import { X, Settings, TrendingDown, TrendingUp, Sliders, BarChart3, Target, Code, Zap } from 'lucide-react';

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

export function FileConfigModal({ file, isOpen, onClose, onSave, globalParsingConfig }) {
  const [config, setConfig] = useState({
    metrics: [],
    dataRange: {
      start: 0,        // 起始位置，默认为0（第一个数据点）
      end: undefined,  // 结束位置，默认为undefined（最后一个数据点）
      useRange: false  // 保留用于向后兼容
    }
  });

  useEffect(() => {
    if (file && isOpen) {
      // 如果文件有配置，使用文件配置，否则使用全局配置
      const fileConfig = file.config || {};
      setConfig({
        metrics: fileConfig.metrics || globalParsingConfig.metrics,
        dataRange: fileConfig.dataRange || {
          start: 0,
          end: undefined,
          useRange: false
        }
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

  const handleRangeChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      dataRange: {
        ...prev.dataRange,
        [field]: value
      }
    }));
  };

  // 从全局配置同步
  const syncFromGlobal = () => {
    setConfig(prev => ({
      ...prev,
      metrics: globalParsingConfig.metrics.map(m => ({ ...m }))
    }));
  };

  // 渲染配置项的函数
  const renderConfigPanel = (type, configItem, index) => {
    const ModeIcon = MODE_CONFIG[configItem.mode].icon;
    
    return (
      <div className="space-y-2">
        {/* 模式选择 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            匹配模式
          </label>
          <select
            value={configItem.mode}
            onChange={(e) => handleMetricChange(index, 'mode', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
          >
            {Object.entries(MODE_CONFIG).map(([key, modeConfig]) => (
              <option key={key} value={key}>
                {modeConfig.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            <ModeIcon size={10} className="inline mr-1" />
            {MODE_CONFIG[configItem.mode].description}
          </p>
        </div>

        {/* 根据模式显示不同的配置项 */}
        {configItem.mode === MATCH_MODES.KEYWORD && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              关键词
            </label>
            <input
              type="text"
              value={configItem.keyword}
              onChange={(e) => handleMetricChange(index, 'keyword', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              placeholder="keyword"
            />
            <p className="text-xs text-gray-500 mt-1">
              支持模糊匹配，如 "loss" 可匹配 "training_loss"
            </p>
          </div>
        )}

        {configItem.mode === MATCH_MODES.REGEX && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              正则表达式
            </label>
            <input
              type="text"
              value={configItem.regex}
              onChange={(e) => handleMetricChange(index, 'regex', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none font-mono"
              placeholder="value:\\s*([\\d.eE+-]+)"
            />
            <p className="text-xs text-gray-500 mt-1">
              使用捕获组 () 来提取数值
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
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-blue-600" aria-hidden="true" />
            <h2 id="config-modal-title" className="text-lg font-semibold text-gray-800">
              配置文件: {file.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="关闭配置对话框"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 解析配置 */}
          <section>
            {/* 全局同步按钮 */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800 flex items-center gap-2">
                <BarChart3 size={16} className="text-indigo-600" aria-hidden="true" />
                解析配置
              </h3>
              <button
                onClick={syncFromGlobal}
                className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                title="从全局配置同步"
              >
                <Zap size={12} />
                同步全局配置
              </button>
            </div>
            
            <div className="space-y-4">
              {config.metrics.map((cfg, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-800 mb-2 flex items-center gap-1">
                    <TrendingDown size={16} className="text-red-500" aria-hidden="true" />
                    {cfg.name || `Metric ${idx + 1}`} 解析配置
                  </h4>
                  {renderConfigPanel(`metric-${idx}`, cfg, idx)}
                </div>
              ))}
            </div>
          </section>

          {/* 数据范围配置 */}
          <section>
            <h3 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" aria-hidden="true" />
              数据范围配置
            </h3>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                配置要显示的数据点范围。默认显示全部数据（从第一个到最后一个数据点）。
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label 
                      htmlFor="range-start"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      起始位置
                    </label>
                    <input
                      id="range-start"
                      type="number"
                      min="0"
                      placeholder="0（默认从第一个数据点）"
                      value={config.dataRange.start || ''}
                      onChange={(e) => handleRangeChange('start', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      第几个数据点开始（从0开始计数）
                    </p>
                  </div>

                  <div>
                    <label 
                      htmlFor="range-end"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      结束位置
                    </label>
                    <input
                      id="range-end"
                      type="number"
                      min="0"
                      placeholder="留空显示到最后"
                      value={config.dataRange.end || ''}
                      onChange={(e) => handleRangeChange('end', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      第几个数据点结束（不包含该点）
                    </p>
                  </div>
                </div>

                <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="text-sm text-blue-800 font-medium">
                    示例说明：
                  </p>
                  <ul className="text-xs text-blue-700 mt-2 space-y-1">
                    <li>• 起始: 0, 结束: 100 → 显示第1到第100个数据点</li>
                    <li>• 起始: 50, 结束: 留空 → 显示第51个数据点到结尾</li>
                    <li>• 起始: 0, 结束: 留空 → 显示全部数据点（默认）</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
