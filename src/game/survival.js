import { decodeBoard, isValidState } from '../engine/board.js';
import routes from '../data/survival.json' with { type: 'json' };

export const CHALLENGE_ROUTES = [
  { id: '150', name: 'Senda Breve', turns: 150, levels: routes['150'].length, tag: 'Clásico' },
  { id: '200', name: 'Senda Firme', turns: 200, levels: routes['200'].length, tag: 'Exigente' },
  { id: '250', name: 'Senda Eterna', turns: 250, levels: routes['250'].length, tag: 'Maestro' },
];

/**
 * Reliquias del Desafío. Calibradas con el mismo modelo de jugador que la Aventura para que terminen la senda con
 * probabilidad parecida, cada una con su estilo:
 *   · Brújula: previene (una pista por tablero). La mejor para jugadores medios.
 *   · Reloj de Arena: segunda oportunidad (+2 turnos de margen y rehacer 1 tablero entero). La de los expertos.
 *   · Hilo del Retorno: corrige (2 deshacer por tablero, que devuelven su turno). La más regular.
 */
export const RESET_BONUS_TURNS = 2;
export const UNDO_PER_BOARD = 2;
export const CHALLENGE_RELICS = [
  {
    id: 'hint',
    name: 'Brújula',
    label: '1 pista por tablero',
    action: 'Pista',
    rule: '1 por tablero',
  },
  {
    id: 'reset',
    name: 'Reloj de Arena',
    label: '+2 turnos y rehace 1 tablero',
    action: 'Rehacer tablero',
    rule: '1 por partida',
  },
  {
    id: 'undo',
    name: 'Hilo del Retorno',
    label: '2 deshacer por tablero',
    action: 'Deshacer',
    rule: '2 por tablero',
  },
];

/** Turnos con los que empieza la senda con esa reliquia (el Reloj de Arena suma su margen). */
export const startTurns = (routeId, relicId) =>
  routeById(routeId).turns + (challengeRelicById(relicId).id === 'reset' ? RESET_BONUS_TURNS : 0);
/** Posiciones a las que puede volver el Hilo (las más recientes al final); acepta guardados con `lastPos`. */
const undoStackOf = (p) => (Array.isArray(p.undoStack) ? p.undoStack : Array.isArray(p.lastPos) ? [p.lastPos] : []);
/** Deshacer gastados en este tablero (los guardados antiguos solo sabían si se había usado). */
const undoCountOf = (p) => (Number.isInteger(p.undoCount) ? p.undoCount : p.undoUsedBoard ? UNDO_PER_BOARD : 0);

export const SURVIVAL_LEVELS = routes['150'].length;
export const SURVIVAL_TURNS = routes['150'].reduce((sum, level) => sum + level.opt, 0);
const ROUTE_VERSION = 2;

export const routeById = (id) => CHALLENGE_ROUTES.find((route) => route.id === String(id)) || CHALLENGE_ROUTES[0];
export const routeLevels = (id) => routes[routeById(id).id];
export const challengeRelicById = (id) => CHALLENGE_RELICS.find((relic) => relic.id === id) || CHALLENGE_RELICS[0];

export const survivalProgress = (store) =>
  store?.survival?.routeVersion === ROUTE_VERSION && routes[store.survival.route] ? store.survival : null;

export function survivalBestFor(store, routeId) {
  const route = routeById(routeId);
  const progress = survivalProgress(store);
  const reached =
    progress?.route === route.id && Number.isInteger(progress.cleared)
      ? Math.max(1, progress.cleared + Number(progress.status === 'active'))
      : 0;
  const stored = Number.isInteger(store?.survivalBests?.[route.id]) ? store.survivalBests[route.id] : 0;
  // Antes de añadir más rutas, el récord global correspondía a la única senda de 150 turnos.
  const legacy =
    route.id === '150' && !store?.survivalBests && Number.isInteger(store?.survivalBest) ? store.survivalBest : 0;
  return survivalWonFor(store, route.id) ? route.levels : Math.min(route.levels, Math.max(stored, reached, legacy));
}

export function survivalWonFor(store, routeId) {
  const route = routeById(routeId);
  const progress = survivalProgress(store);
  return !!(store?.survivalWon?.[route.id] || (progress?.route === route.id && progress.status === 'won'));
}

export function survivalCompletedCount(store) {
  return CHALLENGE_ROUTES.filter((route) => survivalWonFor(store, route.id)).length;
}

export function survivalBestLevel(store) {
  const perRoute = Math.max(...CHALLENGE_ROUTES.map((route) => survivalBestFor(store, route.id)));
  const legacy = Number.isInteger(store?.survivalBest) ? store.survivalBest : 0;
  return Math.max(legacy, perRoute);
}

export function newSurvival(routeId = '150', relicId = 'hint') {
  const route = routeById(routeId);
  const relic = challengeRelicById(relicId);
  const turns = startTurns(route.id, relic.id);
  return {
    routeVersion: ROUTE_VERSION,
    route: route.id,
    relic: relic.id,
    cleared: 0,
    remaining: turns,
    boardStartRemaining: turns,
    pos: null,
    lastPos: null,
    undoStack: [],
    undoCount: 0,
    hintUsedTurn: false,
    resetUsed: false,
    undoUsedBoard: false,
    status: 'active',
  };
}

export function buildSurvival(progress) {
  const levels = routeLevels(progress.route);
  const n = progress.cleared + 1;
  const { board, opt } = levels[n - 1];
  const { pieces, pos, walls } = decodeBoard(board);
  const saved = progress.pos;
  return {
    n,
    total: levels.length,
    route: routeById(progress.route).id,
    pieces,
    pos:
      Array.isArray(saved) && saved.every(Number.isInteger) && isValidState(pieces, saved, walls)
        ? saved.slice()
        : pos.slice(),
    start: pos,
    walls,
    opt,
    moves: Math.max(0, (progress.boardStartRemaining ?? progress.remaining) - progress.remaining),
    hist: [],
    els: [],
    done: false,
  };
}

/** Un movimiento válido siempre gasta un turno, incluso el que resuelve el tablero. */
export function spendSurvivalTurn(progress, pos, won, prevPos = null) {
  const levels = routeLevels(progress.route);
  const remaining = progress.remaining - 1;
  const cleared = progress.cleared + Number(won);
  const status = cleared === levels.length ? 'won' : remaining ? 'active' : 'lost';
  if (won) {
    return {
      ...progress,
      cleared,
      remaining,
      boardStartRemaining: remaining,
      pos: null,
      lastPos: null,
      undoStack: [],
      undoCount: 0,
      hintUsedTurn: false,
      undoUsedBoard: false,
      status,
    };
  }
  const stack = !remaining || !Array.isArray(prevPos) ? [] : [...undoStackOf(progress), prevPos.slice()];
  return {
    ...progress,
    cleared,
    remaining,
    pos: !remaining ? null : pos.slice(),
    lastPos: stack.at(-1) || null,
    undoStack: stack.slice(-UNDO_PER_BOARD),
    hintUsedTurn: !remaining ? false : Boolean(progress.hintUsedTurn),
    status,
  };
}

export function canUseChallengeRelic(progress) {
  if (!progress || progress.status !== 'active') return { ok: false, reason: '' };
  switch (progress.relic) {
    case 'hint':
      return progress.hintUsedTurn
        ? { ok: false, reason: 'Usada en este tablero' }
        : { ok: true, reason: '1 uso en este tablero' };
    case 'reset':
      if (progress.resetUsed) return { ok: false, reason: 'Ya usada en esta partida' };
      if (!progress.pos || progress.remaining >= (progress.boardStartRemaining ?? progress.remaining)) {
        return { ok: false, reason: 'Mueve al menos una vez' };
      }
      return { ok: true, reason: '1 uso en la partida' };
    case 'undo': {
      const left = UNDO_PER_BOARD - undoCountOf(progress);
      if (left <= 0) return { ok: false, reason: 'Usada en este tablero' };
      if (!undoStackOf(progress).length) return { ok: false, reason: 'Mueve primero' };
      return { ok: true, reason: left > 1 ? `${left} usos en este tablero` : '1 uso en este tablero' };
    }
    default:
      return { ok: false, reason: '' };
  }
}

export function useChallengeHint(progress) {
  if (progress?.relic !== 'hint' || !canUseChallengeRelic(progress).ok) return progress;
  return { ...progress, hintUsedTurn: true };
}

export function useChallengeReset(progress) {
  if (progress?.relic !== 'reset' || !canUseChallengeRelic(progress).ok) return progress;
  return {
    ...progress,
    remaining: progress.boardStartRemaining ?? progress.remaining,
    pos: null,
    lastPos: null,
    undoStack: [],
    undoCount: 0,
    resetUsed: true,
    hintUsedTurn: false,
    undoUsedBoard: false,
  };
}

export function useChallengeUndo(progress) {
  if (progress?.relic !== 'undo' || !canUseChallengeRelic(progress).ok) return progress;
  const stack = undoStackOf(progress).slice();
  const back = stack.pop();
  const count = undoCountOf(progress) + 1;
  return {
    ...progress,
    remaining: progress.remaining + 1,
    pos: back.slice(),
    lastPos: stack.at(-1) || null,
    undoStack: stack,
    undoCount: count,
    undoUsedBoard: count >= UNDO_PER_BOARD,
    hintUsedTurn: false,
  };
}

export function writeSurvival(store, progress) {
  const best = survivalBestLevel(store);
  const route = routeById(progress.route).id;
  const previousBests = CHALLENGE_ROUTES.map(({ id }) => [id, survivalBestFor(store, id)]).filter(
    ([, level]) => level > 0,
  );
  store.survival = {
    ...progress,
    updatedAt: Math.max(Date.now(), (progress.updatedAt || 0) + 1),
  };
  store.survivalBests = {
    ...Object.fromEntries(previousBests),
  };
  store.survivalBests[route] = survivalBestFor(store, route);
  if (progress.status === 'won') {
    store.survivalWon = {
      ...(store.survivalWon || {}),
      [route]: true,
    };
  }
  store.survivalBest = Math.max(best, survivalBestLevel(store));
  return store.survival;
}
