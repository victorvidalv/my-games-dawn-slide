/** Reto diario único: 15 tableros progresivos (mínimos de 3 a 17) con una reserva compartida de 150 turnos exactos. */
import { minReach } from '../engine/difficulty.js';
import { buildLevel, pickBoard } from '../engine/levels.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { levelPlan } from './mechanics.js';

export const DAILY_TURN_BUDGET = 150;
export const DAILY_TARGETS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
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
/** Hitos de premio del reto diario: llegar al tablero 13, 14 o 15 suma pistas extra para Aventura. */
export const DAILY_HINT_MILESTONES = [
  { board: 13, hints: 1 },
  { board: 14, hints: 3 },
  { board: 15, hints: 5 },
];
export const STREAK_HINT_REWARDS = DAILY_HINT_MILESTONES;

/** Pistas de premio según los tableros superados hoy (13 → +1, 14 → +3, 15 → +5). */
export const dailyHintReward = (cleared = 0) =>
  DAILY_HINT_MILESTONES.reduce((bonus, m) => (cleared >= m.board ? m.hints : bonus), 0);

/** Pistas extra ganadas hoy por el reto diario (para sumar al iniciar Aventura). */
export const streakHintBonus = (stateOrDays, day = dayNumber()) => {
  if (typeof stateOrDays === 'number') return dailyHintReward(stateOrDays);
  const res = todayResult(stateOrDays, DAILY_CHALLENGE.id, day);
  return dailyHintReward(res?.cleared || 0);
};

export const DAILY_CHALLENGE = {
  id: 'daily150',
  unlock: 0,
  icon: 'flame',
  name: 'Desafío',
  desc: '15 tableros · 150 turnos exactos',
  families: DAILY_FAMILIES,
  targets: DAILY_TARGETS,
  ratings: [1, 100],
  level: 1,
};

export const CHALLENGES = [DAILY_CHALLENGE];
export const challengeById = () => DAILY_CHALLENGE;
export const challengeTargets = () => DAILY_TARGETS;
export const todayFamily = (_challenge, _day, index = 0) => DAILY_FAMILIES[index] || 'plain';

/* ───────────── fechas (hora local del jugador) ───────────── */

/** Número de día local (días desde 1970 en el calendario del jugador): cambia exactamente a su medianoche. */
export const dayNumber = (date = new Date()) =>
  Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
/** Milisegundos que faltan para la próxima medianoche local. */
export const msToReset = (date = new Date()) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - date.getTime();
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
export const isUnlocked = () => true;

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
    tutorial: null,
    seal: null,
    done: false,
    els: [],
    plan: levelPlan(zoneLevel),
    daily: challenge?.id || DAILY_CHALLENGE.id,
  };
}

/* ───────────── medallas, racha y registro ───────────── */

export const MEDALS = ['bronze', 'silver', 'gold'];
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
export const streakEarned = (state, day) => state?.last === day;
export const todayResult = (state, id = DAILY_CHALLENGE.id, day = dayNumber()) => state?.days?.[day]?.[id] || null;

/**
 * Anota el resultado de un intento del reto diario (al llegar a 15 o al quedarse sin turnos).
 * Llegar a 13+ asegura la racha del día y otorga las pistas de premio (13 → +1, 14 → +3, 15 → +5).
 */
export function recordDaily(state, id, day, { cleared, used, opt = DAILY_TURN_BUDGET, boards = [] }) {
  const key = id || DAILY_CHALLENGE.id;
  const medal = medalFor(cleared);
  const today = (state.days[day] ||= {});
  const prev = today[key] || null;
  const first = !prev;
  const improved =
    first || cleared > (prev.cleared || 0) || (cleared === (prev.cleared || 0) && used < (prev.used ?? Infinity));
  if (cleared >= 13 && (!prev || (prev.cleared || 0) < 13)) {
    state.solved++;
    state.by[key] = (state.by[key] || 0) + 1;
  }
  state.bestCleared = Math.max(state.bestCleared || 0, cleared);
  if (cleared >= DAILY_TOTAL_BOARDS && (!prev || (prev.cleared || 0) < DAILY_TOTAL_BOARDS)) state.gold++;
  if (improved) today[key] = { cleared, used, moves: used, opt, medal, boards };
  let streakUp = false;
  if (cleared >= 13 && day > state.last) {
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
    first,
    improved,
    streak: currentStreak(state, day),
    streakUp,
  };
}

export const dailyProgress = (store, id = DAILY_CHALLENGE.id, day = dayNumber()) =>
  store.dailyPlay?.day === day ? store.dailyPlay.challenges?.[id] : undefined;

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
