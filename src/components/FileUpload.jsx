import React, { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

export function FileUpload({ onFilesUploaded }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback((files) => {
    const fileArray = Array.from(files);

    const processedFiles = fileArray.map(file => ({
      file,
      name: file.name,
      id: Math.random().toString(36).substr(2, 9),
      data: null,
      content: null
    }));

    // Read file contents
    Promise.all(
      processedFiles.map(fileObj => 
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            fileObj.content = e.target.result;
            resolve(fileObj);
          };
          reader.readAsText(fileObj.file);
        })
      )
    ).then(files => {
      onFilesUploaded(files);
    });
  }, [onFilesUploaded]);

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
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <h3 
        id="file-upload-heading"
        className="text-base font-semibold text-gray-800 mb-2"
      >
        📁 文件上传
      </h3>
      <div
        className={`group drag-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-transform duration-300 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg'
            : 'border-gray-300 hover:border-gray-400 hover:scale-105 hover:shadow-md'
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
          className="mx-auto mb-2 text-gray-400 float-on-hover"
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
