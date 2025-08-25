import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vitest configuration for unit testing

// https://vite.dev/config/
export default defineConfig({
  // Use a relative base path for GitHub Pages.
  // Switch to absolute path when deploying on Vercel.
  base: process.env.VERCEL ? '/' : './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/App.jsx',
        'src/main.jsx',
        'src/components/RegexControls.jsx',
        'src/components/FileConfigModal.jsx'
      ]
    }
  }
})
