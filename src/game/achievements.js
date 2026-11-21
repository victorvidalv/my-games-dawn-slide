/**
 * Sistema de logros (100 logros: 25 simples, 50 medios y 25 difíciles) y pestaña Canjear (Tienda cosmética).
 * Cada logro cumplido queda listo para reclamar en la pantalla de Logros: al reclamarlo otorga puntos
 * acumulables que se canjean por bordes del tablero, fichas, llaves, celebraciones, melodías y portadas.
 * Reclamar logros también abre cofres de colección (puntos extra a los 5, 15, 30, 50, 75 y 100 logros).
 * Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';
import { survivalBestLevel, survivalCompletedCount, survivalWonFor } from './survival.js';

export const TIERS = {
  bronze: { id: 'bronze', name: 'Simple' },
  silver: { id: 'silver', name: 'Medio' },
  gold: { id: 'gold', name: 'Difícil' },
};

/**
 * Rareza de cada recompensa: marca el precio (y lo vistoso del diseño). Los diseños épicos y legendarios están animados.
 *   · común       20–45 pts   · se consigue en la primera sesión
 *   · rara        40–95 pts   · un par de logros medios
 *   · épica      80–190 pts   · animada o con brillo propio
 *   · legendaria 250–280 pts  · la joya de cada categoría (varios logros difíciles)
 */
export const RARITY = {
  common: { id: 'common', name: 'Común', note: 'Un cambio sencillo y elegante.' },
  rare: { id: 'rare', name: 'Rara', note: 'Materiales con más detalle y relieve.' },
  epic: { id: 'epic', name: 'Épica', note: 'Diseño animado con brillo propio.' },
  legendary: { id: 'legendary', name: 'Legendaria', note: 'La pieza más espectacular de su colección.' },
};
export const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'];

/**
 * Recompensas canjeables en Canjear: la primera de cada tipo es gratuita (de serie).
 * IMPORTANTE: el orden y los id de cada lista forman parte del formato de transferencia QR (v3): no reordenar ni quitar.
 * `anim: true` = el diseño se mueve en el tablero (se apaga en modo ligero y con «reducir movimiento»).
 */
export const REWARDS = {
  board: [
    { id: 'wood', name: 'Madera tallada', price: 0, rarity: 'common' },
    { id: 'slate', name: 'Pizarra nocturna', price: 30, rarity: 'common' },
    { id: 'amber', name: 'Ámbar solar', price: 35, rarity: 'common' },
    { id: 'marble', name: 'Mármol real', price: 65, rarity: 'rare' },
    { id: 'sapphire', name: 'Zafiro real', price: 75, rarity: 'rare' },
    { id: 'jade', name: 'Jade imperial', price: 45, rarity: 'common' },
    { id: 'crimson', name: 'Forja carmesí', price: 150, rarity: 'epic', anim: true },
    { id: 'ivory', name: 'Pergamino dorado', price: 90, rarity: 'rare' },
    { id: 'celestial', name: 'Observatorio astral', price: 280, rarity: 'legendary', anim: true },
    { id: 'obsidian', name: 'Obsidiana real', price: 190, rarity: 'epic', anim: true },
  ],
  pieces: [
    { id: 'paint', name: 'Madera pintada', price: 0, rarity: 'common' },
    { id: 'stone', name: 'Piedra tallada', price: 30, rarity: 'common' },
    { id: 'glass', name: 'Vidrio de colores', price: 40, rarity: 'common' },
    { id: 'night', name: 'Tinta nocturna', price: 75, rarity: 'rare' },
    { id: 'ceramic', name: 'Porcelana celeste', price: 65, rarity: 'rare' },
    { id: 'brass', name: 'Latón bruñido', price: 90, rarity: 'rare' },
    { id: 'runic', name: 'Pergamino rúnico', price: 150, rarity: 'epic', anim: true },
    { id: 'lacquer', name: 'Lacado imperial', price: 180, rarity: 'epic', anim: true },
    { id: 'oldgold', name: 'Oro viejo', price: 280, rarity: 'legendary', anim: true },
  ],
  key: [
    { id: 'red', name: 'Llave roja', price: 0, rarity: 'common' },
    { id: 'amber', name: 'Llave de ámbar', price: 25, rarity: 'common' },
    { id: 'iron', name: 'Llave de hierro antiguo', price: 30, rarity: 'common' },
    { id: 'emerald', name: 'Llave de esmeralda', price: 65, rarity: 'rare' },
    { id: 'sapphire', name: 'Llave de zafiro', price: 70, rarity: 'rare' },
    { id: 'rose', name: 'Llave de coral', price: 40, rarity: 'common' },
    { id: 'crystal', name: 'Llave de cristal', price: 90, rarity: 'rare' },
    { id: 'obsidian', name: 'Llave de obsidiana', price: 150, rarity: 'epic', anim: true },
    { id: 'star', name: 'Llave de estrellas', price: 190, rarity: 'epic', anim: true },
    { id: 'gold', name: 'Llave dorada', price: 280, rarity: 'legendary', anim: true },
  ],
  fx: [
    { id: 'none', name: 'Sin adornos', price: 0, rarity: 'common' },
    {
      id: 'embers',
      name: 'Brasas',
      price: 25,
      rarity: 'common',
      burst: { n: 26, colors: ['#ff9a3d', '#ffd24a', '#ff6a3d', '#fff0b8'], speed: 7 },
    },
    {
      id: 'sparks',
      name: 'Chispas doradas',
      price: 30,
      rarity: 'common',
      burst: { n: 34, colors: ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], speed: 9 },
    },
    {
      id: 'petals',
      name: 'Pétalos',
      price: 40,
      rarity: 'common',
      burst: { n: 30, colors: ['#ffb7d0', '#ff8fb8', '#ffe3ee', '#f7c6d9'], speed: 5 },
    },
    {
      id: 'ink',
      name: 'Salpicadura de tinta',
      price: 65,
      rarity: 'rare',
      burst: { n: 36, colors: ['#150e0c', '#3a2a44', '#e0b04f', '#f3e5c8'], speed: 8 },
    },
    {
      id: 'frost',
      name: 'Destello glaciar',
      price: 75,
      rarity: 'rare',
      burst: { n: 40, colors: ['#b8f2ff', '#5fd6ff', '#ffffff', '#8ab8ff'], speed: 7 },
    },
    {
      id: 'stars',
      name: 'Lluvia de estrellas',
      price: 90,
      rarity: 'rare',
      burst: { n: 44, colors: ['#d7c3ff', '#8fd8ff', '#ffffff', '#ffe9ad'], speed: 8 },
    },
    {
      id: 'aurora',
      name: 'Aurora',
      price: 150,
      rarity: 'epic',
      burst: { n: 44, colors: ['#58f0c8', '#8fd8ff', '#b08cff', '#e6fff6'], speed: 6 },
    },
    {
      id: 'prism',
      name: 'Prisma solar',
      price: 190,
      rarity: 'epic',
      burst: { n: 48, colors: ['#ff8a65', '#ffd54f', '#4dd0e1', '#ce93d8', '#fff8e1'], speed: 9 },
    },
    {
      id: 'fireworks',
      name: 'Fuegos artificiales',
      price: 280,
      rarity: 'legendary',
      burst: { n: 60, colors: ['#ff5f8f', '#ffd24a', '#58d8c8', '#6cb6ff', '#ffffff'], speed: 11 },
    },
  ],
  music: [
    { id: 'menu', name: 'Crónicas de la llave roja', price: 0, rarity: 'common' },
    { id: 'z0', name: 'Un corazón al sol', price: 20, rarity: 'common' },
    { id: 'z1', name: 'Vals de las pequeñas velas', price: 20, rarity: 'common' },
    { id: 'z2', name: 'Las hojas recuerdan', price: 25, rarity: 'common' },
    { id: 'z3', name: 'Campanas de cristal', price: 40, rarity: 'rare' },
    { id: 'z4', name: 'Las horas prestadas', price: 30, rarity: 'common' },
    { id: 'heroes', name: 'Llamada de los héroes', price: 40, rarity: 'rare' },
    { id: 'z5', name: 'La fragua de los sueños', price: 45, rarity: 'rare' },
    { id: 's0', name: 'Contrarreloj', price: 50, rarity: 'rare' },
    { id: 's1', name: 'Amanecer de acero', price: 80, rarity: 'epic' },
    { id: 'fate', name: 'Marcha del destino', price: 85, rarity: 'epic' },
    { id: 'z6', name: 'El regreso del amanecer', price: 95, rarity: 'epic' },
    { id: 's2', name: 'Cumbre astral', price: 110, rarity: 'epic' },
  ],
  cover: [
    { id: 'classic', name: 'Trío del amanecer', price: 0, rarity: 'common', src: 'backgrounds/cover-heroes.webp' },
    { id: 'lia', name: 'Lía en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-lia.webp' },
    { id: 'van', name: 'Van en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-van.webp' },
    { id: 'jean', name: 'Jean en solitario', price: 60, rarity: 'rare', src: 'backgrounds/cover-heroes-jean.webp' },
    { id: 'battle', name: 'En guardia', price: 140, rarity: 'epic', src: 'backgrounds/cover-heroes-battle.webp' },
    {
      id: 'victory',
      name: 'Amanecer victorioso',
      price: 250,
      rarity: 'legendary',
      src: 'backgrounds/cover-heroes-victory.webp',
    },
  ],
};

/**
 * Precio que tenía cada recompensa antes del reajuste de la economía (mismo orden que REWARDS). Lo ya canjeado con
 * esos precios se sigue contando a su precio de entonces: nadie pierde saldo porque un objeto que ya tiene suba.
 */
const LEGACY_PRICES = {
  board: [0, 30, 35, 45, 50, 55, 65, 70, 85, 110],
  pieces: [0, 30, 40, 50, 55, 65, 80, 95, 120],
  key: [0, 20, 30, 40, 45, 50, 60, 75, 90, 115],
  fx: [0, 20, 30, 35, 40, 45, 60, 75, 90, 120],
  music: [0, 25, 25, 35, 40, 35, 40, 50, 55, 65, 75, 85, 95],
  cover: [0, 50, 50, 50, 75, 90],
};
/** Versión de la economía de Canjear guardada en `store.shopEco`. */
export const SHOP_ECONOMY = 2;

/**
 * Cofres de colección: al reclamar 5, 15, 30, 50, 75 y 100 logros se abre un cofre con puntos extra.
 * Premian la constancia (no solo los logros difíciles) y marcan metas intermedias en todo el recorrido.
 */
export const MILESTONES = [
  { n: 5, points: 25, name: 'Cofre de madera' },
  { n: 15, points: 50, name: 'Cofre de bronce' },
  { n: 30, points: 80, name: 'Cofre de plata' },
  { n: 50, points: 120, name: 'Cofre de oro' },
  { n: 75, points: 180, name: 'Cofre real' },
  { n: 100, points: 300, name: 'Cofre del amanecer' },
];

export const REWARD_TYPES = Object.keys(REWARDS);
export const DEFAULT_LOOK = { board: 'wood', pieces: 'paint', key: 'red', fx: 'none', music: 'menu', cover: 'classic' };

export const rewardKey = (type, id) => `${type}:${id}`;
export const rewardById = (type, id) => REWARDS[type]?.find((r) => r.id === id) || null;

/* ───────────── estadísticas ───────────── */

export const COUNTERS = [
  'completed',
  'perfects',
  'mini5',
  'iceRock',
  'locks',
  'fateCards',
  'cleanCity',
  'boardsSolved',
  'heavyBoards',
  'shopBuys',
  'powersUsed',
  'challengeBoards',
  'challengeRelicsUsed',
  'pacts',
  'goldSeals',
  'legacyAchPoints',
  'bestRunStreak', // marca máxima (se sube con raiseStat, no se suma)
];

export const COLLECTIONS = ['heroes', 'paths', 'mini5Kinds', 'challengeRelics', 'challengeRoutesPlayed'];

const listOf = (store, name) => (Array.isArray(store.stats?.[name]) ? store.stats[name] : []);
const maxAdventureScore = (paths) =>
  Math.max(
    0,
    ...Object.entries(paths || {})
      .filter(([key]) => key.startsWith('c'))
      .map(([, p]) => Number(p?.score) || 0),
  );

export const STATS = {
  ...Object.fromEntries(COUNTERS.map((name) => [name, (store) => Number(store.stats?.[name]) || 0])),
  ...Object.fromEntries(COLLECTIONS.map((name) => [name, (store) => listOf(store, name).length])),
  maxLevel: (store) => maxLevelReached(store.paths),
  hardLevel: (store) => store.paths?.c50?.level || 0,
  hardDone: (store) => (listOf(store, 'paths').includes(50) ? 1 : 0),
  expertLevel: (store) => store.paths?.c75?.level || 0,
  expertDone: (store) => (listOf(store, 'paths').includes(75) ? 1 : 0),
  bestScore: (store) => maxAdventureScore(store.paths),
  dailySolved: (store) => store.daily?.solved || 0,
  dailyGold: (store) => store.daily?.gold || 0,
  bestStreak: (store) => store.daily?.best || 0,
  // el reto Maestro se retiró: cuenta «Todo junto» (y los Maestro que ya tenías)
  masterSolved: (store) => (store.daily?.by?.all || 0) + (store.daily?.by?.master || 0),
  dailyKinds: (store) => CHALLENGES.filter((c) => store.daily?.by?.[c.id]).length,
  challengeBest: (store) => survivalBestLevel(store),
  challenge150Won: (store) => (survivalWonFor(store, '150') ? 1 : 0),
  challenge200Won: (store) => (survivalWonFor(store, '200') ? 1 : 0),
  challenge250Won: (store) => (survivalWonFor(store, '250') ? 1 : 0),
  challengeWonCount: (store) => survivalCompletedCount(store),
  cosmeticsOwned: (store) => Object.keys(store.shopOwned || {}).length,
};

export const statsOf = (store = {}) =>
  Object.fromEntries(Object.entries(STATS).map(([k, read]) => [k, read(store || {})]));

/**
 * Pone al día los logros de un guardado antiguo (se llama al cargar y al importar; se puede repetir sin efecto):
 *   · los de jefes pasaron a ser de cartas del destino (mismos puntos);
 *   · los que se quitaron por ser relleno del inicio conservan sus puntos como «puntos heredados», que siguen sumando
 *     para canjear en la Tienda de logros.
 */
const ACH_RENAMED = { boss1: 'fate1', bosses3: 'fate9', bosses: 'fate27', bosses15: 'fate81' };
export const ACH_RETIRED = { lv5: 10, lv20: 15, lv35: 30, lv65: 40, perf1: 10, fate1: 15, boards10: 15 };
export function migrateAchievements(store) {
  if (!store) return false;
  let changed = false;
  for (const box of [store.ach, store.achClaimed])
    if (box)
      for (const [from, to] of Object.entries(ACH_RENAMED))
        if (Object.hasOwn(box, from)) {
          box[to] ??= box[from];
          delete box[from];
          changed = true;
        }
  if (store.stats && Object.hasOwn(store.stats, 'bosses')) {
    store.stats.fateCards = Math.max(Number(store.stats.fateCards) || 0, Number(store.stats.bosses) || 0);
    delete store.stats.bosses;
    changed = true;
  }
  let legacy = 0;
  for (const [id, points] of Object.entries(ACH_RETIRED)) {
    if (store.ach?.[id] || store.achClaimed?.[id]) legacy += points;
    if (store.ach) delete store.ach[id];
    if (store.achClaimed) delete store.achClaimed[id];
  }
  if (legacy) {
    const stats = (store.stats ||= {});
    stats.legacyAchPoints = (Number(stats.legacyAchPoints) || 0) + legacy;
    changed = true;
  }
  return changed;
}

/** Guarda el valor más alto visto de una marca (p. ej. la mejor racha de una partida). Devuelve true si subió. */
export function raiseStat(store, name, value) {
  const stats = (store.stats ||= {});
  if (!(Number(value) > (Number(stats[name]) || 0))) return false;
  stats[name] = Number(value);
  return true;
}

export function bumpStat(store, name, by = 1) {
  if (!COUNTERS.includes(name)) throw new Error(`unknown counter: ${name}`);
  const stats = (store.stats ||= {});
  stats[name] = (Number(stats[name]) || 0) + by;
}

export function markStat(store, name, key) {
  if (!COLLECTIONS.includes(name)) throw new Error(`unknown collection: ${name}`);
  const stats = (store.stats ||= {}),
    list = Array.isArray(stats[name]) ? stats[name] : (stats[name] = []);
  if (key == null || list.includes(key)) return false;
  list.push(key);
  return true;
}

export function boardStats(board, run = {}) {
  const out = ['boardsSolved'],
    n = board.n;
  if (board.moves <= board.opt) out.push('perfects');
  if (board.walls?.length || board.pieces?.some((p) => p.kind === 'ice')) out.push('iceRock');
  if (board.pieces?.some((p) => p.kind === 'gate')) out.push('locks');
  if (board.pieces?.some((p) => p.kind === 'heavy')) out.push('heavyBoards');
  if (n % 3 === 0 && (run.firstLevel ?? Infinity) <= n - 2 && (run.helpAt || 0) < n - 2) out.push('cleanCity');
  return out;
}

/* ───────────── 100 logros: 25 simples, 50 medios, 25 difíciles ───────────── */

export const GROUPS = [
  { id: 'adventure', name: 'Aventura' },
  { id: 'mastery', name: 'Maestría' },
  { id: 'challenge', name: 'Desafío' },
  { id: 'daily', name: 'Retos diarios' },
  { id: 'collection', name: 'Colección' },
];

export const ACHIEVEMENTS = [
  // ===== 1. Aventura (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'firstWin',
    group: 'adventure',
    tier: 'bronze',
    points: 10,
    name: 'Primer paso',
    desc: 'Resuelve tu primer tablero en Aventura',
    stat: 'boardsSolved',
    goal: 1,
  },
  {
    id: 'hard10',
    group: 'adventure',
    tier: 'bronze',
    points: 10,
    name: 'Umbral difícil',
    desc: 'Llega al nivel 6 en el camino Difícil',
    stat: 'hardLevel',
    goal: 6,
  },
  {
    id: 'city1',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Primer tramo',
    desc: 'Llega al nivel 6 en Aventura',
    stat: 'maxLevel',
    goal: 6,
  },
  {
    id: 'expert10',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Umbral experto',
    desc: 'Llega al nivel 6 en el camino Experto',
    stat: 'expertLevel',
    goal: 6,
  },
  {
    id: 'heroes2',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Dúo del amanecer',
    desc: 'Juega con 2 héroes distintos',
    stat: 'heroes',
    goal: 2,
  },
  {
    id: 'lv25',
    group: 'adventure',
    tier: 'silver',
    points: 25,
    name: 'Viajero',
    desc: 'Llega al nivel 9 en Aventura',
    stat: 'maxLevel',
    goal: 9,
  },
  {
    id: 'hard75',
    group: 'adventure',
    tier: 'silver',
    points: 30,
    name: 'Cumbre difícil',
    desc: 'Llega al nivel 19 en el camino Difícil',
    stat: 'hardLevel',
    goal: 19,
  },
  {
    id: 'lv50',
    group: 'adventure',
    tier: 'silver',
    points: 35,
    name: 'Medio camino',
    desc: 'Llega al nivel 12 en Aventura',
    stat: 'maxLevel',
    goal: 12,
  },
  {
    id: 'expert50',
    group: 'adventure',
    tier: 'silver',
    points: 40,
    name: 'Acero templado',
    desc: 'Llega al nivel 15 en el camino Experto',
    stat: 'expertLevel',
    goal: 15,
  },
  {
    id: 'lv75',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Entre llamas',
    desc: 'Llega al nivel 16 en Aventura',
    stat: 'maxLevel',
    goal: 16,
  },
  {
    id: 'lv90',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Ante la cima',
    desc: 'Llega al nivel 19 en Aventura',
    stat: 'maxLevel',
    goal: 19,
  },
  {
    id: 'heroes',
    group: 'adventure',
    tier: 'silver',
    points: 25,
    name: 'Tres almas',
    desc: 'Juega una partida con cada héroe',
    stat: 'heroes',
    goal: 3,
  },
  {
    id: 'hard25',
    group: 'adventure',
    tier: 'silver',
    points: 35,
    name: 'Ruta exigente',
    desc: 'Llega al nivel 9 en el camino Difícil',
    stat: 'hardLevel',
    goal: 9,
  },
  {
    id: 'hard50',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Sendero difícil',
    desc: 'Llega al nivel 15 en el camino Difícil',
    stat: 'hardLevel',
    goal: 15,
  },
  {
    id: 'expert25',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Paso de acero',
    desc: 'Llega al nivel 9 en el camino Experto',
    stat: 'expertLevel',
    goal: 9,
  },
  {
    id: 'lv100',
    group: 'adventure',
    tier: 'gold',
    points: 80,
    name: 'El trono vacío',
    desc: 'Llega al nivel 21 en Aventura',
    stat: 'maxLevel',
    goal: 21,
  },
  {
    id: 'done',
    group: 'adventure',
    tier: 'gold',
    points: 85,
    name: 'Amanece en Thyes',
    desc: 'Completa un camino entero',
    stat: 'completed',
    goal: 1,
  },
  {
    id: 'hard100',
    group: 'adventure',
    tier: 'gold',
    points: 100,
    name: 'Conquistador difícil',
    desc: 'Completa el camino Difícil',
    stat: 'hardDone',
    goal: 1,
  },
  {
    id: 'expert',
    group: 'adventure',
    tier: 'gold',
    points: 120,
    name: 'Solo para expertos',
    desc: 'Completa el camino Experto',
    stat: 'expertDone',
    goal: 1,
  },
  {
    id: 'paths3',
    group: 'adventure',
    tier: 'gold',
    points: 150,
    name: 'Tres amaneceres',
    desc: 'Completa los tres caminos',
    stat: 'paths',
    goal: 3,
  },

  // ===== 2. Maestría (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'pact1',
    group: 'mastery',
    tier: 'bronze',
    points: 10,
    name: 'Primer pacto',
    desc: 'Elige tu primer Pacto del destino',
    stat: 'pacts',
    goal: 1,
  },
  {
    id: 'perf5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Buen ojo',
    desc: 'Resuelve 35 tableros en el mínimo',
    stat: 'perfects',
    goal: 35,
  },
  {
    id: 'goldSeal1',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Buen pulso',
    desc: 'Encadena 6 tableros seguidos en racha',
    stat: 'bestRunStreak',
    goal: 6,
  },
  {
    id: 'icerock5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primer deshielo',
    desc: 'Resuelve 20 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 20,
  },
  {
    id: 'locks5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primera cerradura',
    desc: 'Resuelve 20 tableros con candados',
    stat: 'locks',
    goal: 20,
  },
  {
    id: 'perf10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Pulso firme',
    desc: 'Resuelve 75 tableros en el mínimo',
    stat: 'perfects',
    goal: 75,
  },
  {
    id: 'perf25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Trazo limpio',
    desc: 'Resuelve 140 tableros en el mínimo',
    stat: 'perfects',
    goal: 140,
  },
  {
    id: 'perf50',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin un paso de más',
    desc: 'Resuelve 220 tableros en el mínimo',
    stat: 'perfects',
    goal: 220,
  },
  {
    id: 'icerock',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Rompehielos',
    desc: 'Resuelve 55 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 55,
  },
  {
    id: 'locks',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Cerrajero',
    desc: 'Resuelve 55 tableros con candados',
    stat: 'locks',
    goal: 55,
  },
  {
    id: 'heavy10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Brazo firme',
    desc: 'Resuelve 20 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 20,
  },
  {
    id: 'heavy25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Peso pluma',
    desc: 'Resuelve 55 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 55,
  },
  {
    id: 'fate9',
    group: 'mastery',
    tier: 'silver',
    points: 30,
    name: 'Mano completa',
    desc: 'Elige 12 cartas del destino',
    stat: 'fateCards',
    goal: 12,
  },
  {
    id: 'fate27',
    group: 'mastery',
    tier: 'silver',
    points: 45,
    name: 'Lector del destino',
    desc: 'Elige 36 cartas del destino',
    stat: 'fateCards',
    goal: 36,
  },
  {
    id: 'clean',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin ayuda',
    desc: 'Supera 7 tramos sin usar pistas',
    stat: 'cleanCity',
    goal: 7,
  },
  {
    id: 'perf100',
    group: 'mastery',
    tier: 'gold',
    points: 100,
    name: 'Perfección absoluta',
    desc: 'Resuelve 400 tableros en el mínimo',
    stat: 'perfects',
    goal: 400,
  },
  {
    id: 'perf200',
    group: 'mastery',
    tier: 'gold',
    points: 130,
    name: 'Mente maestra',
    desc: 'Resuelve 650 tableros en el mínimo',
    stat: 'perfects',
    goal: 650,
  },
  {
    id: 'icerock75',
    group: 'mastery',
    tier: 'gold',
    points: 85,
    name: 'Señor del glaciar',
    desc: 'Resuelve 160 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 160,
  },
  {
    id: 'fate81',
    group: 'mastery',
    tier: 'gold',
    points: 95,
    name: 'Tejedor del destino',
    desc: 'Elige 100 cartas del destino',
    stat: 'fateCards',
    goal: 100,
  },
  {
    id: 'clean5',
    group: 'mastery',
    tier: 'gold',
    points: 110,
    name: 'Sabiduría pura',
    desc: 'Supera 21 tramos sin usar pistas',
    stat: 'cleanCity',
    goal: 21,
  },

  // ===== 3. Desafío (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'chBoard1',
    group: 'challenge',
    tier: 'bronze',
    points: 10,
    name: 'Primer desafío',
    desc: 'Supera tu primer tablero en Desafío',
    stat: 'challengeBoards',
    goal: 1,
  },
  {
    id: 'chBoard3',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Calentando la senda',
    desc: 'Supera 3 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 3,
  },
  {
    id: 'chRelicUse',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Poder de reliquia',
    desc: 'Usa una reliquia en Desafío',
    stat: 'challengeRelicsUsed',
    goal: 1,
  },
  {
    id: 'chLvl5',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Cinco seguidos',
    desc: 'Alcanza el nivel 5 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 5,
  },
  {
    id: 'chRoutes2',
    group: 'challenge',
    tier: 'bronze',
    points: 15,
    name: 'Dos sendas',
    desc: 'Juega en 2 rutas de Desafío',
    stat: 'challengeRoutesPlayed',
    goal: 2,
  },
  {
    id: 'chBoard10',
    group: 'challenge',
    tier: 'silver',
    points: 25,
    name: 'Ritmo constante',
    desc: 'Supera 10 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 10,
  },
  {
    id: 'chBoard20',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Paso firme',
    desc: 'Supera 20 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 20,
  },
  {
    id: 'chBoard30',
    group: 'challenge',
    tier: 'silver',
    points: 40,
    name: 'Mente templada',
    desc: 'Supera 30 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 30,
  },
  {
    id: 'chBoard50',
    group: 'challenge',
    tier: 'silver',
    points: 50,
    name: 'Resistencia pura',
    desc: 'Supera 50 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 50,
  },
  {
    id: 'chRelicUse10',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Maestro de reliquias',
    desc: 'Usa reliquias 10 veces en Desafío',
    stat: 'challengeRelicsUsed',
    goal: 10,
  },
  {
    id: 'chRelics3',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Tres reliquias',
    desc: 'Prueba las 3 reliquias de Desafío',
    stat: 'challengeRelics',
    goal: 3,
  },
  {
    id: 'chRoutes3',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Explorador de sendas',
    desc: 'Juega en las 3 rutas de Desafío',
    stat: 'challengeRoutesPlayed',
    goal: 3,
  },
  {
    id: 'chLvl8',
    group: 'challenge',
    tier: 'silver',
    points: 30,
    name: 'Octava prueba',
    desc: 'Alcanza el nivel 8 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 8,
  },
  {
    id: 'chLvl10',
    group: 'challenge',
    tier: 'silver',
    points: 40,
    name: 'Diez seguidos',
    desc: 'Alcanza el nivel 10 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 10,
  },
  {
    id: 'chLvl14',
    group: 'challenge',
    tier: 'silver',
    points: 50,
    name: 'A las puertas',
    desc: 'Alcanza el nivel 14 en cualquier ruta de Desafío',
    stat: 'challengeBest',
    goal: 14,
  },
  {
    id: 'chBoard100',
    group: 'challenge',
    tier: 'gold',
    points: 90,
    name: 'Incansable',
    desc: 'Supera 100 tableros en Desafío',
    stat: 'challengeBoards',
    goal: 100,
  },
  {
    id: 'ch150',
    group: 'challenge',
    tier: 'gold',
    points: 80,
    name: 'Senda Breve dominada',
    desc: 'Completa el Desafío de 150 turnos',
    stat: 'challenge150Won',
    goal: 1,
  },
  {
    id: 'ch200',
    group: 'challenge',
    tier: 'gold',
    points: 100,
    name: 'Senda Firme dominada',
    desc: 'Completa el Desafío de 200 turnos',
    stat: 'challenge200Won',
    goal: 1,
  },
  {
    id: 'ch250',
    group: 'challenge',
    tier: 'gold',
    points: 120,
    name: 'Senda Eterna dominada',
    desc: 'Completa el Desafío de 250 turnos',
    stat: 'challenge250Won',
    goal: 1,
  },
  {
    id: 'chAll',
    group: 'challenge',
    tier: 'gold',
    points: 150,
    name: 'Señor del Desafío',
    desc: 'Completa las 3 rutas de Desafío',
    stat: 'challengeWonCount',
    goal: 3,
  },

  // ===== 4. Retos diarios (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'day1',
    group: 'daily',
    tier: 'bronze',
    points: 10,
    name: 'Buenos días',
    desc: 'Resuelve tu primer reto diario',
    stat: 'dailySolved',
    goal: 1,
  },
  {
    id: 'day3',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Tres mañanas',
    desc: 'Resuelve 3 retos diarios',
    stat: 'dailySolved',
    goal: 3,
  },
  {
    id: 'gold1',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Primer oro diario',
    desc: 'Gana tu primera medalla de oro diaria',
    stat: 'dailyGold',
    goal: 1,
  },
  {
    id: 'streak2',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Dos días seguidos',
    desc: 'Racha de 2 días',
    stat: 'bestStreak',
    goal: 2,
  },
  {
    id: 'kinds2',
    group: 'daily',
    tier: 'bronze',
    points: 15,
    name: 'Variedad diaria',
    desc: 'Resuelve 2 tipos de reto diario',
    stat: 'dailyKinds',
    goal: 2,
  },
  {
    id: 'day7',
    group: 'daily',
    tier: 'silver',
    points: 30,
    name: 'Costumbre',
    desc: 'Resuelve 7 retos diarios',
    stat: 'dailySolved',
    goal: 7,
  },
  {
    id: 'day15',
    group: 'daily',
    tier: 'silver',
    points: 35,
    name: 'Quincena resuelta',
    desc: 'Resuelve 15 retos diarios',
    stat: 'dailySolved',
    goal: 15,
  },
  {
    id: 'day30',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Ritual del amanecer',
    desc: 'Resuelve 30 retos diarios',
    stat: 'dailySolved',
    goal: 30,
  },
  {
    id: 'kinds',
    group: 'daily',
    tier: 'silver',
    points: 40,
    name: 'Coleccionista de retos',
    desc: 'Resuelve cada tipo de reto diario',
    stat: 'dailyKinds',
    goal: CHALLENGES.length,
  },
  {
    id: 'streak3',
    group: 'daily',
    tier: 'silver',
    points: 25,
    name: 'Tres de tres',
    desc: 'Racha de 3 días',
    stat: 'bestStreak',
    goal: 3,
  },
  {
    id: 'streak7',
    group: 'daily',
    tier: 'silver',
    points: 40,
    name: 'Una semana',
    desc: 'Racha de 7 días',
    stat: 'bestStreak',
    goal: 7,
  },
  {
    id: 'streak14',
    group: 'daily',
    tier: 'silver',
    points: 55,
    name: 'Dos semanas',
    desc: 'Racha de 14 días',
    stat: 'bestStreak',
    goal: 14,
  },
  {
    id: 'gold5',
    group: 'daily',
    tier: 'silver',
    points: 35,
    name: 'Brillo constante',
    desc: 'Gana 5 medallas de oro',
    stat: 'dailyGold',
    goal: 5,
  },
  {
    id: 'gold10',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Oro puro',
    desc: 'Gana 10 medallas de oro',
    stat: 'dailyGold',
    goal: 10,
  },
  {
    id: 'master',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Maestro del umbral',
    desc: 'Resuelve el reto Todo junto',
    stat: 'masterSolved',
    goal: 1,
  },
  {
    id: 'day100',
    group: 'daily',
    tier: 'gold',
    points: 110,
    name: 'Cien amaneceres',
    desc: 'Resuelve 100 retos diarios',
    stat: 'dailySolved',
    goal: 100,
  },
  {
    id: 'streak30',
    group: 'daily',
    tier: 'gold',
    points: 110,
    name: 'Un mes entero',
    desc: 'Racha de 30 días',
    stat: 'bestStreak',
    goal: 30,
  },
  {
    id: 'gold25',
    group: 'daily',
    tier: 'gold',
    points: 115,
    name: 'Corona de oro',
    desc: 'Gana 25 medallas de oro',
    stat: 'dailyGold',
    goal: 25,
  },
  {
    id: 'day50',
    group: 'daily',
    tier: 'gold',
    points: 100,
    name: 'Medio centenar',
    desc: 'Resuelve 50 retos diarios',
    stat: 'dailySolved',
    goal: 50,
  },
  {
    id: 'master5',
    group: 'daily',
    tier: 'gold',
    points: 100,
    name: 'Leyenda del umbral',
    desc: 'Resuelve 5 retos Todo junto',
    stat: 'masterSolved',
    goal: 5,
  },

  // ===== 5. Colección (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'streak10',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Mano firme',
    desc: 'Encadena una racha de 10 tableros en una partida',
    stat: 'bestRunStreak',
    goal: 10,
  },
  {
    id: 'power1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera chispa',
    desc: 'Activa el poder de un héroe 15 veces',
    stat: 'powersUsed',
    goal: 15,
  },
  {
    id: 'shop1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera baraja',
    desc: 'Elige 6 Cartas del destino',
    stat: 'fateCards',
    goal: 6,
  },
  {
    id: 'score1k',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Primer botín',
    desc: 'Alcanza 25.000 puntos en una partida',
    stat: 'bestScore',
    goal: 25000,
  },
  {
    id: 'cosmetic1',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Primer estilo',
    desc: 'Canjea tu primer objeto en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 1,
  },
  {
    id: 'mini1',
    group: 'collection',
    tier: 'silver',
    points: 25,
    name: 'Pactante',
    desc: 'Elige 8 Pactos del destino',
    stat: 'pacts',
    goal: 8,
  },
  {
    id: 'mini3',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Sin miedo al costo',
    desc: 'Elige 25 Pactos del destino',
    stat: 'pacts',
    goal: 25,
  },
  {
    id: 'mini5',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Baraja vivida',
    desc: 'Elige 60 Cartas del destino',
    stat: 'fateCards',
    goal: 60,
  },
  {
    id: 'boards50',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Sesenta llaves',
    desc: 'Resuelve 63 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 63,
  },
  {
    id: 'boards100',
    group: 'collection',
    tier: 'silver',
    points: 50,
    name: 'Ciento cuarenta llaves',
    desc: 'Resuelve 147 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 147,
  },
  {
    id: 'power5',
    group: 'collection',
    tier: 'silver',
    points: 25,
    name: 'Despertar',
    desc: 'Activa el poder de un héroe 60 veces',
    stat: 'powersUsed',
    goal: 60,
  },
  {
    id: 'power25',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Fuerza interior',
    desc: 'Activa el poder de un héroe 220 veces',
    stat: 'powersUsed',
    goal: 220,
  },
  {
    id: 'shop5',
    group: 'collection',
    tier: 'silver',
    points: 30,
    name: 'Imparable',
    desc: 'Encadena una racha de 15 tableros en una partida',
    stat: 'bestRunStreak',
    goal: 15,
  },
  {
    id: 'score5k',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Tesoro del amanecer',
    desc: 'Alcanza 60.000 puntos en una partida',
    stat: 'bestScore',
    goal: 60000,
  },
  {
    id: 'cosmetic5',
    group: 'collection',
    tier: 'silver',
    points: 40,
    name: 'Armario en marcha',
    desc: 'Canjea 5 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 5,
  },
  {
    id: 'mini9',
    group: 'collection',
    tier: 'gold',
    points: 100,
    name: 'Viajero incansable',
    desc: 'Completa 8 aventuras enteras',
    stat: 'completed',
    goal: 8,
  },
  {
    id: 'boards250',
    group: 'collection',
    tier: 'gold',
    points: 100,
    name: 'Guardián de llaves',
    desc: 'Resuelve 315 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 315,
  },
  {
    id: 'score25k',
    group: 'collection',
    tier: 'gold',
    points: 95,
    name: 'Fortuna real',
    desc: 'Alcanza 100.000 puntos en una partida',
    stat: 'bestScore',
    goal: 100000,
  },
  {
    id: 'cosmetic15',
    group: 'collection',
    tier: 'gold',
    points: 90,
    name: 'Coleccionista del amanecer',
    desc: 'Canjea 15 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 15,
  },
  {
    id: 'cosmetic30',
    group: 'collection',
    tier: 'gold',
    points: 130,
    name: 'Galería completa',
    desc: 'Canjea 30 objetos en la Tienda de logros',
    stat: 'cosmeticsOwned',
    goal: 30,
  },
];

export const progressOf = (a, stats) => Math.min(a.goal, stats[a.stat] || 0);
export const isDone = (a, stats) => (stats[a.stat] || 0) >= a.goal;

/**
 * Marca en `store.ach` los logros recién cumplidos y los devuelve (para avisar al jugador).
 * El jugador luego debe reclamarlos uno a uno en el panel de Logros para cobrar sus puntos.
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

export function unclaimedAchievements(store = {}) {
  const got = store?.ach || {};
  const claimed = store?.achClaimed || {};
  return ACHIEVEMENTS.filter((a) => got[a.id] && !claimed[a.id]);
}

/** Cuántos logros ha reclamado el jugador (lo que hace avanzar los cofres de colección). */
export const claimedCount = (store = {}) => ACHIEVEMENTS.filter((a) => store?.achClaimed?.[a.id]).length;

/** Cofres alcanzados y aún sin abrir. */
export function readyMilestones(store = {}) {
  const count = claimedCount(store),
    opened = store?.achMilestones || {};
  return MILESTONES.filter((m) => count >= m.n && !opened[m.n]);
}

/** Próximo cofre por alcanzar (o null si ya están todos). */
export const nextMilestone = (store = {}) => MILESTONES.find((m) => claimedCount(store) < m.n) || null;

export function openMilestone(store, n, now = Date.now()) {
  const m = readyMilestones(store).find((item) => item.n === n);
  if (!m) return null;
  (store.achMilestones ||= {})[m.n] = now;
  return { milestone: m, points: m.points, balance: achBalance(store) };
}

export function earnedPoints(store = {}) {
  const claimed = store?.achClaimed || {};
  const opened = store?.achMilestones || {};
  return (
    (Number(store?.stats?.legacyAchPoints) || 0) +
    ACHIEVEMENTS.reduce((sum, a) => sum + (claimed[a.id] ? a.points : 0), 0) +
    MILESTONES.reduce((sum, m) => sum + (opened[m.n] ? m.points : 0), 0)
  );
}

/** Lo que costó cada objeto canjeado: el precio pagado si se guardó; si no, el precio actual. */
export function spentPoints(store = {}) {
  const owned = store?.shopOwned || {};
  const paid = store?.shopPaid || {};
  let total = 0;
  for (const type of REWARD_TYPES) {
    for (const item of REWARDS[type]) {
      const key = rewardKey(type, item.id);
      if (item.price > 0 && owned[key]) total += Number.isFinite(paid[key]) ? paid[key] : item.price;
    }
  }
  return total;
}

export const achBalance = (store = {}) => Math.max(0, earnedPoints(store) - spentPoints(store));

/**
 * Pasa un guardado a la economía actual: lo canjeado antes del reajuste queda anotado a su precio de entonces.
 * Devuelve true si cambió algo (para guardar).
 */
export function migrateShop(store) {
  if (!store || store.shopEco >= SHOP_ECONOMY) return false;
  const owned = store.shopOwned || {};
  for (const type of REWARD_TYPES)
    REWARDS[type].forEach((item, i) => {
      const key = rewardKey(type, item.id);
      if (!owned[key] || Number.isFinite(store.shopPaid?.[key])) return;
      (store.shopPaid ||= {})[key] = Math.min(item.price, LEGACY_PRICES[type][i] ?? item.price);
    });
  store.shopEco = SHOP_ECONOMY;
  return true;
}

export function collectAchievement(store, id, now = Date.now()) {
  const a = ACHIEVEMENTS.find((item) => item.id === id);
  if (!a || !store?.ach?.[id] || store?.achClaimed?.[id]) return null;
  const claimed = (store.achClaimed ||= {});
  claimed[id] = now;
  return { achievement: a, points: a.points, balance: achBalance(store) };
}

/** Reclama de golpe todos los logros pendientes. */
export function collectAllAchievements(store, now = Date.now()) {
  const list = unclaimedAchievements(store);
  for (const a of list) (store.achClaimed ||= {})[a.id] = now;
  return { achievements: list, points: list.reduce((s, a) => s + a.points, 0), balance: achBalance(store) };
}

/** Los `n` logros pendientes más cerca de cumplirse (con algo de avance), para animar a ir por ellos. */
export function nearAchievements(store = {}, n = 3) {
  const stats = statsOf(store),
    got = store?.ach || {};
  return ACHIEVEMENTS.filter((a) => !got[a.id] && progressOf(a, stats) > 0)
    .map((a) => ({ a, ratio: progressOf(a, stats) / a.goal }))
    .sort((x, y) => y.ratio - x.ratio || x.a.goal - y.a.goal)
    .slice(0, n)
    .map((x) => x.a);
}

export function rewardUnlocked(type, id, storeOrOwned = {}) {
  if (DEFAULT_LOOK[type] === id) return true;
  const owned = storeOrOwned?.shopOwned || storeOrOwned || {};
  return !!owned[rewardKey(type, id)];
}

export function buyShopItem(store, type, id, now = Date.now()) {
  const item = rewardById(type, id);
  if (!item || item.price <= 0) return { ok: false, reason: 'invalid' };
  const owned = (store.shopOwned ||= {});
  const key = rewardKey(type, id);
  if (owned[key]) return { ok: false, reason: 'owned' };
  if (achBalance(store) < item.price) return { ok: false, reason: 'funds' };
  migrateShop(store);
  owned[key] = now;
  (store.shopPaid ||= {})[key] = item.price;
  store.look = { ...lookOf(store), [type]: id };
  claimAchievements(store, now);
  return { ok: true, item, balance: achBalance(store) };
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
