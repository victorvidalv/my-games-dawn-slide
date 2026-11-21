/**
 * Héroes y poderes. Los datos (nombre, texto) y las reglas viven juntos aquí; las reglas son
 * funciones puras sobre el objeto `run` (la aventura en curso), sin DOM, y están cubiertas por tests.
 */
import { moveLimit, byPath } from '../engine/difficulty.js';
import { fateBlocks } from './fate.js';

/* Ojo: el identificador interno de Juth sigue siendo 'van' (imágenes heroes/van*.webp y partidas guardadas). Solo cambia el nombre que se ve. */
export const HEROES = [
  {
    id: 'lia',
    name: 'Lía',
    role: 'Portadora de la Brasa',
    icon: 'heart',
    color: '#68d8bd',
    power: 'Turnos de reserva',
    short: 'Más turnos en cada tablero',
    detail:
      'Cada tablero te da turnos extra (alrededor de un tercio del mínimo necesario; algo menos en los caminos difíciles) para perdonar los errores pequeños sin quitarte el reto.',
    quote: '«Incluso la ceniza recuerda el calor.»',
  },
  {
    id: 'jean',
    name: 'Jean',
    role: 'Vigía del Péndulo',
    icon: 'clock',
    color: '#8fb9ff',
    power: 'Rebobinar',
    short: 'Retrocede varios movimientos',
    detail:
      'Una vez por tablero (dos en los tableros largos), devuelve las piezas y los turnos cerca de un tercio de tus movimientos (mínimo tres). Si llevas menos, regresas al inicio.',
    quote: '«Todo error deja una grieta por donde volver.»',
  },
  {
    id: 'van',
    name: 'Juth',
    role: 'Escriba de las Runas',
    icon: 'stars',
    color: '#c5a2ff',
    power: 'Trazar destino',
    short: 'Ejecuta movimientos óptimos',
    detail:
      'Una vez por tablero, las runas mueven las piezas hacia la salida, cerca de un cuarto de los pasos que faltan (nunca el último). Consume turnos y requiere al menos cuatro pasos pendientes.',
    quote: '«Lo que no se nombra sigue buscando salida.»',
  },
];

export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];

export const CITY_EVERY = 3; // niveles por tramo/ciudad
/** Cada cuántos niveles se gana una pista: Normal 4, Difícil 5, Experto 6 (cuanto más difícil el camino, más escasas). */
const HINT_EVERY_BY_PATH = { 1: 4, 50: 5, 75: 6 };
export const hintEvery = (start = 1) => byPath(HINT_EVERY_BY_PATH, start);

const isPractice = (mode) => mode === 'p';

/* ───────────── Lía: turnos de reserva (un % más de turnos en cada tablero) ───────────── */

/**
 * +28 % del mínimo de movimientos del tablero en Normal y +16 % en Difícil/Experto.
 * Calibrado con `npm run simulate` junto con las cartas del destino (los tres héroes eligen entre 3 cartas).
 */
const LIA_TURNS_SHARE = { 1: 0.34, 50: 0.2, 75: 0.17 };
const LIA_MIN_TURNS = 1;

/** Turnos extra que da el héroe sobre el límite base (solo Lía): una parte del mínimo `opt` del tablero según el camino. `off` = poder apagado (Juramento). */
export const bonusTurns = (heroId, opt, start = 1, off = false) => {
  if (heroId !== 'lia' || off) return 0;
  return Math.max(LIA_MIN_TURNS, Math.round(opt * byPath(LIA_TURNS_SHARE, start)));
};

/**
 * Límite de movimientos de un tablero de mínimo `opt` para ese héroe y camino. `fate` = turnos de las cartas del destino
 * (pueden ser negativos) y `noPower` apaga la reserva de Lía. Nunca baja de mínimo + 1.
 */
export const heroLimit = (heroId, opt, start = 1, level = 1, { fate = 0, noPower = false } = {}) =>
  Math.max(opt + 1, moveLimit(opt, start, level) + bonusTurns(heroId, opt, start, noPower) + fate);

/** Foto del tablero para repetirlo desde el principio con 0 movimientos (la usa el revivir). */
export function snapshotRescue(G) {
  return {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces.map((p) => ({ ...p })),
    walls: (G.walls || []).map((w) => w.slice()),
    start: G.start.slice(),
    opt: G.opt,
    limit: G.limit - (G.bought || 0),
    family: G.family,
  };
}

/* ───────────── Pistas: la reserva de la partida ───────────── */

/**
 * Gasta una pista de la reserva (el poder de Juth es independiente de las pistas).
 * Devuelve {ok, free}. (ok=false si no hay ninguna o un Pacto las apaga.) En Práctica no gasta nada.
 */
export function spendHint({ run, mode }) {
  if (isPractice(mode)) return { ok: true, free: true };
  if (fateBlocks(run, 'hints')) return { ok: false, free: false };
  if ((run.hints || 0) > 0) {
    run.hints--;
    return { ok: true, free: false };
  }
  return { ok: false, free: false };
}

/** ¿Se puede pedir una pista ahora? */
export const canHint = (run, mode) => isPractice(mode) || (!fateBlocks(run, 'hints') && (run?.hints || 0) > 0);

/**
 * Pistas ganadas al completar `level`; suma a run.hints y devuelve cuántas.
 * Todos los héroes: +1 cada 5 niveles.
 */
export function clearRewards(run, level) {
  const gained = level % hintEvery(run?.start) === 0 ? 1 : 0;
  run.hints = (run.hints || 0) + gained;
  return gained;
}
