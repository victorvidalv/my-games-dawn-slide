/* ============================ Reglas de la partida ============================
 * Decisiones puras del flujo de una aventura o de un reto diario: crear la partida, guardar el tablero, ganar,
 * perder, saltar, renacer y avanzar de nivel. Aquí no hay DOM, audio ni estado global: cada función recibe la
 * partida (`run`) y el tablero (`G`) y los modifica o devuelve el resultado. `session.js` las orquesta y la UI pinta.
 */
import { MAX_LEVEL } from '../engine/difficulty.js';
import { encodeBoard, isValidState } from '../engine/board.js';
import { analyze } from '../engine/solver.js';
import { DAILY_REDO_REFUND, DAILY_TURN_BUDGET } from './daily.js';
import { clearRewards } from './heroes.js';
import { relicFor } from './relics.js';
import { canPaidRevive, hasRevive, useFreeRetry, useRevive } from './shop.js';
import { FATE_EVERY, FATE_PICKS, fateById, fateDeck, fatePerfectHints, nextStreak } from './fate.js';
import { runRank } from './rank.js';
import { nextAdj } from './run-points.js';

const copyRows = (rows) => rows.map((p) => p.slice());

/** Partida nueva de aventura (siempre desde el nivel 1). */
export function newAdventureRun({ seed, start, mode = 'c', hero, hints, relic }) {
  const selected = relicFor({ mode, relic });
  return {
    seed,
    level: 1,
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
    bestStreak: 0,
    perfects: 0,
    recBroken: false,
    firstLevel: 1,
    fateDeck: fateDeck(seed),
    fate: [],
    fatePicked: 0,
  };
}

/**
 * Partida guardada lista para continuar: rellena los campos que faltan en guardados antiguos y descarta
 * campos de mecánicas retiradas (minijuegos, sellos, torre).
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
  for (const k of [
    'route',
    'routeZone',
    'bossSeen',
    'bossRetry',
    'heroicHintLevel',
    'heroicHintCount',
    'enterPending',
    'bonus',
    'bonusPlan',
    'lastBonusClaim',
    'sealClaims',
    'travelFrom',
    'lastSkipZone',
  ])
    delete run[k];
  if (run.pendingClear) delete run.pendingClear.routeChosen;
  if (run.board) {
    delete run.board.timeLimit;
    delete run.board.timeLeft;
    delete run.board.seal;
  }
  if (!run.daily) {
    if (run.level > MAX_LEVEL) {
      run.level = MAX_LEVEL;
      delete run.board;
      delete run.pendingClear;
    }
    run.fate = Array.isArray(run.fate) ? run.fate.filter(fateById) : [];
    run.fatePicked = Math.min(
      FATE_PICKS,
      run.fatePicked ?? Math.floor(((run.pendingClear?.level ?? run.level) - 1) / FATE_EVERY),
    );
  }
  return run;
}

/** Partida de Desafío: 15 tableros progresivos con semilla aleatoria y reserva compartida de turnos (DAILY_TURN_BUDGET). */
export function newDailyRun({ challenge, day, seed, index, boards, used = 0, attempt = null, redo = false }) {
  const remaining = Math.max(0, DAILY_TURN_BUDGET - used);
  const runSeed = Number.isFinite(seed) ? seed : day;
  return {
    daily: { id: challenge.id, day, seed: runSeed, index, used, remaining, boards, attempt, redo: !!redo },
    seed: runSeed,
    level: challenge.level,
    start: 1,
    mode: 'c',
    hero: 'none',
    fate: [],
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

/** Estado inicial (semilla aleatoria nueva) o reanudado (misma semilla) del Desafío. */
export function dailyEntry(
  progress,
  targets,
  { restart = false, randomSeed = () => Math.floor(Math.random() * 0x7fffffff) + 1 } = {},
) {
  const fresh = () => ({
    seed: randomSeed(),
    boards: targets.map(() => null),
    used: 0,
    attempt: null,
    index: 0,
    redo: false,
  });
  if (restart || !progress || progress.finished) return fresh();
  const boards = targets.map((_, i) => progress.boards?.[i] || null);
  const used = Number.isFinite(progress.used) ? progress.used : 0;
  const attempt = progress.attempt || null;
  const index = attempt?.index ?? boards.findIndex((board) => !board);
  if (index < 0 || used >= DAILY_TURN_BUDGET) return fresh();
  const seed = Number.isFinite(progress.seed) ? progress.seed : randomSeed();
  return { seed, boards, used, attempt, index, redo: !!progress.redo };
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
  };
}

/** Guarda el tablero dentro de la partida. */
export function storeBoard(run, G) {
  run.board = snapshotBoard(G);
}

/** Tramo (0-6) cuyo fondo/música se abre al superar el nivel `level`. */
export const cityAfter = (level) => Math.min(6, Math.floor(level / FATE_EVERY));

/** Suma un tablero superado a la aventura: puntos, racha, dificultad adaptativa, pistas y avance pendiente. */
export function applyAdventureWin(run, G, gain) {
  run.score += gain.total;
  run.cleared = (run.cleared || 0) + 1;
  if (G.moves <= G.opt) run.perfects = (run.perfects || 0) + 1;
  run.streak = nextStreak(run, gain.eff);
  run.bestStreak = Math.max(run.bestStreak || 0, run.streak);
  run.adj = nextAdj(run.adj, run.level, gain.eff);
  clearRewards(run, G.n);
  run.hints = (run.hints || 0) + fatePerfectHints(run, G.moves, G.opt, G.n); // Maestría
  run.pendingClear = { level: G.n, gain: gain.total, moves: G.moves, opt: G.opt };
}

/**
 * Registra un tablero superado del reto diario y descuenta sus turnos de la reserva (DAILY_TURN_BUDGET).
 * Devuelve el siguiente tablero (−1 si se completaron los 15 o se agotó la reserva).
 */
export function applyDailyWin(daily, G, points) {
  daily.boards[daily.index] = { moves: G.moves, opt: G.opt, points };
  daily.used = Math.min(DAILY_TURN_BUDGET, (daily.used || 0) + G.moves);
  daily.remaining = Math.max(0, DAILY_TURN_BUDGET - daily.used);
  daily.attempt = null;
  const cleared = daily.boards.filter(Boolean).length;
  const finished = cleared >= daily.boards.length || daily.remaining <= 0;
  return {
    next: finished ? -1 : daily.index + 1,
    finished,
    cleared,
    used: daily.used,
    remaining: daily.remaining,
  };
}

/** ¿Se puede usar «Rehacer tablero»? Una sola vez por Desafío, con el tablero empezado y sin terminar. */
export const canRedoDaily = (daily, G) => !!(daily && !daily.redo && G && !G.done && G.moves > 0);

/** Turnos que devolvería ahora «Rehacer»: los gastados en este tablero, con tope DAILY_REDO_REFUND. */
export const redoRefund = (G) => Math.min(G?.moves || 0, DAILY_REDO_REFUND);

/**
 * «Rehacer tablero»: el tablero vuelve a su inicio y se devuelven los turnos gastados en él (hasta DAILY_REDO_REFUND); el resto
 * se descuenta de la reserva. No revela nada de la solución, es determinista y solo se puede usar una vez por Desafío.
 * Devuelve `{ refund, charged }` o null si no se puede.
 */
export function redoDailyBoard(daily, G) {
  if (!canRedoDaily(daily, G)) return null;
  const refund = redoRefund(G);
  const charged = G.moves - refund;
  daily.used = Math.min(DAILY_TURN_BUDGET, (daily.used || 0) + charged);
  daily.remaining = Math.max(0, DAILY_TURN_BUDGET - daily.used);
  daily.redo = true;
  daily.attempt = null;
  Object.assign(G, { pos: G.start.slice(), moves: 0, hist: [], limit: Math.max(1, daily.remaining) });
  return { refund, charged };
}

/**
 * Qué pasa al perder un tablero, en orden de preferencia. Aplica el rescate elegido sobre `run` y devuelve:
 * 'daily_end' (sin turnos en el reto diario), 'retry' (reintento gratis), 'revive' (vida guardada),
 * 'offer' (renacer pagando) o 'gameover'.
 */
export function resolveFail(run, G, why) {
  if (run.daily) {
    run.daily.used = Math.min(DAILY_TURN_BUDGET, (run.daily.used || 0) + G.moves);
    run.daily.remaining = 0;
    run.daily.attempt = null;
    return 'daily_end';
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
  run.helped = true; // para «Sin mapa»: la aventura usó alguna pista
};

/** Cómo sigue la aventura tras superar el nivel `n`: fin del juego (21), cierre de tramo (cada 3) o nivel siguiente. */
export const clearKind = (n) => (n >= MAX_LEVEL ? 'final' : n % FATE_EVERY === 0 ? 'crossing' : 'next');

/** Avanza la partida al nivel siguiente al superado. */
export function advanceRun(run, n) {
  run.level = n + 1;
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
  if (final) {
    r.runs++;
    // mejor rango del camino: solo cuenta al terminar la partida (a mitad de camino el porcentaje aún puede bajar)
    const rank = run.mode === 'c' ? runRank(run) : null;
    if (rank.pct > (r.pct || 0)) r.pct = rank.pct;
  }
  return r;
}
