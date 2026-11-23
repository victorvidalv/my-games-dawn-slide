/**
 * Estadísticas del jugador: contadores, marcas máximas, banderas y colecciones que se anotan al jugar, y la vista
 * derivada `statsOf` con la que se comprueban logros y desbloqueos. Lógica pura (sin DOM).
 */
import { CHALLENGES, maxLevelReached } from './daily.js';
import { survivalBestLevel, survivalCompletedCount, survivalWonFor } from './survival.js';

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
];

/** Contadores que son máscaras de bits (se marcan con `flagStat` y se leen contando bits). */
export const FLAG_STATS = ['relicsSeen', 'heroWins', 'fateSeen'];
const bitCount = (n) => {
  let c = 0;
  for (let x = Number(n) || 0; x > 0; x = Math.floor(x / 2)) c += x % 2;
  return c;
};

const COLLECTIONS = ['heroes', 'paths', 'mini5Kinds', 'challengeRelics', 'challengeRoutesPlayed'];

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
  relicsSeenCount: (store) => bitCount(store.stats?.relicsSeen),
  heroWinsCount: (store) => bitCount(store.stats?.heroWins),
  heroBoardsLia: (store) => Number(store.stats?.heroBoards_lia) || 0,
  heroBoardsJean: (store) => Number(store.stats?.heroBoards_jean) || 0,
  heroBoardsVan: (store) => Number(store.stats?.heroBoards_van) || 0,
  heroWinLia: (store) => ((Number(store.stats?.heroWins) || 0) & 1 ? 1 : 0),
  heroWinJean: (store) => ((Number(store.stats?.heroWins) || 0) & 2 ? 1 : 0),
  heroWinVan: (store) => ((Number(store.stats?.heroWins) || 0) & 4 ? 1 : 0),
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
const ACH_RETIRED = { lv5: 10, lv20: 15, lv35: 30, lv65: 40, perf1: 10, fate1: 15, boards10: 15 };
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
export function victoryStats(store, { hero, grade, pacts = 0, oath = false, helped = false }) {
  let changed = flagStat(store, 'heroWins', HERO_BITS.indexOf(hero));
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
