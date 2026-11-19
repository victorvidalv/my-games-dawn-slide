import { describe, expect, it } from 'vitest';
import {
  acceptRescue,
  applyMove,
  markHelped,
  restoreRun,
  advanceRun,
  applyAdventureWin,
  applyDailyWin,
  applySkip,
  canSaveBoard,
  chooseRoute,
  cityAfter,
  clearKind,
  dailyEntry,
  needsBossIntro,
  needsTravelChoice,
  newAdventureRun,
  newDailyRun,
  normalizeRoute,
  resetBoardForRevive,
  resolveFail,
  restoreDailyAttempt,
  snapshotBoard,
  storeBoard,
  updateBest,
} from '../src/game/run-logic.js';

/** Tablero mínimo con la forma que usa el juego (sin DOM). */
const board = (over = {}) => ({
  n: 5,
  rate: 40,
  opt: 6,
  limit: 12,
  moves: 3,
  done: false,
  bought: 0,
  pieces: [
    { x: 0, len: 2, dir: 'h' },
    { x: 3, len: 3, dir: 'v' },
  ],
  pos: [1, 2],
  start: [0, 0],
  hist: [
    [0, 0],
    [1, 0],
  ],
  walls: [[1, 1]],
  plan: {},
  tutorial: null,
  family: 'base',
  colors: [2, 1],
  seal: null,
  ...over,
});
const adventure = (over = {}) => ({
  ...newAdventureRun({ seed: 7, start: 1, hero: 'lia', from: 5, hints: 3 }),
  ...over,
});

describe('crear partidas', () => {
  it('la aventura empieza sin puntos, en el nivel elegido y con las pistas dadas', () => {
    const run = newAdventureRun({ seed: 7, start: 50, hero: 'van', from: 21, hints: 4 });
    expect(run).toMatchObject({
      seed: 7,
      start: 50,
      mode: 'c',
      hero: 'van',
      level: 21,
      firstLevel: 21,
      score: 0,
      hints: 4,
      streak: 0,
      lifeUsed: false,
    });
  });

  it('el reto diario no tiene héroe ni vidas y va por la ruta normal', () => {
    const run = newDailyRun({
      challenge: { id: 'classic', level: 34 },
      day: 900,
      index: 1,
      boards: [null, null, null],
      attempt: null,
    });
    expect(run).toMatchObject({
      seed: 900,
      level: 34,
      hero: 'none',
      lifeUsed: true,
      hints: 0,
      route: 'normal',
      routeZone: 3,
    });
    expect(run.daily).toEqual({ id: 'classic', day: 900, index: 1, boards: [null, null, null], attempt: null });
  });

  it('el reto retoma el intento guardado o el primer tablero sin resolver', () => {
    const targets = [1, 2, 3];
    expect(dailyEntry(null, targets).index).toBe(0);
    expect(dailyEntry({ boards: [{ moves: 5 }] }, targets).index).toBe(1);
    expect(dailyEntry({ boards: [], attempt: { index: 2 } }, targets).index).toBe(2);
    expect(dailyEntry({ boards: [], attempt: { index: 2 } }, targets, 0)).toMatchObject({ index: 0, attempt: null });
    expect(dailyEntry({ boards: [{}, {}, {}] }, targets).index).toBe(-1);
  });
});

describe('guardado del tablero', () => {
  it('copia el tablero sin compartir referencias', () => {
    const G = board({ timeLeft: 4.2 });
    const snap = snapshotBoard(G);
    expect(snap).toMatchObject({ level: 5, pos: [1, 2], moves: 3, timeLeft: 5, tutorial: null });
    G.pos[0] = 9;
    G.hist[0][0] = 9;
    G.pieces[0].x = 9;
    expect(snap.pos[0]).toBe(1);
    expect(snap.hist[0][0]).toBe(0);
    expect(snap.pieces[0].x).toBe(0);
  });

  it('solo guarda mientras se juega el nivel de la partida', () => {
    const run = adventure(),
      G = board();
    expect(canSaveBoard(run, G)).toBe(true);
    expect(canSaveBoard(run, { ...G, done: true })).toBe(false);
    expect(canSaveBoard(run, { ...G, n: 6 })).toBe(false);
    expect(canSaveBoard({ ...run, pendingClear: {} }, G)).toBe(false);
    expect(canSaveBoard({ ...run, rescue: {} }, G)).toBe(false);
    expect(canSaveBoard({ ...run, pendingRevive: 'limit' }, G)).toBe(false);
    expect(canSaveBoard(null, G)).toBe(false);
  });

  it('recuerda en qué tablero se compraron turnos', () => {
    const run = adventure();
    storeBoard(run, board({ bought: 2 }));
    expect(run.turnPackBoard).toBe(5);
    expect(run.board.bought).toBe(2);
  });

  it('el intento del reto se restaura solo en su tablero y con movimientos libres', () => {
    const attempt = { index: 0, pos: [3, 4], moves: 2, hist: [[0, 0]] };
    const G = board({ moves: 0 });
    expect(restoreDailyAttempt(G, { index: 0, attempt })).toBe(true);
    expect(G).toMatchObject({ pos: [3, 4], moves: 2 });
    expect(restoreDailyAttempt(board(), { index: 1, attempt })).toBe(false);
    expect(restoreDailyAttempt(board({ limit: 2 }), { index: 0, attempt })).toBe(false);
    expect(restoreDailyAttempt(board(), { index: 0, attempt: { ...attempt, pos: [1] } })).toBe(false);
    expect(restoreDailyAttempt(board(), undefined)).toBe(false);
  });
});

describe('presentación y rutas', () => {
  it('el jefe se presenta una sola vez y nunca sobre un rescate', () => {
    const G = board({ moves: 0, plan: { boss: true } });
    expect(needsBossIntro(adventure(), G)).toBe(true);
    expect(needsBossIntro(adventure({ bossSeen: 5 }), G)).toBe(false);
    expect(needsBossIntro(adventure({ rescue: {} }), G)).toBe(false);
    expect(needsBossIntro(adventure(), { ...G, moves: 1 })).toBe(false);
    expect(needsBossIntro(adventure(), { ...G, tutorial: 'ice' })).toBe(false);
  });

  it('antes del nivel 11 la ruta vuelve a ser la normal', () => {
    const run = adventure({ level: 4, route: 'brave', routeZone: 2 });
    expect(normalizeRoute(run)).toBe(true);
    expect(run).toMatchObject({ route: 'normal', routeZone: 0 });
    expect(normalizeRoute(run)).toBe(false);
    const later = adventure({ level: 14, route: 'brave' });
    expect(normalizeRoute(later)).toBe(false);
    const entering = adventure({ level: 14, enterPending: true });
    expect(normalizeRoute(entering)).toBe(true);
    expect(entering).toMatchObject({ route: 'normal', routeZone: 0, travelFrom: 0 });
    expect(entering.enterPending).toBeUndefined();
  });

  it('el viaje se ofrece al cerrar cada ciudad menos la última', () => {
    expect(needsTravelChoice({ pendingClear: { level: 20 } })).toBe(true);
    expect(needsTravelChoice({ pendingClear: { level: 21 } })).toBe(false);
    expect(needsTravelChoice({ pendingClear: { level: 100 } })).toBe(false);
    expect(needsTravelChoice({})).toBe(false);
    expect(cityAfter(20)).toBe(2);
    const run = adventure({ pendingClear: { level: 20 } });
    chooseRoute(run, 'brave', 2);
    expect(run).toMatchObject({
      route: 'brave',
      routeZone: 2,
      storyChapterSeen: 2,
      storySeen: 21,
      pendingClear: { routeChosen: true },
    });
  });
});

describe('victoria', () => {
  it('suma puntos, sube la racha y deja el avance pendiente', () => {
    const run = adventure({ score: 100, streak: 2 });
    applyAdventureWin(run, board({ n: 5, moves: 6 }), { total: 250, eff: 0.95 });
    expect(run).toMatchObject({ score: 350, cleared: 1, streak: 3, adj: 1 });
    expect(run.pendingClear).toEqual({ level: 5, gain: 250, moves: 6, opt: 6, routeChosen: false });
  });

  it('una victoria floja corta la racha y baja la dificultad, con tope en −2', () => {
    const run = adventure({ streak: 4, adj: -2 });
    applyAdventureWin(run, board(), { total: 10, eff: 0.2 });
    expect(run).toMatchObject({ streak: 0, adj: -2 });
  });

  it('el reto diario se queda con la mejor marca y suma al terminar todos', () => {
    const d = { index: 0, boards: [{ moves: 9, opt: 6, points: 1 }, null], attempt: { index: 0 } };
    expect(applyDailyWin(d, board({ moves: 7 }), 50)).toEqual({ next: 1, totals: null });
    expect(d.boards[0]).toEqual({ moves: 7, opt: 6, points: 50 });
    expect(d.attempt).toBeNull();
    applyDailyWin(d, board({ moves: 8 }), 40);
    expect(d.boards[0].moves).toBe(7); // una marca peor no reemplaza a la mejor
    d.index = 1;
    expect(applyDailyWin(d, board({ moves: 5, opt: 4 }), 80)).toEqual({ next: -1, totals: { moves: 12, opt: 10 } });
  });

  it('saltar un nivel avanza sin puntos y corta la racha', () => {
    const run = adventure({ streak: 3 });
    applySkip(run, board());
    expect(run).toMatchObject({ streak: 0, helpAt: 5, pendingClear: { level: 5, gain: 0, skipped: true } });
  });
});

describe('avance entre niveles', () => {
  it('distingue fin del juego, cruce de ciudad y nivel siguiente', () => {
    expect([clearKind(7), clearKind(30), clearKind(100)]).toEqual(['next', 'crossing', 'final']);
  });

  it('al cruzar de ciudad prepara el viaje de mapa', () => {
    const run = adventure({ pendingClear: { level: 30 } });
    advanceRun(run, 30, { bonus: true });
    expect(run).toMatchObject({ level: 31, travelFrom: 2, bonus: 1 });
    expect(run.pendingClear).toBeUndefined();
    const plain = adventure({ pendingClear: { level: 7 } });
    advanceRun(plain, 7);
    expect(plain.level).toBe(8);
    expect(plain.travelFrom).toBeUndefined();
    expect(plain.bonus).toBeUndefined();
  });

  it('el récord del camino guarda el mejor puntaje, el nivel más alto y las partidas', () => {
    const paths = {};
    const run = adventure({ score: 500, level: 12 });
    updateBest(paths, 'c1', run, { now: 42 });
    expect(paths.c1).toEqual({ score: 500, level: 12, runs: 0, recordAt: 42 });
    expect(run.recBroken).toBe(true);
    updateBest(paths, 'c1', adventure({ score: 100, level: 3 }), { final: true, now: 99 });
    expect(paths.c1).toEqual({ score: 500, level: 12, runs: 1, recordAt: 42 });
  });
});

describe('derrota', () => {
  it('el reto diario siempre se puede repetir desde el inicio', () => {
    const run = { daily: { index: 1, boards: [] } };
    expect(resolveFail(run, board(), 'limit')).toBe('daily');
    expect(run.daily.attempt).toEqual({ index: 1, pos: [0, 0], moves: 0, hist: [] });
    expect(run.rescue.kind).toBe('daily');
  });

  it('en el camino Normal los primeros niveles se reintentan gratis', () => {
    expect(resolveFail(adventure({ level: 5 }), board({ n: 5 }), 'limit')).toBe('retry');
  });

  it('una vida guardada rescata antes que pagar', () => {
    const run = adventure({ start: 50, revive: 1, score: 900 });
    expect(resolveFail(run, board({ n: 60 }), 'limit')).toBe('revive');
    expect(run.revive).toBe(0);
    expect(run.rescue.kind).toBe('revive');
  });

  it('con puntos se ofrece renacer pagando una vez; sin puntos, fin de la partida', () => {
    const rich = adventure({ start: 50, score: 900 });
    expect(resolveFail(rich, board({ n: 60 }), undefined)).toBe('offer');
    expect(rich.pendingRevive).toBe('limit');
    expect(resolveFail(adventure({ start: 50, score: 900, revivesBought: 1 }), board({ n: 60 }), 'time')).toBe(
      'gameover',
    );
    expect(resolveFail(adventure({ start: 50, score: 0 }), board({ n: 60 }), 'time')).toBe('gameover');
  });

  it('renacer reinicia el tablero y devuelve los turnos comprados', () => {
    const G = board({ bought: 3, limit: 15, timeLimit: 60, timeLeft: 2, done: true });
    resetBoardForRevive(G);
    expect(G).toMatchObject({ pos: [0, 0], moves: 0, hist: [], done: false, limit: 12, bought: 0, timeLeft: 60 });
  });
});

describe('rescates, movimientos y partidas guardadas', () => {
  it('aceptar un rescate reinicia el tablero y lo consume', () => {
    const run = adventure({ rescue: { kind: 'lia' } }),
      G = board({ done: true, bought: 1, limit: 13 });
    acceptRescue(run, G);
    expect(run.rescue).toBeUndefined();
    expect(G).toMatchObject({ pos: [0, 0], moves: 0, done: false, limit: 12 });
  });

  it('cada movimiento guarda la posición anterior para deshacer', () => {
    const G = board({ pos: [1, 2], hist: [], moves: 0 });
    applyMove(G, 1, 4);
    expect(G).toMatchObject({ pos: [1, 4], hist: [[1, 2]], moves: 1 });
  });

  it('usar ayuda queda marcado en el nivel', () => {
    const run = adventure();
    markHelped(run, 8);
    expect(run.helpAt).toBe(8);
  });

  it('una partida guardada antigua recibe los campos que le faltan', () => {
    expect(restoreRun({ level: 30, seed: 1, hero: 'van', score: 70 })).toMatchObject({
      level: 30,
      hero: 'van',
      score: 70,
      start: 1,
      mode: 'c',
      revive: 0,
      recBroken: false,
    });
  });
});
