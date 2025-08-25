import React from 'react';
import { BarChart2 } from 'lucide-react';

export function ComparisonControls({ 
  compareMode, 
  onCompareModeChange
}) {
  const modes = [
    { value: 'normal', label: '📊 平均误差 (normal)', description: '未取绝对值的平均误差' },
    { value: 'absolute', label: '📈 平均误差 (absolute)', description: '绝对值差值的平均' },
    { value: 'relative-normal', label: '📉 相对误差 (normal)', description: '不取绝对值的相对误差' },
    { value: 'relative', label: '📊 平均相对误差 (absolute)', description: '绝对相对误差的平均' }
  ];

  return (
    <section className="card" aria-labelledby="comparison-controls-heading">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2
          size={16}
          className="text-gray-600 dark:text-gray-300"
          aria-hidden="true"
        />
        <h3
          id="comparison-controls-heading"
          className="card-title"
        >
          ⚖️ 对比模式
        </h3>
      </div>
      
      <fieldset className="space-y-2">
        <legend className="sr-only">选择数据对比模式</legend>
        {modes.map(mode => (
          <label
            key={mode.value}
            className="flex items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded"
          >
            <input
              type="radio"
              name="compareMode"
              value={mode.value}
              checked={compareMode === mode.value}
              onChange={(e) => onCompareModeChange(e.target.value)}
              className="radio"
              aria-describedby={`mode-${mode.value}-description`}
            />
            <div className="ml-2">
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {mode.label}
              </div>
              <div
                id={`mode-${mode.value}-description`}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {mode.description}
              </div>
            </div>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
