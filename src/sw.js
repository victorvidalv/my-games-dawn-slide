/* Service worker: la app funciona sin conexión.
   vite-plugin-pwa inyecta la lista de archivos (con hash) en self.__WB_MANIFEST al compilar,
   así que no hay que subir ninguna versión a mano: cada build con cambios es una versión nueva. */
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

/* Ya no hay retratos de jefe: se borra la caché que los guardaba en las instalaciones antiguas. */
self.addEventListener('activate', (e) => e.waitUntil(caches.delete('jefes-v2')));

/* La página pide activar la versión nueva cuando el usuario pulsa «Actualizar» */
self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
