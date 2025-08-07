import React from 'react';
import { FileText, X, Settings } from 'lucide-react';
import { useStore } from '../store';

export function FileList() {
  const files = useStore(state => state.uploadedFiles);
  const onFileRemove = useStore(state => state.handleFileRemove);
  const onFileToggle = useStore(state => state.handleFileToggle);
  const onFileConfig = useStore(state => state.handleFileConfig);
  const setFileColor = useStore(state => state.setFileColor);

  if (files.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="file-list-heading">
        <h3 
          id="file-list-heading"
          className="text-base font-semibold text-gray-800 mb-2"
        >
          📋 已加载文件
        </h3>
        <p className="text-gray-500 text-center py-4 text-sm" role="status">
          📂 暂无文件
        </p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="file-list-heading">
      <h3 
        id="file-list-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        📋 已加载文件 ({files.length})
      </h3>
      <ul className="space-y-2" role="list" aria-label={`已加载 ${files.length} 个文件`}>
        {files.map((file, index) => (
          <li
            key={file.id}
            className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
            role="listitem"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={file.enabled !== false}
                    onChange={(e) => onFileToggle(index, e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-describedby={`file-status-${file.id}`}
                  />
                  <input
                    type="color"
                    value={file.color || '#000000'}
                    onChange={(e) => setFileColor(file.id, e.target.value)}
                    className="w-5 h-5 p-0 border-none rounded cursor-pointer"
                    title="Change line color"
                  />
                  <span 
                    className={`text-xs font-medium truncate ${
                      file.enabled !== false ? 'text-gray-700' : 'text-gray-400'
                    }`}
                  >
                    {file.name}
                  </span>
                  <span 
                    id={`file-status-${file.id}`}
                    className="sr-only"
                  >
                    {file.enabled !== false ? '已启用' : '已禁用'}
                  </span>
                </label>
              </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onFileConfig(file)}
                  className="p-1 text-gray-400 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                  title={`配置文件 ${file.name}`}
                  aria-label={`配置文件 ${file.name}`}
                  disabled={file.enabled === false}
                >
                  <Settings size={14} aria-hidden="true" />
                </button>
                <button
                  onClick={() => onFileRemove(index)}
                  className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                  title={`删除文件 ${file.name}`}
                  aria-label={`删除文件 ${file.name}`}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
