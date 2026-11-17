/**
 * Logros y recompensas. Cada logro se cumple con una condición sobre las estadísticas guardadas (avance en Aventura, perfectos,
 * minijuegos, retos diarios) y desbloquea UNA recompensa cosmética que el jugador activa cuando quiera:
 *   music – la música del menú principal     key – el aspecto de la llave     pieces – el diseño de las piezas
 *   fx – la celebración al resolver un tablero
 * Nada de esto cambia las reglas ni la dificultad. Lógica pura (sin DOM): la interfaz está en src/ui/achievements.js.
 */
import { maxLevelReached } from './daily.js';

/** Recompensas: la primera de cada tipo es la de siempre y está disponible desde el principio. */
export const REWARDS = {
  music: [
    { id: 'menu', name: 'Crónicas de la llave roja' },
    { id: 'z0', name: 'Un corazón al sol' }, { id: 'z4', name: 'Las horas prestadas' }, { id: 'z6', name: 'Pétalos en el viento' },
    { id: 'z5', name: 'Campanas de cristal' }, { id: 'z8', name: 'Un puente entre estrellas' }, { id: 'z9', name: 'El regreso del alba' },
    { id: 'boss', name: 'El guardián del umbral' },
  ],
  key: [
    { id: 'red', name: 'Llave roja' }, { id: 'amber', name: 'Llave de ámbar' }, { id: 'gold', name: 'Llave dorada' },
    { id: 'crystal', name: 'Llave de cristal' }, { id: 'star', name: 'Llave de estrellas' },
  ],
  pieces: [
    { id: 'paint', name: 'Madera pintada' }, { id: 'stone', name: 'Piedra tallada' }, { id: 'glass', name: 'Vidrio de colores' }, { id: 'night', name: 'Tinta nocturna' },
  ],
  fx: [
    { id: 'none', name: 'Sin adornos' }, { id: 'embers', name: 'Brasas' }, { id: 'sparks', name: 'Chispas doradas' },
    { id: 'petals', name: 'Pétalos' }, { id: 'stars', name: 'Lluvia de estrellas' },
  ],
};
export const REWARD_TYPES = Object.keys(REWARDS);
export const DEFAULT_LOOK = { music: 'menu', key: 'red', pieces: 'paint', fx: 'none' };

/** `goal` y `stat` dan el progreso («12 / 25»); `reward` es [tipo, id]. */
export const ACHIEVEMENTS = [
  { id: 'city1', group: 'adventure', name: 'Primer sello', desc: 'Llega al nivel 11 en Aventura', stat: 'maxLevel', goal: 11, reward: ['music', 'z0'] },
  { id: 'lv25', group: 'adventure', name: 'Viajero', desc: 'Llega al nivel 25 en Aventura', stat: 'maxLevel', goal: 25, reward: ['key', 'amber'] },
  { id: 'lv50', group: 'adventure', name: 'Medio camino', desc: 'Llega al nivel 50 en Aventura', stat: 'maxLevel', goal: 50, reward: ['music', 'z4'] },
  { id: 'lv75', group: 'adventure', name: 'Entre pétalos', desc: 'Llega al nivel 75 en Aventura', stat: 'maxLevel', goal: 75, reward: ['fx', 'petals'] },
  { id: 'lv100', group: 'adventure', name: 'El trono vacío', desc: 'Llega al nivel 100 en Aventura', stat: 'maxLevel', goal: 100, reward: ['key', 'gold'] },
  { id: 'done', group: 'adventure', name: 'Amanece en Thyes', desc: 'Completa un camino entero', stat: 'completed', goal: 1, reward: ['music', 'z9'] },
  { id: 'perf10', group: 'adventure', name: 'Pulso firme', desc: 'Resuelve 10 tableros en el mínimo', stat: 'perfects', goal: 10, reward: ['fx', 'sparks'] },
  { id: 'perf25', group: 'adventure', name: 'Trazo limpio', desc: 'Resuelve 25 tableros en el mínimo', stat: 'perfects', goal: 25, reward: ['pieces', 'night'] },
  { id: 'perf50', group: 'adventure', name: 'Sin un paso de más', desc: 'Resuelve 50 tableros en el mínimo', stat: 'perfects', goal: 50, reward: ['key', 'crystal'] },
  { id: 'mini1', group: 'adventure', name: 'Cinco estrellas', desc: 'Consigue 5 estrellas en un minijuego', stat: 'mini5', goal: 1, reward: ['fx', 'embers'] },
  { id: 'mini5', group: 'adventure', name: 'Manos de artista', desc: 'Consigue 5 estrellas en 5 minijuegos', stat: 'mini5', goal: 5, reward: ['music', 'z6'] },
  { id: 'day1', group: 'daily', name: 'Buenos días', desc: 'Resuelve tu primer reto diario', stat: 'dailySolved', goal: 1, reward: ['fx', 'stars'] },
  { id: 'day7', group: 'daily', name: 'Costumbre', desc: 'Resuelve 7 retos diarios', stat: 'dailySolved', goal: 7, reward: ['pieces', 'stone'] },
  { id: 'streak3', group: 'daily', name: 'Tres de tres', desc: 'Racha de 3 días', stat: 'bestStreak', goal: 3, reward: ['music', 'z5'] },
  { id: 'streak7', group: 'daily', name: 'Una semana', desc: 'Racha de 7 días', stat: 'bestStreak', goal: 7, reward: ['key', 'star'] },
  { id: 'streak30', group: 'daily', name: 'Un mes entero', desc: 'Racha de 30 días', stat: 'bestStreak', goal: 30, reward: ['music', 'z8'] },
  { id: 'gold10', group: 'daily', name: 'Oro puro', desc: 'Gana 10 medallas de oro', stat: 'dailyGold', goal: 10, reward: ['pieces', 'glass'] },
  { id: 'master', group: 'daily', name: 'Maestro del umbral', desc: 'Resuelve el reto Maestro', stat: 'masterSolved', goal: 1, reward: ['music', 'boss'] },
];

/** Estadísticas que miran los logros, sacadas del guardado. */
export function statsOf(store = {}) {
  const paths = store.paths || {}, d = store.daily || {}, s = store.stats || {};
  return {
    maxLevel: maxLevelReached(paths),
    completed: s.completed || 0,
    perfects: s.perfects || 0,
    mini5: s.mini5 || 0,
    dailySolved: d.solved || 0,
    dailyGold: d.gold || 0,
    bestStreak: d.best || 0,
    masterSolved: d.by?.master || 0,
  };
}
export const progressOf = (a, stats) => Math.min(a.goal, stats[a.stat] || 0);
export const isDone = (a, stats) => (stats[a.stat] || 0) >= a.goal;

/**
 * Marca en `store.ach` los logros recién cumplidos y los devuelve (para avisar al jugador). Un logro ganado no se pierde nunca,
 * aunque la estadística baje después (p. ej. al borrar récords).
 */
export function claimAchievements(store, now = Date.now()) {
  const stats = statsOf(store), got = (store.ach ||= {}), fresh = [];
  for (const a of ACHIEVEMENTS) if (!got[a.id] && isDone(a, stats)) { got[a.id] = now; fresh.push(a); }
  return fresh;
}

/** ¿Está disponible esta recompensa? Las de serie siempre; las demás, cuando su logro está ganado. */
export function rewardUnlocked(type, id, ach = {}) {
  if (DEFAULT_LOOK[type] === id) return true;
  return ACHIEVEMENTS.some((a) => a.reward && a.reward[0] === type && a.reward[1] === id && ach[a.id]);
}
/** Logro que da una recompensa (para decir cómo se consigue). */
export const sourceOf = (type, id) => ACHIEVEMENTS.find((a) => a.reward && a.reward[0] === type && a.reward[1] === id) || null;
/** Aspecto activo, saneado: si algo guardado ya no existe o no está desbloqueado, vuelve al de serie. */
export function lookOf(store = {}) {
  const look = { ...DEFAULT_LOOK };
  for (const type of REWARD_TYPES) {
    const id = store.look?.[type];
    if (id && REWARDS[type].some((r) => r.id === id) && rewardUnlocked(type, id, store.ach)) look[type] = id;
  }
  return look;
}
/** Activa una recompensa desbloqueada. Devuelve true si se aplicó. */
export function setLook(store, type, id) {
  if (!REWARDS[type]?.some((r) => r.id === id) || !rewardUnlocked(type, id, store.ach)) return false;
  store.look = { ...lookOf(store), [type]: id };
  return true;
}
