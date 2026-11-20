/* Service worker: la app funciona sin conexión.
   vite-plugin-pwa inyecta la lista de archivos (con hash) en self.__WB_MANIFEST al compilar,
   así que no hay que subir ninguna versión a mano: cada build con cambios es una versión nueva. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

/* Los retratos de jefe se guardan al verlos por primera vez. La versión nueva de la caché
   permite que las partidas existentes descarguen los retratos rediseñados. */
registerRoute(
  ({ url }) => /\/jefes\/[^/]+\.(jpg|webp)$/.test(url.pathname),
  async ({ request }) => {
    const cache = await caches.open('jefes-v2');
    const hit = await cache.match(request);
    if (hit) return hit;
    const res = await fetch(request, { cache: 'reload' });
    if (res.ok) cache.put(request, res.clone());
    return res;
  },
);

/* La página pide activar la versión nueva cuando el usuario pulsa «Actualizar» */
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
