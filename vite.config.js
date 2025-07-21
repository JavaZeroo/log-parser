import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest configuration for unit testing

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov']
    }
  }
})
