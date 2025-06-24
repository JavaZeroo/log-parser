import React from 'react';
import { FileText, X } from 'lucide-react';

export function FileList({ files, onFileRemove }) {
  if (files.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-3">
        <h3 className="text-base font-semibold text-gray-800 mb-2">已上传文件</h3>
        <p className="text-gray-500 text-center py-4 text-sm">暂无文件</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <h3 className="text-base font-semibold text-gray-800 mb-2">
        已上传文件 ({files.length})
      </h3>
      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-blue-600" />
              <span className="text-xs font-medium text-gray-700 truncate">
                {file.name}
              </span>
            </div>
            <button
              onClick={() => onFileRemove(index)}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
              title="删除文件"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
