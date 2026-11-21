/* Puntos de una aventura: el puntaje del tablero con las cartas del destino y la reliquia. */
import { gainFor } from '../engine/scoring.js';
import { fatePoints, fateRules } from './fate.js';
import { relicPoints } from './relics.js';

/** Puntos de un tablero de mínimo `opt` resuelto en `moves`, con la racha, las cartas del destino y la reliquia. */
export function runGain(run, moves, opt, streak, G = null) {
  const gain = gainFor(moves, opt, streak, { bonus: fatePoints(run, G || { opt }), rules: fateRules(run) });
  gain.total = relicPoints(run, gain.total);
  return gain;
}
