import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DAILY_CHALLENGE,
  DAILY_TARGETS,
  DAILY_TOTAL_BOARDS,
  DAILY_TURN_BUDGET,
  buildDaily,
  currentStreak,
  dailyHintReward,
  dayNumber,
  emptyDaily,
  recordDaily,
  resetText,
  shareText,
  streakHintBonus,
  todayResult,
} from '../src/game/daily.js';
import { applyDailyWin, dailyEntry, newDailyRun, resolveFail } from '../src/game/run-logic.js';
import { minMoves } from '../src/engine/solver.js';

const levels = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8')).ratings;
const special = JSON.parse(readFileSync(new URL('../src/data/special.json', import.meta.url), 'utf8'));
const banks = { levels, special };

describe('desafío diario: 15 tableros (3→17) y 150 turnos exactos', () => {
  it('tiene 15 tableros de 3 a 17 que suman exactamente 150 turnos', () => {
    expect(DAILY_TOTAL_BOARDS).toBe(15);
    expect(DAILY_TARGETS).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(DAILY_TARGETS.reduce((a, b) => a + b, 0)).toBe(DAILY_TURN_BUDGET);
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

  it('los premios de pistas se otorgan al llegar a 13 (+1), 14 (+3) y 15 (+5)', () => {
    expect(dailyHintReward(0)).toBe(0);
    expect(dailyHintReward(12)).toBe(0);
    expect(dailyHintReward(13)).toBe(1);
    expect(dailyHintReward(14)).toBe(3);
    expect(dailyHintReward(15)).toBe(5);
  });

  it('la reserva compartida de 150 turnos descuenta movimientos y termina al agotarse', () => {
    const day = 20500;
    const run = newDailyRun({
      challenge: DAILY_CHALLENGE,
      day,
      ...dailyEntry(null, DAILY_TARGETS),
    });
    expect(run.daily.used).toBe(0);
    expect(run.daily.remaining).toBe(150);

    const w1 = applyDailyWin(run.daily, { moves: 5, opt: 3 }, 100);
    expect(w1).toMatchObject({ next: 1, finished: false, cleared: 1, used: 5, remaining: 145 });

    // Si se agotan los 150 turnos sin resolver, termina el intento
    run.daily.used = 140;
    run.daily.remaining = 10;
    const res = resolveFail(run, { moves: 10, opt: 12 }, 'limit');
    expect(res).toBe('daily_end');
    expect(run.daily.used).toBe(150);
    expect(run.daily.remaining).toBe(0);
  });

  it('registra racha, hitos y texto para compartir', () => {
    const st = emptyDaily();
    const day = dayNumber(new Date(2026, 4, 10));
    const r1 = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 13, used: 150 });
    expect(r1).toMatchObject({ cleared: 13, hints: 1, streak: 1, streakUp: true });
    expect(streakHintBonus(st, day)).toBe(1);

    const r2 = recordDaily(st, DAILY_CHALLENGE.id, day, { cleared: 15, used: 150 });
    expect(r2).toMatchObject({ cleared: 15, hints: 5, streak: 1, streakUp: false, medal: 'gold' });
    expect(streakHintBonus(st, day)).toBe(5);
    expect(todayResult(st, DAILY_CHALLENGE.id, day).cleared).toBe(15);

    const r3 = recordDaily(st, DAILY_CHALLENGE.id, day + 1, { cleared: 14, used: 150 });
    expect(r3.streak).toBe(2);
    expect(currentStreak(st, day + 1)).toBe(2);
    expect(currentStreak(st, day + 3)).toBe(0);

    expect(shareText(DAILY_CHALLENGE, day, { cleared: 15, used: 150 }, 2)).toContain('15/15');
    expect(resetText(3660000)).toBe('1 h 1 min');
  });
});
