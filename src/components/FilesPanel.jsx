import React, { useCallback, useRef, useState } from 'react';
import { FileText, X, Settings, Loader2, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CollapsibleCardHeader } from './CollapsibleCardHeader.jsx';
import { SmoothCollapse } from './SmoothCollapse.jsx';
import { useCollapsedSection } from '../utils/useCollapsedSection.js';

function ProgressBar({ value }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="mt-1 h-1 w-full bg-gray-200 dark:bg-gray-600 rounded overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="h-full bg-blue-500 transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Combined upload + list panel.
// - When `files` is empty: shows a large drop zone (the standard onboarding view).
// - When files exist: compact drop strip on top + the list below.
// - Header has a "Clear all" trash icon to wipe everything in one click.
export function FilesPanel({
  files,
  onFilesUploaded,
  onFileRemove,
  onFileToggle,
  onFileConfig,
  onClearAll,
  collapseId
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useCollapsedSection(collapseId, true);
  const collapsible = Boolean(collapseId);
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // ----- file reading (lifted from FileUpload) ----------------------------
  const processFiles = useCallback(
    (rawFiles) => {
      const fileArray = Array.from(rawFiles);
      if (fileArray.length === 0) return;
      const processed = fileArray.map((file) => ({
        file,
        name: file.name,
        id: Math.random().toString(36).substr(2, 9),
        data: null,
        content: null
      }));
      Promise.all(
        processed.map(
          (fileObj) =>
            new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                fileObj.content = e.target.result;
                resolve(fileObj);
              };
              reader.readAsText(fileObj.file);
            })
        )
      ).then((done) => onFilesUploaded(done));
    },
    [onFilesUploaded]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  const handleFileSelect = useCallback(
    (e) => {
      processFiles(e.target.files);
      e.target.value = '';
    },
    [processFiles]
  );

  const openPicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // ----- render -----------------------------------------------------------
  const count = files.length;

  const headerActions = count > 0 ? (
    <button
      type="button"
      onClick={onClearAll}
      className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
      aria-label={t('filesPanel.clearAll')}
      title={t('filesPanel.clearAll')}
    >
      <Trash2 size={14} aria-hidden="true" />
    </button>
  ) : null;

  return (
    <section className="card" aria-labelledby="files-panel-heading">
      <CollapsibleCardHeader
        title={count > 0 ? `${t('filesPanel.title')} (${count})` : t('filesPanel.title')}
        titleId="files-panel-heading"
        actions={headerActions}
        collapsible={collapsible}
        open={open}
        onToggle={() => setOpen((o) => !o)}
      />

      <SmoothCollapse open={!collapsible || open}>
        <div className="mt-2 space-y-2">
          {/* Drop zone — large when empty, compact when files exist */}
          <div
            className={`drag-area border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
              count === 0 ? 'p-4' : 'px-3 py-2'
            } ${
              isDragOver
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                : 'border-gray-300 hover:border-blue-400 dark:border-gray-600 dark:hover:border-blue-500 dark:bg-gray-700/40'
            }`}
            onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
            onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
            onDrop={handleDrop}
            onClick={openPicker}
            role="button"
            tabIndex={0}
            aria-label={t('fileUpload.drag')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); }
            }}
          >
            {count === 0 ? (
              <>
                <Upload className="mx-auto mb-2 text-gray-400 dark:text-gray-300" size={28} aria-hidden="true" />
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-0.5">{t('fileUpload.drag')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('fileUpload.support')}</p>
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Upload size={14} aria-hidden="true" />
                <span>{t('filesPanel.dropMore')}</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="fileInput"
              type="file"
              multiple
              onChange={handleFileSelect}
              className="sr-only"
              aria-label={t('fileUpload.aria')}
            />
          </div>

          {/* File list */}
          {count > 0 && (
            <ul className="space-y-1" role="list" aria-label={t('fileList.loaded', { count })}>
              {files.map((file, idx) => (
                <li
                  key={file.id}
                  className="rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600/70 transition-colors"
                  role="listitem"
                >
                  <div className="flex flex-col gap-1 p-2">
                    <div className="flex items-center justify-between gap-1">
                      <label
                        className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0"
                        title={t('filesPanel.enabledTooltip')}
                      >
                        <input
                          type="checkbox"
                          checked={file.enabled !== false}
                          onChange={(e) => onFileToggle(idx, e.target.checked)}
                          className="checkbox shrink-0"
                          aria-label={t('filesPanel.enabledAria', { name: file.name })}
                        />
                        {file.isParsing ? (
                          <Loader2 size={14} className="text-blue-600 animate-spin shrink-0" aria-hidden="true" />
                        ) : file.needsReupload ? (
                          <AlertCircle size={14} className="text-amber-500 shrink-0" aria-hidden="true" title={t('fileList.needsReupload')} />
                        ) : (
                          <FileText
                            size={14}
                            className={`shrink-0 ${file.enabled !== false ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'}`}
                            aria-hidden="true"
                          />
                        )}
                        <span
                          className={`text-xs font-medium truncate ${file.enabled !== false ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}
                          title={file.needsReupload ? t('fileList.needsReuploadTip') : file.name}
                        >
                          {file.name}
                          {file.isParsing && <span className="text-blue-500 ml-1">({t('fileList.parsing')})</span>}
                        </span>
                      </label>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => onFileConfig(file)}
                          className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                          title={t('fileList.config', { name: file.name })}
                          aria-label={t('fileList.config', { name: file.name })}
                          disabled={file.enabled === false}
                        >
                          <Settings size={13} aria-hidden="true" />
                        </button>
                        <button
                          onClick={() => onFileRemove(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                          title={t('fileList.delete', { name: file.name })}
                          aria-label={t('fileList.delete', { name: file.name })}
                        >
                          <X size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    {file.isParsing && typeof file.progress === 'number' && (
                      <ProgressBar value={file.progress} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SmoothCollapse>
    </section>
  );
}
