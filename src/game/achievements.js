/**
 * Personalizar: tablero, fichas, llave y atuendos. Cada objeto se desbloquea al hacer algo en el juego (UNLOCKS);
 * no hay puntos, logros que reclamar ni tienda. Los 113 logros siguen existiendo por dentro como registro de
 * acciones (ACHIEVEMENTS) porque viajan en el código QR de guardado.
 * Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';
import { PLAN } from './unlock-plan.js';
import { OUTFITS, RARITY, RARITY_ORDER, REWARDS } from './reward-data.js';

export { OUTFITS, RARITY, RARITY_ORDER, REWARDS };

export const REWARD_TYPES = Object.keys(REWARDS);
export const DEFAULT_LOOK = {
  board: 'wood',
  pieces: 'paint',
  key: 'red',
  fx: 'none',
  music: 'menu',
  cover: 'alba-arcana',
  bg: 'bosque-cascada',
  card: 'mision',
  trail: 'none',
  aura: 'none',
  ui: 'ink',
};

/**
 * Objetos que ya existían (y se podían comprar con puntos) antes de que todo se desbloqueara jugando, en su orden histórico.
 * Lo que ya tenías de esta lista se conserva siempre; el formato del código QR también lee estas listas por posición.
 */
// prettier-ignore
export const LEGACY_REWARDS = {
  board: ['wood', 'slate', 'amber', 'marble', 'sapphire', 'jade', 'crimson', 'ivory', 'celestial', 'obsidian', 'tide', 'sakura', 'dawnfire'],
  pieces: ['paint', 'stone', 'glass', 'night', 'ceramic', 'brass', 'runic', 'lacquer', 'oldgold', 'frostedge', 'neon', 'ember'],
  key: ['red', 'amber', 'iron', 'emerald', 'sapphire', 'rose', 'crystal', 'obsidian', 'star', 'gold', 'moon', 'phoenix', 'eclipse'],
  fx: ['none', 'embers', 'sparks', 'petals', 'ink', 'frost', 'stars', 'aurora', 'prism', 'fireworks'],
  music: ['menu', 'z0', 'z1', 'z2', 'z3', 'z4', 'heroes', 'z5', 's0', 's1', 'fate', 'z6', 's2'],
  cover: ['alba-arcana', 'lia', 'van', 'jean', 'battle', 'victory'],
};

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
  // Rebalance del roguelite (van al final: el código de guardado los lee en este orden)
  'emberBoards', // tableros con la Brasa intacta de Lía
  'bestGrade', // mejor rango de victoria (1 C · 2 B · 3 A · 4 S · 5 S+), marca máxima
  'maxPactsWin', // más Pactos llevados en una aventura ganada, marca máxima
  'fateCap', // 1 si alguna vez se ganó un tablero con las cartas en el tope de puntos
  'cleanRun', // 1 si se completó una aventura sin pistas
  'oathWin', // 1 si se completó una aventura con Juramento
  'challengePure', // 1 si se completó una senda de Desafío sin usar la reliquia
  'dailyBestDay', // más retos diarios distintos completados en un mismo día, marca máxima
  'relicsSeen', // máscara de bits: reliquias de Aventura usadas
  'heroWins', // máscara de bits: héroes con los que se completó una aventura
  'fateSeen', // máscara de bits: cartas del destino elegidas alguna vez
  'heroHardWins', // máscara de bits: héroes con los que se completó Difícil o Experto (al final para compatibilidad v5)
];

/** Contadores que son máscaras de bits (se marcan con `flagStat` y se leen contando bits). */
export const FLAG_STATS = ['relicsSeen', 'heroWins', 'heroHardWins', 'fateSeen'];
const bitCount = (n) => {
  let c = 0;
  for (let x = Number(n) || 0; x > 0; x = Math.floor(x / 2)) c += x % 2;
  return c;
};

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
  // el reto Maestro se retiró: cuenta el Desafío actual (y los antiguos «Todo junto» / Maestro)
  masterSolved: (store) =>
    (store.daily?.by?.daily150 || 0) + (store.daily?.by?.all || 0) + (store.daily?.by?.master || 0),
  dailyKinds: (store) => CHALLENGES.filter((c) => store.daily?.by?.[c.id]).length,
  dailyBestBoard: (store) =>
    Math.max(
      Number(store.daily?.bestCleared) || 0,
      ...Object.values(store.daily?.days || {}).flatMap((d) =>
        Object.values(d || {}).map((r) => Number(r?.cleared) || 0),
      ),
    ),
  challengeBest: (store) =>
    Math.max(
      STATS.dailyBestBoard(store),
      Number(store.survivalBest) || 0,
      ...Object.values(store.survivalBests || {}).map(Number),
    ),
  challenge150Won: (store) => (STATS.dailyBestBoard(store) >= 13 || store.survivalWon?.['150'] ? 1 : 0),
  challenge200Won: (store) => (STATS.dailyBestBoard(store) >= 14 || store.survivalWon?.['200'] ? 1 : 0),
  challenge250Won: (store) => (STATS.dailyBestBoard(store) >= 15 || store.survivalWon?.['250'] ? 1 : 0),
  challengeWonCount: (store) => {
    const best = STATS.dailyBestBoard(store);
    const milestones = best >= 15 ? 3 : best >= 14 ? 2 : best >= 13 ? 1 : 0;
    return Math.max(milestones, Object.values(store.survivalWon || {}).filter(Boolean).length);
  },
  cosmeticsOwned: (store) => Object.keys(store.shopOwned || {}).length,
  relicsSeenCount: (store) => bitCount(store.stats?.relicsSeen),
  heroWinsCount: (store) => bitCount((Number(store.stats?.heroWins) || 0) & 7),
  heroHardWinsCount: (store) => bitCount((Number(store.stats?.heroHardWins) || 0) & 7),
  heroBoardsLia: (store) => Number(store.stats?.heroBoards_lia) || 0,
  heroBoardsJean: (store) => Number(store.stats?.heroBoards_jean) || 0,
  heroBoardsVan: (store) => Number(store.stats?.heroBoards_van) || 0,
  heroWinLia: (store) => ((Number(store.stats?.heroWins) || 0) & 1 ? 1 : 0),
  heroWinJean: (store) => ((Number(store.stats?.heroWins) || 0) & 2 ? 1 : 0),
  heroWinVan: (store) => ((Number(store.stats?.heroWins) || 0) & 4 ? 1 : 0),
  heroHardWinLia: (store) => ((Number(store.stats?.heroHardWins) || 0) & 1 ? 1 : 0),
  heroHardWinJean: (store) => ((Number(store.stats?.heroHardWins) || 0) & 2 ? 1 : 0),
  heroHardWinVan: (store) => ((Number(store.stats?.heroHardWins) || 0) & 4 ? 1 : 0),
  fateSeenCount: (store) => bitCount(store.stats?.fateSeen),
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

/** Marca el bit `bit` (0..30) de una estadística máscara (`FLAG_STATS`). Devuelve true si es nuevo. */
export function flagStat(store, name, bit) {
  if (!FLAG_STATS.includes(name)) throw new Error(`unknown flag stat: ${name}`);
  if (!(bit >= 0 && bit <= 30)) return false;
  const stats = (store.stats ||= {});
  const before = Number(stats[name]) || 0;
  const after = before | (1 << bit);
  stats[name] = after;
  return after !== before;
}

const HERO_BITS = ['lia', 'jean', 'van'];
const RELIC_BITS = ['sun', 'purse', 'lantern'];
const GRADE_VALUE = { C: 1, B: 2, A: 3, S: 4, 'S+': 5 };

/** Al empezar una aventura: anota la reliquia (para «Relicario»). */
export function adventureStartStats(store, run) {
  return flagStat(store, 'relicsSeen', RELIC_BITS.indexOf(run?.relic));
}

/**
 * Al completar una aventura: héroe, rango, Pactos, sin pistas y Juramento. `grade` es el de `runGrade` ('S+', 'S'…),
 * `pacts` cuántos Pactos llevaba y `oath` si uno era Juramento. Devuelve true si algo cambió.
 */
export function victoryStats(store, { hero, start = 1, grade, pacts = 0, oath = false, helped = false }) {
  let changed = flagStat(store, 'heroWins', HERO_BITS.indexOf(hero));
  if (start >= 50) changed = flagStat(store, 'heroHardWins', HERO_BITS.indexOf(hero)) || changed;
  changed = raiseStat(store, 'bestGrade', GRADE_VALUE[grade] || 0) || changed;
  changed = raiseStat(store, 'maxPactsWin', pacts) || changed;
  if (!helped) changed = raiseStat(store, 'cleanRun', 1) || changed;
  if (oath) changed = raiseStat(store, 'oathWin', 1) || changed;
  return changed;
}

/** Al ganar un tablero de Aventura: Brasa intacta y cartas en el tope de puntos. */
export function boardWinStats(store, { ember = false, capped = false, hero = null }) {
  if (ember) bumpStat(store, 'emberBoards');
  const top = capped && raiseStat(store, 'fateCap', 1);
  // Tableros resueltos con cada héroe (para desbloquear sus atuendos): no viaja en el QR, solo en el guardado local
  const hero_ = HERO_BITS.includes(hero);
  if (hero_) {
    const stats = (store.stats ||= {});
    stats[`heroBoards_${hero}`] = (Number(stats[`heroBoards_${hero}`]) || 0) + 1;
  }
  return ember || top || hero_;
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

/**
 * Registro interno de acciones: id, estadística (STATS) y meta. `store.ach` marca cuáles se han cumplido. Ya no se ven ni se
 * reclaman, pero VIAJAN en el código QR de guardado (formatos v4/v5 leen estos id por su POSICIÓN): no borrar ni reordenar,
 * añadir solo al final (tests/compat.test.js lo comprueba contra una captura).
 */
// prettier-ignore
export const ACHIEVEMENTS = `
firstWin boardsSolved 1
hard10 hardLevel 6
city1 maxLevel 6
expert10 expertLevel 6
heroes2 heroes 2
lv25 maxLevel 9
hard75 hardLevel 19
lv50 maxLevel 12
expert50 expertLevel 15
lv75 maxLevel 16
lv90 maxLevel 19
heroes heroes 3
hard25 hardLevel 9
hard50 hardLevel 15
expert25 expertLevel 9
lv100 maxLevel 21
done completed 1
hard100 hardDone 1
expert expertDone 1
paths3 paths 3
pact1 pacts 1
perf5 perfects 35
goldSeal1 bestRunStreak 6
icerock5 iceRock 20
locks5 locks 20
perf10 perfects 75
perf25 perfects 140
perf50 perfects 220
icerock iceRock 55
locks locks 55
heavy10 heavyBoards 20
heavy25 heavyBoards 55
fate9 fateCards 12
fate27 fateCards 36
clean cleanCity 7
perf100 perfects 400
perf200 perfects 650
icerock75 iceRock 160
fate81 fateCards 100
clean5 cleanCity 21
chBoard1 challengeBoards 1
chBoard3 challengeBoards 3
chRelicUse challengeBest 3
chLvl5 challengeBest 5
chRoutes2 challengeBoards 6
chBoard10 challengeBoards 10
chBoard20 challengeBoards 20
chBoard30 challengeBoards 30
chBoard50 challengeBoards 50
chRelicUse10 challengeBest 7
chRelics3 relicsSeenCount 3
chRoutes3 challengeBest 12
chLvl8 challengeBest 8
chLvl10 challengeBest 10
chLvl14 challengeBest 14
chBoard100 challengeBoards 100
ch150 challenge150Won 1
ch200 challenge200Won 1
ch250 challenge250Won 1
chAll challengeWonCount 3
day1 dailySolved 1
day3 dailySolved 3
gold1 dailyGold 1
streak2 bestStreak 2
kinds2 challengeBoards 15
day7 dailySolved 7
day15 dailySolved 15
day30 dailySolved 30
kinds dailyKinds 1
streak3 bestStreak 3
streak7 bestStreak 7
streak14 bestStreak 14
gold5 dailyGold 5
gold10 dailyGold 10
master masterSolved 1
day100 dailySolved 100
streak30 bestStreak 30
gold25 dailyGold 25
day50 dailySolved 50
master5 masterSolved 5
streak10 bestRunStreak 10
power1 powersUsed 15
shop1 fateCards 6
score1k bestScore 15000
cosmetic1 cosmeticsOwned 1
mini1 pacts 8
mini3 pacts 25
mini5 fateCards 60
boards50 boardsSolved 63
boards100 boardsSolved 147
power5 powersUsed 60
power25 powersUsed 220
shop5 bestRunStreak 15
score5k bestScore 45000
cosmetic5 cosmeticsOwned 5
mini9 completed 8
boards250 boardsSolved 315
score25k bestScore 80000
cosmetic15 cosmeticsOwned 15
cosmetic30 cosmeticsOwned 30
gradeS bestGrade 4
gradeSPlus bestGrade 5
relics3 relicsSeenCount 3
heroWins3 heroWinsCount 3
cleanRun cleanRun 1
oathWin oathWin 1
ember25 emberBoards 25
pacts3win maxPactsWin 3
fateCap fateCap 1
fateAll fateSeenCount 31
streak21 bestRunStreak 21
dailyAll dailyBestBoard 15
chPure challengePure 1
`
  .trim()
  .split('\n')
  .map((line) => {
    const [id, stat, goal] = line.split(' ');
    return { id, stat, goal: Number(goal) };
  });

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
export const UNLOCK_TEXT = {
  boardsSolved: (n) => (n === 1 ? 'Resuelve tu primer tablero en Aventura' : `Resuelve ${n} tableros en Aventura`),
  maxLevel: (n) => `Llega al nivel ${n} en Aventura`,
  hardLevel: (n) => `Llega al nivel ${n} en el camino Difícil`,
  expertLevel: (n) => `Llega al nivel ${n} en el camino Experto`,
  hardDone: () => 'Completa el camino Difícil',
  expertDone: () => 'Completa el camino Experto',
  paths: () => 'Completa los tres caminos',
  completed: (n) => (n === 1 ? 'Completa una aventura entera' : `Completa ${n} aventuras enteras`),
  heroes: (n) => (n >= 3 ? 'Juega una partida con cada héroe' : `Juega con ${n} héroes distintos`),
  heroWinLia: () => 'Completa el modo Normal con Lía',
  heroWinJean: () => 'Completa el modo Normal con Jean',
  heroWinVan: () => 'Completa el modo Normal con Juth',
  heroHardWinLia: () => 'Completa el modo Difícil con Lía',
  heroHardWinJean: () => 'Completa el modo Difícil con Jean',
  heroHardWinVan: () => 'Completa el modo Difícil con Juth',
  heroWinsCount: () => 'Completa el modo Normal con los 3 héroes',
  heroHardWinsCount: () => 'Completa el modo Difícil con los 3 héroes',
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
  dailyBestBoard: (n) => `Completa el tablero ${n} del Desafío`,
  masterSolved: (n) => `Resuelve ${n} retos diarios Todo junto`,
  challengeBoards: (n) => `Supera ${n} tableros en Desafío`,
  challengeBest: (n) => `Completa el tablero ${n} del Desafío`,
  challengeWonCount: (n) => `Completa el tablero ${Math.min(15, 12 + n)} del Desafío`,
  maxPactsWin: (n) => `Completa una aventura llevando ${n} Pactos`,
  cleanRun: () => 'Completa una aventura sin usar ninguna pista',
  oathWin: () => 'Completa una aventura con el Pacto Juramento',
  relicsSeenCount: (n) => `Usa ${n} reliquias distintas`,
  challenge250Won: () => 'Completa el tablero 15 del Desafío',
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
  const hardWins = Number(store.stats?.heroHardWins) || 0;
  if (hardWins > 0) {
    const hasHardWin = listOf(store, 'paths').some((p) => p >= 50);
    if (!hasHardWin) {
      store.stats.fateSeen = (Number(store.stats.fateSeen) || 0) | hardWins;
      store.stats.heroHardWins = 0;
      changed = true;
    } else if (hardWins > 7) {
      store.stats.fateSeen = (Number(store.stats.fateSeen) || 0) | hardWins;
      store.stats.heroHardWins = hardWins & 7;
      changed = true;
    }
  }
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

/**
 * Atuendos: 10 conjuntos de traje por héroe, 15 en todos (el primero es el de serie). Cada uno cambia al héroe en la aventura
 * (cuerpo entero) y en la selección de personaje (busto y pose). Las imágenes salen de scripts/slice-outfits.mjs.
 * El id interno de Juth sigue siendo `van`.
 */
/** Traje de serie de cada héroe (el primero de su primera lámina): no hay que desbloquearlo. */
export const DEFAULT_OUTFIT = { lia: 'capitana', jean: 'vigia', van: 'escriba' };

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
      if (owned[key] || !UNLOCKS[rewardKey('outfit', key)] || !unlockProgress('outfit', key, store).done) continue;
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

/** Imagen de un atuendo: `adv` cuerpo entero, `sel` retrato pasivo y `act` retrato de combate. */
/** Versión de cada traje en la URL (la caché del service worker es por URL): se sube al cambiar sus imágenes. */
const OUTFIT_ART_REV = {
  'lia:capitana': 5,
  'lia:ingeniera': 5,
  'lia:brasas': 6,
  'jean:vigia': 5,
  'jean:sakura': 5,
  'jean:oni': 5,
  'van:escriba': 5,
  'van:carmesi': 5,
  'van:cuervos': 5,
};
export const outfitArt = (hero, id, pose) =>
  `imagenes/atuendo-${hero}-${id}-${pose}.webp?v=${OUTFIT_ART_REV[`${hero}:${id}`] || 3}`;

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
