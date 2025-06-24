import React from 'react';
import { Settings } from 'lucide-react';

export function RegexControls({ lossRegex, gradNormRegex, onRegexChange }) {
  return (
    <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="regex-controls-heading">
      <div className="flex items-center gap-2 mb-2">
        <Settings 
          size={16} 
          className="text-gray-600" 
          aria-hidden="true"
        />
        <h3 
          id="regex-controls-heading"
          className="text-base font-semibold text-gray-800"
        >
          🔧 正则表达式
        </h3>
      </div>
      
      <div className="space-y-3">
        <div>
          <label 
            htmlFor="loss-regex"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            📉 Loss 匹配规则
          </label>
          <input
            id="loss-regex"
            type="text"
            value={lossRegex}
            onChange={(e) => onRegexChange('loss', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            placeholder="loss:\\s*([\\d.]+)"
            aria-describedby="loss-regex-description"
          />
        </div>
        
        <div>
          <label 
            htmlFor="grad-norm-regex"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            📈 Grad Norm 匹配规则
          </label>
          <input
            id="grad-norm-regex"
            type="text"
            value={gradNormRegex}
            onChange={(e) => onRegexChange('gradNorm', e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
            placeholder="grad norm:\\s*([\\d.]+)"
            aria-describedby="grad-norm-regex-description"
          />
        </div>
        
        <div 
          className="text-xs text-gray-500"
          id="loss-regex-description grad-norm-regex-description"
          role="region"
          aria-label="正则表达式使用说明"
        >
          <p><strong>默认匹配格式示例：</strong></p>
          <ul role="list" className="mt-1 space-y-1">
            <li>• loss: 0.1234</li>
            <li>• grad norm: 1.5678</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
