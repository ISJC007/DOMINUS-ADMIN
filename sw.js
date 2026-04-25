const CACHE_NAME = 'DOMI-ADMIN-2.0.0'; 

const ASSETS = [
  './', 
  'index.html',
  'manifest.json',
  'DA-STYLES/STYLES.css',
  
  // --- LIBRERÍAS ---
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
  'https://www.gstatic.com/firebasejs/8.10.0/firebase-database.js',

  // --- TUS SCRIPTS (DA-) ---
  'DA-JS/DA-Cloud.js',
  'DA-JS/DA-Core.js',

  // --- RECURSOS VISUALES Y AUDIO ---
  'DA-IMG/icon-192.png',
  'DA-IMG/icon-512.png',
  'DA-AUDIO/notificacion.mp3' // Si tienes alguno para alertas
];

// 1. INSTALACIÓN (Tu método compatible)
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('DOMI Admin: Sincronizando Mando Central...');
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.error(`Fallo en: ${url}`, err)))
      );
    })
  );
  self.skipWaiting();
});

// 2. ACTIVACIÓN
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// 3. FETCH (Modo Offline para el Panel)
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => {
      if (response) return response;
      return fetch(e.request).catch(() => {
        console.log("☁️ DOMI Admin: Modo lectura offline.");
        return new Response(null, { status: 404, statusText: 'Offline' });
      });
    })
  );
});