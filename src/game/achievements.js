/**
 * Personalizar: tablero, fichas, llave y atuendos. Cada objeto se desbloquea al hacer algo en el juego (UNLOCKS);
 * no hay puntos, logros que reclamar ni tienda. Los 113 logros siguen existiendo por dentro como registro de
 * acciones (ACHIEVEMENTS) porque viajan en el código QR de guardado.
 * Lógica pura (sin DOM).
 */
import { ACHIEVEMENTS } from './catalog/achievement-list.js';
import { DEFAULT_OUTFIT, OUTFITS } from './catalog/outfits.js';
import { DEFAULT_LOOK, LEGACY_REWARDS, REWARDS, REWARD_TYPES } from './catalog/rewards.js';
import { STATS, statsOf } from './stats.js';
import { PLAN } from './unlock-plan.js';

// El catálogo y las estadísticas se publican también desde aquí: es la puerta de entrada de Personalizar.
export * from './catalog/achievement-list.js';
export * from './catalog/outfits.js';
export * from './catalog/rewards.js';
export * from './stats.js';

export const rewardKey = (type, id) => `${type}:${id}`;
export const rewardById = (type, id) => REWARDS[type]?.find((r) => r.id === id) || null;

export const isDone = (a, stats) => (stats[a.stat] || 0) >= a.goal;

/**
 * Marca en `store.ach` los logros recién cumplidos y los devuelve.
 * Los logros ya no se ven ni se reclaman: son el registro interno de acciones (y viajan en el código QR de guardado).
 * Lo que el jugador ve es Personalizar: cada objeto se desbloquea solo con una acción (ver UNLOCKS).
 */
export function claimAchievements(store, now = Date.now()) {
  const stats = statsOf(store),
    got = (store.ach ||= {}),
    fresh = [];
  for (const a of ACHIEVEMENTS)
    if (!got[a.id] && isDone(a, stats)) {
      got[a.id] = now;
      fresh.push(a);
    }
  return fresh;
}

/* ───────────── Personalizar: desbloqueo por acciones ───────────── */

/** Categorías de Personalizar (en este orden). `outfit` = conjuntos de traje de los héroes. */
export const CUSTOM_TYPES = [
  'board',
  'pieces',
  'key',
  'card',
  'trail',
  'fx',
  'music',
  'cover',
  'bg',
  'aura',
  'ui',
  'outfit',
];

/**
 * Qué hay que hacer en el juego para desbloquear cada objeto. No hay puntos ni canje: al cumplir la acción,
 * el objeto queda tuyo (se anota en `shopOwned`). Las claves son `tipo:id`; los que no aparecen vienen de serie.
 * `stat` es una de las estadísticas de STATS; `goal` el valor a alcanzar.
 */
/**
 * Texto de la acción que pide cada estadística («Resuelve 30 tableros en Aventura»). Los textos llevan el número dentro:
 * las traducciones son plantillas con {n} (src/i18n/*-game.js), no una entrada por cada número.
 */
const UNLOCK_TEXT = {
  boardsSolved: (n) => (n === 1 ? 'Resuelve tu primer tablero en Aventura' : `Resuelve ${n} tableros en Aventura`),
  maxLevel: (n) => `Llega al nivel ${n} en Aventura`,
  hardLevel: (n) => `Llega al nivel ${n} en el camino Difícil`,
  expertLevel: (n) => `Llega al nivel ${n} en el camino Experto`,
  hardDone: () => 'Completa el camino Difícil',
  expertDone: () => 'Completa el camino Experto',
  paths: () => 'Completa los tres caminos',
  completed: (n) => (n === 1 ? 'Completa una aventura entera' : `Completa ${n} aventuras enteras`),
  heroes: (n) => (n >= 3 ? 'Juega una partida con cada héroe' : `Juega con ${n} héroes distintos`),
  heroWinLia: () => 'Completa una aventura con Lía',
  heroWinJean: () => 'Completa una aventura con Jean',
  heroWinVan: () => 'Completa una aventura con Juth',
  heroWinsCount: () => 'Completa una aventura con cada héroe',
  heroBoardsLia: (n) => `Resuelve ${n} tableros con Lía`,
  heroBoardsJean: (n) => `Resuelve ${n} tableros con Jean`,
  heroBoardsVan: (n) => `Resuelve ${n} tableros con Juth`,
  perfects: (n) => `Resuelve ${n} tableros en el mínimo de movimientos`,
  iceRock: (n) => `Resuelve ${n} tableros con rocas o hielo`,
  locks: (n) => `Resuelve ${n} tableros con candados`,
  heavyBoards: (n) => `Resuelve ${n} tableros con bloques pesados`,
  cleanCity: (n) => `Supera ${n} tramos sin usar pistas`,
  fateCards: (n) => `Elige ${n} cartas del destino`,
  fateSeenCount: (n) => `Elige alguna vez ${n} cartas del destino distintas`,
  pacts: (n) => `Elige ${n} Pactos del destino`,
  powersUsed: (n) => `Activa ${n} veces el poder de un héroe`,
  bestRunStreak: (n) => `Encadena una racha de ${n} tableros en una partida`,
  bestGrade: (n) =>
    n >= 5
      ? 'Completa una aventura con rango S+'
      : n === 4
        ? 'Completa una aventura con rango S o mejor'
        : 'Completa una aventura con rango A o mejor',
  dailySolved: (n) => (n === 1 ? 'Resuelve un reto diario' : `Resuelve ${n} retos diarios`),
  dailyGold: (n) => `Gana ${n} medallas de oro en retos diarios`,
  bestStreak: (n) => `Juega retos diarios ${n} días seguidos`,
  dailyKinds: (n) => (n >= 5 ? 'Resuelve los 5 tipos de reto diario' : `Resuelve ${n} tipos de reto diario`),
  masterSolved: (n) => `Resuelve ${n} retos diarios Todo junto`,
  challengeBoards: (n) => `Supera ${n} tableros en Desafío`,
  challengeBest: (n) => `Alcanza el nivel ${n} en cualquier ruta de Desafío`,
  challengeWonCount: (n) => (n >= 3 ? 'Completa las 3 rutas de Desafío' : `Completa ${n} rutas de Desafío`),
  maxPactsWin: (n) => `Completa una aventura llevando ${n} Pactos`,
  cleanRun: () => 'Completa una aventura sin usar ninguna pista',
  oathWin: () => 'Completa una aventura con el Pacto Juramento',
  relicsSeenCount: (n) => `Usa ${n} reliquias distintas`,
  challenge250Won: () => 'Completa el Desafío de 250 turnos',
};
export const unlockText = (stat, goal) => UNLOCK_TEXT[stat]?.(goal) || '';

/**
 * Qué hay que hacer en el juego para desbloquear cada objeto (clave `tipo:id`). Sale de PLAN (unlock-plan.js, generado por
 * scripts/plan-unlocks.mjs). Los que no aparecen vienen de serie. Cada uno pide una o varias condiciones (`reqs`), todas a la vez:
 * las legendarias piden tres (una de Aventura, otra de Desafío y otra de Retos diarios). `stat` es una de las STATS.
 */
export const UNLOCKS = Object.fromEntries(
  Object.entries(PLAN).flatMap(([type, items]) =>
    Object.entries(items).map(([id, list]) => {
      const reqs = list.map(([stat, goal]) => ({ stat, goal, text: unlockText(stat, goal) }));
      // `stat`, `goal` y `text` son los de la primera condición (para quien solo necesita una)
      return [rewardKey(type, id), { reqs, ...reqs[0] }];
    }),
  ),
);

export const unlockOf = (type, id) => UNLOCKS[rewardKey(type, id)] || null;

/** Avance hacia el desbloqueo de un objeto: { value, goal, done } (los de serie cuentan como hechos). */
export function unlockProgress(type, id, store = {}) {
  const u = unlockOf(type, id);
  if (!u) return { value: 1, goal: 1, done: true, reqs: [] };
  const reqs = u.reqs.map((r) => {
    const value = Math.min(r.goal, Number(STATS[r.stat]?.(store)) || 0);
    return { text: r.text, value, goal: r.goal, done: value >= r.goal };
  });
  const done = reqs.every((r) => r.done);
  if (reqs.length === 1) return { value: reqs[0].value, goal: reqs[0].goal, done, reqs };
  // Varias condiciones: el avance es la media de todas, en porcentaje
  const ratio = reqs.reduce((sum, r) => sum + r.value / r.goal, 0) / reqs.length;
  return { value: Math.round(ratio * 100), goal: 100, done, reqs };
}

/**
 * Cierra lo que quedó abierto con reglas de desbloqueo anteriores y todavía no se cumple con las actuales: los objetos nuevos de
 * Personalizar y los atuendos. Lo que ya existía antes (LEGACY_REWARDS, comprado con puntos) se conserva siempre.
 * Las estadísticas solo suben, así que lo ganado de verdad nunca se pierde. Devuelve true si cambió algo.
 */
export function revalidateUnlocks(store) {
  let changed = false;
  for (const key of Object.keys(store.shopOwned || {})) {
    const [type, id] = key.split(':');
    if (!CUSTOM_TYPES.includes(type) || LEGACY_REWARDS[type]?.includes(id) || !UNLOCKS[key]) continue;
    if (!unlockProgress(type, id, store).done) {
      delete store.shopOwned[key];
      changed = true;
    }
  }
  for (const key of Object.keys(store.outfitsOwned || {}))
    if (!unlockProgress('outfit', key, store).done) {
      delete store.outfitsOwned[key];
      changed = true;
    }
  return changed;
}

/** Desbloquea (y guarda en `shopOwned`) los objetos cuya acción ya está cumplida. Devuelve los nuevos. */
export function unlockRewards(store, now = Date.now()) {
  const owned = (store.shopOwned ||= {}),
    fresh = [];
  for (const type of CUSTOM_TYPES)
    for (const item of REWARDS[type] || []) {
      const key = rewardKey(type, item.id);
      if (owned[key] || !UNLOCKS[key] || !unlockProgress(type, item.id, store).done) continue;
      owned[key] = now;
      fresh.push({ type, item });
    }
  return [...fresh, ...unlockOutfits(store, now)];
}

const outfitKey = (hero, id) => `${hero}:${id}`;
export const outfitUnlocked = (store, hero, id) =>
  id === DEFAULT_OUTFIT[hero] || !!store?.outfitsOwned?.[outfitKey(hero, id)];

/** Desbloquea los atuendos cuya acción ya está cumplida. Devuelve los nuevos como { type: 'outfit', item }. */
export function unlockOutfits(store, now = Date.now()) {
  const owned = (store.outfitsOwned ||= {}),
    fresh = [];
  for (const [hero, list] of Object.entries(OUTFITS))
    for (const o of list.slice(1)) {
      const key = outfitKey(hero, o.id);
      if (owned[key] || !unlockProgress('outfit', key, store).done) continue;
      owned[key] = now;
      fresh.push({ type: 'outfit', hero, item: o });
    }
  return fresh;
}

/** Atuendo puesto por un héroe (`base` si no hay o aún no está desbloqueado). */
export function outfitOf(store = {}, hero) {
  const id = store.outfit?.[hero];
  return id && OUTFITS[hero]?.some((o) => o.id === id) && outfitUnlocked(store, hero, id) ? id : DEFAULT_OUTFIT[hero];
}

export function setOutfit(store, hero, id) {
  if (!OUTFITS[hero]?.some((o) => o.id === id) || !outfitUnlocked(store, hero, id)) return false;
  store.outfit = { ...store.outfit, [hero]: id };
  return true;
}

/** Imagen de un atuendo: `adv` cuerpo entero (aventura), `sel` busto y `act` pose (selección). */
export const outfitArt = (hero, id, pose) => `heroes/outfits/${hero}-${id}-${pose}.webp?v=3`;

export function rewardUnlocked(type, id, storeOrOwned = {}) {
  if (DEFAULT_LOOK[type] === id) return true;
  const owned = storeOrOwned?.shopOwned || storeOrOwned || {};
  return !!owned[rewardKey(type, id)];
}

export function lookOf(store = {}) {
  const look = { ...DEFAULT_LOOK };
  for (const type of REWARD_TYPES) {
    const id = store.look?.[type];
    if (id && REWARDS[type].some((r) => r.id === id) && rewardUnlocked(type, id, store)) look[type] = id;
  }
  return look;
}

export function setLook(store, type, id) {
  if (!REWARDS[type]?.some((r) => r.id === id) || !rewardUnlocked(type, id, store)) return false;
  store.look = { ...lookOf(store), [type]: id };
  return true;
}
