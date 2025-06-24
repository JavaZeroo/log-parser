import React from 'react';
import { FileText, X } from 'lucide-react';

export function FileList({ files, onFileRemove }) {
  if (files.length === 0) {
    return (
      <section className="bg-white rounded-lg shadow-md p-3" aria-labelledby="file-list-heading">
        <h3 
          id="file-list-heading"
          className="text-base font-semibold text-gray-800 mb-2"
        >
          📋 已上传文件
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
        📋 已上传文件 ({files.length})
      </h3>
      <ul className="space-y-2" role="list" aria-label={`已上传 ${files.length} 个文件`}>
        {files.map((file, index) => (
          <li
            key={file.id}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
            role="listitem"
          >
            <div className="flex items-center gap-2">
              <FileText 
                size={14} 
                className="text-blue-600" 
                aria-hidden="true"
              />
              <span className="text-xs font-medium text-gray-700 truncate">
                {file.name}
              </span>
            </div>
            <button
              onClick={() => onFileRemove(index)}
              className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              title={`删除文件 ${file.name}`}
              aria-label={`删除文件 ${file.name}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
