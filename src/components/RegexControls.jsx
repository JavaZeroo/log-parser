import React from 'react';
import { Settings } from 'lucide-react';

export function RegexControls({ lossRegex, gradNormRegex, onRegexChange }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <Settings size={16} className="text-gray-600" />
        <h3 className="text-base font-semibold text-gray-800">正则表达式</h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Loss 匹配规则
          </label>
          <input
            type="text"
            value={lossRegex}
            onChange={(e) => onRegexChange('loss', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="loss:\\s*([\\d.]+)"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Grad Norm 匹配规则
          </label>
          <input
            type="text"
            value={gradNormRegex}
            onChange={(e) => onRegexChange('gradNorm', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="grad norm:\\s*([\\d.]+)"
          />
        </div>
        
        <div className="text-xs text-gray-500">
          <p>默认匹配格式示例：</p>
          <p>• loss: 0.1234</p>
          <p>• grad norm: 1.5678</p>
        </div>
      </div>
    </div>
  );
}
