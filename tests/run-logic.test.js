import { describe, expect, it } from 'vitest';
import { decodeBoard } from '../src/engine/board.js';
import { FATE_CARDS } from '../src/game/fate.js';
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
  cityAfter,
  clearKind,
  dailyEntry,
  newAdventureRun,
  newDailyRun,
  resetBoardForRevive,
  resolveFail,
  restoreDailyAttempt,
  runGrade,
  boardKey,
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
  ...newAdventureRun({ seed: 7, start: 1, hero: 'lia', hints: 3 }),
  level: 5,
  ...over,
});

describe('crear partidas', () => {
  it('la aventura empieza sin puntos, en el nivel 1 y con las pistas dadas', () => {
    const run = newAdventureRun({ seed: 7, start: 50, hero: 'van', hints: 4 });
    expect(run).toMatchObject({
      seed: 7,
      start: 50,
      mode: 'c',
      hero: 'van',
      level: 1,
      firstLevel: 1,
      score: 0,
      hints: 4,
      streak: 0,
      lifeUsed: false,
      fate: [],
      fatePicked: 0,
    });
    expect(run.fateDeck).toHaveLength(FATE_CARDS.length);
  });

  it('el Farol suma sus pistas a las del camino y la racha diaria (no las reemplaza)', () => {
    // 3 del camino + 15 de una racha de 7 días + 3 del Farol
    expect(newAdventureRun({ seed: 7, start: 1, hero: 'lia', hints: 18, relic: 'lantern' }).hints).toBe(21);
    expect(newAdventureRun({ seed: 7, start: 75, hero: 'lia', hints: 2, relic: 'lantern' }).hints).toBe(5);
    expect(newAdventureRun({ seed: 7, start: 1, hero: 'lia', hints: 18, relic: 'sun' }).hints).toBe(18);
  });

  it('el reto diario no tiene héroe, ni vidas, ni cartas del destino', () => {
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
    });
    expect(run.fate).toBeUndefined();
    expect(run.route).toBeUndefined();
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
    const G = board();
    const snap = snapshotBoard(G);
    expect(snap).toMatchObject({ level: 5, pos: [1, 2], moves: 3, tutorial: null });
    expect(snap.timeLeft).toBeUndefined();
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

  it('storeBoard guarda la copia del tablero en run.board', () => {
    const run = adventure();
    storeBoard(run, board({ bought: 2 }));
    expect(run.board.bought).toBe(2);
  });

  it('el intento del reto se restaura solo en su tablero y con movimientos libres', () => {
    const real = () => ({
      ...decodeBoard('h2.2.0 v2.3.2 h2.4.3 #1.3'),
      start: [0, 2, 3],
      moves: 0,
      hist: [],
      limit: 20,
    });
    const G = real();
    G.pos = [0, 2, 3];
    const key = boardKey(G);
    const attempt = {
      index: 0,
      key,
      pos: [1, 2, 0],
      moves: 2,
      hist: [
        [0, 2, 3],
        [0, 2, 0],
      ],
    };
    expect(restoreDailyAttempt(G, { index: 0, attempt })).toBe(true);
    expect(G).toMatchObject({ pos: [1, 2, 0], moves: 2 });
    expect(restoreDailyAttempt(real(), { index: 1, attempt })).toBe(false);
    expect(restoreDailyAttempt({ ...real(), limit: 2 }, { index: 0, attempt })).toBe(false);
    expect(restoreDailyAttempt(real(), undefined)).toBe(false);
  });

  it('un intento de otro tablero (por ejemplo, el de antes de una actualización) no se aplica', () => {
    const other = { ...decodeBoard('h2.2.0 v2.3.1 h2.4.3 #1.3'), start: [0, 1, 3] };
    const attempt = { index: 0, key: boardKey(other), pos: [0, 2, 0], moves: 1, hist: [[0, 2, 3]] };
    const G = { ...decodeBoard('h2.2.0 v2.3.2 h2.4.3 #1.3'), start: [0, 2, 3], moves: 0, hist: [], limit: 20 };
    expect(restoreDailyAttempt(G, { index: 0, attempt })).toBe(false);
    expect(G.pos).toEqual([0, 2, 3]);
  });

  it('los intentos antiguos sin huella solo se aplican si todas sus posiciones son legales en este tablero', () => {
    const G = () => ({ ...decodeBoard('h2.2.0 v2.3.2 h2.4.3 #1.3'), start: [0, 2, 3], moves: 0, hist: [], limit: 20 });
    const legacy = (pos, hist = []) => ({ index: 0, attempt: { index: 0, pos, moves: 1, hist } });
    expect(restoreDailyAttempt(G(), legacy([0, 2, 0], [[0, 2, 3]]))).toBe(true);
    expect(restoreDailyAttempt(G(), legacy([0, 3, 3]))).toBe(false); // la pieza vertical quedaría sobre otra
    expect(restoreDailyAttempt(G(), legacy([0, 1, 3]))).toBe(false); // ...o sobre la roca
    expect(restoreDailyAttempt(G(), legacy([0, 2, 0], [[0, 1, 3]]))).toBe(false); // deshacer llevaría a la roca
    expect(restoreDailyAttempt(G(), legacy([1]))).toBe(false);
  });
});

describe('cierre de tramo', () => {
  it('cityAfter da el tramo que se abre al superar un nivel', () => {
    expect(cityAfter(6)).toBe(2);
    expect(cityAfter(2)).toBe(0);
    expect(cityAfter(21)).toBe(6);
  });
});

describe('victoria', () => {
  it('suma puntos, sube la racha y deja el avance pendiente', () => {
    const run = adventure({ score: 100, streak: 2 });
    applyAdventureWin(run, board({ n: 5, moves: 6 }), { total: 250, eff: 0.95 });
    expect(run).toMatchObject({ score: 350, cleared: 1, streak: 3, adj: 1 });
    expect(run.pendingClear).toEqual({ level: 5, gain: 250, moves: 6, opt: 6 });
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
  it('distingue fin del juego, cierre de tramo y nivel siguiente', () => {
    expect([clearKind(7), clearKind(6), clearKind(21)]).toEqual(['next', 'crossing', 'final']);
  });

  it('advanceRun avanza el nivel y limpia pendingClear (sin torre ni minijuegos)', () => {
    const run = adventure({ pendingClear: { level: 6 } });
    advanceRun(run, 6);
    expect(run.level).toBe(7);
    expect(run.pendingClear).toBeUndefined();
    expect(run.travelFrom).toBeUndefined();
    expect(run.bonus).toBeUndefined();
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
    expect(run.daily.attempt).toMatchObject({ index: 1, pos: [0, 0], moves: 0, hist: [] });
    expect(run.daily.attempt.key).toBe(boardKey(board()));
    expect(run.rescue.kind).toBe('daily');
  });

  it('en el camino Normal los primeros niveles se reintentan gratis', () => {
    expect(resolveFail(adventure({ level: 2 }), board({ n: 2 }), 'limit')).toBe('retry');
  });

  it('una vida guardada rescata antes que pagar', () => {
    const run = adventure({ start: 50, revive: 1, score: 900 });
    expect(resolveFail(run, board({ n: 10 }), 'limit')).toBe('revive');
    expect(run.revive).toBe(0);
    expect(run.rescue.kind).toBe('revive');
  });

  it('sin revivir por defecto termina la partida; con Fénix y puntos ofrece renacer una vez', () => {
    expect(resolveFail(adventure({ start: 50, score: 900 }), board({ n: 10 }), 'limit')).toBe('gameover');
    const rich = adventure({ start: 50, score: 900, fate: ['fenix'] });
    expect(resolveFail(rich, board({ n: 10 }), undefined)).toBe('offer');
    expect(rich.pendingRevive).toBe('limit');
    expect(
      resolveFail(adventure({ start: 50, score: 900, fate: ['fenix'], revivesBought: 1 }), board({ n: 10 }), 'time'),
    ).toBe('gameover');
    expect(resolveFail(adventure({ start: 50, score: 0, fate: ['fenix'] }), board({ n: 10 }), 'time')).toBe('gameover');
  });

  it('renacer reinicia el tablero y devuelve los turnos comprados', () => {
    const G = board({ bought: 3, limit: 15, done: true });
    resetBoardForRevive(G);
    expect(G).toMatchObject({ pos: [0, 0], moves: 0, hist: [], done: false, limit: 12, bought: 0 });
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

  it('el rango de partida (S+, S, A, B, C) refleja victoria, puntaje y perfectos', () => {
    expect(runGrade({ victory: true, score: 45000, perfects: 16, start: 1 })).toEqual({ grade: 'S+', cls: 'splus' });
    expect(runGrade({ victory: true, score: 33000, perfects: 10, start: 1 })).toEqual({ grade: 'S', cls: 's' });
    expect(runGrade({ victory: true, score: 21000, perfects: 6, start: 1 })).toEqual({ grade: 'A', cls: 'a' });
    expect(runGrade({ victory: true, score: 10000, perfects: 2, start: 1 })).toEqual({ grade: 'B', cls: 'b' });
    expect(runGrade({ victory: false, level: 17, score: 12000, start: 50 })).toEqual({ grade: 'A', cls: 'a' });
    expect(runGrade({ victory: false, level: 11, score: 6000, start: 50 })).toEqual({ grade: 'B', cls: 'b' });
    expect(runGrade({ victory: false, level: 4, score: 1000, start: 75 })).toEqual({ grade: 'C', cls: 'c' });

    const r = adventure({ score: 0, perfects: 0, bestStreak: 0, streak: 0 });
    applyAdventureWin(r, board({ moves: 6, opt: 6 }), { total: 500, eff: 1 });
    applyAdventureWin(r, board({ moves: 8, opt: 6 }), { total: 350, eff: 0.75 });
    expect(r.perfects).toBe(1);
    expect(r.bestStreak).toBe(1);
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

  it('una partida guardada antigua recibe los campos que le faltan y acota el nivel a 21', () => {
    expect(restoreRun({ level: 30, seed: 1, hero: 'van', score: 70 })).toMatchObject({
      level: 21,
      hero: 'van',
      score: 70,
      start: 1,
      mode: 'c',
      revive: 0,
      recBroken: false,
      fate: [],
      fatePicked: 6,
    });
  });
  it('una partida guardada con campos retirados (camino heroico, jefe, bonus, sellos) los descarta', () => {
    const run = restoreRun({
      level: 12,
      seed: 1,
      route: 'brave',
      routeZone: 1,
      bossSeen: 10,
      bossRetry: { level: 10, used: 1 },
      bonus: 1,
      pendingClear: { level: 12, routeChosen: false },
      board: { level: 12, timeLimit: 60, timeLeft: 30, seal: { tier: 1 } },
    });
    expect(run.route).toBeUndefined();
    expect(run.bossSeen).toBeUndefined();
    expect(run.bossRetry).toBeUndefined();
    expect(run.bonus).toBeUndefined();
    expect(run.pendingClear).toEqual({ level: 12 });
    expect(run.board).toEqual({ level: 12 });
    expect(run.fatePicked).toBe(3); // la carta del tramo 4 sigue pendiente
  });
});
