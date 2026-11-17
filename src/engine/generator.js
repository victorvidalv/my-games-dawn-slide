import { mulberry32 } from './rng.js';
import { randomBoard, mutate } from './board.js';
import { analyze, maxDistance } from './solver.js';
import { curve, minReach } from './difficulty.js';
import { boardInterest, INTEREST_MAX_TARGET } from './interest.js';

/**
 * Genera un tablero para una dificultad por escalada de colina: parte de un tablero aleatorio
 * y va cambiando una pieza mientras la distancia máxima a la victoria no empeore.
 *
 * En las dificultades bajas (mínimo objetivo ≤ INTEREST_MAX_TARGET) no basta con llegar al mínimo: una vez alcanzado, sigue
 * escalando por INTERÉS (ver interest.js) para que el tablero tenga dependencias y sentidos variados y no sea «despeja y sal».
 *
 * Es DETERMINISTA: el presupuesto se mide en iteraciones (no en milisegundos), así que la misma
 * semilla produce el mismo tablero en cualquier dispositivo.
 *
 * @param {number} rating   dificultad 1-100
 * @param {number} seed     semilla
 * @param {object} [opts]
 * @param {number} [opts.goalIters=60]    iteraciones para buscar margen extra (target+3)
 * @param {number} [opts.maxIters=20000]  tope duro de iteraciones
 * @param {number} [opts.tuneIters=500] iteraciones dedicadas a subir el interés (solo dificultades bajas)
 * @param {number} [opts.walls=0]         muros sueltos que lleva el tablero (familia «muros»)
 * @returns {{pieces, pos, maxd, target, reached:boolean, iters:number}}
 *   pos = estado más lejano de la victoria encontrado; reached = maxd >= target.
 */
export function generateBoard(rating, seed, { goalIters = 60, maxIters = 20000, tuneIters = 500, walls: wallCount = 0 } = {}) {
  const c = curve(rating);
  const floor = minReach(rating);
  const goal = c.target + 3;
  const rng = mulberry32(seed);
  const tuned = c.target <= INTEREST_MAX_TARGET;
  // valor de un tablero: su distancia máxima; en las dificultades bajas, distancia (hasta la meta) + interés (0..1)
  const valueOf = (b, an, m) => (tuned ? Math.min(m, goal) + boardInterest(b.pieces, an, c.target, b.walls) : m);
  let cur = null;
  let curV = -1;
  let best = null;
  let stall = 0;
  let iters = 0;
  while (iters < maxIters) {
    iters++;
    if (!cur) {
      const b = randomBoard(rng, c.others, c.pLong, wallCount);
      const an = analyze(b.pieces, b.pos, 300000, b.walls);
      if (an) {
        cur = b;
        cur.maxd = maxDistance(an);
        curV = valueOf(b, an, cur.maxd);
        cur.farthest = farthest(an, b.pieces.length);
      }
    } else {
      const b = mutate(cur, rng, c.pLong);
      const an = b && analyze(b.pieces, b.pos, 300000, b.walls);
      if (an) {
        const m = maxDistance(an);
        const v = valueOf(b, an, m);
        if (v > curV) stall = 0;
        else stall++;
        if (v >= curV) {
          cur = b;
          cur.maxd = m;
          curV = v;
          cur.farthest = farthest(an, b.pieces.length);
        }
      } else stall++;
      if (stall > 70) {
        cur = null;
        stall = 0;
      }
    }
    if (cur && (!best || curV > best.value)) best = { pieces: cur.pieces, pos: cur.farthest, walls: cur.walls || [], maxd: cur.maxd, value: curV };
    if (!best) continue;
    if (tuned) {
      const interest = best.value - Math.min(best.maxd, goal);
      if (best.maxd >= goal && (interest >= 0.85 || iters >= tuneIters)) break;
      if (best.maxd >= floor && iters >= Math.max(goalIters, tuneIters)) break;
    } else {
      if (best.maxd >= goal) break;
      if (best.maxd >= floor && iters >= goalIters) break;
    }
  }
  const { value, ...board } = best;
  return { ...board, target: c.target, reached: best.maxd >= floor, iters, ...(tuned ? { interest: value - Math.min(best.maxd, goal) } : {}) };
}

/** Estado de la componente con mayor distancia a la victoria. */
function farthest(an, n) {
  let bk = an.k0;
  let bd = -1;
  for (const [k, d] of an.dist) {
    if (d > bd) {
      bd = d;
      bk = k;
    }
  }
  const pos = [];
  for (let i = 0, v = bk; i < n; i++, v = Math.floor(v / 8)) pos.push(v % 8);
  return pos;
}
