const CACHE = 'panini2026-v5'
const ASSETS = [
  '/panini2026/',
  '/panini2026/index.html',
  '/panini2026/app.js',
  '/panini2026/styles.css',
  '/panini2026/favicon.svg',
  '/panini2026/manifest.json',
  '/panini2026/data/stickers.js',
  '/panini2026/firebase-config.js',
  '/panini2026/icon-192.png',
  '/panini2026/icon-512.png'
]

// Instalar: cachear todos los assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  )
})

// Activar: borrar caches viejas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch: cache-first, fallback a red
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE).then(cache => cache.put(e.request, clone))
        return res
      }).catch(() => caches.match('/panini2026/index.html'))
    })
  )
})
