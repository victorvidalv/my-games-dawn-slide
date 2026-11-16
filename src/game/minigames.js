import { hash32, mulberry32 } from '../engine/rng.js';
import { byPath } from '../engine/difficulty.js';
import { decodeBoard } from '../engine/board.js';
import { isWon } from '../engine/rules.js';

export const BONUS_KINDS = ['memory', 'sequence', 'timing', 'sprint', 'bestmove'];
export const HERO_GAMES = {
  lia: [
    { kind: 'memory', title: 'Brasas del Juramento' },
    { kind: 'sequence', title: 'El Canto del Alba' },
    { kind: 'timing', title: 'El Latido de la Forja' },
    { kind: 'sprint', title: 'Paso Relámpago' },
    { kind: 'bestmove', title: 'Golpe de Brasa' },
  ],
  jean: [
    { kind: 'timing', title: 'La Última Campanada' },
    { kind: 'memory', title: 'Fragmentos de la Hora' },
    { kind: 'sequence', title: 'El Eco del Péndulo' },
    { kind: 'bestmove', title: 'La Jugada Justa' },
    { kind: 'sprint', title: 'Tres Segundos' },
  ],
  van: [
    { kind: 'sequence', title: 'El Nombre de las Estrellas' },
    { kind: 'timing', title: 'El Sello del Firmamento' },
    { kind: 'memory', title: 'El Códice de los Nombres' },
    { kind: 'sprint', title: 'Trazo Veloz' },
    { kind: 'bestmove', title: 'Códice en Un Trazo' },
  ],
};
export const GAME_SYMBOLS = {
  lia: [{ icon: 'flame', name: 'Brasa' }, { icon: 'hint', name: 'Farol' }, { icon: 'heart', name: 'Corazón' }, { icon: 'crown', name: 'Corona' }],
  jean: [{ icon: 'clock', name: 'Reloj' }, { icon: 'hourglass', name: 'Arena' }, { icon: 'rewind', name: 'Retorno' }, { icon: 'crystal', name: 'Cristal' }],
  van: [{ icon: 'stars', name: 'Estrella' }, { icon: 'crystal', name: 'Cristal' }, { icon: 'lock', name: 'Sello' }, { icon: 'hint', name: 'Luz' }],
};
export const isBonusLevel = level => level >= 15 && level < 100 && level % 10 === 5;
export const bonusIndex = level => Math.max(0, Math.floor((level - 15) / 10));
export const gameFor = (hero, level) => {
  const list = HERO_GAMES[hero] || HERO_GAMES.lia;
  return list[bonusIndex(level) % list.length];
};
/** Los premios de los minijuegos son proporcionales al nivel (3 pistas en el 15 → 10 en el 95) y más escasos en los caminos difíciles. */
const PRIZE_PATH_SCALE = { 1: 1, 50: .8, 75: .6 };
const prizePathScale = (start = 1) => byPath(PRIZE_PATH_SCALE, start);
export const maxPrize = (level = 15, start = 1) => Math.max(2, Math.min(10, Math.round((3 + 7 * (level - 15) / 80) * prizePathScale(start))));
const scalePrize = (part, level = 15, start = 1) => part <= 0 ? 0 : Math.max(1, Math.round(Math.min(3, part) * maxPrize(level, start) / 3));
export const bonusPrize = (part, level, start = 1) => Math.max(1, scalePrize(part, level, start));
const MEMORY = { pairs: 4, misses: 6 };
export const SEQUENCE = { rounds: 3, mistakes: 2, lengths: [2, 3, 4] };
const TIMING = { tries: 3, period: 2400, zone: .25, center: .08 };
export const SPRINT = { rounds: 3, seconds: 10 };
export const BESTMOVE = { rounds: 3 };

/** Tableros miniatura verificados de exactamente 3 movimientos óptimos para «Paso Relámpago» (sprint). */
export const SPRINT_PUZZLES = [
  'h2.2.0 v2.4.0 v2.5.0 v2.3.1 v2.2.1 h2.5.4',
  'h2.2.0 v2.4.3 v2.3.0 v2.2.1 v2.4.0 v2.5.1',
  'h2.2.0 v3.5.0 h2.3.0 h2.1.0 h2.4.4 v2.3.0',
  'h2.2.0 v2.2.0 h2.4.0 v2.5.0 v3.3.0 h2.5.2',
  'h2.2.0 h2.3.0 h2.1.0 v3.5.0 v2.3.0 h2.4.4',
  'h2.2.0 h2.3.0 v2.5.4 v2.3.3 v2.5.1 h2.0.4 h3.0.0',
  'h2.2.0 h2.4.0 v2.3.0 v2.2.3 h2.0.1 v2.5.1 v2.4.1',
  'h2.2.0 v3.3.3 h2.0.0 v2.2.4 v2.2.2 v2.4.0 h2.1.1',
  'h2.2.0 v2.5.0 h2.3.0 h2.1.0 v2.5.2 h2.4.4 v2.3.0',
  'h2.2.0 v2.1.0 v2.3.2 h2.1.2 v2.4.0 v2.4.2 h2.4.0',
];

/** Retos tácticos verificados (1 movimiento reduce la distancia óptima, 2 no) para «Ojo Maestro» (bestmove). */
export const BESTMOVE_PUZZLES = [
  { board: 'h2.2.0 h2.5.0 v2.1.0 v2.3.3 v3.4.0 h2.4.4', best: { i: 3, to: 0 }, decoys: [{ i: 1, to: 1 }, { i: 4, to: 1 }] },
  { board: 'h2.2.0 v3.5.0 h2.3.4 h2.1.2 h2.4.0 v2.3.2', best: { i: 5, to: 4 }, decoys: [{ i: 3, to: 0 }, { i: 4, to: 1 }] },
  { board: 'h2.2.1 v2.2.3 h2.4.3 v2.5.3 v3.3.0 h2.5.0', best: { i: 3, to: 0 }, decoys: [{ i: 1, to: 4 }, { i: 4, to: 1 }] },
  { board: 'h2.2.0 h2.3.0 h2.1.0 v3.5.0 v2.3.4 h2.4.4', best: { i: 4, to: 0 }, decoys: [{ i: 1, to: 1 }, { i: 2, to: 1 }] },
  { board: 'h2.2.0 h2.3.0 v2.5.4 v2.3.3 v2.5.1 h2.0.4 h3.0.1', best: { i: 6, to: 0 }, decoys: [{ i: 1, to: 1 }, { i: 2, to: 3 }] },
  { board: 'h2.2.0 h2.4.3 v2.3.0 v2.2.3 h2.0.4 v2.5.3 v2.4.1', best: { i: 3, to: 0 }, decoys: [{ i: 2, to: 1 }, { i: 5, to: 1 }] },
  { board: 'h2.2.0 h2.0.3 v2.2.0 v2.3.2 v2.5.0 v2.4.1 h2.3.4', best: { i: 3, to: 4 }, decoys: [{ i: 2, to: 1 }, { i: 4, to: 1 }] },
  { board: 'h2.2.0 v2.5.0 h2.3.0 h2.1.0 v2.5.2 h2.4.4 v2.3.4', best: { i: 6, to: 0 }, decoys: [{ i: 2, to: 1 }, { i: 3, to: 1 }] },
  { board: 'h2.2.0 v2.1.3 v2.3.3 h2.1.0 v2.4.0 v2.4.2 h2.4.4', best: { i: 2, to: 0 }, decoys: [{ i: 1, to: 4 }, { i: 3, to: 1 }] },
  { board: 'h2.2.0 v2.1.3 h2.4.4 v2.5.1 v2.3.3 h2.0.4 v2.3.0', best: { i: 6, to: 1 }, decoys: [{ i: 1, to: 4 }, { i: 3, to: 2 }] },
];

function pickDistinctIndices(rng, total, count) {
  const pool = Array.from({ length: total }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

/** Order is fixed; only card positions, sequences and mini-boards vary deterministically with the adventure seed. */
export function createBonusPlan(hero, level, seed = 0, start = 1) {
  const heroId = HERO_GAMES[hero] ? hero : 'lia';
  const rng = mulberry32(hash32(seed, level, Object.keys(HERO_GAMES).indexOf(heroId), 507));
  const deck = [0, 0, 1, 1, 2, 2, 3, 3];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  const sequence = Array.from({ length: 4 }, () => Math.floor(rng() * 4));
  const sprintBoards = pickDistinctIndices(rng, SPRINT_PUZZLES.length, SPRINT.rounds);
  const bestBoards = pickDistinctIndices(rng, BESTMOVE_PUZZLES.length, BESTMOVE.rounds);
  const bestOrder = bestBoards.map(() => {
    const ord = [0, 1, 2];
    for (let i = 2; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
    return ord;
  });
  return { version: 2, hero: heroId, level, start, kind: gameFor(heroId, level).kind, deck, matched: [], flipped: [], mistakes: 0,
    sequence, round: 0, input: 0, hits: [], phase: 'ready',
    sprintBoards, sprintRound: 0, sprintSolved: 0, sprintPos: null, sprintResults: [],
    bestBoards, bestOrder, bestRound: 0, bestHits: 0, bestResults: [] };
}
export function ensureBonusPlan(run) {
  if (run.bonusPlan?.version === 2 && run.bonusPlan.sprintBoards && run.bonusPlan.bestBoards) return run.bonusPlan;
  const old = run.bonusPlan, level = old?.level || Math.max(15, run.level - 1);
  const plan = createBonusPlan(run.hero, level, run.seed, run.start);
  if (old?.prize !== undefined) { plan.prize = old.prize; plan.phase = 'done'; }
  run.bonusPlan = plan;
  return plan;
}
export function memoryTap(plan, index) {
  if (plan.prize !== undefined || plan.flipped.length >= 2 || !Number.isInteger(index) || index < 0 || index >= 8 || plan.matched.includes(index) || plan.flipped.includes(index)) return null;
  plan.flipped.push(index);
  if (plan.flipped.length < 2) return { type: 'open', indices: [index] };
  const indices = plan.flipped.slice();
  if (plan.deck[indices[0]] === plan.deck[indices[1]]) { plan.matched.push(...indices); plan.flipped = []; return { type: 'match', indices }; }
  plan.mistakes++;
  return { type: 'miss', indices };
}
export const memoryDone = plan => plan.matched.length === 8 || plan.mistakes >= MEMORY.misses;
export const memoryPart = plan => plan.matched.length === 8 ? (plan.mistakes <= 2 ? 3 : plan.mistakes <= 4 ? 2 : 1) : plan.matched.length >= 4 ? 1 : 0;
export function sequenceTap(plan, index) {
  if (plan.phase !== 'input' || plan.prize !== undefined || index < 0 || index >= 4) return null;
  if (index !== plan.sequence[plan.input]) { plan.mistakes++; plan.input = 0; plan.phase = plan.mistakes >= SEQUENCE.mistakes ? 'done' : 'ready'; return 'miss'; }
  plan.input++;
  if (plan.input === SEQUENCE.lengths[plan.round]) { plan.round++; plan.input = 0; plan.phase = plan.round >= SEQUENCE.rounds ? 'done' : 'ready'; return 'round'; }
  return 'step';
}
export const sequencePart = plan => plan.round === 3 ? (plan.mistakes ? 2 : 3) : plan.round;
/** A predictable back-and-forth sweep; score is calculated at the input timestamp, never from the last rendered frame. */
export function timingPosition(elapsed) { const t = ((Math.max(0, elapsed) % TIMING.period) / TIMING.period) * 2; return t <= 1 ? t : 2 - t; }
export const timingPoints = position => Math.abs(position - .5) <= TIMING.center ? 2 : Math.abs(position - .5) <= TIMING.zone ? 1 : 0;
export function recordTiming(plan, elapsed) {
  if (plan.prize !== undefined || plan.hits.length >= TIMING.tries || plan.phase !== 'running') return null;
  const points = timingPoints(timingPosition(elapsed)); plan.hits.push(points); plan.phase = plan.hits.length === TIMING.tries ? 'done' : 'ready'; return points;
}
export const timingPart = plan => { const n = plan.hits.reduce((a, b) => a + b, 0); return n >= 5 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0; };

/** Estado actual del minitablero en «Paso Relámpago» (sprint). */
export function sprintCurrent(plan) {
  const idx = plan.sprintBoards?.[plan.sprintRound] ?? 0;
  const decoded = decodeBoard(SPRINT_PUZZLES[idx] || SPRINT_PUZZLES[0]);
  return { pieces: decoded.pieces, pos: (plan.sprintPos?.length === decoded.pieces.length ? plan.sprintPos : decoded.pos).slice() };
}
export function sprintStart(plan) {
  if (plan.prize !== undefined || plan.sprintRound >= SPRINT.rounds) return null;
  const decoded = decodeBoard(SPRINT_PUZZLES[plan.sprintBoards[plan.sprintRound]]);
  plan.sprintPos = decoded.pos.slice();
  plan.phase = 'running';
  return sprintCurrent(plan);
}
export function sprintMove(plan, pieceIdx, to) {
  if (plan.phase !== 'running' || plan.prize !== undefined || !plan.sprintPos) return null;
  plan.sprintPos[pieceIdx] = to;
  if (!isWon(plan.sprintPos)) return { won: false };
  plan.sprintSolved++;
  plan.sprintResults.push(true);
  plan.sprintRound++;
  plan.sprintPos = null;
  plan.phase = plan.sprintRound >= SPRINT.rounds ? 'done' : 'ready';
  return { won: true, done: plan.phase === 'done' };
}
export function sprintTimeout(plan) {
  if (plan.phase !== 'running' || plan.prize !== undefined) return null;
  plan.sprintResults.push(false);
  plan.sprintRound++;
  plan.sprintPos = null;
  plan.phase = plan.sprintRound >= SPRINT.rounds ? 'done' : 'ready';
  return { done: plan.phase === 'done' };
}
export const sprintPart = plan => Math.min(3, plan.sprintSolved || 0);

/** Reto actual de «Ojo Maestro» (bestmove): tablero + 3 movimientos candidatos ordenados por la semilla. */
export function bestMoveCurrent(plan) {
  const idx = plan.bestBoards?.[plan.bestRound] ?? 0;
  const item = BESTMOVE_PUZZLES[idx] || BESTMOVE_PUZZLES[0];
  const decoded = decodeBoard(item.board);
  const rawOpts = [{ ...item.best, best: true }, { ...item.decoys[0], best: false }, { ...item.decoys[1], best: false }];
  const order = plan.bestOrder?.[plan.bestRound] || [0, 1, 2];
  return { pieces: decoded.pieces, pos: decoded.pos, options: order.map((k) => rawOpts[k]) };
}
export function bestMovePick(plan, optIdx) {
  if (plan.prize !== undefined || plan.bestRound >= BESTMOVE.rounds || optIdx < 0 || optIdx > 2) return null;
  const cur = bestMoveCurrent(plan);
  const hit = !!cur.options[optIdx]?.best;
  if (hit) plan.bestHits++;
  plan.bestResults.push(hit);
  plan.bestRound++;
  plan.phase = plan.bestRound >= BESTMOVE.rounds ? 'done' : 'ready';
  return { hit, bestIdx: cur.options.findIndex((o) => o.best), done: plan.phase === 'done' };
}
export const bestMovePart = plan => Math.min(3, plan.bestHits || 0);

export const earnedPart = plan => ({
  memory: memoryPart,
  sequence: sequencePart,
  timing: timingPart,
  sprint: sprintPart,
  bestmove: bestMovePart,
}[plan.kind] || timingPart)(plan);
export function finishBonus(plan) {
  if (plan.prize === undefined) plan.prize = bonusPrize(earnedPart(plan), plan.level, plan.start);
  plan.phase = 'done'; return plan.prize;
}
/** One atomic claim; resumeAdventure must not add the prize a second time. */
export function claimBonus(run) {
  const plan = run.bonusPlan;
  if (!plan || plan.prize === undefined) return 0;
  const prize = run.lastBonusClaim >= plan.level ? 0 : plan.prize;
  run.hints = (run.hints || 0) + prize;
  run.lastBonusClaim = Math.max(run.lastBonusClaim || 0, plan.level); run.bonus = 0; delete run.bonusPlan;
  return prize;
}
