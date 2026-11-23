/** Niveles por camino y nivel de dificultad máximo. */
export const MAX_LEVEL = 21;
import { MAX_RATING, targetFor } from './targets.js';
import { minFor } from './calibration.js';

/** Los tres caminos: 1 = Normal, 50 = Difícil, 75 = Experto (los identificadores no cambian: los usan los récords guardados). */
/** Camino al que pertenece un valor de inicio: 1 (Normal), 50 (Difícil) o 75 (Experto). */
const pathKey = (start = 1) => (start >= 75 ? 75 : start >= 50 ? 50 : 1);
/** Valor de una tabla indexada por camino. */
export const byPath = (table, start) => table[pathKey(start)];

/** Dificultad (1-100) cuyo mínimo objetivo se acerca más a `min` movimientos (la más baja si hay empate). */
export function ratingForMin(min) {
  let best = 1;
  let d = Infinity;
  for (let r = 1; r <= MAX_RATING; r++) {
    const x = Math.abs(targetFor(r) - min);
    if (x < d) {
      d = x;
      best = r;
    }
  }
  return best;
}
const RATINGS = {};
/**
 * Dificultad (1-100) del nivel `level` en el camino `start` (1, 50 o 75): la que corresponde a los turnos mínimos calibrados
 * de ese nivel (src/data/calibration.json, ver `npm run calibrate`).
 */
export function rateAt(start, level) {
  const key = pathKey(start);
  const table = (RATINGS[key] ||= Array.from({ length: MAX_LEVEL }, (_, i) => ratingForMin(minFor(key, i + 1))));
  return table[Math.max(1, Math.min(MAX_LEVEL, level)) - 1];
}

export { TARGET_KNOTS, targetFor } from './targets.js';

/**
 * Curva de dificultad de un nivel:
 *  - target: movimientos mínimos objetivo del tablero.
 *  - others: bloques además de la llave roja.
 *  - pLong: probabilidad de bloques largos (3 casillas).
 */
export function curve(rating) {
  const t = (rating - 1) / (MAX_RATING - 1);
  return {
    target: targetFor(rating),
    others: rating <= 3 ? 3 : Math.min(13, 4 + Math.round(9.5 * Math.pow(t, 0.7))),
    pLong: 0.05 + 0.4 * t,
  };
}

/**
 * Distancia mínima que debe alcanzar un tablero para valer en esa dificultad. En las más altas se admiten
 * hasta 3 movimientos menos (encontrar tableros tan duros es carísimo y el juego ya ofrece un margen de ±3).
 */
export const minReach = (rating) => curve(rating).target - (rating > 85 ? 3 : rating > 70 ? 2 : rating > 55 ? 1 : 0);

/** Margen (±) de movimientos mínimos alrededor del objetivo que se ofrece al jugador. */
export const WINDOW = 3;

/** Pistas iniciales según la dificultad del camino (Normal 3 · Difícil 2 · Experto 1). */
export const startHintsFor = (start = 1) => byPath({ 1: 3, 50: 2, 75: 1 }, start);

/**
 * Factor de límite de movimientos: empieza holgado y se aprieta hasta el nivel 21, así la dificultad se siente subir.
 *   Normal ×2,0 → ×1,30 · Difícil ×1,65 → ×1,15 · Experto ×1,50 → ×1,12, con un margen mínimo de turnos de sobra
 *   (Normal 4, los demás 2): un error cuesta varios movimientos fijos, así que los tableros cortos necesitan margen absoluto.
 */
const LIMIT_FACTORS = { 1: [2.0, 1.3], 50: [1.65, 1.15], 75: [1.5, 1.12] };
const MIN_SPARE = { 1: 4, 50: 2, 75: 2 };
const limitFactor = (start = 1, level = 1) => {
  const [from, to] = byPath(LIMIT_FACTORS, start);
  const t = Math.max(0, Math.min(1, (level - 1) / (MAX_LEVEL - 1)));
  return from + (to - from) * t;
};

/** Límite de movimientos permitido para completar un tablero de mínimo `opt` en ese camino y nivel. */
export const moveLimit = (opt, start = 1, level = 1) =>
  Math.max(opt + byPath(MIN_SPARE, start), Math.round(opt * limitFactor(start, level)));
