import { encode, N } from '../engine/board.js';
import { byPath } from '../engine/difficulty.js';
import { powerFactor } from './routes.js';
import { analyze, expand } from '../engine/solver.js';

/** Jean rebobina ~33 % de los movimientos hechos, mínimo 3 (o todos si lleva menos); `power` = 0,5 en el camino heroico (≈17 %, mínimo 2). */
export const REWIND_SHARE = 1 / 3;
export const REWIND_MIN = 3;
export const rewindCount = (moves, power = 1) =>
  Math.min(moves, Math.max(Math.round(REWIND_MIN * power), Math.round(moves * REWIND_SHARE * power)));
/** Destino de Juth: ejecuta ~25 % de los pasos que faltan (heroico la mitad), con un mínimo de 1; nunca el último (siempre deja uno al jugador). */
export const DESTINY_SHARE = 0.25;
export const JUTH_MIN_REMAINING = 2; // usable solo si quedan al menos 3 pasos (con 1 o 2 no hace nada)
export const destinyCount = (left, share = DESTINY_SHARE) =>
  left > JUTH_MIN_REMAINING ? Math.min(left - 1, Math.max(1, Math.round(left * share))) : 0;
/** Parte de los tableros en los que los poderes de Jean y Juth están listos: Normal todos, Difícil ~85 %, Experto ~70 % (repartidos de forma pareja). */
export const POWER_READY_SHARE = { 1: 1, 50: 0.85, 75: 0.7 };
export const powerReady = (level = 1, start = 1) => {
  const k = byPath(POWER_READY_SHARE, start);
  return Math.floor(level * k + 1e-9) > Math.floor((level - 1) * k + 1e-9);
};

const plans = new WeakMap();
/** One graph analysis per position, shared by the button and activation; respects all special pieces. */
export function destinyPlan(G, share = DESTINY_SHARE) {
  const key = `${encode(G.pos)}/${share}`,
    cached = plans.get(G);
  if (cached?.key === key) return cached.plan;
  const an = analyze(G.pieces, G.pos, 600000, G.walls || [], G.doors || []);
  let plan = null;
  const left = an?.dist.get(encode(G.pos));
  if (left > JUTH_MIN_REMAINING) {
    let current = encode(G.pos);
    const count = destinyCount(left, share);
    const pos = new Array(G.pieces.length).fill(0),
      grid = new Int8Array(N * N),
      steps = [];
    for (let n = 0; n < count; n++) {
      const distance = an.dist.get(current);
      let next = null;
      expand(
        G.pieces,
        current,
        pos,
        grid,
        (i, to, k) => {
          if (!next && an.dist.get(k) === distance - 1) next = { i, to, key: k };
        },
        G.walls || [],
        G.doors || [],
      );
      if (!next) break;
      steps.push({ i: next.i, to: next.to });
      current = next.key;
    }
    if (steps.length === count) plan = { left, steps };
  }
  plans.set(G, { key, plan });
  return plan;
}

function powerUsed(run, G) {
  return (
    run?.powerUsedLevel === G?.n ||
    (run?.hero === 'jean' && run.undoUsedLevel === G?.n && run.undoUsedCount > 0) ||
    (run?.hero === 'van' && run.freeHintLevel === G?.n && run.freeHintCount > 0)
  );
}

export function powerState(run, G) {
  if (!run || !G || G.done) return { ok: false, reason: 'Sin tablero' };
  if (run.hero === 'lia') return { ok: false, reason: 'Reserva automática' };
  if (powerUsed(run, G)) return { ok: false, reason: 'Usado · próximo tablero' };
  if (!powerReady(G.n, run.start)) return { ok: false, reason: 'Descansa este tablero' };
  if (run.hero === 'jean')
    return G.hist.length
      ? { ok: true, count: rewindCount(G.hist.length, powerFactor(run)), reason: '1 uso por tablero' }
      : { ok: false, reason: 'Mueve una pieza primero' };
  if (run.hero !== 'van') return { ok: false, reason: 'Sin poder' };
  const plan = destinyPlan(G, DESTINY_SHARE * powerFactor(run));
  if (plan && G.limit - G.moves < plan.steps.length)
    return { ok: false, reason: `Necesitas ${plan.steps.length} turnos` };
  return plan
    ? { ok: true, plan, reason: `${plan.steps.length} movimientos · 1 uso` }
    : { ok: false, reason: 'Requiere al menos 3 pasos hasta la salida' };
}

/** Consume before any animation, so saving or reloading cannot replenish the power. */
export function beginPower(run, G) {
  const state = powerState(run, G);
  if (!state.ok) return null;
  run.powerUsedLevel = G.n;
  return run.hero === 'jean'
    ? {
        kind: 'rewind',
        steps: G.hist
          .slice(-state.count)
          .reverse()
          .map((pos) => pos.slice()),
      }
    : { kind: 'destiny', steps: state.plan.steps.map((step) => ({ ...step })) };
}

/** Lía's existing allowance, placed before purchased turns (which remain the last segment). */
export function reserveState(G, reserve = 0) {
  const bought = G.bought || 0,
    end = G.limit - bought,
    start = Math.max(0, end - reserve);
  return { start, end, left: Math.max(0, reserve - Math.max(0, G.moves - start)) };
}
