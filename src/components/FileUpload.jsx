import React, { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';

  export function FileUpload({ onFilesUploaded }) {
    const [isDragOver, setIsDragOver] = useState(false);
    const { t } = useTranslation();

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
    e.stopPropagation(); // prevent bubbling to global handler
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent bubbling to global handler
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent bubbling to global handler
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation(); // prevent bubbling to global handler
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileSelect = useCallback((e) => {
    processFiles(e.target.files);
    e.target.value = '';
  }, [processFiles]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3">
        <h3
          id="file-upload-heading"
          className="text-base font-semibold text-gray-800 dark:text-gray-100 mb-2"
        >
          {t('fileUpload.title')}
        </h3>
      <div
        className={`drag-area border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500 dark:bg-gray-700'
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
          className="mx-auto mb-2 text-gray-400 dark:text-gray-200"
          size={32}
          aria-hidden="true"
        />
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
            {t('fileUpload.drag')}
          </p>
        <p 
          id="file-upload-description"
            className="text-xs text-gray-500 dark:text-gray-400"
          >
            {t('fileUpload.support')}
          </p>
        <input
          id="fileInput"
          type="file"
          multiple
          onChange={handleFileSelect}
            className="sr-only"
            aria-label={t('fileUpload.aria')}
          />
      </div>
    </div>
  );
}
