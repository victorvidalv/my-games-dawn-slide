/**
 * Sistema de logros (100 logros: 25 simples, 50 medios y 25 difíciles) y pestaña Canjear (Tienda cosmética).
 * Cada logro cumplido queda listo para reclamar en la pantalla de Logros: al reclamarlo otorga puntos
 * acumulables que se canjean por bordes del tablero, fichas, llaves, celebraciones y melodías del menú.
 * Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';
import { survivalBestLevel, survivalCompletedCount, survivalWonFor } from './survival.js';

export const TIERS = {
  bronze: { id: 'bronze', name: 'Simple' },
  silver: { id: 'silver', name: 'Medio' },
  gold: { id: 'gold', name: 'Difícil' },
};

/** Recompensas canjeables en Canjear: la primera de cada tipo es gratuita (de serie). */
export const REWARDS = {
  board: [
    { id: 'wood', name: 'Madera tallada', price: 0 },
    { id: 'slate', name: 'Pizarra nocturna', price: 30 },
    { id: 'amber', name: 'Ámbar solar', price: 35 },
    { id: 'marble', name: 'Mármol real', price: 45 },
    { id: 'sapphire', name: 'Zafiro real', price: 50 },
    { id: 'jade', name: 'Jade imperial', price: 55 },
    { id: 'crimson', name: 'Forja carmesí', price: 65 },
    { id: 'ivory', name: 'Pergamino dorado', price: 70 },
    { id: 'celestial', name: 'Observatorio astral', price: 85 },
    { id: 'obsidian', name: 'Obsidiana real', price: 110 },
  ],
  pieces: [
    { id: 'paint', name: 'Madera pintada', price: 0 },
    { id: 'stone', name: 'Piedra tallada', price: 30 },
    { id: 'glass', name: 'Vidrio de colores', price: 40 },
    { id: 'night', name: 'Tinta nocturna', price: 50 },
    { id: 'ceramic', name: 'Porcelana celeste', price: 55 },
    { id: 'brass', name: 'Latón bruñido', price: 65 },
    { id: 'runic', name: 'Pergamino rúnico', price: 80 },
    { id: 'lacquer', name: 'Lacado imperial', price: 95 },
    { id: 'oldgold', name: 'Oro viejo', price: 120 },
  ],
  key: [
    { id: 'red', name: 'Llave roja', price: 0 },
    { id: 'amber', name: 'Llave de ámbar', price: 20 },
    { id: 'iron', name: 'Llave de hierro antiguo', price: 30 },
    { id: 'emerald', name: 'Llave de esmeralda', price: 40 },
    { id: 'sapphire', name: 'Llave de zafiro', price: 45 },
    { id: 'rose', name: 'Llave de coral', price: 50 },
    { id: 'crystal', name: 'Llave de cristal', price: 60 },
    { id: 'obsidian', name: 'Llave de obsidiana', price: 75 },
    { id: 'star', name: 'Llave de estrellas', price: 90 },
    { id: 'gold', name: 'Llave dorada', price: 115 },
  ],
  fx: [
    { id: 'none', name: 'Sin adornos', price: 0 },
    {
      id: 'embers',
      name: 'Brasas',
      price: 20,
      burst: { n: 26, colors: ['#ff9a3d', '#ffd24a', '#ff6a3d', '#fff0b8'], speed: 7 },
    },
    {
      id: 'sparks',
      name: 'Chispas doradas',
      price: 30,
      burst: { n: 34, colors: ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], speed: 9 },
    },
    {
      id: 'petals',
      name: 'Pétalos',
      price: 35,
      burst: { n: 30, colors: ['#ffb7d0', '#ff8fb8', '#ffe3ee', '#f7c6d9'], speed: 5 },
    },
    {
      id: 'ink',
      name: 'Salpicadura de tinta',
      price: 40,
      burst: { n: 28, colors: ['#150e0c', '#3a2a44', '#e0b04f', '#f3e5c8'], speed: 8 },
    },
    {
      id: 'frost',
      name: 'Destello glaciar',
      price: 45,
      burst: { n: 34, colors: ['#b8f2ff', '#5fd6ff', '#ffffff', '#8ab8ff'], speed: 7 },
    },
    {
      id: 'stars',
      name: 'Lluvia de estrellas',
      price: 60,
      burst: { n: 36, colors: ['#d7c3ff', '#8fd8ff', '#ffffff', '#ffe9ad'], speed: 8 },
    },
    {
      id: 'aurora',
      name: 'Aurora',
      price: 75,
      burst: { n: 40, colors: ['#58f0c8', '#8fd8ff', '#b08cff', '#e6fff6'], speed: 6 },
    },
    {
      id: 'prism',
      name: 'Prisma solar',
      price: 90,
      burst: { n: 46, colors: ['#ff8a65', '#ffd54f', '#4dd0e1', '#ce93d8', '#fff8e1'], speed: 9 },
    },
    {
      id: 'fireworks',
      name: 'Fuegos artificiales',
      price: 120,
      burst: { n: 60, colors: ['#ff5f8f', '#ffd24a', '#58d8c8', '#6cb6ff', '#ffffff'], speed: 11 },
    },
  ],
  music: [
    { id: 'menu', name: 'Crónicas de la llave roja', price: 0 },
    { id: 'z0', name: 'Un corazón al sol', price: 25 },
    { id: 'z1', name: 'Vals de las pequeñas velas', price: 25 },
    { id: 'z2', name: 'Gotas sobre la arena', price: 30 },
    { id: 'z3', name: 'Las hojas recuerdan', price: 35 },
    { id: 'z4', name: 'Las horas prestadas', price: 35 },
    { id: 'heroes', name: 'Llamada de los héroes', price: 40 },
    { id: 'z5', name: 'Campanas de cristal', price: 40 },
    { id: 'z6', name: 'Pétalos en el viento', price: 45 },
    { id: 'z7', name: 'La fragua de los sueños', price: 50 },
    { id: 's0', name: 'Contrarreloj', price: 55 },
    { id: 'z8', name: 'Un puente entre estrellas', price: 60 },
    { id: 's1', name: 'Alba de acero', price: 65 },
    { id: 'boss', name: 'El guardián del umbral', price: 75 },
    { id: 'z9', name: 'El regreso del alba', price: 85 },
    { id: 's2', name: 'Cumbre astral', price: 95 },
  ],
  cover: [
    { id: 'classic', name: 'Trío del alba', price: 0, src: 'backgrounds/cover-heroes.webp' },
    { id: 'lia', name: 'Lía en solitario', price: 50, src: 'backgrounds/cover-heroes-lia.png' },
    { id: 'van', name: 'Van en solitario', price: 50, src: 'backgrounds/cover-heroes-van.png' },
    { id: 'jean', name: 'Jean en solitario', price: 50, src: 'backgrounds/cover-heroes-jean.png' },
    { id: 'battle', name: 'En guardia', price: 75, src: 'backgrounds/cover-heroes-battle.png' },
    { id: 'victory', name: 'Alba victoriosa', price: 90, src: 'backgrounds/cover-heroes-victory.png' },
  ],
};

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
  'bosses',
  'cleanCity',
  'boardsSolved',
  'heavyBoards',
  'shopBuys',
  'powersUsed',
  'challengeBoards',
  'challengeRelicsUsed',
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
  masterSolved: (store) => store.daily?.by?.master || 0,
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
  if (board.plan?.boss) out.push('bosses');
  if (n % 10 === 0 && (run.firstLevel ?? Infinity) <= n - 9 && (run.helpAt || 0) < n - 9) out.push('cleanCity');
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
    id: 'lv5',
    group: 'adventure',
    tier: 'bronze',
    points: 10,
    name: 'Calentando motores',
    desc: 'Llega al nivel 5 en Aventura',
    stat: 'maxLevel',
    goal: 5,
  },
  {
    id: 'city1',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Primer sello',
    desc: 'Llega al nivel 11 en Aventura',
    stat: 'maxLevel',
    goal: 11,
  },
  {
    id: 'lv20',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Segunda ciudad',
    desc: 'Llega al nivel 20 en Aventura',
    stat: 'maxLevel',
    goal: 20,
  },
  {
    id: 'heroes2',
    group: 'adventure',
    tier: 'bronze',
    points: 15,
    name: 'Dúo del alba',
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
    desc: 'Llega al nivel 25 en Aventura',
    stat: 'maxLevel',
    goal: 25,
  },
  {
    id: 'lv35',
    group: 'adventure',
    tier: 'silver',
    points: 30,
    name: 'Horizonte lejano',
    desc: 'Llega al nivel 35 en Aventura',
    stat: 'maxLevel',
    goal: 35,
  },
  {
    id: 'lv50',
    group: 'adventure',
    tier: 'silver',
    points: 35,
    name: 'Medio camino',
    desc: 'Llega al nivel 50 en Aventura',
    stat: 'maxLevel',
    goal: 50,
  },
  {
    id: 'lv65',
    group: 'adventure',
    tier: 'silver',
    points: 40,
    name: 'Tierras altas',
    desc: 'Llega al nivel 65 en Aventura',
    stat: 'maxLevel',
    goal: 65,
  },
  {
    id: 'lv75',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Entre pétalos',
    desc: 'Llega al nivel 75 en Aventura',
    stat: 'maxLevel',
    goal: 75,
  },
  {
    id: 'lv90',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Ante la cima',
    desc: 'Llega al nivel 90 en Aventura',
    stat: 'maxLevel',
    goal: 90,
  },
  {
    id: 'heroes',
    group: 'adventure',
    tier: 'silver',
    points: 30,
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
    desc: 'Llega al nivel 25 en el camino Difícil',
    stat: 'hardLevel',
    goal: 25,
  },
  {
    id: 'hard50',
    group: 'adventure',
    tier: 'silver',
    points: 50,
    name: 'Sendero difícil',
    desc: 'Llega al nivel 50 en el camino Difícil',
    stat: 'hardLevel',
    goal: 50,
  },
  {
    id: 'expert25',
    group: 'adventure',
    tier: 'silver',
    points: 45,
    name: 'Paso de acero',
    desc: 'Llega al nivel 25 en el camino Experto',
    stat: 'expertLevel',
    goal: 25,
  },
  {
    id: 'lv100',
    group: 'adventure',
    tier: 'gold',
    points: 80,
    name: 'El trono vacío',
    desc: 'Llega al nivel 100 en Aventura',
    stat: 'maxLevel',
    goal: 100,
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
    id: 'perf1',
    group: 'mastery',
    tier: 'bronze',
    points: 10,
    name: 'Primer perfecto',
    desc: 'Resuelve 1 tablero en el mínimo',
    stat: 'perfects',
    goal: 1,
  },
  {
    id: 'perf5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Buen ojo',
    desc: 'Resuelve 5 tableros en el mínimo',
    stat: 'perfects',
    goal: 5,
  },
  {
    id: 'boss1',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primer guardián',
    desc: 'Vence a tu primer jefe',
    stat: 'bosses',
    goal: 1,
  },
  {
    id: 'icerock5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primer deshielo',
    desc: 'Resuelve 5 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 5,
  },
  {
    id: 'locks5',
    group: 'mastery',
    tier: 'bronze',
    points: 15,
    name: 'Primera cerradura',
    desc: 'Resuelve 5 tableros con candados',
    stat: 'locks',
    goal: 5,
  },
  {
    id: 'perf10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Pulso firme',
    desc: 'Resuelve 10 tableros en el mínimo',
    stat: 'perfects',
    goal: 10,
  },
  {
    id: 'perf25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Trazo limpio',
    desc: 'Resuelve 25 tableros en el mínimo',
    stat: 'perfects',
    goal: 25,
  },
  {
    id: 'perf50',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin un paso de más',
    desc: 'Resuelve 50 tableros en el mínimo',
    stat: 'perfects',
    goal: 50,
  },
  {
    id: 'icerock',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Rompehielos',
    desc: 'Resuelve 25 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 25,
  },
  {
    id: 'locks',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Cerrajero',
    desc: 'Resuelve 25 tableros con candados',
    stat: 'locks',
    goal: 25,
  },
  {
    id: 'heavy10',
    group: 'mastery',
    tier: 'silver',
    points: 25,
    name: 'Brazo firme',
    desc: 'Resuelve 10 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 10,
  },
  {
    id: 'heavy25',
    group: 'mastery',
    tier: 'silver',
    points: 35,
    name: 'Peso pluma',
    desc: 'Resuelve 25 tableros con bloques pesados',
    stat: 'heavyBoards',
    goal: 25,
  },
  {
    id: 'bosses3',
    group: 'mastery',
    tier: 'silver',
    points: 30,
    name: 'Cazador novato',
    desc: 'Vence a 3 jefes',
    stat: 'bosses',
    goal: 3,
  },
  {
    id: 'bosses',
    group: 'mastery',
    tier: 'silver',
    points: 45,
    name: 'Cazador de guardianes',
    desc: 'Vence a 5 jefes',
    stat: 'bosses',
    goal: 5,
  },
  {
    id: 'clean',
    group: 'mastery',
    tier: 'silver',
    points: 50,
    name: 'Sin ayuda',
    desc: 'Supera una ciudad entera sin pistas ni saltos',
    stat: 'cleanCity',
    goal: 1,
  },
  {
    id: 'perf100',
    group: 'mastery',
    tier: 'gold',
    points: 100,
    name: 'Perfección absoluta',
    desc: 'Resuelve 100 tableros en el mínimo',
    stat: 'perfects',
    goal: 100,
  },
  {
    id: 'perf200',
    group: 'mastery',
    tier: 'gold',
    points: 130,
    name: 'Mente maestra',
    desc: 'Resuelve 200 tableros en el mínimo',
    stat: 'perfects',
    goal: 200,
  },
  {
    id: 'icerock75',
    group: 'mastery',
    tier: 'gold',
    points: 85,
    name: 'Señor del glaciar',
    desc: 'Resuelve 75 tableros con rocas o hielo',
    stat: 'iceRock',
    goal: 75,
  },
  {
    id: 'bosses15',
    group: 'mastery',
    tier: 'gold',
    points: 95,
    name: 'Azote del umbral',
    desc: 'Vence a 15 jefes',
    stat: 'bosses',
    goal: 15,
  },
  {
    id: 'clean5',
    group: 'mastery',
    tier: 'gold',
    points: 110,
    name: 'Sabiduría pura',
    desc: 'Supera 5 ciudades sin pistas ni saltos',
    stat: 'cleanCity',
    goal: 5,
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
    name: 'Ritual del alba',
    desc: 'Resuelve 30 retos diarios',
    stat: 'dailySolved',
    goal: 30,
  },
  {
    id: 'day50',
    group: 'daily',
    tier: 'silver',
    points: 55,
    name: 'Medio centenar',
    desc: 'Resuelve 50 retos diarios',
    stat: 'dailySolved',
    goal: 50,
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
    id: 'master',
    group: 'daily',
    tier: 'silver',
    points: 45,
    name: 'Maestro del umbral',
    desc: 'Resuelve el reto Maestro',
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
    id: 'gold10',
    group: 'daily',
    tier: 'gold',
    points: 80,
    name: 'Oro puro',
    desc: 'Gana 10 medallas de oro',
    stat: 'dailyGold',
    goal: 10,
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
    id: 'master5',
    group: 'daily',
    tier: 'gold',
    points: 100,
    name: 'Leyenda del umbral',
    desc: 'Resuelve 5 retos Maestro',
    stat: 'masterSolved',
    goal: 5,
  },

  // ===== 5. Colección (20: 5 simples, 10 medios, 5 difíciles) =====
  {
    id: 'boards10',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Diez llaves',
    desc: 'Resuelve 10 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 10,
  },
  {
    id: 'power1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera chispa',
    desc: 'Activa el poder de un héroe por primera vez',
    stat: 'powersUsed',
    goal: 1,
  },
  {
    id: 'shop1',
    group: 'collection',
    tier: 'bronze',
    points: 10,
    name: 'Primera compra',
    desc: 'Compra 1 objeto en la tienda de Aventura',
    stat: 'shopBuys',
    goal: 1,
  },
  {
    id: 'score1k',
    group: 'collection',
    tier: 'bronze',
    points: 15,
    name: 'Primer botín',
    desc: 'Alcanza 1.000 puntos en una partida',
    stat: 'bestScore',
    goal: 1000,
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
    name: 'Cinco estrellas',
    desc: 'Consigue 5 estrellas en un minijuego',
    stat: 'mini5',
    goal: 1,
  },
  {
    id: 'mini3',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Talento natural',
    desc: 'Consigue 5 estrellas en 3 minijuegos',
    stat: 'mini5',
    goal: 3,
  },
  {
    id: 'mini5',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Manos de artista',
    desc: 'Consigue 5 estrellas en 5 minijuegos',
    stat: 'mini5',
    goal: 5,
  },
  {
    id: 'boards50',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Cincuenta llaves',
    desc: 'Resuelve 50 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 50,
  },
  {
    id: 'boards100',
    group: 'collection',
    tier: 'silver',
    points: 50,
    name: 'Cien llaves',
    desc: 'Resuelve 100 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 100,
  },
  {
    id: 'power5',
    group: 'collection',
    tier: 'silver',
    points: 25,
    name: 'Despertar',
    desc: 'Activa el poder de un héroe 5 veces',
    stat: 'powersUsed',
    goal: 5,
  },
  {
    id: 'power25',
    group: 'collection',
    tier: 'silver',
    points: 45,
    name: 'Fuerza interior',
    desc: 'Activa el poder de un héroe 25 veces',
    stat: 'powersUsed',
    goal: 25,
  },
  {
    id: 'shop5',
    group: 'collection',
    tier: 'silver',
    points: 30,
    name: 'Buen cliente',
    desc: 'Compra 5 objetos en la tienda de Aventura',
    stat: 'shopBuys',
    goal: 5,
  },
  {
    id: 'score5k',
    group: 'collection',
    tier: 'silver',
    points: 35,
    name: 'Tesoro del alba',
    desc: 'Alcanza 5.000 puntos en una partida',
    stat: 'bestScore',
    goal: 5000,
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
    name: 'Maestro artesano',
    desc: 'Consigue 5 estrellas en los 9 minijuegos',
    stat: 'mini5Kinds',
    goal: 9,
  },
  {
    id: 'boards250',
    group: 'collection',
    tier: 'gold',
    points: 100,
    name: 'Guardián de llaves',
    desc: 'Resuelve 250 tableros en Aventura',
    stat: 'boardsSolved',
    goal: 250,
  },
  {
    id: 'score25k',
    group: 'collection',
    tier: 'gold',
    points: 95,
    name: 'Fortuna real',
    desc: 'Alcanza 25.000 puntos en una partida',
    stat: 'bestScore',
    goal: 25000,
  },
  {
    id: 'cosmetic15',
    group: 'collection',
    tier: 'gold',
    points: 90,
    name: 'Coleccionista del alba',
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

export function earnedPoints(store = {}) {
  const claimed = store?.achClaimed || {};
  return ACHIEVEMENTS.reduce((sum, a) => sum + (claimed[a.id] ? a.points : 0), 0);
}

export function spentPoints(store = {}) {
  const owned = store?.shopOwned || {};
  let total = 0;
  for (const type of REWARD_TYPES) {
    for (const item of REWARDS[type]) {
      if (item.price > 0 && owned[rewardKey(type, item.id)]) total += item.price;
    }
  }
  return total;
}

export const achBalance = (store = {}) => Math.max(0, earnedPoints(store) - spentPoints(store));

export function collectAchievement(store, id, now = Date.now()) {
  const a = ACHIEVEMENTS.find((item) => item.id === id);
  if (!a || !store?.ach?.[id] || store?.achClaimed?.[id]) return null;
  const claimed = (store.achClaimed ||= {});
  claimed[id] = now;
  return { achievement: a, points: a.points, balance: achBalance(store) };
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
  owned[key] = now;
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
