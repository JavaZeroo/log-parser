import React from 'react';
import { BarChart2 } from 'lucide-react';
import { useStore } from '../store';

export function ComparisonControls() {
  const {
    compareMode,
    onCompareModeChange
  } = useStore(state => ({
    compareMode: state.compareMode,
    onCompareModeChange: state.setCompareMode
  }));

  const modes = [
    { value: 'normal', label: '📊 平均误差 (normal)', description: '未取绝对值的平均误差' },
    { value: 'absolute', label: '📈 平均误差 (absolute)', description: '绝对值差值的平均' },
    { value: 'relative-normal', label: '📉 相对误差 (normal)', description: '不取绝对值的相对误差' },
    { value: 'relative', label: '📊 平均相对误差 (absolute)', description: '绝对相对误差的平均' }
  ];

  return (
    <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="comparison-controls-heading">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 
          size={16} 
          className="text-gray-600" 
          aria-hidden="true"
        />
        <h3 
          id="comparison-controls-heading"
          className="text-base font-semibold text-gray-800"
        >
          ⚖️ 对比模式
        </h3>
      </div>
      
      <fieldset className="space-y-2">
        <legend className="sr-only">选择数据对比模式</legend>
        {modes.map(mode => (
          <label 
            key={mode.value} 
            className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded"
          >
            <input
              type="radio"
              name="compareMode"
              value={mode.value}
              checked={compareMode === mode.value}
              onChange={(e) => onCompareModeChange(e.target.value)}
              className="text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-describedby={`mode-${mode.value}-description`}
            />
            <div className="ml-2">
              <div className="text-xs font-medium text-gray-700">
                {mode.label}
              </div>
              <div 
                id={`mode-${mode.value}-description`}
                className="text-xs text-gray-500"
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
