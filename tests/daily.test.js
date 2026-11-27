import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DAILY_CHALLENGE,
  DAILY_CUSHION,
  DAILY_EXACT_BUDGET,
  DAILY_HINT_MILESTONES,
  DAILY_REDO_REFUND,
  DAILY_TARGETS,
  DAILY_TOTAL_BOARDS,
  DAILY_TURN_BUDGET,
  buildDaily,
  currentStreak,
  dailyHintReward,
  dailyMargin,
  marginText,
  dayNumber,
  emptyDaily,
  recordDaily,
  resetText,
  shareText,
  streakHintBonus,
  todayResult,
} from '../src/game/daily.js';
import {
  applyDailyWin,
  canRedoDaily,
  dailyEntry,
  newDailyRun,
  redoDailyBoard,
  redoRefund,
  resolveFail,
} from '../src/game/run-logic.js';
import { challengeRates } from '../src/game/balance.js';
import { minMoves } from '../src/engine/solver.js';

const levels = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8')).ratings;
const special = JSON.parse(readFileSync(new URL('../src/data/special.json', import.meta.url), 'utf8'));
const banks = { levels, special };

describe('desafío diario: 15 tableros (3→17) y 152 turnos (150 de mínimos + 2 de colchón)', () => {
  it('tiene 15 tableros de 3 a 17 que suman 150 y una reserva de 152', () => {
    expect(DAILY_TOTAL_BOARDS).toBe(15);
    expect(DAILY_TARGETS).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(DAILY_TARGETS.reduce((a, b) => a + b, 0)).toBe(150);
    expect(DAILY_EXACT_BUDGET).toBe(150);
    expect(DAILY_CUSHION).toBe(2);
    expect(DAILY_TURN_BUDGET).toBe(152);
  });

  it('todos los tableros del día (1..15) son deterministas, resolubles y coinciden con su mínimo exacto', () => {
    const day = 20500;
    const families = new Set();
    for (let i = 0; i < DAILY_TOTAL_BOARDS; i++) {
      const a = buildDaily(DAILY_CHALLENGE, day, banks, i, DAILY_TURN_BUDGET);
      const b = buildDaily(DAILY_CHALLENGE, day, banks, i, DAILY_TURN_BUDGET);
      expect(a.opt).toBe(DAILY_TARGETS[i]);
      expect(a.pos).toEqual(b.pos);
      const opt = minMoves(a.pieces, a.pos, a.walls);
      expect(opt).toBe(DAILY_TARGETS[i]);
      families.add(a.family);
    }
    expect(families.size).toBeGreaterThanOrEqual(4); // aparecen distintas piezas especiales progresivamente
  });

  it('los premios de pistas se otorgan al llegar a 10 (+1), 13 (+2) y 15 (+4)', () => {
    expect(DAILY_HINT_MILESTONES).toEqual([
      { board: 10, hints: 1 },
      { board: 13, hints: 2 },
      { board: 15, hints: 4 },
    ]);
    expect(dailyHintReward(0)).toBe(0);
    expect(dailyHintReward(9)).toBe(0);
    expect(dailyHintReward(10)).toBe(1);
    expect(dailyHintReward(12)).toBe(1);
    expect(dailyHintReward(13)).toBe(2);
    expect(dailyHintReward(14)).toBe(2);
    expect(dailyHintReward(15)).toBe(4);
  });

  it('la reserva compartida de 152 turnos descuenta movimientos y termina al agotarse', () => {
    const day = 20500;
    const run = newDailyRun({
      challenge: DAILY_CHALLENGE,
      day,
      ...dailyEntry(null, DAILY_TARGETS),
    });
    expect(run.daily.used).toBe(0);
    expect(run.daily.remaining).toBe(152);

    const w1 = applyDailyWin(run.daily, { moves: 5, opt: 3 }, 100);
    expect(w1).toMatchObject({ next: 1, finished: false, cleared: 1, used: 5, remaining: 147 });

    // Si se agotan los 152 turnos sin resolver, termina el intento
    run.daily.used = 142;
    run.daily.remaining = 10;
    const res = resolveFail(run, { moves: 10, opt: 12 }, 'limit');
    expect(res).toBe('daily_end');
    expect(run.daily.used).toBe(152);
    expect(run.daily.remaining).toBe(0);
  });

  it('registra racha, hitos y texto para compartir', () => {
    const st = emptyDaily();
    const day = dayNumber(new Date(2026, 4, 10));
    const r0 = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 10, used: 100 });
    expect(r0).toMatchObject({ cleared: 10, hints: 1, streak: 0, streakUp: false });
    expect(st.solved, 'por debajo de 13 no cuenta como resuelto').toBe(0);

    const r1 = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 13, used: 150 });
    expect(r1).toMatchObject({ cleared: 13, hints: 2, streak: 1, streakUp: true });
    expect(streakHintBonus(st, day)).toBe(2);

    const r2 = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 15, used: 152 });
    expect(r2).toMatchObject({ cleared: 15, hints: 4, streak: 1, streakUp: false, medal: 'gold', exact: false });
    expect(streakHintBonus(st, day)).toBe(4);
    expect(streakHintBonus(st, day, 50), 'Difícil: sin tope').toBe(4);
    expect(streakHintBonus(st, day, 75), 'Experto empieza con 1 pista: el Desafío le da como mucho +2').toBe(2);
    expect(streakHintBonus(13, day, 75)).toBe(2);
    expect(todayResult(st, DAILY_CHALLENGE.id, day).cleared).toBe(15);

    const r3 = recordDaily(st, DAILY_CHALLENGE.id, day + 1, { cleared: 14, used: 150 });
    expect(r3.streak).toBe(2);
    expect(currentStreak(st, day + 1)).toBe(2);
    expect(currentStreak(st, day + 3)).toBe(0);

    expect(shareText(DAILY_CHALLENGE, day, { cleared: 15, used: 150 }, 2)).toContain('15/15 · 150/152');
    expect(resetText(3660000)).toBe('1 h 1 min');
  });
});

describe('desafío diario: sello «150 exactos»', () => {
  it('solo lo da terminar los 15 con 150 turnos o menos, y se cuenta una vez', () => {
    const st = emptyDaily();
    const day = dayNumber(new Date(2026, 4, 10));
    expect(recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 15, used: 151 }).exact).toBe(false);
    expect(st.exact || 0).toBe(0);
    const best = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 15, used: 150 });
    expect(best).toMatchObject({ exact: true, medal: 'gold' });
    expect(st.exact).toBe(1);
    expect(recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 15, used: 150 }).exact).toBe(true);
    expect(st.exact, 'no se suma dos veces').toBe(1);
    expect(recordDaily(emptyDaily(), DAILY_CHALLENGE.id, day, { cleared: 14, used: 120 }).exact).toBe(false);
  });
});

describe('desafío diario: margen de turnos', () => {
  it('es lo que sobra sobre los mínimos de lo que falta', () => {
    expect(dailyMargin({ used: 0, moves: 0, index: 0 })).toBe(DAILY_CUSHION);
    // a mitad del tablero 1 sin pasarse del mínimo (3) el margen no baja
    expect(dailyMargin({ used: 0, moves: 2, index: 0 })).toBe(2);
    // un turno de más en el tablero 1 (4 movimientos, mínimo 3): queda +1
    expect(dailyMargin({ used: 0, moves: 4, index: 0 })).toBe(1);
    // tablero 2 tras superar el 1 con un turno de más
    expect(dailyMargin({ used: 4, moves: 0, index: 1 })).toBe(1);
    // todo perfecto hasta el último tablero
    const used = DAILY_TARGETS.slice(0, 14).reduce((a, b) => a + b, 0);
    expect(dailyMargin({ used, moves: 17, index: 14 })).toBe(2);
    expect(dailyMargin({ used, moves: 20, index: 14 })).toBe(-1);
    expect(marginText(2)).toBe('+2');
    expect(marginText(0)).toBe('+0');
    expect(marginText(-3)).toBe('−3');
  });
});

describe('desafío diario: «Rehacer tablero»', () => {
  const setup = (moves, used = 20) => {
    const run = newDailyRun({ challenge: DAILY_CHALLENGE, day: 20500, ...dailyEntry(null, DAILY_TARGETS) });
    run.daily.used = used;
    run.daily.remaining = DAILY_TURN_BUDGET - used;
    const G = {
      start: [1, 2, 3],
      pos: [4, 5, 6],
      moves,
      hist: [[1, 2, 3]],
      opt: 8,
      limit: run.daily.remaining,
      done: false,
    };
    return { run, G };
  };

  it('solo se puede una vez, con el tablero empezado y sin terminar', () => {
    const { run, G } = setup(0);
    expect(canRedoDaily(run.daily, G), 'sin movimientos no hay nada que rehacer').toBe(false);
    G.moves = 3;
    expect(canRedoDaily(run.daily, G)).toBe(true);
    expect(canRedoDaily(run.daily, { ...G, done: true }), 'no tras terminar el tablero').toBe(false);
    expect(redoDailyBoard(run.daily, G)).not.toBeNull();
    G.moves = 3;
    expect(canRedoDaily(run.daily, G), 'segundo uso').toBe(false);
    expect(redoDailyBoard(run.daily, G)).toBeNull();
    expect(canRedoDaily(null, G)).toBe(false);
  });

  it('devuelve todos los turnos gastados en el tablero si no pasan del tope', () => {
    const { run, G } = setup(3);
    expect(redoRefund(G)).toBe(3);
    expect(redoDailyBoard(run.daily, G)).toEqual({ refund: 3, charged: 0 });
    expect(run.daily.used, 'los turnos de tableros anteriores no se tocan').toBe(20);
    expect(G).toMatchObject({ pos: [1, 2, 3], moves: 0, hist: [], limit: DAILY_TURN_BUDGET - 20 });
    expect(run.daily.redo).toBe(true);
    expect(run.daily.attempt).toBeNull();
  });

  it(`con más de ${DAILY_REDO_REFUND} turnos gastados, el resto se pierde (no sirve para explorar gratis)`, () => {
    const { run, G } = setup(9);
    expect(redoDailyBoard(run.daily, G)).toEqual({ refund: DAILY_REDO_REFUND, charged: 9 - DAILY_REDO_REFUND });
    expect(run.daily.used).toBe(20 + 9 - DAILY_REDO_REFUND);
    expect(run.daily.remaining).toBe(DAILY_TURN_BUDGET - run.daily.used);
    expect(G.limit).toBe(run.daily.remaining);
  });

  it('es determinista: mismo estado, mismo resultado, y no revela nada del tablero', () => {
    const a = setup(6),
      b = setup(6);
    expect(redoDailyBoard(a.run.daily, a.G)).toEqual(redoDailyBoard(b.run.daily, b.G));
    expect(a.G).toEqual(b.G);
  });

  it('se conserva al guardar y reanudar, y las partidas guardadas sin el campo lo tienen disponible', () => {
    const { run, G } = setup(2);
    redoDailyBoard(run.daily, G);
    const saved = { seed: 7, boards: DAILY_TARGETS.map(() => null), used: 22, attempt: null, redo: run.daily.redo };
    expect(dailyEntry(saved, DAILY_TARGETS).redo).toBe(true);
    const legacy = { ...saved, redo: undefined }; // guardado de antes de existir «Rehacer»
    expect(dailyEntry(legacy, DAILY_TARGETS).redo).toBe(false);
    expect(dailyEntry(null, DAILY_TARGETS).redo).toBe(false);
    expect(dailyEntry({ ...saved }, DAILY_TARGETS, { restart: true }).redo, 'un intento nuevo lo recupera').toBe(false);
  });
});

describe('desafío diario: calibración del colchón y del Rehacer', () => {
  it('llegar al 15 sigue siendo muy difícil: aunque suba, queda por debajo de lo razonable para un jugador bueno', () => {
    const before = (skill) => challengeRates(skill, 6000, { budget: 150, redo: false })[15];
    const after = (skill) => challengeRates(skill, 6000)[15];
    // el alivio es real pero acotado (calibrado con scripts/simulate-challenge.mjs)
    expect(after(0.8)).toBeGreaterThan(before(0.8));
    expect(after(0.8), 'habilidad 0,8: menos de uno de cada 8').toBeLessThan(0.125);
    expect(after(0.9), 'habilidad 0,9: menos de dos de cada 5').toBeLessThan(0.4);
    expect(after(0.7), 'habilidad 0,7: casi imposible').toBeLessThan(0.04);
  });
});
