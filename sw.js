const CACHE = 'panini2026-v14'
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

// Instalar: cachear assets y activar inmediatamente
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())   // fuerza activación sin esperar que cierren las pestañas
  )
})

// Activar: borrar TODOS los cachés viejos y tomar control de clientes
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())  // tomar control de las pestañas abiertas de inmediato
  )
})

// Fetch: network-first para HTML/JS/CSS (siempre intenta red antes), cache para el resto
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  const isDynamic = /\.(js|css|html)(\?.*)?$/.test(url.pathname) || url.pathname.endsWith('/')

  if (isDynamic) {
    // Network-first: siempre intenta obtener versión fresca del servidor
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone()
            caches.open(CACHE).then(cache => cache.put(e.request, clone))
          }
          return res
        })
        .catch(() => caches.match(e.request).then(c => c || caches.match('/panini2026/index.html')))
    )
  } else {
    // Cache-first para imágenes y otros assets estáticos
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached
        return fetch(e.request).then(res => {
          if (res && res.status === 200 && res.type !== 'opaque') {
            const clone = res.clone()
            caches.open(CACHE).then(cache => cache.put(e.request, clone))
          }
          return res
        })
      })
    )
  }
})
