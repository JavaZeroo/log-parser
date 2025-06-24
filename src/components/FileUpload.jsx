import React, { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

export function FileUpload({ onFilesUploaded }) {
  const [isDragOver, setIsDragOver] = useState(false);

  const processFiles = useCallback((files) => {
    const fileArray = Array.from(files).filter(file => 
      file.type === 'text/plain' || file.name.endsWith('.log') || file.name.endsWith('.txt')
    );

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

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  return (
    <div className="bg-white rounded-lg shadow-md p-3">
      <h3 className="text-base font-semibold text-gray-800 mb-2">文件上传</h3>
      <div
        className={`drag-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('fileInput').click()}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600 mb-1">
          拖拽文件到此处或点击选择文件
        </p>
        <p className="text-xs text-gray-500">
          支持 .log 和 .txt 格式
        </p>
        <input
          id="fileInput"
          type="file"
          multiple
          accept=".log,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
