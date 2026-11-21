/* ============================ Reglas de la partida ============================
 * Decisiones puras del flujo de una aventura o de un reto diario: crear la partida, guardar el tablero, ganar,
 * perder, saltar, renacer y avanzar de nivel. Aquí no hay DOM, audio ni estado global: cada función recibe la
 * partida (`run`) y el tablero (`G`) y los modifica o devuelve el resultado. `session.js` las orquesta y la UI pinta.
 */
import { MAX_LEVEL } from '../engine/difficulty.js';
import { encodeBoard, isValidState } from '../engine/board.js';
import { analyze } from '../engine/solver.js';
import { zoneIdx } from '../data/zones.js';
import { clearRewards, snapshotRescue } from './heroes.js';
import { relicFor } from './relics.js';
import { canPaidRevive, hasRevive, shopBoardKey, useFreeRetry, useRevive } from './shop.js';
import { fateDeck, keepsStreak } from './fate.js';

const copyRows = (rows) => rows.map((p) => p.slice());

/** Partida nueva de aventura. `from` es el nivel inicial ya validado. */
export function newAdventureRun({ seed, start, mode = 'c', hero, from, hints, relic }) {
  const selected = relicFor({ mode, relic });
  return {
    seed,
    level: from,
    start,
    mode,
    hero,
    ...(selected && { relic: selected.id }),
    lifeUsed: false,
    revive: 0,
    revivesBought: 0,
    undoUsedAt: 0,
    undoUsedLevel: 0,
    undoUsedCount: 0,
    vanAwardedAt: 0,
    score: 0,
    hints: (hints ?? 0) + (selected?.hints ?? 0), // el Farol se suma a las pistas del camino y a las de la racha diaria
    adj: 0,
    streak: 0,
    recBroken: false,
    firstLevel: from,
    fateDeck: fateDeck(seed),
    fate: [],
    fatePicked: Math.min(9, Math.floor((from - 1) / 10)), // al empezar más adelante, las ciudades saltadas no ofrecen carta
  };
}

/**
 * Partida guardada lista para continuar: rellena los campos que faltan en guardados antiguos. Las partidas de antes de
 * las cartas del destino empiezan a recibirlas en la próxima ciudad que cierren; los campos del camino heroico y de los
 * jefes (que ya no existen) se descartan.
 */
export function restoreRun(saved) {
  const run = {
    start: 1,
    mode: 'c',
    hero: 'lia',
    lifeUsed: false,
    revive: 0,
    revivesBought: 0,
    undoUsedAt: 0,
    undoUsedLevel: 0,
    undoUsedCount: 0,
    vanAwardedAt: 0,
    recBroken: false,
    ...saved,
  };
  for (const k of ['route', 'routeZone', 'bossSeen', 'bossRetry', 'heroicHintLevel', 'heroicHintCount', 'enterPending'])
    delete run[k];
  if (run.pendingClear) delete run.pendingClear.routeChosen;
  if (run.board) {
    delete run.board.timeLimit;
    delete run.board.timeLeft;
  }
  if (!run.daily && !run.survival) {
    run.fate = Array.isArray(run.fate) ? run.fate : [];
    run.fatePicked ??= Math.min(9, Math.floor(((run.pendingClear?.level ?? run.level) - 1) / 10));
  }
  return run;
}

/** Partida de reto diario: sin héroe, sin vidas y con la ruta normal. */
export function newDailyRun({ challenge, day, index, boards, attempt }) {
  return {
    daily: { id: challenge.id, day, index, boards, attempt },
    seed: day,
    level: challenge.level,
    start: 1,
    mode: 'c',
    hero: 'none',
    score: 0,
    hints: 0,
    adj: 0,
    streak: 0,
    lifeUsed: true,
    revive: 0,
    revivesBought: 0,
    undoUsedAt: 0,
    undoUsedLevel: 0,
    undoUsedCount: 0,
    vanAwardedAt: 0,
    recBroken: false,
  };
}

/** Tableros elegidos del reto y el intento a retomar. Devuelve `index` −1 si ya están todos resueltos. */
export function dailyEntry(progress, targets, index) {
  const boards = targets.map((_, i) => progress?.boards?.[i] || null);
  const attempt = index === undefined ? progress?.attempt : null;
  index ??= attempt?.index ?? boards.findIndex((board) => !board);
  return { boards, attempt, index };
}

/** Huella del tablero (piezas, inicio y rocas): distingue un tablero de otro aunque tengan las mismas piezas. */
export const boardKey = (G) => encodeBoard(G.pieces, G.start, G.walls || []);

/** Posición en curso del reto diario, para retomarla si se cierra el juego. */
export const dailyAttempt = (daily, G) => ({
  index: daily.index,
  key: boardKey(G),
  pos: G.pos.slice(),
  moves: G.moves,
  hist: copyRows(G.hist),
});

/**
 * ¿Sirve este intento guardado para el tablero G? Con huella, solo si es el mismo tablero. Los intentos guardados antes de
 * la huella se aceptan si todas sus posiciones (la actual y las de deshacer) son legales en G y desde ahí hay solución:
 * así un intento de un tablero que ya no existe nunca deja piezas encima de una roca o de otra pieza.
 */
function attemptFits(G, saved) {
  if (saved.key) return saved.key === boardKey(G);
  const walls = G.walls || [];
  const legal = (pos) => pos.length === G.pos.length && isValidState(G.pieces, pos, walls);
  return legal(saved.pos) && (saved.hist || []).every(legal) && !!analyze(G.pieces, saved.pos, 600000, walls);
}

/** Un intento guardado del reto vale solo si es del mismo tablero y aún le quedan movimientos. */
export function restoreDailyAttempt(G, daily) {
  const saved = daily?.attempt;
  if (!saved || saved.index !== daily.index || saved.moves >= G.limit || !attemptFits(G, saved)) return false;
  Object.assign(G, { pos: saved.pos.slice(), moves: saved.moves, hist: copyRows(saved.hist) });
  return true;
}

/** El tablero solo se guarda mientras se juega: no tras ganar, ni durante un rescate o una oferta de renacer. */
export const canSaveBoard = (run, G) =>
  !!(run && G && !G.done && G.n === run.level && !run.pendingClear && !run.rescue && !run.pendingRevive);

/** Copia serializable del tablero en curso (lo que se guarda en `run.board`). */
export function snapshotBoard(G) {
  return {
    level: G.n,
    rate: G.rate,
    pieces: G.pieces.map((p) => ({ ...p })),
    walls: copyRows(G.walls || []),
    pos: G.pos.slice(),
    start: G.start.slice(),
    opt: G.opt,
    limit: G.limit,
    bought: G.bought || 0,
    tutorial: G.tutorial || null,
    moves: G.moves,
    hist: copyRows(G.hist),
    colors: G.colors?.slice(),
    family: G.family,
    seal: G.seal ? { ...G.seal, cell: G.seal.cell.slice() } : null,
  };
}

/** Guarda el tablero dentro de la partida (y la marca de turnos comprados de la tienda). */
export function storeBoard(run, G) {
  if (G.bought > 0) run.turnPackBoard = shopBoardKey(G);
  run.board = snapshotBoard(G);
}

/** Ciudad (0-9) cuyo capítulo se abre al superar el nivel `level`. */
export const cityAfter = (level) => Math.min(9, Math.floor(level / 10));

/** Suma un tablero superado a la aventura: puntos, racha, dificultad adaptativa, pistas y avance pendiente. */
export function applyAdventureWin(run, G, gain) {
  run.score += gain.total;
  run.cleared = (run.cleared || 0) + 1;
  run.streak = keepsStreak(run, gain.eff) ? (run.streak || 0) + 1 : 0;
  run.adj = Math.max(-2, Math.min(run.level < 10 ? 1 : 2, run.adj + (gain.eff >= 0.9 ? 1 : gain.eff < 0.4 ? -1 : 0)));
  clearRewards(run, G.n);
  run.pendingClear = { level: G.n, gain: gain.total, moves: G.moves, opt: G.opt };
}

/**
 * Registra un tablero del reto diario (se queda la mejor marca). Devuelve el siguiente tablero sin resolver
 * (−1 si ya no quedan) y, al completarlos todos, los totales del reto.
 */
export function applyDailyWin(daily, G, points) {
  const previous = daily.boards[daily.index];
  if (!previous || G.moves < previous.moves) daily.boards[daily.index] = { moves: G.moves, opt: G.opt, points };
  daily.attempt = null;
  const next = daily.boards.findIndex((board) => !board);
  if (next >= 0) return { next, totals: null };
  const moves = daily.boards.reduce((sum, board) => sum + board.moves, 0);
  const opt = daily.boards.reduce((sum, board) => sum + board.opt, 0);
  return { next, totals: { moves, opt } };
}

/** Saltar nivel (tienda): sin puntos y sin racha, pero avanza como si se hubiera superado. */
export function applySkip(run, G) {
  run.streak = 0;
  run.helpAt = G.n;
  run.pendingClear = { level: G.n, gain: 0, moves: G.moves, opt: G.opt, skipped: true };
}

/**
 * Qué pasa al perder un tablero, en orden de preferencia. Aplica el rescate elegido sobre `run` y devuelve:
 * 'daily' (el reto se repite), 'retry' (reintento gratis), 'revive' (vida guardada), 'offer' (renacer pagando)
 * o 'gameover'.
 */
export function resolveFail(run, G, why) {
  if (run.daily) {
    run.daily.attempt = { index: run.daily.index, key: boardKey(G), pos: G.start.slice(), moves: 0, hist: [] };
    run.rescue = { ...snapshotRescue(G), kind: 'daily' };
    return 'daily';
  }
  if (useFreeRetry(run, G)) return 'retry';
  if (hasRevive(run)) {
    useRevive(run, G);
    return 'revive';
  } // compatibilidad con cargas antiguas
  if (canPaidRevive(run, run.mode)) {
    run.pendingRevive = why || 'limit';
    return 'offer';
  }
  return 'gameover';
}

/** Tras pagar el renacer el tablero vuelve a su inicio, sin los turnos comprados. */
export function resetBoardForRevive(G) {
  Object.assign(G, {
    pos: G.start.slice(),
    moves: 0,
    hist: [],
    done: false,
    limit: G.limit - (G.bought || 0),
    bought: 0,
  });
}

/** Acepta un rescate (reintento, vida o poder de Lía): el tablero vuelve a empezar y el rescate se consume. */
export function acceptRescue(run, G) {
  resetBoardForRevive(G);
  delete run.rescue;
}

/** Desliza la pieza `i` a `x` y lo cuenta como un movimiento (guardando la posición anterior para deshacer). */
export function applyMove(G, i, x) {
  G.hist.push(G.pos.slice());
  G.pos[i] = x;
  G.moves++;
}

/** Marca que en este nivel se usó ayuda (cuenta para los logros «sin ayuda»). */
export const markHelped = (run, level) => {
  run.helpAt = level;
};

/** Cómo sigue la aventura tras superar el nivel `n`: fin del juego, cruce de ciudad (cada 10) o nivel siguiente. */
export const clearKind = (n) => (n >= MAX_LEVEL ? 'final' : n % 10 === 0 ? 'crossing' : 'next');

/** Avanza la partida al nivel siguiente al superado y marca el viaje de mapa y el bonus si tocan. */
export function advanceRun(run, n, { bonus = false } = {}) {
  run.level = n + 1;
  if (clearKind(n) === 'crossing') run.travelFrom = zoneIdx(n);
  if (bonus) run.bonus = 1;
  delete run.pendingClear;
}

/** Actualiza el récord del camino (`paths[key]`). `final` cuenta la partida como terminada. */
export function updateBest(paths, key, run, { final = false, now = Date.now() } = {}) {
  const r = paths[key] || (paths[key] = { score: 0, level: 0, runs: 0 });
  if (run.mode === 'c' && run.score > r.score) {
    r.score = run.score;
    r.recordAt = now;
    run.recBroken = true;
  }
  if (run.level > r.level) r.level = run.level;
  if (final) r.runs++;
  return r;
}
