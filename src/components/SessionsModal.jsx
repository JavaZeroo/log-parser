import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, History, Link2, Trash2, FolderOpen, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { listSessions, deleteSession, clearSessions } from '../utils/sessionCache.js';
import { buildShareUrl } from '../utils/cacheUrl.js';
import { useToast } from './ToastContext.jsx';

function formatBytes(bytes) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}

// Cached analyses, Perfetto-style: every snapshot has a `local_cache_key` link
// that reopens it in this browser. Links are local by design — the modal says
// so, because a "link" users can't send to a colleague needs explaining once.
export function SessionsModal({ isOpen, onClose, currentKey, onOpenSession }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const closeBtnRef = useRef(null);

  const refresh = useCallback(() => {
    listSessions().then(setSessions).catch(() => setSessions([]));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    refresh();
    if (closeBtnRef.current) closeBtnRef.current.focus();
  }, [isOpen, refresh]);

  const copyLink = useCallback(async (key) => {
    const url = buildShareUrl(key);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('sessions.linkCopied'));
    } catch {
      toast.error(t('toast.clipboardUnsupported'));
    }
  }, [t, toast]);

  const handleDelete = useCallback(async (id) => {
    await deleteSession(id);
    refresh();
  }, [refresh]);

  const handleClearAll = useCallback(async () => {
    await clearSessions();
    refresh();
  }, [refresh]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 drag-overlay-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sessions-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col drag-modal-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <History size={18} className="text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <h2 id="sessions-modal-title" className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('sessions.title')}
            </h2>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={t('sessions.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          <p className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{t('sessions.hint')}</span>
          </p>

          {currentKey && (
            <div className="rounded-md border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 p-3">
              <div className="text-xs font-medium text-blue-900 dark:text-blue-200 mb-1.5">
                {t('sessions.currentLink')}
              </div>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={buildShareUrl(currentKey)}
                  onFocus={(e) => e.target.select()}
                  className="input-field flex-1 font-mono text-[11px] py-1"
                  aria-label={t('sessions.currentLink')}
                />
                <button
                  type="button"
                  onClick={() => copyLink(currentKey)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                >
                  <Link2 size={13} aria-hidden="true" />
                  {t('sessions.copyLink')}
                </button>
              </div>
            </div>
          )}

          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
              {t('sessions.empty')}
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.map(session => {
                const isCurrent = session.id === currentKey;
                return (
                  <li
                    key={session.id}
                    className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                      isCurrent
                        ? 'border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {session.name}
                        </span>
                        {isCurrent && (
                          <span className="shrink-0 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-600 text-white">
                            {t('sessions.current')}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 tabular-nums">
                        {t('sessions.meta', {
                          files: session.fileCount,
                          size: formatBytes(session.bytes),
                          time: new Date(session.updatedAt).toLocaleString(i18n.language)
                        })}
                        {session.truncated ? ` · ${t('sessions.truncated')}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => { onOpenSession(session.id); onClose(); }}
                        disabled={isCurrent}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={t('sessions.open')}
                        title={t('sessions.open')}
                      >
                        <FolderOpen size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyLink(session.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label={t('sessions.copyLink')}
                        title={t('sessions.copyLink')}
                      >
                        <Link2 size={15} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(session.id)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500"
                        aria-label={t('sessions.delete')}
                        title={t('sessions.delete')}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {sessions.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button
              type="button"
              onClick={handleClearAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <Trash2 size={13} aria-hidden="true" />
              {t('sessions.clearAll')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SessionsModal;
