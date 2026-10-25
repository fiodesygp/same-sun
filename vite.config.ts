import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Node's process, declared here so the config needs no @types/node
declare const process: { env: Record<string, string | undefined> }

// Vercel serves the site at the domain root; GitHub Pages serves it under /same-sun/.
// Vercel sets VERCEL=1 during its builds. Everything below (assets, manifest, service worker,
// 404 page) follows this one value.
const base = process.env.VERCEL ? '/' : '/same-sun/'

/** 404.html for GitHub Pages: any unknown address goes back to the app (Vercel uses a rewrite). */
function notFoundPage(): Plugin {
  return {
    name: 'same-sun-404',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: '404.html',
        source: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Same Sun</title>
    <!-- Same Sun has one page. Any other address on the site goes back to it. -->
    <meta http-equiv="refresh" content="0; url=${base}" />
    <script>location.replace('${base}')</script>
  </head>
  <body>
    <p><a href="${base}">Open Same Sun</a></p>
  </body>
</html>
`
      })
    }
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    notFoundPage(),
    VitePWA({
      registerType: 'autoUpdate',
      includeManifestIcons: false, // the glob below already precaches the icons
      manifest: {
        name: 'Same Sun',
        short_name: 'Same Sun',
        description: 'Grow food. Make energy. Share the same sun. A miniAgriPV game.',
        lang: 'en',
        start_url: base,
        scope: base,
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
        globPatterns: ['**/*.{html,js,css,woff2,svg,png,txt}'],
        // 404.html only redirects to the app; no need to keep it offline. The 3D bench (about 240 KB
        // zipped) is left out too, so learners on limited data only fetch it if they open 3D
        globIgnores: ['**/404.html', '**/assets/Board3D-*.js', '**/assets/Frame3D-*.js', '**/assets/three3d-*.js', '**/photos/**'],
        // ...and once they have, it stays cached so 3D works offline after that
        runtimeCaching: [{
          urlPattern: ({ url }) => /\/assets\/(Board3D|Frame3D|three3d)-[^/]+\.js$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'samesun-3d', expiration: { maxEntries: 4 } }
        }, {
          // the part and material photos (about 1 MB in all) are fetched when a card first shows one
          urlPattern: ({ url }) => /\/photos\/(parts|materials)\/[^/]+\.jpg$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'samesun-photos', expiration: { maxEntries: 40 } }
        }]
      }
    })
  ],
  build: {
    // three.js and the shared 3D helpers go in one chunk named "three3d", used only by the lazy 3D
    // views (Power's bench, Structure's frame). It is left out of the precache and cached on first use.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // only the matched modules: React itself must stay in the main bundle
          includeDependenciesRecursively: false,
          groups: [{ name: 'three3d', test: /node_modules[\\/](three|@react-three|zustand|its-fine|suspend-react|react-use-measure)[\\/]|components[\\/]three[\\/](CameraRig|textures)/ }]
        }
      }
    }
  },
  test: {
    include: ['src/**/*.test.ts']
  }
})
