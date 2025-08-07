import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest configuration for unit testing

// https://vite.dev/config/
export default defineConfig({
  // Use a relative base path for GitHub Pages.
  // Switch to absolute path when deploying on Vercel.
  base: process.env.VERCEL ? '/' : './',
  optimizeDeps: {
    include: ['lz-string'],
  },
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
