// Service Worker — Meshausha PWA
const CACHE = 'meshausha-v1'

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

// Network-first: תמיד ינסה לקחת מהרשת, fallback לcache
self.addEventListener('fetch', (e) => {
  // דלג על בקשות ל-Netlify Functions ו-APIs חיצוניים
  if (
    e.request.url.includes('/.netlify/') ||
    e.request.url.includes('googleapis') ||
    e.request.url.includes('emailjs') ||
    e.request.method !== 'GET'
  ) {
    return
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // שמור בcache רק תגובות תקינות
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then((cache) => cache.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request))
  )
})
