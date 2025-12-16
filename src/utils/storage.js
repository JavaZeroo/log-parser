/**
 * IndexedDB storage utility for persisting uploaded files and parsing config.
 * Replaces localStorage for large data storage without size limits.
 */

const DB_NAME = 'LogParserDB';
const DB_VERSION = 1;
const STORES = {
  FILES: 'uploadedFiles',
  CONFIG: 'globalConfig'
};

let dbPromise = null;

/**
 * Opens the IndexedDB database, creating object stores if needed.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Store for uploaded files (keyed by file id)
      if (!db.objectStoreNames.contains(STORES.FILES)) {
        db.createObjectStore(STORES.FILES, { keyPath: 'id' });
      }

      // Store for config (single record with key 'global')
      if (!db.objectStoreNames.contains(STORES.CONFIG)) {
        db.createObjectStore(STORES.CONFIG);
      }
    };
  });

  return dbPromise;
}

/**
 * Save all uploaded files to IndexedDB.
 * @param {Array} files - Array of file objects
 */
export async function saveFiles(files) {
  const db = await openDB();
  const tx = db.transaction(STORES.FILES, 'readwrite');
  const store = tx.objectStore(STORES.FILES);

  // Clear existing files
  store.clear();

  // Add all files
  for (const file of files) {
    // Store file without transient state (isParsing, error)
    const { isParsing: _isParsing, error: _error, ...fileData } = file;
    store.put(fileData);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load all uploaded files from IndexedDB.
 * @returns {Promise<Array>} Array of file objects
 */
export async function loadFiles() {
  const db = await openDB();
  const tx = db.transaction(STORES.FILES, 'readonly');
  const store = tx.objectStore(STORES.FILES);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const files = request.result.map(file => ({
        ...file,
        enabled: file.enabled ?? true,
        isParsing: false,
        metricsData: file.metricsData || {}
      }));
      resolve(files);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all uploaded files from IndexedDB.
 */
export async function clearFiles() {
  const db = await openDB();
  const tx = db.transaction(STORES.FILES, 'readwrite');
  const store = tx.objectStore(STORES.FILES);
  store.clear();

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Save global parsing config to IndexedDB.
 * @param {Object} config - Global parsing configuration
 */
export async function saveConfig(config) {
  const db = await openDB();
  const tx = db.transaction(STORES.CONFIG, 'readwrite');
  const store = tx.objectStore(STORES.CONFIG);
  store.put(config, 'global');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load global parsing config from IndexedDB.
 * @returns {Promise<Object|null>} Config object or null if not found
 */
export async function loadConfig() {
  const db = await openDB();
  const tx = db.transaction(STORES.CONFIG, 'readonly');
  const store = tx.objectStore(STORES.CONFIG);

  return new Promise((resolve, reject) => {
    const request = store.get('global');
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear global parsing config from IndexedDB.
 */
export async function clearConfig() {
  const db = await openDB();
  const tx = db.transaction(STORES.CONFIG, 'readwrite');
  const store = tx.objectStore(STORES.CONFIG);
  store.delete('global');

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clear all data from IndexedDB.
 */
export async function clearAll() {
  await Promise.all([clearFiles(), clearConfig()]);
}

/**
 * Migrate data from localStorage to IndexedDB (one-time migration).
 * @param {Object} defaultConfig - Default config to use if none exists
 * @returns {Promise<{files: Array, config: Object}>}
 */
export async function migrateFromLocalStorage(defaultConfig) {
  // Try to load from IndexedDB first
  const [existingFiles, existingConfig] = await Promise.all([
    loadFiles(),
    loadConfig()
  ]);

  // If IndexedDB already has data, use it
  if (existingFiles.length > 0 || existingConfig) {
    return {
      files: existingFiles,
      config: existingConfig || defaultConfig
    };
  }

  // Otherwise, try to migrate from localStorage
  let files = [];
  let config = defaultConfig;

  try {
    const storedFiles = localStorage.getItem('uploadedFiles');
    if (storedFiles) {
      const parsed = JSON.parse(storedFiles);
      files = parsed.map(file => ({
        ...file,
        enabled: file.enabled ?? true,
        isParsing: false,
        metricsData: file.metricsData || {}
      }));
    }

    const storedConfig = localStorage.getItem('globalParsingConfig');
    if (storedConfig) {
      config = JSON.parse(storedConfig);
    }

    // Save to IndexedDB
    if (files.length > 0) {
      await saveFiles(files);
    }
    if (storedConfig) {
      await saveConfig(config);
    }

    // Clean up localStorage
    localStorage.removeItem('uploadedFiles');
    localStorage.removeItem('globalParsingConfig');
  } catch (err) {
    console.warn('Migration from localStorage failed:', err);
  }

  return { files, config };
}
