import React from 'react';
import { BarChart2 } from 'lucide-react';

export function ComparisonControls({ compareMode, onCompareModeChange }) {
  const modes = [
    { value: 'normal', label: 'Normal', description: '原始差值' },
    { value: 'absolute', label: 'Absolute', description: '绝对差值' },
    { value: 'relative', label: 'Relative', description: '相对误差' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <BarChart2 size={16} className="text-gray-600" />
        <h3 className="text-base font-semibold text-gray-800">对比模式</h3>
      </div>
      
      <div className="space-y-2">
        {modes.map(mode => (
          <label key={mode.value} className="flex items-center">
            <input
              type="radio"
              name="compareMode"
              value={mode.value}
              checked={compareMode === mode.value}
              onChange={(e) => onCompareModeChange(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <div className="ml-2">
              <div className="text-xs font-medium text-gray-700">
                {mode.label}
              </div>
              <div className="text-xs text-gray-500">
                {mode.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
