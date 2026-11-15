import { describe, it, expect } from 'vitest';
import { moveLimit } from '../src/engine/difficulty.js';
import {
  HEROES, bonusTurns, heroLimit, clearRewards, powerScale, spendHint, canHint } from '../src/game/heroes.js';

const newRun = (extra = {}) => ({ hints: 3, lifeUsed: false, undoUsedAt: 0, undoUsedLevel: 0, undoUsedCount: 0, vanAwardedAt: 0, ...extra });

describe('héroes', () => {
  it('hay tres héroes con poder descrito', () => {
    expect(HEROES.map((h) => h.id)).toEqual(['lia', 'jean', 'van']);
    for (const h of HEROES) expect(h.power && h.short && h.detail).toBeTruthy();
  });
});

describe('Lía · turnos de reserva', () => {
  it('solo Lía recibe turnos extra: el 25 % del límite, mínimo 2', () => {
    expect(bonusTurns('lia', 8)).toBe(2);
    expect(bonusTurns('lia', 40)).toBe(10);
    expect(bonusTurns('lia', 74)).toBe(19);
    expect(bonusTurns('jean', 40)).toBe(0);
    expect(bonusTurns('van', 40)).toBe(0);
  });
  it('heroLimit suma el bonus al límite normal y para el resto de héroes no cambia', () => {
    for (const opt of [2, 7, 20, 37]) {
      expect(heroLimit('jean', opt, 1)).toBe(moveLimit(opt, 1));
      expect(heroLimit('lia', opt, 1)).toBe(moveLimit(opt, 1) + bonusTurns('lia', moveLimit(opt, 1)));
      expect(heroLimit('lia', opt, 75)).toBeGreaterThan(moveLimit(opt, 75));
    }
  });
});

describe('poderes por camino: Normal 100 %, Difícil 55 %, Experto 35 %', () => {
  it('powerScale baja con la dificultad del camino', () => {
    expect([1, 50, 75].map(powerScale)).toEqual([1, 0.55, 0.35]);
  });
  it('La reserva de Lía da menos en Difícil y menos aún en Experto (nunca cero)', () => {
    for (const opt of [14, 25, 37]) {
      expect(bonusTurns('lia', 60, 75)).toBeLessThan(bonusTurns('lia', 60, 50));
      expect(bonusTurns('lia', 60, 50)).toBeLessThan(bonusTurns('lia', 60, 1));
      expect(heroLimit('lia', opt, 75)).toBeGreaterThan(moveLimit(opt, 75));
    }
  });
});

describe('pistas · recompensas de nivel y reserva', () => {
  it('todos ganan +1 pista cada 5 niveles (y nada más: Juth ya no recibe pistas extra por ciudad)', () => {
    for (const hero of ['lia', 'jean', 'van']) {
      const run = newRun({ hints: 0 });
      expect(clearRewards(hero, run, 5)).toBe(1);
      expect(clearRewards(hero, run, 6)).toBe(0);
      expect(clearRewards(hero, run, 10)).toBe(1);
      expect(run.hints).toBe(2);
    }
  });
  it('las pistas normales de Juth gastan la reserva: su poder tiene una carga independiente', () => {
    const run = newRun({ hints: 2 });
    expect(spendHint({ heroId: 'van', run, mode: 'c', level: 7 })).toEqual({ ok: true, free: false });
    expect(run.hints).toBe(1);
    expect(run.powerUsedLevel).toBeUndefined();
    spendHint({ heroId: 'van', run, mode: 'c', level: 7 });
    expect(canHint('van', run, 'c', 7)).toBe(false);
    expect(canHint('van', run, 'c', 8)).toBe(false);
  });
  it('sin reserva ni pista gratis no se puede pedir una pista', () => {
    const run = newRun({ hints: 0 });
    expect(canHint('lia', run, 'c', 3)).toBe(false);
    expect(spendHint({ heroId: 'lia', run, mode: 'c', level: 3 })).toEqual({ ok: false, free: false });
    expect(run.hints).toBe(0);
  });
  it('en Práctica las pistas son gratis y no gastan nada', () => {
    const run = newRun({ hints: 0 });
    expect(canHint('lia', run, 'p', 3)).toBe(true);
    expect(spendHint({ heroId: 'lia', run, mode: 'p', level: 3 }).ok).toBe(true);
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
