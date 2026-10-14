import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/same-sun/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false, // the glob below already precaches the icons
      manifest: {
        name: 'Same Sun',
        short_name: 'Same Sun',
        description: 'Grow food. Make energy. Share the same sun. A miniAgriPV game.',
        lang: 'en',
        start_url: '/same-sun/',
        scope: '/same-sun/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0B6B47',
        background_color: '#F4F6F2',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // cache every built file so the game works offline after the first visit
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,txt}']
      }
    })
  ],
  test: {
    include: ['src/**/*.test.ts']
  }
})
