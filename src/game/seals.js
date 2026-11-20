import { N, WIN_POS, encode, occupancy } from '../engine/board.js';
import { analyze, expand } from '../engine/solver.js';
import { baseScore, calcGain } from '../engine/scoring.js';
import { hash32 } from '../engine/rng.js';
import { sealAt } from '../engine/calibration.js';
import { heroicPoints } from './routes.js';
import { relicPoints } from './relics.js';

/** Niveles con sello (y su tipo) según el calibrador. */
export const SEAL_LEVELS = Array.from({ length: 100 }, (_, i) => i + 1).filter((l) => sealAt(l));
export const isSealLevel = (level) => SEAL_LEVELS.includes(level);
export const maxSealDetour = (opt) => Math.min(8, Math.max(2, Math.ceil(opt * 0.18)));
export const maxSealAdjustment = (opt) => Math.min(6, Math.max(1, Math.ceil(opt * 0.12)));
/**
 * Tres tipos de sello según lo difícil que es conseguirlos (el rodeo en movimientos extra, +1 si la casilla está ocupada y hay que apartar una pieza):
 *   1 bronce  – rodeo de 1 movimiento: premio pequeño;
 *   2 plata   – rodeo de 2-3 movimientos: premio medio;
 *   3 oro     – rodeo de 4 o más: el gran premio (solo cabe en tableros largos).
 * El premio = una parte de los puntos base del nivel (crece con la dificultad y con el tipo) + lo que compensa la eficiencia perdida en el desvío.
 */
export const SEAL_TIERS = [
  { id: 1, key: 'bronce', name: 'Sello de bronce', mult: 0.3 },
  { id: 2, key: 'plata', name: 'Sello de plata', mult: 0.8 },
  { id: 3, key: 'oro', name: 'Sello de oro', mult: 2.1 },
];
const sealTierOf = (extra, occupied = false) => {
  const s = extra + (occupied ? 1 : 0);
  return s >= 4 ? 3 : s >= 2 ? 2 : 1;
};
export const sealTier = (seal) => Math.max(1, Math.min(3, seal?.tier || 2)); // los sellos guardados antes de existir los tipos cuentan como plata
export const sealPoints = (rate, opt, required, tier = 2) =>
  Math.round(
    baseScore(rate) * SEAL_TIERS[tier - 1].mult +
      Math.max(0, calcGain(rate, opt, opt, 0).total - calcGain(rate, required, opt, 0).total),
  );
/** Tipo de sello que se intenta colocar en un nivel (el del calibrador; el motor lo baja si el tablero no da para tanto rodeo). */
export const requestedSealTier = (level) => sealAt(level)?.tier ?? 1;
export const sealReward = (run, seal) => relicPoints(run, Math.round(seal.value * (1 + heroicPoints(run))));
export const sealLimit = (seal, base) => (seal ? Math.max(base, seal.requiredMoves + 1) : base);

/** A slide crosses every cell in its swept footprint, including intermediate cells on ice. */
export function crossesSeal(pieces, before, after, seal) {
  const i = seal.piece,
    p = pieces[i];
  if (!p || before[i] === after[i]) return false;
  const [r, c] = seal.cell,
    fixed = p.o === 'h' ? r : c,
    along = p.o === 'h' ? c : r;
  return fixed === p.fix && along >= Math.min(before[i], after[i]) && along < Math.max(before[i], after[i]) + p.len;
}

/** Award ledger survives rewinds, shop resets and revival. Position and score are persisted together by the caller. */
export function collectSeal(run, G, before) {
  if (!run || !G.seal || G.seal.collected || !before || !crossesSeal(G.pieces, before, G.pos, G.seal)) return 0;
  const seal = G.seal;
  seal.collected = true;
  run.sealClaims ||= {};
  if (Object.hasOwn(run.sealClaims, G.n)) return 0;
  const value = sealReward(run, seal);
  run.sealClaims[G.n] = value;
  run.score = (run.score || 0) + value;
  return value;
}

const searches = new WeakMap();
/**
 * Search legal prefixes that have NOT exited, then append an exact winning suffix from the solver.
 * Ice may be directed: no reversibility assumptions are made. Every emitted candidate has a complete witness.
 * The deterministic state budget limits work on phones; a truncated search still only emits certified routes.
 */
function candidatesFor(pieces, start, walls, opt, an, stateCap) {
  const root = encode(start),
    bound = opt + maxSealDetour(opt);
  let cache = searches.get(an);
  if (!cache) {
    cache = new Map();
    searches.set(an, cache);
  }
  const cacheKey = `${root}:${bound}:${stateCap}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);
  const occupied = occupancy(pieces, start, walls),
    plates = new Set(pieces.filter((p) => p.kind === 'gate').map((p) => p.plate[0] * N + p.plate[1]));
  const nodes = new Map([[root, { g: 0, parent: null }]]),
    queue = [root],
    candidates = new Map();
  const pos = Array(pieces.length).fill(0),
    grid = new Int8Array(N * N);
  let truncated = false;
  for (let q = 0; q < queue.length; q++) {
    const key = queue[q],
      g = nodes.get(key).g;
    if (key % 8 === WIN_POS || g + (an.dist.get(key) ?? Infinity) > bound) continue;
    expand(
      pieces,
      key,
      pos,
      grid,
      (i, to, next) => {
        const d = an.dist.get(next);
        if (d === undefined || g + 1 + d > bound) return;
        const p = pieces[i],
          from = pos[i],
          required = g + 1 + d;
        if (i > 0)
          for (let x = Math.min(from, to); x < Math.max(from, to) + p.len; x++) {
            // The seal starts outside its own piece and never covers a wall or pressure plate.
            if (x >= start[i] && x < start[i] + p.len) continue;
            const cell = p.o === 'h' ? [p.fix, x] : [x, p.fix],
              index = cell[0] * N + cell[1];
            if (plates.has(index) || walls.some(([r, c]) => r === cell[0] && c === cell[1])) continue;
            const id = `${i}:${index}`,
              previous = candidates.get(id);
            if (!previous || required < previous.required || (required === previous.required && g < previous.g)) {
              candidates.set(id, {
                piece: i,
                cell,
                required,
                extra: required - opt,
                key,
                next,
                to,
                g,
                occupied: occupied[index] >= 0,
              });
            }
          }
        if (next % 8 !== WIN_POS && !nodes.has(next)) {
          if (nodes.size < stateCap) {
            nodes.set(next, { g: g + 1, parent: key, piece: i, to });
            queue.push(next);
          } else truncated = true;
        }
      },
      walls,
    );
  }
  const result = { candidates: [...candidates.values()], nodes, truncated };
  cache.set(cacheKey, result);
  return result;
}

function witnessFor(candidate, nodes, pieces, walls, an) {
  const prefix = [];
  let key = candidate.key;
  while (nodes.get(key).parent !== null) {
    const n = nodes.get(key);
    prefix.push({ i: n.piece, to: n.to });
    key = n.parent;
  }
  prefix.reverse();
  prefix.push({ i: candidate.piece, to: candidate.to });
  key = candidate.next;
  const pos = Array(pieces.length).fill(0),
    grid = new Int8Array(N * N);
  while (key % 8 !== WIN_POS) {
    const distance = an.dist.get(key);
    let step;
    expand(
      pieces,
      key,
      pos,
      grid,
      (i, to, next) => {
        if (!step && an.dist.get(next) === distance - 1) step = { i, to, next };
      },
      walls,
    );
    if (!step) throw new Error('Invalid seal winning suffix');
    prefix.push({ i: step.i, to: step.to });
    key = step.next;
  }
  return prefix;
}

export function planSeal({
  pieces,
  pos,
  walls = [],
  opt,
  limit,
  rate,
  level,
  seed = 0,
  analysis,
  withProof = false,
  stateCap = 20000,
}) {
  if (!isSealLevel(level) || pos[0] === WIN_POS) return null;
  const an = analysis || analyze(pieces, pos, 600000, walls);
  if (!an) return null;
  const search = candidatesFor(pieces, pos, walls, opt, an, stateCap),
    cap = limit + maxSealAdjustment(opt);
  const usable = search.candidates.filter((c) => c.required + 1 <= cap);
  const want = requestedSealTier(level, seed),
    tierOf = (c) => sealTierOf(c.extra, c.occupied);
  const target = { 1: 1, 2: 2.5, 3: Math.min(8, maxSealDetour(opt)) }[want];
  const rank = (c) =>
    (c.extra > 0 ? 0 : 100) +
    (c.occupied ? 6 : 0) +
    (c.g >= 1 ? 0 : 8) +
    Math.abs(c.extra - target) * 3 +
    Math.abs(tierOf(c) - want) * 40;
  usable.sort(
    (a, b) => rank(a) - rank(b) || hash32(seed, level, a.piece, ...a.cell) - hash32(seed, level, b.piece, ...b.cell),
  );
  const chosen = usable[0];
  if (!chosen) return null; // fail closed: preserve the original solvable board
  const tier = tierOf(chosen); // el premio depende de lo que cuesta de verdad, no de lo que se pidió
  const seal = {
    piece: chosen.piece,
    cell: chosen.cell,
    tier,
    value: sealPoints(rate, opt, chosen.required, tier),
    requiredMoves: chosen.required,
    extraMoves: chosen.extra,
    collected: false,
  };
  const adjustedLimit = sealLimit(seal, limit),
    proof = witnessFor(chosen, search.nodes, pieces, walls, an);
  if (!verifySealProof({ pieces, pos, walls }, seal, proof, adjustedLimit)) return null;
  return {
    seal,
    limit: adjustedLimit,
    visited: search.nodes.size,
    truncated: search.truncated,
    ...(withProof ? { proof } : {}),
  };
}

/** Independently replay the certificate: every move must be legal, the seal must be crossed, exit must be last. */
export function verifySealProof(G, seal, proof, limit) {
  let pos = G.pos.slice(),
    collected = false;
  for (let n = 0; n < proof.length; n++) {
    if (pos[0] === WIN_POS) return false;
    const step = proof[n],
      key = encode(pos);
    let legal = false;
    expand(
      G.pieces,
      key,
      Array(pos.length).fill(0),
      new Int8Array(N * N),
      (i, to) => {
        if (i === step.i && to === step.to) legal = true;
      },
      G.walls || [],
    );
    if (!legal) return false;
    const after = pos.slice();
    after[step.i] = step.to;
    collected ||= crossesSeal(G.pieces, pos, after, seal);
    pos = after;
  }
  return collected && pos[0] === WIN_POS && proof.length <= limit;
}
