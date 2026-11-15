import { encode, N } from '../engine/board.js';
import { analyze, expand } from '../engine/solver.js';

export const REWIND_STEPS = 5;
export const DESTINY_STEPS = 3;
export const JUTH_MIN_REMAINING = 3; // usable only when the exact distance is greater than this

const plans = new WeakMap();
/** One graph analysis per position, shared by the button and activation; respects all special pieces. */
export function destinyPlan(G) {
  const key = encode(G.pos), cached = plans.get(G);
  if (cached?.key === key) return cached.plan;
  const an = analyze(G.pieces, G.pos, 600000, G.walls || []);
  let plan = null;
  const left = an?.dist.get(key);
  if (left > JUTH_MIN_REMAINING) {
    let current = key;
    const pos = new Array(G.pieces.length).fill(0), grid = new Int8Array(N * N), steps = [];
    for (let n = 0; n < DESTINY_STEPS; n++) {
      const distance = an.dist.get(current);
      let next = null;
      expand(G.pieces, current, pos, grid, (i, to, k) => {
        if (!next && an.dist.get(k) === distance - 1) next = { i, to, key: k };
      }, G.walls || []);
      if (!next) break;
      steps.push({ i: next.i, to: next.to }); current = next.key;
    }
    if (steps.length === DESTINY_STEPS) plan = { left, steps };
  }
  plans.set(G, { key, plan });
  return plan;
}

export function powerUsed(run, G) {
  return run?.powerUsedLevel === G?.n ||
    (run?.hero === 'jean' && run.undoUsedLevel === G?.n && run.undoUsedCount > 0) ||
    (run?.hero === 'van' && run.freeHintLevel === G?.n && run.freeHintCount > 0);
}

export function powerState(run, G) {
  if (!run || !G || G.done) return { ok: false, reason: 'Sin tablero' };
  if (run.hero === 'lia') return { ok: false, reason: 'Reserva automática' };
  if (powerUsed(run, G)) return { ok: false, reason: 'Usado · próximo tablero' };
  if (run.hero === 'jean') return G.hist.length
    ? { ok: true, count: Math.min(REWIND_STEPS, G.hist.length), reason: '1 uso por tablero' }
    : { ok: false, reason: 'Mueve una pieza primero' };
  if (run.hero !== 'van') return { ok: false, reason: 'Sin poder' };
  if (G.limit - G.moves < DESTINY_STEPS) return { ok: false, reason: 'Necesitas 3 turnos' };
  const plan = destinyPlan(G);
  return plan ? { ok: true, plan, reason: '3 movimientos · 1 uso' }
    : { ok: false, reason: 'Requiere más de 3 pasos hasta la salida' };
}

/** Consume before any animation, so saving or reloading cannot replenish the power. */
export function beginPower(run, G) {
  const state = powerState(run, G);
  if (!state.ok) return null;
  run.powerUsedLevel = G.n;
  return run.hero === 'jean'
    ? { kind: 'rewind', steps: G.hist.slice(-state.count).reverse().map(pos => pos.slice()) }
    : { kind: 'destiny', steps: state.plan.steps.map(step => ({ ...step })) };
}

/** Lía's existing allowance, placed before purchased turns (which remain the last segment). */
export function reserveState(G, reserve = 0) {
  const bought = G.bought || 0, end = G.limit - bought, start = Math.max(0, end - reserve);
  return { start, end, left: Math.max(0, reserve - Math.max(0, G.moves - start)) };
}
