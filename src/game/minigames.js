import { hash32, mulberry32 } from '../engine/rng.js';

export const BONUS_KINDS = ['memory', 'sequence', 'timing'];
export const HERO_GAMES = {
  lia: [
    { kind: 'memory', title: 'Brasas del Juramento' },
    { kind: 'sequence', title: 'El Canto del Alba' },
    { kind: 'timing', title: 'El Latido de la Forja' },
  ],
  jean: [
    { kind: 'timing', title: 'La Última Campanada' },
    { kind: 'memory', title: 'Fragmentos de la Hora' },
    { kind: 'sequence', title: 'El Eco del Péndulo' },
  ],
  van: [
    { kind: 'sequence', title: 'El Nombre de las Estrellas' },
    { kind: 'timing', title: 'El Sello del Firmamento' },
    { kind: 'memory', title: 'El Códice de los Nombres' },
  ],
};
export const GAME_SYMBOLS = {
  lia: [{ icon: 'flame', name: 'Brasa' }, { icon: 'hint', name: 'Farol' }, { icon: 'heart', name: 'Corazón' }, { icon: 'crown', name: 'Corona' }],
  jean: [{ icon: 'clock', name: 'Reloj' }, { icon: 'hourglass', name: 'Arena' }, { icon: 'rewind', name: 'Retorno' }, { icon: 'crystal', name: 'Cristal' }],
  van: [{ icon: 'stars', name: 'Estrella' }, { icon: 'crystal', name: 'Cristal' }, { icon: 'lock', name: 'Sello' }, { icon: 'hint', name: 'Luz' }],
};
export const isBonusLevel = level => level >= 15 && level < 100 && level % 10 === 5;
export const bonusIndex = level => Math.max(0, Math.floor((level - 15) / 10));
export const gameFor = (hero, level) => (HERO_GAMES[hero] || HERO_GAMES.lia)[bonusIndex(level) % 3];
export const maxPrize = (level = 15) => Math.max(3, Math.min(10, Math.round(3 + 7 * (level - 15) / 80)));
export const scalePrize = (part, level = 15) => part <= 0 ? 0 : Math.max(1, Math.round(Math.min(3, part) * maxPrize(level) / 3));
export const bonusPrize = (part, level) => Math.max(1, scalePrize(part, level));
export const MEMORY = { pairs: 4, misses: 6 };
export const SEQUENCE = { rounds: 3, mistakes: 2, lengths: [2, 3, 4] };
export const TIMING = { tries: 3, period: 2400, zone: .25, center: .08 };

/** Order is fixed; only card positions and sequences vary deterministically with the adventure seed. */
export function createBonusPlan(hero, level, seed = 0) {
  const heroId = HERO_GAMES[hero] ? hero : 'lia';
  const rng = mulberry32(hash32(seed, level, Object.keys(HERO_GAMES).indexOf(heroId), 507));
  const deck = [0, 0, 1, 1, 2, 2, 3, 3];
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return { version: 2, hero: heroId, level, kind: gameFor(heroId, level).kind, deck, matched: [], flipped: [], mistakes: 0,
    sequence: Array.from({ length: 4 }, () => Math.floor(rng() * 4)), round: 0, input: 0, hits: [], phase: 'ready' };
}
export function ensureBonusPlan(run) {
  if (run.bonusPlan?.version === 2) return run.bonusPlan;
  const old = run.bonusPlan, level = old?.level || Math.max(15, run.level - 1);
  const plan = createBonusPlan(run.hero, level, run.seed);
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
export const earnedPart = plan => plan.kind === 'memory' ? memoryPart(plan) : plan.kind === 'sequence' ? sequencePart(plan) : timingPart(plan);
export function finishBonus(plan) {
  if (plan.prize === undefined) plan.prize = bonusPrize(earnedPart(plan), plan.level);
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
