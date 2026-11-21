import { describe, it, expect } from 'vitest';
import { moveLimit } from '../src/engine/difficulty.js';
import { HEROES, bonusTurns, heroLimit, clearRewards, spendHint, canHint } from '../src/game/heroes.js';

const newRun = (extra = {}) => ({
  hints: 3,
  lifeUsed: false,
  undoUsedAt: 0,
  undoUsedLevel: 0,
  undoUsedCount: 0,
  vanAwardedAt: 0,
  ...extra,
});

describe('héroes', () => {
  it('hay tres héroes con poder descrito', () => {
    expect(HEROES.map((h) => h.id)).toEqual(['lia', 'jean', 'van']);
    for (const h of HEROES) expect(h.power && h.short && h.detail).toBeTruthy();
  });
});

describe('Lía · turnos de reserva', () => {
  it('solo Lía recibe turnos extra: 40 % del mínimo en Normal, 20 % en Difícil y 25 % en Experto', () => {
    expect(bonusTurns('lia', 8)).toBe(3);
    expect(bonusTurns('lia', 40)).toBe(16);
    expect(bonusTurns('lia', 40, 50)).toBe(8);
    expect(bonusTurns('lia', 40, 75)).toBe(10);
    expect(bonusTurns('lia', 2)).toBe(1);
    expect(bonusTurns('jean', 40)).toBe(0);
    expect(bonusTurns('van', 40)).toBe(0);
    expect(bonusTurns('lia', 40, 1, true), 'Juramento apaga la reserva').toBe(0);
  });
  it('heroLimit suma el bonus de su camino al límite normal y no cambia para el resto de héroes', () => {
    for (const opt of [2, 7, 20, 37])
      for (const start of [1, 50, 75]) {
        expect(heroLimit('jean', opt, start)).toBe(moveLimit(opt, start));
        expect(heroLimit('lia', opt, start)).toBe(moveLimit(opt, start) + bonusTurns('lia', opt, start));
      }
  });
  it('las cartas del destino suman o restan turnos, pero el límite nunca baja de mínimo + 1', () => {
    expect(heroLimit('jean', 10, 1, 1, { fate: 3 })).toBe(moveLimit(10) + 3);
    expect(heroLimit('jean', 10, 1, 1, { fate: -2 })).toBe(moveLimit(10) - 2);
    expect(heroLimit('jean', 2, 75, 100, { fate: -2 })).toBe(3);
    expect(heroLimit('lia', 10, 1, 1, { noPower: true })).toBe(moveLimit(10));
  });
});

describe('pistas · recompensas de nivel y reserva', () => {
  it('se gana +1 pista cada 5 niveles en Normal (y nada más)', () => {
    const run = newRun({ hints: 0 });
    expect(clearRewards(run, 5)).toBe(1);
    expect(clearRewards(run, 6)).toBe(0);
    expect(clearRewards(run, 10)).toBe(1);
    expect(run.hints).toBe(2);
  });
  it('las pistas normales de Juth gastan la reserva: su poder tiene una carga independiente', () => {
    const run = newRun({ hints: 2 });
    expect(spendHint({ run, mode: 'c', level: 7 })).toEqual({ ok: true, free: false });
    expect(run.hints).toBe(1);
    expect(run.powerUsedLevel).toBeUndefined();
    spendHint({ run, mode: 'c', level: 7 });
    expect(canHint(run, 'c', 7)).toBe(false);
    expect(canHint(run, 'c', 8)).toBe(false);
  });
  it('sin reserva ni pista gratis no se puede pedir una pista', () => {
    const run = newRun({ hints: 0 });
    expect(canHint(run, 'c', 3)).toBe(false);
    expect(spendHint({ run, mode: 'c', level: 3 })).toEqual({ ok: false, free: false });
    expect(run.hints).toBe(0);
  });
  it('en Práctica las pistas son gratis y no gastan nada', () => {
    const run = newRun({ hints: 0 });
    expect(canHint(run, 'p', 3)).toBe(true);
    expect(spendHint({ run, mode: 'p', level: 3 }).ok).toBe(true);
    expect(run.hints).toBe(0);
  });
});

describe('al elegir héroe solo se describe el poder, sin cifras', () => {
  it('ningún texto del héroe lleva números ni «según el tablero»', () => {
    for (const h of HEROES) {
      expect(`${h.power} ${h.short} ${h.detail}`, h.id).not.toMatch(/\d/);
      expect(`${h.short} ${h.detail}`.toLowerCase()).not.toContain('según el tablero');
      expect(h.short.length).toBeGreaterThan(8);
      expect(h.detail.length).toBeGreaterThan(30);
    }
  });
});
