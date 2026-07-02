import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          'image-gen': ['html2canvas'],
          vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (לא autoUpdate): גרסה חדשה "ממתינה" עד שהמשתמש לוחץ "רענן" בבאנר
      // (PWAUpdatePrompt) → updateServiceWorker(true). כך עדכונים גלויים ואמינים,
      // ומשתמש לא נתקע בשקט על בנדל ישן (שורש באג 2).
      registerType: 'prompt',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'robots.txt', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'משאוושה - מערכת הזמנות',
        short_name: 'משאוושה',
        description: 'מערכת הזמנות רכש מתקדמת',
        theme_color: '#802020',
        background_color: '#802020',
        display: 'standalone',
        orientation: 'portrait',
        dir: 'rtl',
        lang: 'he',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        // אין skipWaiting אוטומטי: ב-registerType 'prompt' המשתמש מפעיל את הדילוג דרך הבאנר
        // (updateServiceWorker(true)). skipWaiting:true היה מבטל את הבאנר (הגרסה החדשה הייתה
        // מתחלפת מיד בשקט). clientsClaim נשאר — כשה-SW החדש מופעל הוא תופס את החלונות הפתוחים.
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
})
