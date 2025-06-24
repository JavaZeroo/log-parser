import React, { useState, useEffect } from 'react';
import { X, Settings, TrendingDown, TrendingUp, Sliders, BarChart3, Play, Square } from 'lucide-react';

export function FileConfigModal({ file, isOpen, onClose, onSave }) {
  const [config, setConfig] = useState({
    lossRegex: '',
    gradNormRegex: '',
    dataRange: {
      start: '', // 起始位置 (可选，留空表示从开头)
      end: '',   // 结束位置 (可选，留空表示到结尾)
      useRange: false // 是否启用范围限制
    }
  });

  useEffect(() => {
    if (file && isOpen) {
      setConfig({
        lossRegex: file.config?.lossRegex || 'loss:\\s*([\\d.]+)',
        gradNormRegex: file.config?.gradNormRegex || 'grad_norm:\\s*([\\d.]+)',
        dataRange: file.config?.dataRange || {
          start: '',
          end: '',
          useRange: false
        }
      });
    }
  }, [file, isOpen]);

  const handleSave = () => {
    onSave(file.id, config);
    onClose();
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

  const handleUseRangeToggle = (useRange) => {
    setConfig(prev => ({
      ...prev,
      dataRange: {
        ...prev.dataRange,
        useRange,
        // 如果禁用范围，清空输入值
        start: useRange ? prev.dataRange.start : '',
        end: useRange ? prev.dataRange.end : ''
      }
    }));
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
          {/* 正则表达式配置 */}
          <section>
            <h3 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-indigo-600" aria-hidden="true" />
              正则表达式配置
            </h3>
            
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="config-loss-regex"
                  className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
                >
                  <TrendingDown size={16} className="text-red-500" aria-hidden="true" />
                  Loss 匹配规则
                </label>
                <input
                  id="config-loss-regex"
                  type="text"
                  value={config.lossRegex}
                  onChange={(e) => setConfig(prev => ({ ...prev, lossRegex: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm font-mono"
                  placeholder="loss:\\s*([\\d.]+)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  用于匹配日志中的损失函数值，括号内为捕获组
                </p>
              </div>

              <div>
                <label 
                  htmlFor="config-gradnorm-regex"
                  className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
                >
                  <TrendingUp size={16} className="text-green-500" aria-hidden="true" />
                  Grad Norm 匹配规则
                </label>
                <input
                  id="config-gradnorm-regex"
                  type="text"
                  value={config.gradNormRegex}
                  onChange={(e) => setConfig(prev => ({ ...prev, gradNormRegex: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm font-mono"
                  placeholder="grad_norm:\\s*([\\d.]+)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  用于匹配日志中的梯度范数值，括号内为捕获组
                </p>
              </div>
            </div>
          </section>

          {/* 数据范围配置 */}
          <section>
            <h3 className="text-base font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Sliders size={16} className="text-purple-600" aria-hidden="true" />
              数据范围配置
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={config.dataRange.useRange}
                    onChange={(e) => handleUseRangeToggle(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium">启用数据范围限制</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  勾选后可以指定要显示的数据点范围
                </p>
              </div>

              {config.dataRange.useRange && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label 
                        htmlFor="range-start"
                        className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
                      >
                        <Play size={14} className="text-green-600" aria-hidden="true" />
                        起始位置
                      </label>
                      <input
                        id="range-start"
                        type="number"
                        min="1"
                        placeholder="留空表示从开头"
                        value={config.dataRange.start}
                        onChange={(e) => handleRangeChange('start', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        第几个数据点开始（从1开始）
                      </p>
                    </div>

                    <div>
                      <label 
                        htmlFor="range-end"
                        className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"
                      >
                        <Square size={14} className="text-red-600" aria-hidden="true" />
                        结束位置
                      </label>
                      <input
                        id="range-end"
                        type="number"
                        min="1"
                        placeholder="留空表示到结尾"
                        value={config.dataRange.end}
                        onChange={(e) => handleRangeChange('end', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        第几个数据点结束（包含该点）
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      示例说明：
                    </p>
                    <ul className="text-xs text-blue-700 mt-2 space-y-1">
                      <li>• 起始: 1, 结束: 100 → 显示第1到第100个数据点</li>
                      <li>• 起始: 50, 结束: 留空 → 显示第50个数据点到结尾</li>
                      <li>• 起始: 留空, 结束: 200 → 显示开头到第200个数据点</li>
                      <li>• 起始: 100, 结束: 50 → 无效范围，将显示所有数据</li>
                    </ul>
                  </div>
                </div>
              )}
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
