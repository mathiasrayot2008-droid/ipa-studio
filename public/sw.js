/* Service worker d'IPA Studio : permet d'ouvrir l'application sans réseau après une première visite.
 *  - fichiers versionnés par le build (assets/*) et jars Java : cache d'abord (le nom change quand le contenu change) ;
 *  - pages, banque d'exercices et manifeste : réseau d'abord, copie en cache si hors ligne ;
 *  - tout ce qui vient d'un autre site (CDN de CheerpJ, Firebase…) n'est JAMAIS intercepté.
 * Limite assumée : l'exécution de Java charge le runtime CheerpJ depuis le CDN de Leaning Technologies ;
 * hors ligne, les exercices se consultent mais ne s'exécutent que si ce runtime est déjà dans le cache du navigateur. */
/* ignoreVary : le serveur répond « Vary: Origin » et les scripts de module envoient un en-tête Origin que la mise en cache à l'installation n'avait pas. */
const VERSION = 'ipa-sw-1';
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;
const base = new URL('./', self.location.href).pathname;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await shell.addAll([base, `${base}favicon.svg`, `${base}manifest.webmanifest`, `${base}runner.html`]);
    // Tous les fichiers du build (liste écrite par vite.config.ts) : l'application entière s'ouvre ensuite sans réseau.
    try {
      const list = await (await fetch(`${base}asset-manifest.json`, { cache: 'no-store' })).json();
      const stat = await caches.open(STATIC);
      await Promise.all(list.files.map((f) => stat.add(`${base}${f}`).catch(() => undefined)));
    } catch { /* manifeste absent : le cache se remplira au fil de la navigation */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const networkFirst = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  try { const res = await fetch(req); if (res.ok) void cache.put(req, res.clone()); return res; }
  catch (err) { const hit = await cache.match(req, { ignoreVary: true }); if (hit) return hit; throw err; }
};
const cacheFirst = async (req, cacheName) => {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req, { ignoreVary: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.status === 200) void cache.put(req, res.clone());
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                       // jamais d'interception d'un autre site
  if (req.headers.has('range')) return;                                  // requêtes partielles : laissées au navigateur
  const path = url.pathname;
  // runner.html est une page à part (iframe qui héberge Java) : elle ne doit JAMAIS être remplacée par le shell de l'appli.
  if (path === `${base}runner.html`) { e.respondWith(networkFirst(req, SHELL)); return; }
  // Navigation vers l'appli (page d'accueil ou index.html) : réseau d'abord, copie du shell si hors ligne.
  if (req.mode === 'navigate') {
    if (path === base || path === `${base}index.html`) e.respondWith(networkFirst(new Request(base), SHELL));
    return;
  }
  if (path.startsWith(`${base}assets/`) || path.startsWith(`${base}java/`)) { e.respondWith(cacheFirst(req, STATIC)); return; }
  if (path.startsWith(`${base}bank/`) || path === `${base}manifest.webmanifest`) { e.respondWith(networkFirst(req, STATIC)); return; }
});
