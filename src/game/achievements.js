/**
 * Logros y recompensas. Todo se declara aquí, en tres tablas (la interfaz está en src/ui/achievements.js):
 *   STATS        – cómo se lee cada estadística del guardado. Dos clases se guardan en `store.stats`: contadores (número que sube
 *                  con `bumpStat`) y colecciones (lista sin repetir que crece con `markStat`). Las demás se calculan con datos
 *                  que el juego ya guarda (récords de cada camino, retos diarios).
 *   ACHIEVEMENTS – cada logro: grupo, texto, estadística, meta y UNA recompensa cosmética.
 *   REWARDS      – las recompensas por tipo: music (música del menú), key (aspecto de la llave), pieces (diseño de las piezas)
 *                  y fx (celebración al resolver un tablero, con sus partículas en `burst`).
 * Para añadir un logro: si necesita una estadística nueva, añádela a COUNTERS/COLLECTIONS o a STATS (y llama a bumpStat/markStat
 * donde ocurra); después añade el logro y, si da una recompensa nueva, su entrada en REWARDS, su estilo en 33-daily.css y sus
 * textos en src/i18n/*-game.js. tests/daily.test.js comprueba que las tablas cuadran entre sí y con las traducciones.
 * Nada de esto cambia las reglas ni la dificultad. Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';

/** Recompensas: la primera de cada tipo es la de siempre y está disponible desde el principio. */
export const REWARDS = {
  music: [
    { id: 'menu', name: 'Crónicas de la llave roja' },
    { id: 'z0', name: 'Un corazón al sol' },
    { id: 'z1', name: 'Vals de las pequeñas velas' },
    { id: 'z2', name: 'Gotas sobre la arena' },
    { id: 'z3', name: 'Las hojas recuerdan' },
    { id: 'z4', name: 'Las horas prestadas' },
    { id: 'z5', name: 'Campanas de cristal' },
    { id: 'z6', name: 'Pétalos en el viento' },
    { id: 'z7', name: 'La fragua de los sueños' },
    { id: 'z8', name: 'Un puente entre estrellas' },
    { id: 'z9', name: 'El regreso del alba' },
    { id: 'boss', name: 'El guardián del umbral' },
  ],
  key: [
    { id: 'red', name: 'Llave roja' },
    { id: 'amber', name: 'Llave de ámbar' },
    { id: 'gold', name: 'Llave dorada' },
    { id: 'crystal', name: 'Llave de cristal' },
    { id: 'star', name: 'Llave de estrellas' },
    { id: 'obsidian', name: 'Llave de obsidiana' },
    { id: 'iron', name: 'Llave de hierro antiguo' },
    { id: 'emerald', name: 'Llave de esmeralda' },
  ],
  pieces: [
    { id: 'paint', name: 'Madera pintada' },
    { id: 'stone', name: 'Piedra tallada' },
    { id: 'glass', name: 'Vidrio de colores' },
    { id: 'night', name: 'Tinta nocturna' },
    { id: 'runic', name: 'Pergamino rúnico' },
    { id: 'oldgold', name: 'Oro viejo' },
  ],
  fx: [
    { id: 'none', name: 'Sin adornos' },
    { id: 'embers', name: 'Brasas', burst: { n: 26, colors: ['#ff9a3d', '#ffd24a', '#ff6a3d', '#fff0b8'], speed: 7 } },
    {
      id: 'sparks',
      name: 'Chispas doradas',
      burst: { n: 34, colors: ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], speed: 9 },
    },
    { id: 'petals', name: 'Pétalos', burst: { n: 30, colors: ['#ffb7d0', '#ff8fb8', '#ffe3ee', '#f7c6d9'], speed: 5 } },
    {
      id: 'stars',
      name: 'Lluvia de estrellas',
      burst: { n: 36, colors: ['#d7c3ff', '#8fd8ff', '#ffffff', '#ffe9ad'], speed: 8 },
    },
    { id: 'aurora', name: 'Aurora', burst: { n: 40, colors: ['#58f0c8', '#8fd8ff', '#b08cff', '#e6fff6'], speed: 6 } },
    {
      id: 'ink',
      name: 'Salpicadura de tinta',
      burst: { n: 28, colors: ['#150e0c', '#3a2a44', '#e0b04f', '#f3e5c8'], speed: 8 },
    },
    {
      id: 'fireworks',
      name: 'Fuegos artificiales',
      burst: { n: 60, colors: ['#ff5f8f', '#ffd24a', '#58d8c8', '#6cb6ff', '#ffffff'], speed: 11 },
    },
  ],
};
export const REWARD_TYPES = Object.keys(REWARDS);
export const DEFAULT_LOOK = { music: 'menu', key: 'red', pieces: 'paint', fx: 'none' };

/* ───────────── estadísticas ───────────── */

/** Contadores que guarda el juego (suben con `bumpStat`). */
export const COUNTERS = ['completed', 'perfects', 'mini5', 'iceRock', 'locks', 'bosses', 'cleanCity'];
/** Colecciones que guarda el juego (crecen con `markStat`): héroes jugados, caminos completados, minijuegos con 5 estrellas. */
export const COLLECTIONS = ['heroes', 'paths', 'mini5Kinds'];
const listOf = (store, name) => (Array.isArray(store.stats?.[name]) ? store.stats[name] : []);
/** Cada estadística y cómo se lee del guardado. */
export const STATS = {
  ...Object.fromEntries(COUNTERS.map((name) => [name, (store) => Number(store.stats?.[name]) || 0])),
  ...Object.fromEntries(COLLECTIONS.map((name) => [name, (store) => listOf(store, name).length])),
  maxLevel: (store) => maxLevelReached(store.paths),
  hardLevel: (store) => store.paths?.c50?.level || 0,
  expertDone: (store) => (listOf(store, 'paths').includes(75) ? 1 : 0),
  dailySolved: (store) => store.daily?.solved || 0,
  dailyGold: (store) => store.daily?.gold || 0,
  bestStreak: (store) => store.daily?.best || 0,
  masterSolved: (store) => store.daily?.by?.master || 0,
  dailyKinds: (store) => CHALLENGES.filter((c) => store.daily?.by?.[c.id]).length,
};
/** Estadísticas que miran los logros, sacadas del guardado. */
export const statsOf = (store = {}) =>
  Object.fromEntries(Object.entries(STATS).map(([k, read]) => [k, read(store || {})]));

/** Suma `by` a un contador. */
export function bumpStat(store, name, by = 1) {
  if (!COUNTERS.includes(name)) throw new Error(`unknown counter: ${name}`);
  const stats = (store.stats ||= {});
  stats[name] = (Number(stats[name]) || 0) + by;
}
/** Añade `key` a una colección. Devuelve true si es nuevo. */
export function markStat(store, name, key) {
  if (!COLLECTIONS.includes(name)) throw new Error(`unknown collection: ${name}`);
  const stats = (store.stats ||= {}),
    list = Array.isArray(stats[name]) ? stats[name] : (stats[name] = []);
  if (key == null || list.includes(key)) return false;
  list.push(key);
  return true;
}
/**
 * Contadores que suben al resolver un tablero de Aventura. `board`: el tablero (n, moves, opt, pieces, walls, doors, plan);
 * `run`: la partida (firstLevel, nivel en que empezó; helpAt, último nivel en que se usó una pista o se saltó un tablero).
 */
export function boardStats(board, run = {}) {
  const out = [],
    n = board.n;
  if (board.moves <= board.opt) out.push('perfects');
  if (board.walls?.length || board.pieces?.some((p) => p.kind === 'ice')) out.push('iceRock');
  if (board.doors?.length || board.pieces?.some((p) => p.kind === 'gate')) out.push('locks');
  if (board.plan?.boss) out.push('bosses');
  if (n % 10 === 0 && (run.firstLevel ?? Infinity) <= n - 9 && (run.helpAt || 0) < n - 9) out.push('cleanCity'); // sus 10 niveles, sin ayuda
  return out;
}

/* ───────────── logros ───────────── */

/** Grupos, en el orden en que se enseñan. */
export const GROUPS = [
  { id: 'adventure', name: 'Aventura' },
  { id: 'mastery', name: 'Maestría' },
  { id: 'daily', name: 'Retos diarios' },
];
/** `goal` y `stat` dan el progreso («12 / 25»); `reward` es [tipo, id]. Los ids no cambian nunca: son los que guarda el jugador. */
export const ACHIEVEMENTS = [
  // Aventura: llegar lejos, con todos los héroes y por todos los caminos
  {
    id: 'city1',
    group: 'adventure',
    name: 'Primer sello',
    desc: 'Llega al nivel 11 en Aventura',
    stat: 'maxLevel',
    goal: 11,
    reward: ['music', 'z0'],
  },
  {
    id: 'lv25',
    group: 'adventure',
    name: 'Viajero',
    desc: 'Llega al nivel 25 en Aventura',
    stat: 'maxLevel',
    goal: 25,
    reward: ['key', 'amber'],
  },
  {
    id: 'lv50',
    group: 'adventure',
    name: 'Medio camino',
    desc: 'Llega al nivel 50 en Aventura',
    stat: 'maxLevel',
    goal: 50,
    reward: ['music', 'z4'],
  },
  {
    id: 'lv75',
    group: 'adventure',
    name: 'Entre pétalos',
    desc: 'Llega al nivel 75 en Aventura',
    stat: 'maxLevel',
    goal: 75,
    reward: ['fx', 'petals'],
  },
  {
    id: 'lv100',
    group: 'adventure',
    name: 'El trono vacío',
    desc: 'Llega al nivel 100 en Aventura',
    stat: 'maxLevel',
    goal: 100,
    reward: ['key', 'gold'],
  },
  {
    id: 'done',
    group: 'adventure',
    name: 'Amanece en Thyes',
    desc: 'Completa un camino entero',
    stat: 'completed',
    goal: 1,
    reward: ['music', 'z9'],
  },
  {
    id: 'heroes',
    group: 'adventure',
    name: 'Tres almas',
    desc: 'Juega una partida con cada héroe',
    stat: 'heroes',
    goal: 3,
    reward: ['music', 'z1'],
  },
  {
    id: 'hard50',
    group: 'adventure',
    name: 'Sendero difícil',
    desc: 'Llega al nivel 50 en el camino Difícil',
    stat: 'hardLevel',
    goal: 50,
    reward: ['key', 'obsidian'],
  },
  {
    id: 'expert',
    group: 'adventure',
    name: 'Solo para expertos',
    desc: 'Completa el camino Experto',
    stat: 'expertDone',
    goal: 1,
    reward: ['fx', 'aurora'],
  },
  {
    id: 'paths3',
    group: 'adventure',
    name: 'Tres amaneceres',
    desc: 'Completa los tres caminos',
    stat: 'paths',
    goal: 3,
    reward: ['pieces', 'runic'],
  },
  // Maestría: jugar bien
  {
    id: 'perf10',
    group: 'mastery',
    name: 'Pulso firme',
    desc: 'Resuelve 10 tableros en el mínimo',
    stat: 'perfects',
    goal: 10,
    reward: ['fx', 'sparks'],
  },
  {
    id: 'perf25',
    group: 'mastery',
    name: 'Trazo limpio',
    desc: 'Resuelve 25 tableros en el mínimo',
    stat: 'perfects',
    goal: 25,
    reward: ['pieces', 'night'],
  },
  {
    id: 'perf50',
    group: 'mastery',
    name: 'Sin un paso de más',
    desc: 'Resuelve 50 tableros en el mínimo',
    stat: 'perfects',
    goal: 50,
    reward: ['key', 'crystal'],
  },
  {
    id: 'perf100',
    group: 'mastery',
    name: 'Perfección absoluta',
    desc: 'Resuelve 100 tableros en el mínimo',
    stat: 'perfects',
    goal: 100,
    reward: ['pieces', 'oldgold'],
  },
  {
    id: 'icerock',
    group: 'mastery',
    name: 'Rompehielos',
    desc: 'Resuelve 25 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 25,
    reward: ['music', 'z2'],
  },
  {
    id: 'locks',
    group: 'mastery',
    name: 'Cerrajero',
    desc: 'Resuelve 25 tableros con candados o portones',
    stat: 'locks',
    goal: 25,
    reward: ['key', 'iron'],
  },
  {
    id: 'bosses',
    group: 'mastery',
    name: 'Cazador de guardianes',
    desc: 'Vence a 5 jefes',
    stat: 'bosses',
    goal: 5,
    reward: ['music', 'z7'],
  },
  {
    id: 'clean',
    group: 'mastery',
    name: 'Sin ayuda',
    desc: 'Supera una ciudad entera sin pistas ni saltos',
    stat: 'cleanCity',
    goal: 1,
    reward: ['fx', 'ink'],
  },
  {
    id: 'mini1',
    group: 'mastery',
    name: 'Cinco estrellas',
    desc: 'Consigue 5 estrellas en un minijuego',
    stat: 'mini5',
    goal: 1,
    reward: ['fx', 'embers'],
  },
  {
    id: 'mini5',
    group: 'mastery',
    name: 'Manos de artista',
    desc: 'Consigue 5 estrellas en 5 minijuegos',
    stat: 'mini5',
    goal: 5,
    reward: ['music', 'z6'],
  },
  {
    id: 'mini9',
    group: 'mastery',
    name: 'Maestro artesano',
    desc: 'Consigue 5 estrellas en los 9 minijuegos',
    stat: 'mini5Kinds',
    goal: 9,
    reward: ['music', 'z3'],
  },
  // Retos diarios: volver cada día
  {
    id: 'day1',
    group: 'daily',
    name: 'Buenos días',
    desc: 'Resuelve tu primer reto diario',
    stat: 'dailySolved',
    goal: 1,
    reward: ['fx', 'stars'],
  },
  {
    id: 'day7',
    group: 'daily',
    name: 'Costumbre',
    desc: 'Resuelve 7 retos diarios',
    stat: 'dailySolved',
    goal: 7,
    reward: ['pieces', 'stone'],
  },
  {
    id: 'day100',
    group: 'daily',
    name: 'Cien amaneceres',
    desc: 'Resuelve 100 retos diarios',
    stat: 'dailySolved',
    goal: 100,
    reward: ['fx', 'fireworks'],
  },
  {
    id: 'kinds',
    group: 'daily',
    name: 'Coleccionista de retos',
    desc: 'Resuelve cada tipo de reto diario',
    stat: 'dailyKinds',
    goal: CHALLENGES.length,
    reward: ['key', 'emerald'],
  },
  {
    id: 'streak3',
    group: 'daily',
    name: 'Tres de tres',
    desc: 'Racha de 3 días',
    stat: 'bestStreak',
    goal: 3,
    reward: ['music', 'z5'],
  },
  {
    id: 'streak7',
    group: 'daily',
    name: 'Una semana',
    desc: 'Racha de 7 días',
    stat: 'bestStreak',
    goal: 7,
    reward: ['key', 'star'],
  },
  {
    id: 'streak30',
    group: 'daily',
    name: 'Un mes entero',
    desc: 'Racha de 30 días',
    stat: 'bestStreak',
    goal: 30,
    reward: ['music', 'z8'],
  },
  {
    id: 'gold10',
    group: 'daily',
    name: 'Oro puro',
    desc: 'Gana 10 medallas de oro',
    stat: 'dailyGold',
    goal: 10,
    reward: ['pieces', 'glass'],
  },
  {
    id: 'master',
    group: 'daily',
    name: 'Maestro del umbral',
    desc: 'Resuelve el reto Maestro',
    stat: 'masterSolved',
    goal: 1,
    reward: ['music', 'boss'],
  },
];
export const progressOf = (a, stats) => Math.min(a.goal, stats[a.stat] || 0);
export const isDone = (a, stats) => (stats[a.stat] || 0) >= a.goal;

/**
 * Marca en `store.ach` los logros recién cumplidos y los devuelve (para avisar al jugador). Un logro ganado no se pierde nunca,
 * aunque la estadística baje después (p. ej. al borrar récords).
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

/** ¿Está disponible esta recompensa? Las de serie siempre; las demás, cuando su logro está ganado. */
export function rewardUnlocked(type, id, ach = {}) {
  if (DEFAULT_LOOK[type] === id) return true;
  return ACHIEVEMENTS.some((a) => a.reward && a.reward[0] === type && a.reward[1] === id && ach[a.id]);
}
/** Logro que da una recompensa (para decir cómo se consigue). */
export const sourceOf = (type, id) =>
  ACHIEVEMENTS.find((a) => a.reward && a.reward[0] === type && a.reward[1] === id) || null;
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
