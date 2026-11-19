import { WIN_POS } from './board.js';

/** Fracción de turnos restantes (o menos) a partir de la cual se avisa de que quedan pocos. */
const WARN_FRACTION = 0.2;

/** Movimientos que aún puedes hacer (nunca negativo). Al llegar a 0 sin ganar, la aventura termina: ya no se puede mover. */
export const movesLeft = (moves, limit) => Math.max(0, limit - moves);

/** Sin turnos: se hicieron todos los movimientos permitidos (si no ganaste en el último, pierdes y no puedes mover más). */
const isOver = (moves, limit) => moves >= limit;

/** El aviso salta, como muy tarde, cuando quedan estos movimientos (si el tablero es lo bastante largo para que tenga sentido). */
export const WARN_LEFT = 3;

/** Movimientos restantes a partir de los cuales se avisa: 3 (o el 20 % del límite si es más); en tableros cortos, nunca antes de gastar el 60 %. */
export const warnAt = (limit) =>
  Math.max(1, Math.ceil(limit * WARN_FRACTION), Math.min(WARN_LEFT, Math.floor(limit * 0.4)));

/** Quedan pocos turnos (ver `warnAt`) y todavía se puede mover. */
export function isLow(moves, limit) {
  const left = limit - moves;
  return left > 0 && left <= warnAt(limit);
}

/**
 * Estado del contador de movimientos:
 *  'ok' · 'warn' (pocos turnos) · 'last' (te queda UN movimiento: si no ganas con él, terminas) · 'over' (sin turnos).
 */
export function moveStatus(moves, limit) {
  if (isOver(moves, limit)) return 'over';
  if (limit - moves === 1) return 'last';
  if (isLow(moves, limit)) return 'warn';
  return 'ok';
}

/** La llave roja (pieza 0) ha llegado a la salida. */
export const isWon = (pos) => pos[0] === WIN_POS;
