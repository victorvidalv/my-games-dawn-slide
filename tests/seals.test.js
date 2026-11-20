import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SEAL_LEVELS,
  isSealLevel,
  requestedSealTier,
  planSeal,
  verifySealProof,
  crossesSeal,
  collectSeal,
  sealReward,
  sealPoints,
  maxSealAdjustment,
} from '../src/game/seals.js';
import { HEROIC_BENEFITS } from '../src/game/routes.js';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { heroLimit, snapshotRescue } from '../src/game/heroes.js';
import { buy, payRevive } from '../src/game/shop.js';
import { decodeBoard, occupancy } from '../src/engine/board.js';
import { buildLevel } from '../src/engine/levels.js';
import { mulberry32 } from '../src/engine/rng.js';
import { TUTORIAL_LEVELS } from '../src/engine/calibration.js';
import { minMoves } from '../src/engine/solver.js';
const levels = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url))).ratings;
const special = JSON.parse(readFileSync(new URL('../src/data/special.json', import.meta.url)));
const tips = {
  wall: true,
  gate: true,
  heavy: true,
  ice: true,
  tut_wall: true,
  tut_gate: true,
  tut_heavy: true,
  tut_ice: true,
};
const run = (extra = {}) => ({
  seed: 46,
  hero: 'jean',
  start: 1,
  level: SEAL_LEVELS[0],
  route: 'normal',
  mode: 'c',
  score: 10000,
  hints: 3,
  adj: 0,
  ...extra,
});

it('los sellos y su tipo los decide el calibrador: nunca en jefes ni en niveles de tutorial de una pieza', () => {
  expect(SEAL_LEVELS.length).toBeGreaterThanOrEqual(20);
  expect(SEAL_LEVELS.some((l) => l % 10 === 0)).toBe(false);
  for (const mech of ['wall', 'heavy', 'gate', 'ice']) expect(isSealLevel(TUTORIAL_LEVELS[mech]), mech).toBe(false);
  for (const level of SEAL_LEVELS) expect([1, 2, 3]).toContain(requestedSealTier(level));
  for (const level of [1, 2, 3, 4, 5, 10, 20, 30, 40, 50, 100]) expect(isSealLevel(level)).toBe(false);
});

it('atravesar una casilla intermedia de hielo recoge el sello; mover otra pieza no lo recoge', () => {
  const pieces = [
      { o: 'h', len: 2, fix: 2 },
      { o: 'v', len: 2, fix: 3, kind: 'ice' },
    ],
    seal = { piece: 1, cell: [3, 3] };
  expect(crossesSeal(pieces, [0, 0], [0, 4], seal)).toBe(true);
  expect(crossesSeal(pieces, [0, 0], [4, 0], seal)).toBe(false);
  expect(crossesSeal(pieces, [0, 0], [0, 1], { ...seal, cell: [5, 3] })).toBe(false);
});

for (const start of [1, 50, 75])
  for (const route of ['normal', 'brave'])
    it(`certifica recogida y salida en ${start}/${route} sin alterar el mínimo`, () => {
      const r = run({ start, route, level: 39 });
      const G = buildAdventureLevel(r, { levels, special, tips, withProof: true });
      expect(G.seal).toBeTruthy();
      expect(G.seal.piece).toBeGreaterThan(0);
      expect(verifySealProof(G, G.seal, G.sealProof, G.limit)).toBe(true);
      expect(G.limit).toBeLessThanOrEqual(
        heroLimit(r.hero, G.opt, start, r.level, route === 'brave') + maxSealAdjustment(G.opt),
      );
      expect(minMoves(G.pieces, G.pos, G.walls)).toBe(G.opt);
      expect(G.seal.requiredMoves).toBeLessThan(G.limit);
      const [row, col] = G.seal.cell;
      expect(occupancy(G.pieces, G.pos, G.walls)[row * 6 + col]).not.toBe(99);
      for (const p of G.pieces) if (p.kind === 'gate') expect(p.plate).not.toEqual(G.seal.cell);
    });

it('no coloca objetivos que exijan seguir moviendo después de haber salido', () => {
  const b = decodeBoard('h2.2.0 v2.5.0');
  const plan = planSeal({ ...b, opt: 1, limit: 3, rate: 1, level: 5, withProof: true });
  // The only other piece can move legally before exit: every produced certificate must finish at its first win.
  if (plan) expect(verifySealProof(b, plan.seal, plan.proof, plan.limit)).toBe(true);
  const solved = { ...b, pos: [4, 0] };
  expect(planSeal({ ...solved, opt: 0, limit: 3, rate: 1, level: 5 })).toBeNull();
});

it('el premio escala con la dificultad y compensa parte del desvío', () => {
  expect(sealPoints(75, 20, 23)).toBeGreaterThan(sealPoints(10, 20, 23));
  expect(sealPoints(40, 10, 12)).toBeGreaterThan(sealPoints(40, 10, 10));
});

it('se guarda y se cobra una vez, incluso tras rebobinar, rehacer o revivir', () => {
  const r = run({ start: 50, level: 23, score: 200000 }),
    G = buildAdventureLevel(r, { levels, special, tips, withProof: true });
  let total = 0;
  for (const step of G.sealProof) {
    const before = G.pos.slice();
    G.hist.push(before);
    G.pos[step.i] = step.to;
    G.moves++;
    total += collectSeal(r, G, before);
  }
  expect(total).toBe(sealReward(r, G.seal));
  const after = r.score;
  G.pos = G.start.slice();
  G.hist = [];
  G.moves = 1;
  buy('redo', { run: r, G });
  const paid = r.score;
  expect(paid).toBeLessThan(after);
  G.seal.collected = false;
  for (const step of G.sealProof) {
    const before = G.pos.slice();
    G.pos[step.i] = step.to;
    expect(collectSeal(r, G, before)).toBe(0);
  }
  expect(r.score).toBe(paid);
  const loaded = JSON.parse(JSON.stringify(r));
  expect(loaded.sealClaims[G.n]).toBe(total);
  payRevive(loaded);
  expect(loaded.sealClaims[G.n]).toBe(total);
});

it('el bono heroico también se aplica al sello (según el héroe) y coincide con el importe mostrado', () => {
  const seal = { value: 100 },
    B = HEROIC_BENEFITS;
  expect(sealReward(run({ route: 'brave' }), seal)).toBe(Math.round(100 * (1 + B.points.jean)));
  expect(sealReward(run({ hero: 'lia', route: 'brave' }), seal)).toBe(Math.round(100 * (1 + B.points.lia)));
  expect(sealReward(run(), seal)).toBe(100);
  expect(sealReward(run({ route: 'brave', relic: 'sun' }), seal)).toBe(Math.round(145 * 1.15));
});

it('restaura el mismo tablero y sello sin regenerar, también en partidas antiguas sin sello', () => {
  const r = run(),
    G = buildAdventureLevel(r, { levels, special, tips, withProof: true });
  r.board = {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces,
    walls: G.walls,
    pos: G.pos,
    start: G.start,
    opt: G.opt,
    limit: G.limit,
    moves: 0,
    hist: [],
    seal: G.seal,
  };
  const restored = buildAdventureLevel(JSON.parse(JSON.stringify(r)), { tips });
  expect(restored.pos).toEqual(G.pos);
  expect(restored.seal).toEqual(G.seal);
  expect(restored.limit).toBe(G.limit);
  delete r.board.seal;
  expect(buildAdventureLevel(r, { tips }).seal).toBeNull();
  r.rescue = snapshotRescue(G);
  expect(buildAdventureLevel(r, { tips }).seal).toEqual(G.seal);
});

it('un sello ya cobrado no reaparece por un indicador visual antiguo en el guardado', () => {
  const r = run(),
    G = buildAdventureLevel(r, { levels, special, tips });
  r.sealClaims = { [G.n]: G.seal.value };
  r.board = {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces,
    walls: G.walls,
    pos: G.pos,
    start: G.start,
    opt: G.opt,
    limit: G.limit,
    hist: [],
    seal: { ...G.seal, collected: false },
  };
  expect(buildAdventureLevel(r, { tips }).seal.collected).toBe(true);
});

const anyBoard = (family, from = 40) => {
  if (family === 'plain') return { raw: levels[49][0], rating: 50 };
  const r = special[family].findIndex((l, k) => k >= from && l.length);
  return r < 0 ? null : { raw: special[family][r][0], rating: r + 1 };
};
for (const family of ['plain', 'walls', 'gates', 'heavy', 'ice', 'combo_hg', 'combo_gi'])
  it(`certifica el sello con reglas ${family} incluso con límite experto`, () => {
    const { raw, rating } = anyBoard(family);
    const built = buildLevel(decodeBoard(raw), { rating, brave: true, rng: mulberry32(46), withAnalysis: true });
    const L = SEAL_LEVELS.at(-1),
      limit = heroLimit('jean', built.opt, 75, L, true);
    const planned = planSeal({ ...built, rate: rating, level: L, limit, analysis: built.analysis, withProof: true });
    expect(planned).toBeTruthy();
    expect(verifySealProof(built, planned.seal, planned.proof, planned.limit)).toBe(true);
  });
