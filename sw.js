// Service worker di Babbo Natale Segreto: rende l'app installabile e utilizzabile senza rete.
// Cambia VERSION quando modifichi icone o manifest, così i telefoni li riscaricano.
const VERSION = 'babbo-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('babbo-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Risorse esterne che servono anche offline: SDK di Firebase e font
const external = u =>
  (u.hostname === 'www.gstatic.com' && u.pathname.startsWith('/firebasejs/')) ||
  u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // La pagina: prima la rete, così ogni aggiornamento su GitHub arriva subito; senza rete, la copia salvata
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./', copy)); }
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }

  // Icone, manifest, SDK e font: prima la copia salvata
  if (url.href.startsWith(self.registration.scope) || external(url)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Tutto il resto (Firestore) passa direttamente dalla rete
});
