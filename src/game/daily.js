/** Retos diarios de tres tableros, determinados por la fecha local y el tipo de reto. */
import { minReach, moveLimit } from '../engine/difficulty.js';
import { buildLevel, pickBoard } from '../engine/levels.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { levelPlan } from './mechanics.js';

export const DAILY_TARGETS = [5, 8, 12];
export const STREAK_HINT_REWARDS = [
  { days: 3, hints: 5 },
  { days: 5, hints: 10 },
  { days: 7, hints: 15 },
];
export const streakHintBonus = (days) =>
  STREAK_HINT_REWARDS.reduce((bonus, reward) => (days >= reward.days ? reward.hints : bonus), 0);
/** `level` solo decide la ciudad de fondo y su música; `ratings` es el tramo de dificultad del banco del que sale el tablero. */
export const CHALLENGES = [
  {
    id: 'classic',
    unlock: 0,
    icon: 'flag',
    name: 'Clásico',
    desc: 'Sin piezas especiales',
    families: ['plain'],
    level: 4,
  },
  {
    id: 'frost',
    unlock: 20,
    icon: 'ice',
    name: 'Rocas y hielo',
    desc: 'Un día rocas, otro hielo',
    families: ['walls', 'ice'],
    level: 54,
  },
  {
    id: 'gears',
    unlock: 30,
    icon: 'lock',
    name: 'Mecanismos',
    desc: 'Candados y piezas pesadas',
    families: ['combo_hg'],
    level: 44,
  },
  {
    id: 'all',
    unlock: 50,
    icon: 'crystal',
    name: 'Todo junto',
    desc: 'Todas las piezas especiales',
    families: ['combo_whgid'],
    ratings: [88, 90],
    level: 84,
  },
  {
    id: 'master',
    unlock: 100,
    icon: 'crown',
    name: 'Maestro',
    desc: 'Todas las piezas, sin margen',
    families: ['combo_whgid'],
    ratings: [98, 100],
    level: 94,
    tight: true,
  },
];
export const challengeById = (id) => CHALLENGES.find((c) => c.id === id) || CHALLENGES[0];

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

/* ───────────── desbloqueo por avance en Aventura ───────────── */

/** Nivel más alto alcanzado en cualquier camino (queda para siempre, aunque se pierda la partida). */
export const maxLevelReached = (paths = {}) =>
  Object.values(paths || {}).reduce((m, r) => Math.max(m, r?.level || 0), 0);
export const isUnlocked = (challenge, maxLevel) => maxLevel >= challenge.unlock;

/* ───────────── el tablero del día ───────────── */

/** Genera la etapa indicada con el mínimo exacto y la mecánica propia del reto. */
export function buildDaily(challenge, day, { levels, special }, index = 0) {
  const target = DAILY_TARGETS[index];
  const seed = hash32(day, CHALLENGES.indexOf(challenge) + 1, 9001 + index);
  const family = challenge.families[day % challenge.families.length];
  const bank = family === 'plain' ? levels : special[family];
  const [lo, hi] = challenge.ratings || [1, 100];
  const ratings = Object.keys(bank)
    .map((i) => Number(i) + 1)
    .filter((r) => r >= lo && r <= hi && bank[r - 1]?.length && minReach(r) >= target)
    .slice(0, 8);
  const rating = ratings[seed % ratings.length];
  const base = pickBoard(levels, rating, seed, index + 1, family, special);
  const built = buildLevel(base, { rating, target, rng: mulberry32(seed) });
  if (built.opt !== target) throw new Error(`Daily ${challenge.id}: expected ${target} moves, got ${built.opt}`);
  const limit = moveLimit(built.opt, 1, challenge.level, false, challenge.tight ? 1.15 : false);
  return {
    n: challenge.level,
    rate: rating,
    pieces: built.pieces,
    pos: built.pos.slice(),
    start: built.pos.slice(),
    walls: built.walls || [],
    doors: built.doors || [],
    opt: built.opt,
    limit,
    moves: 0,
    hist: [],
    bought: 0,
    family: base.family,
    tutorial: null,
    seal: null,
    timeLimit: 0,
    timeLeft: 0,
    done: false,
    els: [],
    plan: { ...levelPlan(challenge.level), boss: false },
    daily: challenge.id,
  };
}

/* ───────────── medallas, racha y registro ───────────── */

export const MEDALS = ['bronze', 'silver', 'gold'];
/** Oro: en el mínimo exacto · Plata: hasta un 15 % más (al menos 2 movimientos) · Bronce: resuelto. */
export function medalFor(moves, opt) {
  if (moves <= opt) return 'gold';
  return moves <= opt + Math.max(2, Math.ceil(opt * 0.15)) ? 'silver' : 'bronze';
}
const rank = (medal) => MEDALS.indexOf(medal);

export const emptyDaily = () => ({ streak: 0, best: 0, last: -1, solved: 0, gold: 0, by: {}, days: {} });
/** Racha vigente si se completó algún reto hoy o ayer. */
export const currentStreak = (state, day) => (state && state.last >= day - 1 ? state.streak : 0);
/** Resultado de hoy en un reto ({moves, opt, medal}) o null. */
export const streakEarned = (state, day) => state?.last === day;
export const todayResult = (state, id, day) => state?.days?.[day]?.[id] || null;
/**
 * Anota un reto resuelto. Devuelve { medal, first (primera vez hoy), improved (mejor medalla o menos movimientos), streak, streakUp }.
 * Cualquier reto completo cuenta para la racha, una sola vez por día.
 */
export function recordDaily(state, id, day, moves, opt, boards) {
  const medal = medalFor(moves, opt);
  const today = (state.days[day] ||= {}),
    prev = today[id] || null;
  const first = !prev,
    improved = first || (boards && !prev.boards) || rank(medal) > rank(prev.medal) || moves < prev.moves;
  if (first) {
    state.solved++;
    state.by[id] = (state.by[id] || 0) + 1;
  }
  if (medal === 'gold' && (!prev || prev.medal !== 'gold')) state.gold++;
  if (improved || (boards && moves === prev?.moves)) today[id] = { moves, opt, medal, ...(boards ? { boards } : {}) };
  let streakUp = false;
  if (day > state.last) {
    state.streak = state.last === day - 1 ? state.streak + 1 : 1;
    state.last = day;
    state.best = Math.max(state.best, state.streak);
    streakUp = true;
  }
  for (const d of Object.keys(state.days)) if (Number(d) < day - 6) delete state.days[d]; // solo se guarda la última semana
  return { medal: today[id].medal, first, improved, streak: currentStreak(state, day), streakUp };
}
export const dailyProgress = (store, id, day) =>
  store.dailyPlay?.day === day ? store.dailyPlay.challenges[id] : undefined;

/** Conserva la partida y las marcas por tablero separadas de la aventura. */
export function writeDailyProgress(store, daily, progress) {
  if (store.dailyPlay?.day > daily.day) return;
  if (store.dailyPlay?.day !== daily.day) store.dailyPlay = { day: daily.day, challenges: {} };
  const previous = store.dailyPlay.challenges[daily.id];
  store.dailyPlay.challenges[daily.id] = {
    ...progress,
    updatedAt: Math.max(Date.now(), (previous?.updatedAt || 0) + 1),
  };
}

/** Texto para compartir, sin desvelar la solución. */
export const shareText = (challenge, day, result, streak) =>
  `DAWNSLIDE · ${challenge.name} #${day} · ${result.moves}/${result.opt}${streak > 1 ? ` · ${streak}` : ''}`;
