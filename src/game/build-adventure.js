import { decodeBoard } from '../engine/board.js';
import { buildLevel, pickBoard, varyBoard } from '../engine/levels.js';
import { minMoves } from '../engine/solver.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { rateAt } from '../engine/difficulty.js';
import { levelPlan, tutorialFor } from './mechanics.js';
import { heroLimit } from './heroes.js';
import { isSealLevel, planSeal, sealLimit } from './seals.js';
import { fateBlocks, fateTurns } from './fate.js';

/** Límite de un tablero de esta aventura: héroe, camino, nivel y cartas del destino (turnos y Juramento). */
export const runLimit = (run, opt, level, pieces = []) =>
  heroLimit(run.hero, opt, run.start, level, {
    fate: fateTurns(run, { opt, pieces }),
    noPower: fateBlocks(run, 'power'),
  });

/** Shared by the real game and simulator. Saved boards are restored without introducing a new objective. */
export function buildAdventureLevel(run, { levels, special, tips = {}, withProof = false } = {}) {
  const level = run.level,
    plan = levelPlan(level),
    rate = rateAt(run.start, level);
  const saved = run.board?.level === level ? run.board : null,
    rescue = run.rescue?.level === level ? run.rescue : null;
  let G;
  if (saved || rescue) {
    const b = rescue || saved,
      opt = b.opt;
    G = {
      n: level,
      rate: b.rate,
      pieces: b.pieces.map((p) => ({ ...p })),
      walls: (b.walls || []).map((w) => w.slice()),
      pos: (rescue ? b.start : b.pos).slice(),
      start: b.start.slice(),
      opt,
      limit: b.limit ?? runLimit(run, opt, level, b.pieces),
      moves: rescue ? 0 : b.moves || 0,
      hist: rescue ? [] : (b.hist || []).map((p) => p.slice()),
      bought: rescue ? 0 : b.bought || 0,
      tutorial: rescue ? null : b.tutorial || null,
      family: b.family || plan.family,
      seal: b.seal ? { ...b.seal, cell: b.seal.cell.slice() } : null,
      colors: saved?.colors?.slice(),
    };
    G.limit = sealLimit(G.seal, G.limit);
  } else {
    const tutorial = run.mode === 'p' ? null : tutorialFor(level, tips);
    let base, built;
    if (tutorial) {
      base = decodeBoard(tutorial.board);
      base.family = plan.family;
      built = { ...base, opt: minMoves(base.pieces, base.pos, base.walls) };
    } else {
      base = pickBoard(levels, rate, run.seed, level, plan.family, special);
      const board = varyBoard(base, rate, hash32(run.seed, level, 7));
      built = buildLevel(board, {
        rating: rate,
        adj: run.adj,
        rng: mulberry32(hash32(run.seed, level, 31)),
        withAnalysis: isSealLevel(level) || withProof,
      });
    }
    G = {
      n: level,
      rate,
      pieces: built.pieces,
      pos: built.pos.slice(),
      walls: built.walls || [],
      start: built.pos.slice(),
      opt: built.opt,
      limit: runLimit(run, built.opt, level, built.pieces),
      moves: 0,
      hist: [],
      bought: 0,
      family: base.family,
      tutorial: tutorial?.mech || null,
      seal: null,
    };
    if (tutorial) G.limit = built.opt + 40; // el tutorial no se puede perder
    if (withProof) G.analysis = built.analysis;
    if (!tutorial && run.mode !== 'p' && isSealLevel(level)) {
      const result = planSeal({ ...G, level, seed: run.seed, analysis: built.analysis, withProof });
      if (result) {
        G.seal = result.seal;
        G.limit = result.limit;
        if (withProof) G.sealProof = result.proof;
        G.sealSearch = { visited: result.visited, truncated: result.truncated };
      }
    }
  }
  if (G.seal && Object.hasOwn(run.sealClaims || {}, level)) G.seal.collected = true;
  return { ...G, done: false, els: [], plan };
}
