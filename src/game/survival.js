import { decodeBoard, isValidState } from '../engine/board.js';
import levels from '../data/survival.json' with { type: 'json' };

export const SURVIVAL_LEVELS = levels.length;
export const SURVIVAL_TURNS = levels.reduce((sum, level) => sum + level.opt, 0);
const ROUTE_VERSION = 1;

export const survivalProgress = (store) => (store.survival?.routeVersion === ROUTE_VERSION ? store.survival : null);

export function survivalBestLevel(store) {
  const progress = survivalProgress(store);
  const reached = Number.isInteger(progress?.cleared)
    ? Math.max(1, progress.cleared + Number(progress.status === 'active'))
    : 0;
  const best = Number.isInteger(store.survivalBest) ? store.survivalBest : 0;
  return Math.min(SURVIVAL_LEVELS, Math.max(best, reached));
}

export const newSurvival = () => ({
  routeVersion: ROUTE_VERSION,
  cleared: 0,
  remaining: SURVIVAL_TURNS,
  pos: null,
  status: 'active',
});

export function buildSurvival(progress) {
  const n = progress.cleared + 1;
  const { board, opt } = levels[n - 1];
  const { pieces, pos, walls } = decodeBoard(board);
  const saved = progress.pos;
  return {
    n,
    pieces,
    pos:
      Array.isArray(saved) && saved.every(Number.isInteger) && isValidState(pieces, saved, walls)
        ? saved.slice()
        : pos.slice(),
    start: pos,
    walls,
    opt,
    moves: 0,
    hist: [],
    els: [],
    done: false,
  };
}

/** Un movimiento válido siempre gasta un turno, incluso el que resuelve el tablero. */
export function spendSurvivalTurn(progress, pos, won) {
  const remaining = progress.remaining - 1;
  const cleared = progress.cleared + Number(won);
  return {
    ...progress,
    cleared,
    remaining,
    pos: won || !remaining ? null : pos.slice(),
    status: cleared === SURVIVAL_LEVELS ? 'won' : remaining ? 'active' : 'lost',
  };
}

export function writeSurvival(store, progress) {
  const best = survivalBestLevel(store);
  store.survival = {
    ...progress,
    updatedAt: Math.max(Date.now(), (progress.updatedAt || 0) + 1),
  };
  store.survivalBest = Math.max(best, survivalBestLevel(store));
  return store.survival;
}
