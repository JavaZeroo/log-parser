import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Vitest configuration for unit testing

// https://vite.dev/config/
export default defineConfig({
  // Use a relative base path for GitHub Pages.
  // Switch to absolute path when deploying on Vercel.
  base: process.env.VERCEL ? '/' : './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'ML Log Analyzer',
        short_name: 'Log Analyzer',
        description: 'Analyze and visualize loss and gradient norm data from ML training logs',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        // Relative start_url so the manifest works under both GitHub Pages
        // (subpath) and Vercel (root) without rebuilding manifest.json.
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Precache app shell + fonts so the page boots fully offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff,ico,png}'],
        // Allow caching font files (largest assets are <100KB each).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Don't cache the worker bundle — it's tiny and rebuilds per deploy.
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
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
