import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest configuration for unit testing

// https://vite.dev/config/
export default defineConfig({
  // Use a relative base path so the built site works
  // when deployed to subfolders such as PR previews.
  // This still works for the main site hosted at the
  // repository root.
  base: './',
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
