import { vi } from 'vitest';
import './src/i18n.js';

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock Worker
class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => { };
  }
  postMessage(msg) {
    this.onmessage({ data: msg });
  }
  terminate() { }
}

global.Worker = Worker;
