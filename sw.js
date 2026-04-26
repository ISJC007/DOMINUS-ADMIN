const CACHE_NAME = 'DOMI-ADMIN-2.1.1'; 

// 🚩 Solo archivos LOCALES en el arranque para asegurar la instalación
const ASSETS = [
  './', 
  'index.html',
  'manifest.json',
  'DA-STYLES/STYLES.css',
  'DA-JS/DA-Cloud.js',
  'DA-JS/DA-Core.js',
  'DA-IMG/icon-192.png',
  'DA-IMG/icon-512.png',
  'DA-AUDIO/notificacion.mp3'
];

// 1. INSTALACIÓN
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('DOMI Admin: Sincronizando Mando Central...');
      // Usamos map para que si uno falla, no mate a los demás
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn(`Pendiente: ${url}`)))
      );
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN (Limpieza de memorias antiguas)
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  // 🚩 CRÍTICO: Toma el control de la app inmediatamente
  self.clients.claim();
});

// 3. FETCH (Estrategia: Cache First, then Network)
self.addEventListener('fetch', e => {
  // Solo manejamos peticiones GET (Firebase usa otros métodos que no se cachean)
  if (e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(response => {
      // Si está en caché, lo devolvemos
      if (response) return response;

      // Si no, lo buscamos en la red
      return fetch(e.request).then(networkResponse => {
        // Opcional: Podrías guardar dinámicamente nuevos recursos aquí
        return networkResponse;
      }).catch(() => {
        // Si no hay red ni caché, y es una página, podrías devolver index.html
        if (e.request.mode === 'navigate') {
          return caches.match('index.html');
        }
        console.log("☁️ DOMI Admin: Recurso no disponible offline.");
      });
    })
  );
});