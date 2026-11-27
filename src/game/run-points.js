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

/**
 * Dificultad adaptativa: ajuste (−2..+2) que se suma al mínimo calibrado del siguiente tablero. Sube 1 con cada tablero a ≥ 90 % de
 * eficiencia y baja 1 con uno a < 40 %; hasta el nivel 9 el tope es +1 y desde el 10, +2. Un jugador perfecto juega, pues, tableros
 * 1 movimiento más largos (niveles 2-10) y 2 más (11-21) que el calendario: `perfectAdj(n)` es ese ajuste en el nivel `n`.
 */
export const nextAdj = (adj, level, eff) =>
  Math.max(-2, Math.min(level < 10 ? 1 : 2, adj + (eff >= 0.9 ? 1 : eff < 0.4 ? -1 : 0)));
export const perfectAdj = (level) => {
  let adj = 0;
  for (let n = 1; n < level; n++) adj = nextAdj(adj, n, 1);
  return adj;
};
