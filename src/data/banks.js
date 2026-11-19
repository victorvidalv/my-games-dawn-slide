/**
 * Bancos de tableros (levels.json ≈ 90 KB y special.json ≈ 500 KB): se cargan aparte, después de pintar el menú, para que el juego
 * arranque mucho más rápido. `loadBanks()` devuelve siempre la misma promesa; `warmBanks()` los pide en un momento libre.
 */
let loading = null;
export const loadBanks = () =>
  (loading ||= Promise.all([import('./levels.json'), import('./special.json')]).then(([levels, special]) => ({
    levelBank: levels.default,
    specialBank: special.default,
  })));
export const warmBanks = () =>
  (window.requestIdleCallback || ((f) => setTimeout(f, 600)))(() => {
    loadBanks();
  });
