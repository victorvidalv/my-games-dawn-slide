/* Puntos de una aventura: el puntaje del tablero con las cartas del destino, la Brasa intacta de Lía y la reliquia. */
import { gainFor } from '../engine/scoring.js';
import { fateBlocks, fatePoints, fateRules } from './fate.js';
import { LIA_INTACT_POINTS, bonusTurns } from './heroes.js';
import { relicPoints } from './relics.js';

/** ¿Termina Lía el tablero `G` en `moves` movimientos sin entrar en su reserva? (con el poder encendido) */
export function liaIntact(run, G, moves) {
  if (run?.hero !== 'lia' || !G?.limit || fateBlocks(run, 'power')) return false;
  const reserve = bonusTurns('lia', G.opt, run.start, false);
  return moves <= G.limit - (G.bought || 0) - reserve;
}

/** Tablero «puro» (Ascetismo): sin pista y sin poder (Lía: sin tocar la reserva). */
export function boardPure(run, G, moves) {
  if (!G || !Number.isFinite(G.n)) return false;
  if (run?.helpAt === G.n) return false;
  if (run?.hero === 'lia') return fateBlocks(run, 'power') || liaIntact(run, G, moves);
  return fateBlocks(run, 'power') || run?.powerUsedLevel !== G.n;
}

/**
 * Puntos de un tablero de mínimo `opt` resuelto en `moves`, con la racha, las cartas del destino, la Brasa intacta de Lía
 * (+12 % si no tocó la reserva) y la reliquia.
 */
export function runGain(run, moves, opt, streak, G = null) {
  const board = G ? { ...G, pure: boardPure(run, G, moves) } : { opt };
  const ember = G && liaIntact(run, G, moves) ? LIA_INTACT_POINTS : 0;
  const gain = gainFor(moves, opt, streak, { bonus: fatePoints(run, board) + ember, rules: fateRules(run) });
  gain.ember = ember > 0;
  gain.total = relicPoints(run, gain.total);
  return gain;
}
