import React, { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { useStore } from '../store';

export function FileUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const processGlobalFiles = useStore(state => state.processGlobalFiles);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡到全局处理器
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡到全局处理器
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡到全局处理器
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // 阻止事件冒泡到全局处理器
    setIsDragOver(false);
    processGlobalFiles(e.dataTransfer.files);
  }, [processGlobalFiles]);

  const handleFileSelect = useCallback((e) => {
    processGlobalFiles(e.target.files);
    e.target.value = '';
  }, [processGlobalFiles]);

  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <h3 
        id="file-upload-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        📁 文件上传
      </h3>
      <div
        className={`drag-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput').click()}
        role="button"
        tabIndex={0}
        aria-labelledby="file-upload-heading"
        aria-describedby="file-upload-description"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            document.getElementById('fileInput').click();
          }
        }}
      >
        <Upload 
          className="mx-auto mb-2 text-gray-400" 
          size={32} 
          aria-hidden="true"
        />
        <p className="text-sm text-gray-600 mb-1">
          🎯 拖拽文件到此处或点击选择文件
        </p>
        <p 
          id="file-upload-description"
          className="text-xs text-gray-500"
        >
          📄 支持所有文本格式文件
        </p>
        <input
          id="fileInput"
          type="file"
          multiple
          onChange={handleFileSelect}
          className="sr-only"
          aria-label="选择日志文件，支持所有文本格式"
        />
      </div>
    </div>
  );
}
