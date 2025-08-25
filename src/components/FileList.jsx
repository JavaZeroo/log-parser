import React from 'react';
import { FileText, X, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

  export function FileList({ files, onFileRemove, onFileToggle, onFileConfig }) {
    const { t } = useTranslation();
    if (files.length === 0) {
      return (
        <section className="card" aria-labelledby="file-list-heading">
          <h3
            id="file-list-heading"
            className="card-title mb-2"
          >
            {t('fileList.title')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-center py-4 text-sm" role="status">
            {t('fileList.empty')}
          </p>
        </section>
      );
    }

    return (
      <section className="card" aria-labelledby="file-list-heading">
        <h3
          id="file-list-heading"
          className="card-title mb-2"
        >
          {t('fileList.title')} ({files.length})
        </h3>
        <ul className="space-y-2" role="list" aria-label={t('fileList.loaded', { count: files.length })}>
          {files.map((file, index) => (
            <li
              key={file.id}
            className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
            role="listitem"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <label className="flex items-center gap-2 cursor-pointer flex-1">
                  <input
                    type="checkbox"
                    checked={file.enabled !== false}
                    onChange={(e) => onFileToggle(index, e.target.checked)}
                    className="checkbox"
                    aria-describedby={`file-status-${file.id}`}
                  />
                  <FileText
                    size={14}
                    className={`${file.enabled !== false ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-xs font-medium truncate ${
                      file.enabled !== false ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {file.name}
                  </span>
                    <span
                      id={`file-status-${file.id}`}
                      className="sr-only"
                    >
                      {file.enabled !== false ? t('fileList.enabled') : t('fileList.disabled')}
                    </span>
                  </label>
                </div>
              
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onFileConfig(file)}
                    className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
                    title={t('fileList.config', { name: file.name })}
                    aria-label={t('fileList.config', { name: file.name })}
                    disabled={file.enabled === false}
                  >
                    <Settings size={14} aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => onFileRemove(index)}
                    className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
                    title={t('fileList.delete', { name: file.name })}
                    aria-label={t('fileList.delete', { name: file.name })}
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
