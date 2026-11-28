/** Reto diario único: 15 tableros progresivos (mínimos de 3 a 17) con una reserva compartida de 152 turnos (150 es el mínimo exacto). */
import { byPath, minReach } from '../engine/difficulty.js';
import { buildLevel, pickBoard } from '../engine/levels.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { levelPlan } from './mechanics.js';

export const DAILY_TARGETS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
/** Suma de los mínimos de los 15 tableros: terminar con ≤ 150 turnos usados es el sello «150 exactos». */
export const DAILY_EXACT_BUDGET = DAILY_TARGETS.reduce((a, b) => a + b, 0);
/** Colchón de 2 turnos sobre el mínimo: un paso de más en un tablero temprano ya no hunde la partida (calibrado con simulate-challenge). */
export const DAILY_CUSHION = 2;
export const DAILY_TURN_BUDGET = DAILY_EXACT_BUDGET + DAILY_CUSHION;
/** «Rehacer tablero» (una vez por Desafío) devuelve como mucho 4 de los turnos gastados en el tablero: protege del dedazo, no sirve para explorar. */
export const DAILY_REDO_REFUND = 4;
/** Tablero a partir del cual el intento cuenta como victoria del día: medalla, racha y logros. */
export const DAILY_WIN_BOARD = 13;
export const DAILY_TOTAL_BOARDS = DAILY_TARGETS.length;
/** Familias de piezas que van apareciendo progresivamente del tablero 1 al 15. */
export const DAILY_FAMILIES = [
  'plain',
  'plain',
  'plain',
  'walls',
  'walls',
  'heavy',
  'heavy',
  'ice',
  'ice',
  'gates',
  'gates',
  'combo_wh',
  'combo_hg',
  'combo_whgi',
  'combo_whgi',
];
/** Hitos de premio del reto diario: llegar al tablero 10, 13 o 15 suma pistas extra para Aventura. */
export const DAILY_HINT_MILESTONES = [
  { board: 10, hints: 1 },
  { board: 13, hints: 2 },
  { board: 15, hints: 4 },
];

/** Pistas de premio según los tableros superados hoy (10 → +1, 13 → +2, 15 → +4). */
export const dailyHintReward = (cleared = 0) =>
  DAILY_HINT_MILESTONES.reduce((bonus, m) => (cleared >= m.board ? m.hints : bonus), 0);

/**
 * Tope de las pistas del Desafío al empezar una aventura, por camino. En Experto se empieza con 1 pista y las +5 del oro la
 * multiplicaban por 6 (≈ +1,2 niveles y +11 % de puntos en la simulación, más que el Farol de pistas): se limita a +2.
 */
export const DAILY_HINT_CAP = { 1: Infinity, 50: Infinity, 75: 2 };

/** Pistas extra ganadas hoy por el reto diario (para sumar al iniciar una aventura del camino `start`). */
export const streakHintBonus = (stateOrDays, day = dayNumber(), start = 1) => {
  const cap = byPath(DAILY_HINT_CAP, start);
  if (typeof stateOrDays === 'number') return Math.min(cap, dailyHintReward(stateOrDays));
  const res = todayResult(stateOrDays, DAILY_CHALLENGE.id, day);
  return Math.min(cap, dailyHintReward(res?.cleared || 0));
};

export const DAILY_CHALLENGE = {
  id: 'daily150',
  unlock: 0,
  icon: 'flame',
  name: 'Desafío',
  desc: '15 tableros · 152 turnos',
  families: DAILY_FAMILIES,
  targets: DAILY_TARGETS,
  ratings: [1, 100],
  level: 1,
};

export const CHALLENGES = [DAILY_CHALLENGE];
export const challengeById = () => DAILY_CHALLENGE;
export const challengeTargets = () => DAILY_TARGETS;

/* ───────────── fechas (hora local del jugador) ───────────── */

/** Número de día local (días desde 1970 en el calendario del jugador): cambia exactamente a su medianoche. */
export const dayNumber = (date = new Date()) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
/** «5 h 12 min» / «48 min» / «menos de 1 min». */
export function resetText(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000),
    h = Math.floor(min / 60),
    m = min % 60;
  return h ? `${h} h ${m} min` : m ? `${m} min` : 'menos de 1 min';
}

/* ───────────── desbloqueo (el reto diario siempre está abierto) ───────────── */

export const maxLevelReached = (paths = {}) =>
  Object.values(paths || {}).reduce((m, r) => Math.max(m, r?.level || 0), 0);

/* ───────────── el tablero del día ───────────── */

/** Genera el tablero `index` (0..14) del día con el mínimo exacto (3..17) y su mecánica progresiva. */
export function buildDaily(challenge, day, { levels, special }, index = 0, remaining = DAILY_TURN_BUDGET) {
  const target = DAILY_TARGETS[index];
  const seed = hash32(day, 1, 9001 + index);
  const preferred = DAILY_FAMILIES[index] || 'plain';
  const tryFamilies = preferred === 'plain' ? ['plain'] : [preferred, 'walls', 'plain'];
  let built = null;
  let chosenFamily = preferred;
  let chosenRating = 1;
  let baseWalls = [];

  for (const family of tryFamilies) {
    const bank = family === 'plain' ? levels : special?.[family];
    if (!bank) continue;
    const ratings = Object.keys(bank)
      .map((i) => Number(i) + 1)
      .filter((r) => bank[r - 1]?.length && minReach(r) >= target)
      .slice(0, 14);
    if (!ratings.length) continue;
    for (let attempt = 0; attempt < Math.min(6, ratings.length); attempt++) {
      const rating = ratings[(seed + attempt) % ratings.length];
      const base = pickBoard(levels, rating, seed + attempt * 31, index + 1, family, special);
      const candidate = buildLevel(base, { rating, target, rng: mulberry32(seed + attempt * 97) });
      if (candidate.opt === target) {
        built = candidate;
        chosenFamily = base.family;
        chosenRating = rating;
        baseWalls = candidate.walls || [];
        break;
      }
    }
    if (built) break;
  }

  if (!built) throw new Error(`Daily #${index + 1}: could not build target ${target}`);
  const zoneLevel = Math.min(21, Math.floor((index / DAILY_TOTAL_BOARDS) * 21) + 1);
  return {
    n: zoneLevel,
    rate: chosenRating,
    pieces: built.pieces,
    pos: built.pos.slice(),
    start: built.pos.slice(),
    walls: baseWalls,
    opt: built.opt,
    limit: Math.max(1, remaining),
    moves: 0,
    hist: [],
    bought: 0,
    family: chosenFamily,
    seal: null,
    done: false,
    els: [],
    plan: levelPlan(zoneLevel),
    daily: challenge?.id || DAILY_CHALLENGE.id,
  };
}

/**
 * Margen del Desafío: turnos que sobran sobre los mínimos de lo que falta. `used` = turnos de tableros ya superados,
 * `moves` = movimientos del tablero en curso (`index`, 0..14). Mientras no te pases del mínimo del tablero en curso el margen
 * no baja (supone que lo terminas en su mínimo); al pasarte, baja un punto por cada turno de más.
 */
export function dailyMargin({ used = 0, moves = 0, index = 0, opt = DAILY_TARGETS[index] }) {
  const later = DAILY_TARGETS.slice(index + 1).reduce((a, b) => a + b, 0);
  return DAILY_TURN_BUDGET - used - Math.max(moves, opt) - later;
}
/** «+2» / «+0» / «−3» (con el signo menos tipográfico). */
export const marginText = (m) => (m < 0 ? `−${-m}` : `+${m}`);

/* ───────────── medallas, racha y registro ───────────── */

/** Oro: 15 tableros · Plata: 14 tableros · Bronce: 13 tableros (o menos si no llegó). */
export function medalFor(clearedOrMoves, opt) {
  if (opt === undefined) {
    if (clearedOrMoves >= 15) return 'gold';
    if (clearedOrMoves >= 14) return 'silver';
    return 'bronze';
  }
  if (clearedOrMoves <= opt) return 'gold';
  return clearedOrMoves <= opt + Math.max(2, Math.ceil(opt * 0.15)) ? 'silver' : 'bronze';
}

export const emptyDaily = () => ({
  streak: 0,
  best: 0,
  last: -1,
  solved: 0,
  gold: 0,
  bestCleared: 0,
  by: {},
  days: {},
});
/** Racha vigente si se completó el reto hoy o ayer. */
export const currentStreak = (state, day) => (state && state.last >= day - 1 ? state.streak : 0);
export const todayResult = (state, id = DAILY_CHALLENGE.id, day = dayNumber()) => state?.days?.[day]?.[id] || null;

/**
 * Anota el resultado de un intento del reto diario (al llegar a 15 o al quedarse sin turnos).
 * Llegar a 13+ asegura la racha del día; las pistas de premio (10 → +1, 13 → +2, 15 → +4) salen de `dailyHintReward`.
 */
export function recordDaily(state, id, day, { cleared, used, opt = DAILY_TURN_BUDGET, boards = [] }) {
  const key = id || DAILY_CHALLENGE.id;
  const exact = cleared >= DAILY_TOTAL_BOARDS && used <= DAILY_EXACT_BUDGET; // sello «150 exactos»
  const medal = medalFor(cleared);
  const today = (state.days[day] ||= {});
  const prev = today[key] || null;
  const first = !prev;
  const improved =
    first || cleared > (prev.cleared || 0) || (cleared === (prev.cleared || 0) && used < (prev.used ?? Infinity));
  if (cleared >= DAILY_WIN_BOARD && (!prev || (prev.cleared || 0) < DAILY_WIN_BOARD)) {
    state.solved++;
    state.by[key] = (state.by[key] || 0) + 1;
  }
  state.bestCleared = Math.max(state.bestCleared || 0, cleared);
  if (cleared >= DAILY_TOTAL_BOARDS && (!prev || (prev.cleared || 0) < DAILY_TOTAL_BOARDS)) state.gold++;
  if (exact && !prev?.exact) state.exact = (state.exact || 0) + 1;
  if (improved)
    today[key] = { cleared, used, moves: used, opt, medal, boards, ...(exact || prev?.exact ? { exact: true } : {}) };
  else if (exact) prev.exact = true;
  let streakUp = false;
  if (cleared >= DAILY_WIN_BOARD && day > state.last) {
    state.streak = state.last === day - 1 ? state.streak + 1 : 1;
    state.last = day;
    state.best = Math.max(state.best, state.streak);
    streakUp = true;
  }
  for (const d of Object.keys(state.days)) if (Number(d) < day - 6) delete state.days[d];
  const best = today[key];
  return {
    medal: best.medal,
    cleared,
    bestCleared: best.cleared,
    hints: dailyHintReward(best.cleared),
    exact: !!best.exact,
    first,
    improved,
    streak: currentStreak(state, day),
    streakUp,
  };
}

export const dailyProgress = (store, id = DAILY_CHALLENGE.id) => store.dailyPlay?.challenges?.[id];

/** Conserva el avance del reto diario (tablero actual, turnos usados y posición) separado de la aventura. */
export function writeDailyProgress(store, daily, progress) {
  if (store.dailyPlay?.day > daily.day) return;
  if (store.dailyPlay?.day !== daily.day) store.dailyPlay = { day: daily.day, challenges: {} };
  const previous = store.dailyPlay.challenges[daily.id];
  store.dailyPlay.challenges[daily.id] = {
    ...progress,
    updatedAt: Math.max(Date.now(), (previous?.updatedAt || 0) + 1),
  };
}

/** Texto para compartir el resultado del día. */
export function shareText(challenge, day, result, streak, { name = challenge.name, streakUnit = '' } = {}) {
  const cleared = result.cleared ?? result.boards?.filter(Boolean).length ?? 0;
  const used = result.used ?? result.moves ?? 0;
  const streakPart = streak > 1 ? ` · ${streak}${streakUnit ? ` ${streakUnit}` : ''}` : '';
  return `DAWNSLIDE · ${name} #${day} · ${cleared}/${DAILY_TOTAL_BOARDS} · ${used}/${DAILY_TURN_BUDGET}${streakPart}`;
}
