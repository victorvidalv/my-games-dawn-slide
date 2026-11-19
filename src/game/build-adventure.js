import { decodeBoard } from '../engine/board.js';
import { buildLevel, pickBoard, varyBoard } from '../engine/levels.js';
import { minMoves } from '../engine/solver.js';
import { hash32, mulberry32 } from '../engine/rng.js';
import { braveExtra, curve, rateAt } from '../engine/difficulty.js';
import { lettersOfFamily, levelPlan, mechanicsOfFamily, tutorialFor } from './mechanics.js';
import { bossCapFor, bossRating, bossTimeFor } from './bosses.js';
import { heroLimit } from './heroes.js';
import { isSealLevel, planSeal, sealLimit } from './seals.js';
import { isHeroic, juthHeroicFamily } from './routes.js';

/** Jean can try nearby boards of the same family if the original has no longer solution. */
function buildLongerBoard(board, built, options, levels, special, seed, level) {
  const target = Math.max(curve(options.rating).target, built.opt + braveExtra(built.opt));
  const longer = { ...options, target, adj: 0, boost: 0, brave: false };
  const sameBoard = buildLevel(board, longer);
  if (sameBoard.opt > built.opt) return sameBoard;
  const bank = board.family === 'plain' ? levels : special?.[board.family];
  const ratings = new Set([Math.min(100, options.rating + 3), Math.min(100, options.rating + 7), options.rating]);
  for (const rating of ratings) {
    if (!bank?.[rating - 1]?.length) continue;
    const candidate = pickBoard(levels, rating, hash32(seed, 47), level, board.family, special);
    const result = buildLevel(candidate, longer);
    if (result.opt > built.opt) return result;
  }
  return built;
}

/** Shared by the real game and simulator. Saved boards are restored without introducing a new objective. */
export function buildAdventureLevel(run, { levels, special, tips = {}, withProof = false } = {}) {
  const level = run.level,
    plan = levelPlan(level),
    rate = bossRating(level, rateAt(run.start, level)),
    brave = isHeroic(run);
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
      doors: (b.doors || []).map((d) => d.slice()),
      pos: (rescue ? b.start : b.pos).slice(),
      start: b.start.slice(),
      opt,
      limit: b.limit ?? heroLimit(run.hero, opt, run.start, level, brave, bossCapFor(level)),
      moves: rescue ? 0 : b.moves || 0,
      hist: rescue ? [] : (b.hist || []).map((p) => p.slice()),
      bought: rescue ? 0 : b.bought || 0,
      tutorial: rescue ? null : b.tutorial || null,
      family: b.family || plan.family,
      seal: b.seal ? { ...b.seal, cell: b.seal.cell.slice() } : null,
      colors: saved?.colors?.slice(),
    };
    G.limit = sealLimit(G.seal, G.limit);
    G.timeLimit = run.mode !== 'p' && plan.boss && !G.tutorial ? bossTimeFor(level, opt) : 0;
    const addedTime = Math.max(0, G.timeLimit - (b.timeLimit ?? G.timeLimit));
    G.timeLeft = rescue ? G.timeLimit : Math.min(G.timeLimit, (b.timeLeft ?? G.timeLimit) + addedTime);
  } else {
    const tutorial = run.mode === 'p' ? null : tutorialFor(level, tips);
    let base, built;
    if (tutorial) {
      base = decodeBoard(tutorial.board);
      base.family = plan.family;
      built = { ...base, opt: minMoves(base.pieces, base.pos, base.walls, base.doors) };
    } else {
      const family = brave && run.hero === 'van' ? juthHeroicFamily(plan, level, rate, special) : plan.family;
      base = pickBoard(levels, rate, run.seed, level, family, special);
      const board = varyBoard(base, rate, hash32(run.seed, level, 7));
      const boost = plan.boss ? (level >= 50 ? 2 : 1) : 0;
      const options = {
        rating: rate,
        adj: run.adj,
        brave: brave && run.hero === 'jean',
        boost,
        rng: mulberry32(hash32(run.seed, level, 31)),
        withAnalysis: isSealLevel(level) || withProof,
      };
      built = buildLevel(board, options);
      if (options.brave && built.opt === built.normalOpt)
        built = buildLongerBoard(board, built, options, levels, special, run.seed, level);
    }
    G = {
      n: level,
      rate,
      pieces: built.pieces,
      pos: built.pos.slice(),
      walls: built.walls || [],
      doors: built.doors || [],
      start: built.pos.slice(),
      opt: built.opt,
      limit: heroLimit(run.hero, built.opt, run.start, level, brave, bossCapFor(level)),
      moves: 0,
      hist: [],
      bought: 0,
      family: base.family,
      tutorial: tutorial?.mech || null,
      seal: null,
    };
    if (tutorial) G.limit = built.opt + 40; // el tutorial no se puede perder
    G.timeLimit = run.mode !== 'p' && plan.boss && !tutorial ? bossTimeFor(level, built.opt) : 0; // contrarreloj de los jefes que la tienen
    G.timeLeft = G.timeLimit;
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
  const actualPlan =
    brave && run.hero === 'van' && G.family !== plan.family
      ? { ...plan, family: G.family, letters: lettersOfFamily(G.family), mechanics: mechanicsOfFamily(G.family) }
      : plan;
  return { ...G, done: false, els: [], plan: actualPlan };
}
