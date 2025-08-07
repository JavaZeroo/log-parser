import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergeFilesWithReplacement } from './utils/mergeFiles.js';

export const useStore = create(
  persist(
    (set, get) => ({
      // State
      uploadedFiles: [],
  globalParsingConfig: {
    metrics: [
      { name: 'Loss', mode: 'keyword', keyword: 'loss:', regex: 'loss:\\s*([\\d.eE+-]+)' },
      { name: 'Grad Norm', mode: 'keyword', keyword: 'norm:', regex: 'grad[\\s_]norm:\\s*([\\d.eE+-]+)' }
    ]
  },
  compareMode: 'normal',
  relativeBaseline: 0.002,
  absoluteBaseline: 0.005,
  configModalOpen: false,
  configFile: null,
  xRange: { min: undefined, max: undefined },
  maxStep: 0,
  sidebarVisible: true,

  // Actions
  handleFilesUploaded: (files) => {
    const { globalParsingConfig, uploadedFiles } = get();
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
    const existingFilesCount = uploadedFiles.length;

    const filesWithDefaults = files.map((file, index) => ({
      ...file,
      enabled: true,
      color: colors[(existingFilesCount + index) % colors.length],
      config: {
        metrics: globalParsingConfig.metrics.map(m => ({ ...m })),
        dataRange: { start: 0, end: undefined, useRange: false }
      }
    }));
    set(state => ({ uploadedFiles: mergeFilesWithReplacement(state.uploadedFiles, filesWithDefaults) }));
  },

  setFileColor: (fileId, color) => set(state => ({
    uploadedFiles: state.uploadedFiles.map(file =>
      file.id === fileId ? { ...file, color } : file
    )
  })),

  processGlobalFiles: (files) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Vite-specific worker instantiation
    const worker = new (require('./worker.js?worker').default)();

    worker.onmessage = (event) => {
      const processedFiles = event.data;
      if (processedFiles && processedFiles.length > 0) {
        get().handleFilesUploaded(processedFiles);
      }
      worker.terminate(); // Clean up the worker
    };

    worker.onerror = (error) => {
      console.error("Worker error:", error);
      worker.terminate();
    };

    worker.postMessage(fileArray);
  },

  handleFileRemove: (index) => set(state => ({
    uploadedFiles: state.uploadedFiles.filter((_, i) => i !== index)
  })),

  handleFileToggle: (index, enabled) => set(state => ({
    uploadedFiles: state.uploadedFiles.map((file, i) =>
      i === index ? { ...file, enabled } : file
    )
  })),

  handleFileConfig: (file) => set({ configFile: file, configModalOpen: true }),

  handleConfigSave: (fileId, config) => set(state => ({
    uploadedFiles: state.uploadedFiles.map(file =>
      file.id === fileId ? { ...file, config } : file
    )
  })),

  handleConfigClose: () => set({ configModalOpen: false, configFile: null }),

  handleGlobalParsingConfigChange: (newConfig) => set(state => ({
    globalParsingConfig: newConfig,
    uploadedFiles: state.uploadedFiles.map(file => ({
      ...file,
      config: {
        ...file.config,
        metrics: newConfig.metrics.map(m => ({ ...m }))
      }
    }))
  })),

  setCompareMode: (mode) => set({ compareMode: mode }),
  setRelativeBaseline: (value) => set({ relativeBaseline: value }),
  setAbsoluteBaseline: (value) => set({ absoluteBaseline: value }),
  setXRange: (range) => set({ xRange: range }),
  setMaxStep: (step) => set({ maxStep: step }),
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  smoothingEnabled: false,
  smoothingWindow: 10,
  setSmoothingEnabled: (enabled) => set({ smoothingEnabled: enabled }),
  setSmoothingWindow: (window) => set({ smoothingWindow: window }),
    }),
    {
      name: 'ml-log-analyzer-session', // name of the item in the storage (must be unique)
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !['configFile', 'configModalOpen', 'sidebarVisible', 'smoothingEnabled', 'smoothingWindow'].includes(key))
        ),
    }
  )
);
