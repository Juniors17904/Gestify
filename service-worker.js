// ===== SERVICE WORKER (PWA) =====

const CACHE_NAME = 'ctrl-negocio-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/style.css',
  '/css/dashboard.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/ui.js',
  '/js/inventario.js',
  '/js/ventas.js',
  '/js/caja.js',
  '/js/empleados.js',
  '/js/reportes.js',
  '/js/dashboard.js',
  '/js/pwa.js',
  '/manifest.json'
];

// Instalar y cachear archivos
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activar y limpiar caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia: Network first, fallback a cache
self.addEventListener('fetch', e => {
  // Solo cachear peticiones GET
  if (e.request.method !== 'GET') return;

  // No cachear peticiones a Supabase (datos en tiempo real)
  if (e.request.url.includes('supabase.co')) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
