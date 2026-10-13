import { defineConfig } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['favicon-browser.png', 'favicon-app.png', 'horizontal-logo.png', 'vertical-logo.png'],
      manifest: {
        name: 'HarvestWise',
        short_name: 'HarvestWise',
        description: 'Mobile-first AgriTech platform for farmers and agricultural trading',
        theme_color: '#245501',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'en',
        icons: [
          {
            src: '/favicon-app.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon-app.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/favicon-app.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        // Runtime caching for API responses — enables offline-first for farmers
        runtimeCaching: [
          {
            // Authenticated identity must never come from a service-worker
            // cache. Two reasons, the second being the reason this rule has to
            // come first (workbox matches routes in registration order):
            //
            //  1. Correctness. `/auth/me` is what carries
            //     `profile_picture_path` into AuthContext, and every avatar in
            //     the app reads it from there. NetworkFirst falls back to the
            //     cached copy once a request exceeds `networkTimeoutSeconds`,
            //     so a save-then-navigate could hand back the *pre-save*
            //     response and silently revert the change on screen.
            //  2. Isolation. The cache key is the URL, with no notion of who
            //     is signed in, and entries live 7 days. On a shared handset —
            //     the case AuthContext already guards against for tokens — user
            //     A's cached identity, email, and role could be served to user
            //     B during a slow request.
            //
            // Offline is unaffected: AuthContext restores a cached session from
            // IndexedDB (HARVESTWISE_USER_CACHE_V1) when /auth/me is
            // unreachable, which is the intended offline path, not this cache.
            urlPattern: /\/api\/v1\/auth\//i,
            handler: 'NetworkOnly',
          },
          {
            // Cache all other API GET responses with NetworkFirst strategy
            // (try network, fall back to cache when offline)
            // Match any origin with /api/v1/ path — works for localhost, production domains, etc.
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'harvestwise-api-cache',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  esbuild: {
    sourcemap: false,
  },
  optimizeDeps: {
    esbuildOptions: {
      sourcemap: false,
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // The DFTC entry suites need 7s+ of wall clock once all 40+ files run in
    // parallel, so vitest's 5s default killed them on a loaded machine. This is
    // headroom for slow rendering, not a relaxation of any assertion.
    testTimeout: 15000,
  },
})
