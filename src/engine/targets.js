export const MAX_RATING = 100;

/**
 * Movimientos mínimos objetivo por dificultad (puntos de control; entre ellos se interpola).
 *   1-20   tutorial suave (2 a 6 movimientos)
 *   30     «hay que pensar» (11)         ← en el camino Normal, nivel 30
 *   50     el Difícil empieza aquí (19)
 *   75     el Experto empieza aquí (29)
 *   100    desafiante de verdad (37)
 */
export const TARGET_KNOTS = [
  [1, 2],
  [10, 3],
  [20, 6],
  [30, 11],
  [40, 15],
  [50, 19],
  [60, 23],
  [75, 29],
  [90, 34],
  [100, 37],
];

export function targetFor(rating) {
  const r = Math.max(1, Math.min(MAX_RATING, rating));
  for (let i = 1; i < TARGET_KNOTS.length; i++) {
    const [r1, t1] = TARGET_KNOTS[i];
    const [r0, t0] = TARGET_KNOTS[i - 1];
    if (r <= r1) return Math.round(t0 + ((t1 - t0) * (r - r0)) / (r1 - r0));
  }
  return TARGET_KNOTS[TARGET_KNOTS.length - 1][1];
}
