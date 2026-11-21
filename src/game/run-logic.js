/* ============================ Reglas de la partida ============================
 * Decisiones puras del flujo de una aventura o de un reto diario: crear la partida, guardar el tablero, ganar,
 * perder, saltar, renacer y avanzar de nivel. Aquí no hay DOM, audio ni estado global: cada función recibe la
 * partida (`run`) y el tablero (`G`) y los modifica o devuelve el resultado. `session.js` las orquesta y la UI pinta.
 */
import { MAX_LEVEL } from '../engine/difficulty.js';
import { encodeBoard, isValidState } from '../engine/board.js';
import { analyze } from '../engine/solver.js';
import { clearRewards, snapshotRescue } from './heroes.js';
import { relicFor } from './relics.js';
import { canPaidRevive, hasRevive, useFreeRetry, useRevive } from './shop.js';
import { FATE_EVERY, FATE_PICKS, fateById, fateDeck, fatePerfectHints, nextStreak } from './fate.js';

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
  if (!run.daily && !run.survival) {
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
  run.adj = Math.max(-2, Math.min(run.level < 10 ? 1 : 2, run.adj + (gain.eff >= 0.9 ? 1 : gain.eff < 0.4 ? -1 : 0)));
  clearRewards(run, G.n);
  run.hints = (run.hints || 0) + fatePerfectHints(run, G.moves, G.opt); // Maestría
  run.pendingClear = { level: G.n, gain: gain.total, moves: G.moves, opt: G.opt };
}

const GRADE_THRESHOLDS = {
  1: { sPlus: 48000, s: 32000, a: 20000 },
  50: { sPlus: 62000, s: 43000, a: 27000 },
  75: { sPlus: 80000, s: 55000, a: 36000 },
};

/** Rango visual de la partida (S+, S, A, B, C) según victoria, puntaje y perfectos. */
export function runGrade({ victory = false, level = 1, score = 0, perfects = 0, start = 1 } = {}) {
  const key = start >= 75 ? 75 : start >= 50 ? 50 : 1;
  const th = GRADE_THRESHOLDS[key];
  const boards = victory ? MAX_LEVEL : Math.max(0, level - 1);
  const perfRatio = boards ? perfects / boards : 0;
  if (victory) {
    if (score >= th.sPlus || (perfRatio >= 0.75 && score >= th.s)) return { grade: 'S+', cls: 'splus' };
    if (score >= th.s || perfRatio >= 0.55) return { grade: 'S', cls: 's' };
    if (score >= th.a || perfRatio >= 0.35) return { grade: 'A', cls: 'a' };
    return { grade: 'B', cls: 'b' };
  }
  if (boards >= 15) return { grade: 'A', cls: 'a' };
  if (boards >= 9) return { grade: 'B', cls: 'b' };
  return { grade: 'C', cls: 'c' };
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
  if (final) r.runs++;
  return r;
}
