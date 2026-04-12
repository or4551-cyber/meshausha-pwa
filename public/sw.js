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

// ── Push Notifications ──────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch {}

  const title = data.title || 'Meshausha'
  const options = {
    body: data.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'meshausha-order',         // מחליף התראה קודמת (לא מצטבר)
    renotify: true,
    requireInteraction: false,
    data: data.data ?? {},
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// פתיחת האפליקציה בלחיצה על התראה
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/admin/dispatch'

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // אם האפליקציה כבר פתוחה — תתמקד בה ונווט
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus()
            if ('navigate' in client) client.navigate(targetUrl)
            return
          }
        }
        // אחרת — פתח חלון חדש
        if (clients.openWindow) return clients.openWindow(targetUrl)
      })
  )
})
