import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { FileUpload } from './components/FileUpload';
import { FilesPanel } from './components/FilesPanel.jsx';
import { RegexControls } from './components/RegexControls';
import { FileList } from './components/FileList';
import ChartContainer from './components/ChartContainer';
import { ComparisonControls } from './components/ComparisonControls';
import { FileConfigModal } from './components/FileConfigModal';
import { ThemeToggle } from './components/ThemeToggle';
import { Header } from './components/Header';
import { AnnotationsPanel } from './components/AnnotationsPanel.jsx';
import { AnomaliesPanel } from './components/AnomaliesPanel.jsx';
import { CollapsibleCardHeader } from './components/CollapsibleCardHeader.jsx';
import { SmoothCollapse } from './components/SmoothCollapse.jsx';
import { ShortcutHelp } from './components/ShortcutHelp.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { ExportMenu } from './components/ExportMenu.jsx';
import { useCollapsedSection } from './utils/useCollapsedSection.js';
import { useKeyboardShortcuts } from './utils/useKeyboardShortcuts.js';
import { PanelLeftClose, PanelLeftOpen, HelpCircle, Settings as SettingsIcon, Github, FileBarChart, Copy, Download } from 'lucide-react';
import { mergeFilesWithReplacement } from './utils/mergeFiles.js';
import { useToast } from './components/ToastContext.jsx';
import { loadFiles as loadFilesFromStorage, saveFiles as saveFilesToStorage, clearFiles as clearFilesInStorage } from './utils/fileStorage.js';
import { detectAnomalies } from './utils/anomalyDetection.js';

// Threshold for "large file" - files above this won't have content persisted
const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB of content

// Default global parsing configuration
export const DEFAULT_GLOBAL_PARSING_CONFIG = {
  metrics: [
    {
      name: 'Loss',
      mode: 'keyword',
      keyword: 'loss:',
      regex: 'loss:\\s*([\\d.eE+-]+)'
    },
    {
      name: 'Grad Norm',
      mode: 'keyword',
      keyword: 'norm:',
      regex: 'grad[\\s_]norm:\\s*([\\d.eE+-]+)'
    }
  ],
  useStepKeyword: false,
  stepKeyword: 'step:'
};

export const DEFAULT_CHART_CONFIG = {
  // Off by default — most logs are small enough to render every point, and
  // surprise downsampling can mislead users when investigating spikes.
  downsampleEnabled: false,
  downsampleThreshold: 2000,
  yAxisType: 'linear', // 'linear' | 'log'
  smoothing: 'none',   // 'none' | 'ma' | 'ema'
  smoothingWindow: 10,
  showStats: false,
  chartType: 'line',   // 'line' | 'scatter' | 'bar'
  combinedView: false,
  annotations: [],
  showAnomalies: true,
  // Experimental features — opt-in via Settings → Experimental. Hidden from the
  // default sidebar to keep new users focused on core analysis.
  experimentalAnomalies: false,
  experimentalAnnotations: false
};

function restoreFile(file) {
  return {
    ...file,
    enabled: file.enabled ?? true,
    isParsing: false,
    metricsData: file.metricsData || {},
    needsReupload: file.isLargeFile && !file.content
  };
}

function App() {
  const { t } = useTranslation();
  const toast = useToast();
  const toastRef = useRef(toast);
  const tRef = useRef(t);
  useEffect(() => { toastRef.current = toast; }, [toast]);
  useEffect(() => { tRef.current = t; }, [t]);
  // Sync init from legacy localStorage so the first paint matches prior behavior;
  // an async IndexedDB load below will replace this state if richer data is present.
  const [uploadedFiles, setUploadedFiles] = useState(() => {
    const stored = localStorage.getItem('uploadedFiles');
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored);
      return parsed.map(restoreFile);
    } catch {
      return [];
    }
  });
  const initialLoadDoneRef = useRef(false);

  // Global parsing configuration state
  const [globalParsingConfig, setGlobalParsingConfig] = useState(() => {
    const stored = localStorage.getItem('globalParsingConfig');
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_GLOBAL_PARSING_CONFIG));
  });

  const [chartConfig, setChartConfig] = useState(() => {
    const stored = localStorage.getItem('chartConfig');
    if (!stored) return { ...DEFAULT_CHART_CONFIG };
    try {
      return { ...DEFAULT_CHART_CONFIG, ...JSON.parse(stored) };
    } catch {
      return { ...DEFAULT_CHART_CONFIG };
    }
  });

  const [compareMode, setCompareMode] = useState('normal');
  const [multiFileMode, setMultiFileMode] = useState('baseline');
  const [baselineFile, setBaselineFile] = useState('');
  const [relativeBaseline, setRelativeBaseline] = useState(0.002);
  const [absoluteBaseline, setAbsoluteBaseline] = useState(0.005);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configFile, setConfigFile] = useState(null);
  const [globalDragOver, setGlobalDragOver] = useState(false);
  const [, setDragCounter] = useState(0);
  const [xRange, setXRange] = useState({ min: undefined, max: undefined });
  const [yRange, setYRange] = useState({ min: undefined, max: undefined });
  const [maxStep, setMaxStep] = useState(0);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [displayTab, setDisplayTab] = useState(() => {
    try {
      return localStorage.getItem('ui.displayTab') || 'chart';
    } catch {
      return 'chart';
    }
  });
  useEffect(() => {
    try { localStorage.setItem('ui.displayTab', displayTab); } catch { /* noop */ }
  }, [displayTab]);
  const [displayOpen, setDisplayOpen] = useCollapsedSection('display', true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Imperative handle to ChartContainer — lets the sidebar Header trigger
  // report export without lifting all chart state into App.
  const chartContainerRef = useRef(null);
  const savingDisabledRef = useRef(false);
  const enabledFiles = uploadedFiles.filter(file => file.enabled);
  const workerRef = useRef(null);

  // Pre-compute anomalies for every enabled file × metric. Memoized so this
  // only re-runs when metricsData changes (after worker completes a parse).
  const anomaliesByFile = useMemo(() => {
    const out = {};
    uploadedFiles.forEach(file => {
      if (!file.enabled || !file.metricsData) return;
      const entry = {};
      let hasAny = false;
      Object.keys(file.metricsData).forEach(metricName => {
        const events = detectAnomalies(file.metricsData[metricName]);
        if (events.length > 0) {
          entry[metricName] = events;
          hasAny = true;
        }
      });
      if (hasAny) out[file.id] = entry;
    });
    return out;
  }, [uploadedFiles]);

  // Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/logParser.worker.js', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { type, payload } = e.data;
      if (type === 'PARSE_PROGRESS') {
        setUploadedFiles(prev => prev.map(file => {
          if (file.id === payload.fileId) {
            return { ...file, progress: payload.progress };
          }
          return file;
        }));
      } else if (type === 'PARSE_COMPLETE') {
        setUploadedFiles(prev => prev.map(file => {
          if (file.id === payload.fileId) {
            return {
              ...file,
              metricsData: payload.metricsData,
              isParsing: false,
              progress: 1
            };
          }
          return file;
        }));
      } else if (type === 'PARSE_ERROR') {
        console.error('Worker parsing error:', payload.error);
        setUploadedFiles(prev => {
          const target = prev.find(f => f.id === payload.fileId);
          if (target) {
            toastRef.current.error(
              tRef.current('toast.parseError', { name: target.name, error: payload.error })
            );
          }
          return prev.map(file => {
            if (file.id === payload.fileId) {
              return {
                ...file,
                isParsing: false,
                progress: undefined,
                error: payload.error
              };
            }
            return file;
          });
        });
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (enabledFiles.length > 0) {
      if (!enabledFiles.find(f => f.name === baselineFile)) {
        setBaselineFile(enabledFiles[0].name);
      }
    } else {
      setBaselineFile('');
    }
  }, [enabledFiles, baselineFile]);

  // Async load from IndexedDB on mount. Overrides the sync localStorage init
  // if richer data is present (e.g. after migration or in IDB-capable browsers).
  useEffect(() => {
    let cancelled = false;
    loadFilesFromStorage().then(files => {
      if (cancelled) return;
      initialLoadDoneRef.current = true;
      if (Array.isArray(files) && files.length > 0) {
        setUploadedFiles(prev => {
          // Avoid overwriting if user already added files during async load
          if (prev.length > 0) return prev;
          return files.map(restoreFile);
        });
      }
    }).catch(() => {
      initialLoadDoneRef.current = true;
    });
    return () => { cancelled = true; };
  }, []);

  // Persist configuration to localStorage
  useEffect(() => {
    if (savingDisabledRef.current) return;
    localStorage.setItem('globalParsingConfig', JSON.stringify(globalParsingConfig));
  }, [globalParsingConfig]);

  useEffect(() => {
    if (savingDisabledRef.current) return;
    localStorage.setItem('chartConfig', JSON.stringify(chartConfig));
  }, [chartConfig]);

  useEffect(() => {
    if (savingDisabledRef.current) return;
    // Smart serialization: for large files, only store metricsData (not raw content).
    // Charts still render after refresh, but re-parsing requires re-upload.
    const serialized = uploadedFiles.map(({ id, name, enabled, content, config, metricsData }) => {
      const isLargeFile = content && content.length > LARGE_FILE_THRESHOLD;
      return {
        id,
        name,
        enabled,
        content: isLargeFile ? null : content,
        config,
        metricsData: isLargeFile ? metricsData : undefined,
        isLargeFile
      };
    });
    saveFilesToStorage(serialized).catch(err => {
      if (err && (err.name === 'QuotaExceededError' || err.code === 22)) {
        savingDisabledRef.current = true;
        console.warn('Storage quota exceeded; uploaded files will not be persisted.');
        toastRef.current.warning(t('toast.storageQuotaExceeded'));
      } else {
        console.warn('Failed to persist uploaded files', err);
      }
    });
  }, [uploadedFiles, t]);

  const handleFilesUploaded = useCallback((files) => {
    const filesWithDefaults = files.map(file => ({
      ...file,
      enabled: true,
      metricsData: {}, // Initialize empty
      isParsing: true, // Mark as parsing
      progress: 0,
      config: {
        // Use global parsing config as default values
        metrics: globalParsingConfig.metrics.map(m => ({ ...m })),
        dataRange: {
          start: 0,        // start from first data point by default
          end: undefined,  // default to last data point
          useRange: false  // keep for backward compatibility but disabled by default
        },
        useStepKeyword: globalParsingConfig.useStepKeyword,
        stepKeyword: globalParsingConfig.stepKeyword
      }
    }));

    setUploadedFiles(prev => mergeFilesWithReplacement(prev, filesWithDefaults));

    // Trigger worker for new files
    filesWithDefaults.forEach(file => {
      if (workerRef.current) {
        workerRef.current.postMessage({
          type: 'PARSE_FILE',
          payload: {
            fileId: file.id,
            content: file.content,
            config: file.config
          }
        });
      }
    });
  }, [globalParsingConfig]);

  // Global file processing function
  const processGlobalFiles = useCallback((files) => {
    const fileArray = Array.from(files);

    if (fileArray.length === 0) return;

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
      handleFilesUploaded(files);
    });
  }, [handleFilesUploaded]);

  const handleFileRemove = useCallback((index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleFileToggle = useCallback((index, enabled) => {
    setUploadedFiles(prev => prev.map((file, i) =>
      i === index ? { ...file, enabled } : file
    ));
  }, []);

  const handleFileConfig = useCallback((file) => {
    setConfigFile(file);
    setConfigModalOpen(true);
  }, []);

  const handleConfigSave = useCallback((fileId, config) => {
    setUploadedFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        // Trigger re-parsing
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'PARSE_FILE',
            payload: {
              fileId: file.id,
              content: file.content,
              config: config
            }
          });
        }
        return { ...file, config, isParsing: true, progress: 0 };
      }
      return file;
    }));
  }, []);

  const handleConfigClose = useCallback(() => {
    setConfigModalOpen(false);
    setConfigFile(null);
  }, []);

  // Handle global parsing config changes
  const handleGlobalParsingConfigChange = useCallback((newConfig) => {
    setGlobalParsingConfig(newConfig);

    // Sync parsing config to files that still use the global metrics
    setUploadedFiles(prev => {
      const newFiles = prev.map(file => {
        const fileConfig = file.config || {};
        const usesGlobalMetrics = !fileConfig.metrics ||
          JSON.stringify(fileConfig.metrics) === JSON.stringify(globalParsingConfig.metrics);

        if (usesGlobalMetrics || newConfig.useStepKeyword !== globalParsingConfig.useStepKeyword || newConfig.stepKeyword !== globalParsingConfig.stepKeyword) {
          const newFileConfig = {
            ...fileConfig,
            ...(usesGlobalMetrics && {
              metrics: newConfig.metrics.map(m => ({ ...m }))
            }),
            useStepKeyword: newConfig.useStepKeyword,
            stepKeyword: newConfig.stepKeyword
          };

          // Trigger re-parsing if config changed
          if (workerRef.current) {
            workerRef.current.postMessage({
              type: 'PARSE_FILE',
              payload: {
                fileId: file.id,
                content: file.content,
                config: newFileConfig
              }
            });
          }

          return {
            ...file,
            config: newFileConfig,
            isParsing: true,
            progress: 0
          };
        }
        return file;
      });
      return newFiles;
    });
  }, [globalParsingConfig]);

  // Global keyboard shortcuts. Memoized handlers via inline functions —
  // the hook reads latest bindings via ref, so closures stay fresh.
  useKeyboardShortcuts({
    '?': () => setHelpOpen(true),
    'Escape': () => {
      setHelpOpen(false);
      setSettingsOpen(false);
      setConfigModalOpen(false);
    },
    's': () => setSidebarVisible(v => !v),
    'c': () => setChartConfig(prev => ({ ...prev, combinedView: !prev.combinedView })),
    'mod+,': () => setSettingsOpen(s => !s),
    '1': () => setDisplayTab('chart'),
    '2': () => setDisplayTab('smoothing'),
    '3': () => setDisplayTab('stats')
  });

  // Clear all uploaded files (but keep parsing config + display preferences).
  // Used by the FilesPanel "Clear all" action.
  const handleClearAllFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // Reset configuration
  const handleResetConfig = useCallback(() => {
    savingDisabledRef.current = true;
    localStorage.removeItem('globalParsingConfig');
    localStorage.removeItem('chartConfig');
    clearFilesInStorage();
    setGlobalParsingConfig(JSON.parse(JSON.stringify(DEFAULT_GLOBAL_PARSING_CONFIG)));
    setChartConfig({ ...DEFAULT_CHART_CONFIG });
    setUploadedFiles([]);
    setTimeout(() => {
      savingDisabledRef.current = false;
    }, 0);
  }, []);

  // Global drag event handlers
  const handleGlobalDragEnter = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => prev + 1);

    // Check if files are included
    if (e.dataTransfer.types.includes('Files')) {
      setGlobalDragOver(true);
    }
  }, []);

  const handleGlobalDragOver = useCallback((e) => {
    e.preventDefault();
    // Set drag effect
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleGlobalDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setGlobalDragOver(false);
      }
      return newCount;
    });
  }, []);

  const handleGlobalDrop = useCallback((e) => {
    e.preventDefault();
    setGlobalDragOver(false);
    setDragCounter(0);

    if (e.dataTransfer.files.length > 0) {
      processGlobalFiles(e.dataTransfer.files);
    }
  }, [processGlobalFiles]);

  // Add global drag listeners
  useEffect(() => {
    const handleDragEnter = (e) => handleGlobalDragEnter(e);
    const handleDragOver = (e) => handleGlobalDragOver(e);
    const handleDragLeave = (e) => handleGlobalDragLeave(e);
    const handleDrop = (e) => handleGlobalDrop(e);

    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('drop', handleDrop);

    return () => {
      document.removeEventListener('dragenter', handleDragEnter);
      document.removeEventListener('dragover', handleDragOver);
      document.removeEventListener('dragleave', handleDragLeave);
      document.removeEventListener('drop', handleDrop);
    };
  }, [handleGlobalDragEnter, handleGlobalDragOver, handleGlobalDragLeave, handleGlobalDrop]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-700 relative page-fade-in">
      {/* Full-page drag overlay */}
      {globalDragOver && (
        <div
          className="fixed inset-0 bg-blue-600 dark:bg-blue-950 bg-opacity-95 z-50 flex items-center justify-center backdrop-blur-sm drag-overlay-fade-in"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 text-center max-w-md mx-4 border-4 border-dashed border-blue-300 dark:border-blue-700 drag-modal-scale-in"
          >
            <div className="mb-6">
              <div className="relative">
                <svg
                  className="mx-auto h-20 w-20 text-blue-600 drag-icon-bounce"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {t('globalDrag.release')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              <Trans i18nKey="globalDrag.support">
                Supports <span className="font-semibold text-blue-600">all text formats</span> files
              </Trans>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('globalDrag.tip')}
            </p>
          </div>
        </div>
      )}

      {/* Always mounted so we can cross-fade with sidebar collapse; opacity gets
          a delay when the sidebar is leaving so the button doesn't overlap the
          still-visible aside. */}
      <button
        onClick={() => setSidebarVisible(true)}
        className={`fixed top-3 left-3 z-40 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md text-gray-600 dark:text-gray-200 hover:text-gray-800 dark:hover:text-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          sidebarVisible
            ? 'opacity-0 pointer-events-none'
            : 'opacity-100 delay-200'
        }`}
        aria-label={t('showToolbar')}
        aria-hidden={sidebarVisible}
        tabIndex={sidebarVisible ? -1 : 0}
      >
        <PanelLeftOpen size={20} aria-hidden="true" />
      </button>

      <div className="w-full px-3 py-3">

        <main
          id="main-content"
          className="flex flex-col xl:grid transition-[grid-template-columns,gap] duration-[320ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            // Synchronous layout shift: sidebar track and gap animate together
            // with the same timing as the chart area's implicit re-fill, so
            // both halves of the screen settle in one motion.
            gridTemplateColumns: sidebarVisible ? '22rem minmax(0, 1fr)' : '0rem minmax(0, 1fr)',
            columnGap: sidebarVisible ? '0.75rem' : '0',
            rowGap: '0.75rem'
          }}
          role="main"
        >
            <aside
              className={`sidebar-stagger overflow-hidden transition-opacity duration-[260ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
                sidebarVisible
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none xl:visible invisible xl:h-auto h-0'
              }`}
              role="complementary"
              aria-label={t('sidebar.controlPanel')}
              aria-hidden={!sidebarVisible}
            >
            <div className="space-y-3 xl:w-[22rem] w-full">
              {/* Header info — 2-row compact layout. Brand on top, utility icons on
                  the right of row 2 so the title row is purely brand-focused. */}
              <div className="card">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900 rounded-md shrink-0">
                      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h1 className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-500 to-indigo-600 animate-gradient-slow truncate whitespace-nowrap">
                      Log Analyzer
                    </h1>
                  </div>
                  <button
                    onClick={() => setSidebarVisible(false)}
                    className="p-1 text-gray-400 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded shrink-0"
                    aria-label={t('hideToolbar')}
                    title={t('hideToolbar') + ' (s)'}
                  >
                    <PanelLeftClose size={16} aria-hidden="true" />
                  </button>
                </div>
                {/* Primary actions — icon + text so users don't have to guess
                    what the icons mean. */}
                <div className="flex items-center gap-1 mt-1">
                  <ExportMenu
                    icon={FileBarChart}
                    variant="ghost"
                    label={t('report.exportLabel')}
                    tooltip={t('report.exportLabel')}
                    items={[
                      { label: t('report.copy'), icon: Copy, onClick: () => chartContainerRef.current?.copyReport() },
                      { label: t('report.download'), icon: Download, onClick: () => chartContainerRef.current?.downloadReport() }
                    ]}
                  />
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                    aria-label={t('settings.aria')}
                    title={t('settings.aria') + ' (Ctrl+,)'}
                  >
                    <SettingsIcon size={13} aria-hidden="true" />
                    <span>{t('header.settings')}</span>
                  </button>
                  <button
                    onClick={() => setHelpOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                    aria-label={t('shortcuts.aria')}
                    title={t('shortcuts.aria') + ' (?)'}
                  >
                    <HelpCircle size={13} aria-hidden="true" />
                    <span>{t('header.shortcuts')}</span>
                  </button>
                </div>

                {/* Preferences — language toggle (already labeled), theme cycle
                    with label, GitHub link with text. */}
                <div className="flex items-center gap-1 mt-1">
                  <Header />
                  <ThemeToggle showLabel />
                  <a
                    href="https://github.com/JavaZeroo/log-parser"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                    aria-label={t('github.aria')}
                    title="GitHub"
                  >
                    <Github size={13} aria-hidden="true" />
                    <span>GitHub</span>
                  </a>
                </div>
              </div>

              <FilesPanel
                files={uploadedFiles}
                onFilesUploaded={handleFilesUploaded}
                onFileRemove={handleFileRemove}
                onFileToggle={handleFileToggle}
                onFileConfig={handleFileConfig}
                onClearAll={handleClearAllFiles}
                collapseId="files"
              />

              <RegexControls
                globalParsingConfig={globalParsingConfig}
                onGlobalParsingConfigChange={handleGlobalParsingConfigChange}
                uploadedFiles={uploadedFiles}
                xRange={xRange}
                onXRangeChange={setXRange}
                yRange={yRange}
                onYRangeChange={setYRange}
                maxStep={maxStep}
                collapseId="regex"
              />

              {chartConfig.experimentalAnnotations && (
                <AnnotationsPanel
                  annotations={chartConfig.annotations || []}
                  onAdd={(a) => setChartConfig(prev => ({ ...prev, annotations: [...(prev.annotations || []), a] }))}
                  onRemove={(id) => setChartConfig(prev => ({ ...prev, annotations: (prev.annotations || []).filter(x => x.id !== id) }))}
                  collapseId="annotations"
                />
              )}

              {chartConfig.experimentalAnomalies && (
                <AnomaliesPanel
                  anomaliesByFile={anomaliesByFile}
                  files={uploadedFiles}
                  collapseId="anomalies"
                />
              )}

              {enabledFiles.length >= 2 && (
                <ComparisonControls
                  compareMode={compareMode}
                  onCompareModeChange={setCompareMode}
                  files={enabledFiles}
                  baseline={baselineFile}
                  onBaselineChange={setBaselineFile}
                  multiFileMode={multiFileMode}
                  onMultiFileModeChange={setMultiFileMode}
                  collapseId="comparison"
                />
              )}

              <section className="card" aria-labelledby="display-options-heading">
                <CollapsibleCardHeader
                  title={t('display.options')}
                  titleId="display-options-heading"
                  collapsible
                  open={displayOpen}
                  onToggle={() => setDisplayOpen(o => !o)}
                />
                <SmoothCollapse open={displayOpen}>
                  <div className="mt-2">
                    {/* Tab strip */}
                    <div className="flex flex-wrap gap-1 mb-3 -mx-0.5" role="tablist" aria-label={t('display.options')}>
                      {[
                        { id: 'chart', label: t('display.tabChart') },
                        { id: 'smoothing', label: t('display.tabSmoothing') },
                        { id: 'stats', label: t('display.tabStats') }
                      ].map(tab => {
                        const active = displayTab === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setDisplayTab(tab.id)}
                            className={`px-2 py-1 text-xs rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              active
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tab panels */}
                    {displayTab === 'chart' && (
                      <div className="space-y-2 tab-fade" role="tabpanel">
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1" htmlFor="chart-type">
                            {t('display.chartTypeLabel')}
                          </label>
                          <select
                            id="chart-type"
                            value={chartConfig.chartType}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, chartType: e.target.value }))}
                            className="input-field"
                          >
                            <option value="line">{t('display.chartTypeLine')}</option>
                            <option value="scatter">{t('display.chartTypeScatter')}</option>
                            <option value="bar">{t('display.chartTypeBar')}</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1" htmlFor="y-axis-type">
                            {t('display.yAxisType')}
                          </label>
                          <select
                            id="y-axis-type"
                            value={chartConfig.yAxisType}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, yAxisType: e.target.value }))}
                            className="input-field"
                          >
                            <option value="linear">{t('display.yAxisLinear')}</option>
                            <option value="log">{t('display.yAxisLog')}</option>
                          </select>
                        </div>
                        <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 checkbox"
                            checked={chartConfig.combinedView}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, combinedView: e.target.checked }))}
                          />
                          {t('display.combinedView')}
                        </label>
                        {chartConfig.experimentalAnomalies && (
                          <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              className="mr-2 checkbox"
                              checked={chartConfig.showAnomalies !== false}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, showAnomalies: e.target.checked }))}
                            />
                            {t('display.showAnomalies')}
                          </label>
                        )}
                      </div>
                    )}

                    {displayTab === 'smoothing' && (
                      <div className="space-y-2 tab-fade" role="tabpanel">
                        <select
                          value={chartConfig.smoothing}
                          onChange={(e) => setChartConfig(prev => ({ ...prev, smoothing: e.target.value }))}
                          className="input-field"
                          aria-label={t('display.smoothing')}
                        >
                          <option value="none">{t('display.smoothingNone')}</option>
                          <option value="ma">{t('display.smoothingMA')}</option>
                          <option value="ema">{t('display.smoothingEMA')}</option>
                        </select>
                        {chartConfig.smoothing !== 'none' && (
                          <div>
                            <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1" htmlFor="smoothing-window">
                              {t('display.smoothingWindow', { value: chartConfig.smoothingWindow })}
                            </label>
                            <input
                              id="smoothing-window"
                              type="range"
                              min="2"
                              max="100"
                              value={chartConfig.smoothingWindow}
                              onChange={(e) => setChartConfig(prev => ({ ...prev, smoothingWindow: parseInt(e.target.value, 10) || 10 }))}
                              className="w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {displayTab === 'stats' && (
                      <div className="space-y-2 tab-fade" role="tabpanel">
                        <label className="flex items-center text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            className="mr-2 checkbox"
                            checked={chartConfig.showStats}
                            onChange={(e) => setChartConfig(prev => ({ ...prev, showStats: e.target.checked }))}
                          />
                          {t('display.showStats')}
                        </label>
                      </div>
                    )}

                    {/* Performance + Baseline tabs moved to SettingsModal (Ctrl+,) */}
                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    >
                      <SettingsIcon size={11} aria-hidden="true" />
                      {t('display.openSettings')}
                    </button>
                  </div>
                </SmoothCollapse>
              </section>
            </div>
            </aside>

          <section
            className="min-w-0"
            role="region"
            aria-label={t('chart.area')}
          >
            <ChartContainer
              ref={chartContainerRef}
              files={uploadedFiles}
              metrics={globalParsingConfig.metrics}
              compareMode={compareMode}
              multiFileMode={multiFileMode}
              baselineFile={baselineFile}
              relativeBaseline={relativeBaseline}
              absoluteBaseline={absoluteBaseline}
              xRange={xRange}
              onXRangeChange={setXRange}
              yRange={yRange}
              onMaxStepChange={setMaxStep}
              downsampleEnabled={chartConfig.downsampleEnabled}
              downsampleThreshold={chartConfig.downsampleThreshold}
              yAxisType={chartConfig.yAxisType}
              smoothing={chartConfig.smoothing}
              smoothingWindow={chartConfig.smoothingWindow}
              showStats={chartConfig.showStats}
              chartType={chartConfig.chartType}
              combinedView={chartConfig.combinedView}
              annotations={chartConfig.experimentalAnnotations ? chartConfig.annotations : []}
              anomaliesByFile={chartConfig.experimentalAnomalies ? anomaliesByFile : {}}
              showAnomalies={chartConfig.experimentalAnomalies && chartConfig.showAnomalies !== false}
            />
          </section>
        </main>
      </div>

      <FileConfigModal
        file={configFile}
        isOpen={configModalOpen}
        onClose={handleConfigClose}
        onSave={handleConfigSave}
        globalParsingConfig={globalParsingConfig}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        chartConfig={chartConfig}
        onChartConfigChange={setChartConfig}
        relativeBaseline={relativeBaseline}
        onRelativeBaselineChange={setRelativeBaseline}
        absoluteBaseline={absoluteBaseline}
        onAbsoluteBaselineChange={setAbsoluteBaseline}
        onResetAll={() => {
          handleResetConfig();
          setSettingsOpen(false);
        }}
      />

      <ShortcutHelp
        isOpen={helpOpen}
        onClose={() => setHelpOpen(false)}
        groups={[
          {
            title: t('shortcuts.groupGeneral'),
            items: [
              { label: t('shortcuts.help'), key: '?' },
              { label: t('shortcuts.escape'), key: 'Escape' }
            ]
          },
          {
            title: t('shortcuts.groupView'),
            items: [
              { label: t('shortcuts.toggleSidebar'), key: 's' },
              { label: t('shortcuts.toggleCombined'), key: 'c' },
              { label: t('shortcuts.openSettings'), key: 'mod+,' }
            ]
          },
          {
            title: t('shortcuts.groupDisplay'),
            items: [
              { label: t('display.tabChart'), key: '1' },
              { label: t('display.tabSmoothing'), key: '2' },
              { label: t('display.tabStats'), key: '3' }
            ]
          }
        ]}
      />
    </div>
  );
}

export default App;
