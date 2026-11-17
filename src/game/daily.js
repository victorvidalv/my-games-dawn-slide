/**
 * Retos diarios: tableros sueltos, los mismos para todos los jugadores, que cambian a la medianoche local.
 *
 *   Clásico        siempre abierto      sin piezas especiales, mínimo de 15 movimientos o más (es el que cuenta para la racha)
 *   Rocas y hielo  nivel 25 en Aventura un día rocas, al siguiente hielo
 *   Mecanismos     nivel 50             candados y piezas pesadas
 *   Todo junto     nivel 75             todas las piezas especiales
 *   Maestro        nivel 100            todas las piezas y el límite ajustado de un jefe
 *
 * El tablero sale de la fecha (no hay servidor): mismo día + mismo reto = mismo tablero en cualquier dispositivo.
 * Sin héroe, sin tienda y sin pistas: solo el tablero. Se puede repetir cuantas veces se quiera; la medalla es la mejor del día.
 * Lógica pura (sin DOM): la interfaz está en src/ui/daily.js.
 */
import { moveLimit } from '../engine/difficulty.js';
import { buildLevel, pickBoard, varyBoard } from '../engine/levels.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { levelPlan } from './mechanics.js';

export const DAILY_MIN_MOVES = 15;
/** `level` solo decide la ciudad de fondo y su música; `ratings` es el tramo de dificultad del banco del que sale el tablero. */
export const CHALLENGES = [
  { id: 'classic', unlock: 0, icon: 'flag', name: 'Clásico', desc: 'Sin piezas especiales', families: ['plain'], ratings: [40, 54], level: 4 },
  { id: 'frost', unlock: 25, icon: 'ice', name: 'Rocas y hielo', desc: 'Un día rocas, otro hielo', families: ['walls', 'ice'], ratings: [42, 58], level: 54 },
  { id: 'gears', unlock: 50, icon: 'lock', name: 'Mecanismos', desc: 'Candados y piezas pesadas', families: ['combo_hg'], ratings: [52, 68], level: 44 },
  { id: 'all', unlock: 75, icon: 'crystal', name: 'Todo junto', desc: 'Todas las piezas especiales', families: ['combo_whgid'], ratings: [88, 90], level: 84 },
  { id: 'master', unlock: 100, icon: 'crown', name: 'Maestro', desc: 'Todas las piezas, sin margen', families: ['combo_whgid'], ratings: [98, 100], level: 94, tight: true },
];
export const challengeById = (id) => CHALLENGES.find((c) => c.id === id) || CHALLENGES[0];
/** El reto que mantiene la racha de días. */
export const STREAK_CHALLENGE = 'classic';

/* ───────────── fechas (hora local del jugador) ───────────── */

/** Número de día local (días desde 1970 en el calendario del jugador): cambia exactamente a su medianoche. */
export const dayNumber = (date = new Date()) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
/** Milisegundos que faltan para la próxima medianoche local. */
export const msToReset = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime() - date.getTime();
/** «5 h 12 min» / «48 min» / «menos de 1 min». */
export function resetText(ms) {
  const min = Math.floor(Math.max(0, ms) / 60000), h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${m} min` : m ? `${m} min` : 'menos de 1 min';
}

/* ───────────── desbloqueo por avance en Aventura ───────────── */

/** Nivel más alto alcanzado en cualquier camino (queda para siempre, aunque se pierda la partida). */
export const maxLevelReached = (paths = {}) => Object.values(paths || {}).reduce((m, r) => Math.max(m, r?.level || 0), 0);
export const isUnlocked = (challenge, maxLevel) => maxLevel >= challenge.unlock;

/* ───────────── el tablero del día ───────────── */

const seedOf = (challenge, day) => hash32(day, CHALLENGES.indexOf(challenge) + 1, 9001);
/**
 * Tablero del reto `challenge` para el día `day`: determinista, con solución y con el mínimo exigido.
 * Devuelve el mismo objeto de tablero que usa la aventura (pieces, pos, opt, limit…).
 */
export function buildDaily(challenge, day, { levels, special }) {
  const seed = seedOf(challenge, day), [lo, hi] = challenge.ratings;
  const family = challenge.families[day % challenge.families.length];
  let built = null, rating = lo + (hash32(seed, 3) % (hi - lo + 1)), base = null;
  for (let tries = 0; tries < 8; tries++) {
    base = pickBoard(levels, rating, seed, tries + 1, family, special);
    const board = varyBoard(base, rating, hash32(seed, tries, 7));
    built = buildLevel(board, { rating, adj: 0, rng: mulberry32(hash32(seed, tries, 31)) });
    if (built.opt >= DAILY_MIN_MOVES) break;
    rating = Math.min(100, rating + 3);                        // raro: el tablero quedó corto; se prueba uno algo más difícil
  }
  const limit = moveLimit(built.opt, 1, challenge.level, false, !!challenge.tight);
  return {
    n: challenge.level, rate: rating, pieces: built.pieces, pos: built.pos.slice(), start: built.pos.slice(), walls: built.walls || [], doors: built.doors || [],
    opt: built.opt, limit, moves: 0, hist: [], bought: 0, family: base.family, tutorial: null, seal: null, timeLimit: 0, timeLeft: 0,
    done: false, els: [], plan: { ...levelPlan(challenge.level), boss: false }, daily: challenge.id,
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
/** Racha vigente hoy: sigue viva si el Clásico se resolvió hoy o ayer. */
export const currentStreak = (state, day) => (state && state.last >= day - 1 ? state.streak : 0);
/** Resultado de hoy en un reto ({moves, opt, medal}) o null. */
export const todayResult = (state, id, day) => state?.days?.[day]?.[id] || null;
/**
 * Anota un reto resuelto. Devuelve { medal, first (primera vez hoy), improved (mejor medalla o menos movimientos), streak, streakUp }.
 * La racha solo crece con el Clásico y una vez por día.
 */
export function recordDaily(state, id, day, moves, opt) {
  const medal = medalFor(moves, opt);
  const today = (state.days[day] ||= {}), prev = today[id] || null;
  const first = !prev, improved = !prev || rank(medal) > rank(prev.medal) || moves < prev.moves;
  if (first) {
    state.solved++;
    state.by[id] = (state.by[id] || 0) + 1;
  }
  if (medal === 'gold' && (!prev || prev.medal !== 'gold')) state.gold++;
  if (improved) today[id] = { moves, opt, medal };
  let streakUp = false;
  if (id === STREAK_CHALLENGE && first) {
    state.streak = state.last === day - 1 ? state.streak + 1 : 1;
    state.last = day;
    state.best = Math.max(state.best, state.streak);
    streakUp = true;
  }
  for (const d of Object.keys(state.days)) if (Number(d) < day - 6) delete state.days[d];      // solo se guarda la última semana
  return { medal: today[id].medal, first, improved, streak: currentStreak(state, day), streakUp };
}
/** Texto para compartir, sin desvelar la solución. */
export const shareText = (challenge, day, result, streak) => `DAWNSLIDE · ${challenge.name} #${day} · ${result.moves}/${result.opt}${streak > 1 ? ` · ${streak}` : ''}`;
