import { describe, it, expect } from 'vitest';
import {
  REVIVE_SHARE,
  MAX_REVIVES,
  reviveCost,
  canPaidRevive,
  payRevive,
  hasRevive,
  useRevive,
  freeRetry,
  useFreeRetry,
  FREE_RETRY_UNTIL,
} from '../src/game/shop.js';

describe('revivir al caer (solo con Fénix)', () => {
  it('cuesta el 33 % de los puntos actuales y por defecto no hay revivir (MAX_REVIVES = 0)', () => {
    expect(REVIVE_SHARE).toBe(0.33);
    expect(MAX_REVIVES).toBe(0);
    expect(reviveCost(10000)).toBe(3300);
    expect(reviveCost(1001)).toBe(330);
    expect(reviveCost(0)).toBe(0);
    expect(canPaidRevive({ score: 10000, revivesBought: 0, mode: 'c' })).toBe(false);
  });
  it('con Fénix cobra el 33 % de tus puntos actuales y bloquea un segundo revivir en la misma partida', () => {
    const run = { score: 10000, spent: 0, revivesBought: 0, mode: 'c', fate: ['fenix'] };
    expect(canPaidRevive(run)).toBe(true);
    expect(payRevive(run)).toEqual({ ok: true, cost: 3300 });
    expect(run.score).toBe(6700);
    expect(run.spent).toBe(3300);
    expect(run.revivesBought).toBe(1);
    expect(canPaidRevive(run)).toBe(false);
    expect(payRevive(run)).toEqual({ ok: false, cost: 0 });
    expect(run.score).toBe(6700);
  });
  it('no se puede revivir sin puntos ni en Práctica', () => {
    expect(canPaidRevive({ score: 0, revivesBought: 0, mode: 'c', fate: ['fenix'] })).toBe(false);
    expect(canPaidRevive({ score: 10000, revivesBought: 0, mode: 'p', fate: ['fenix'] })).toBe(false);
  });
  it('compatibilidad: si existe una carga antigua guardada, useRevive la consume sin quedar negativa', () => {
    const run = { revive: 1, hints: 3 };
    const G = { n: 12, rate: 12, pieces: [{ o: 'h', len: 2, fix: 2 }], walls: [[1, 1]], start: [1], opt: 5 };
    useRevive(run, G);
    expect(run.revive).toBe(0);
    expect(run.rescue).toMatchObject({ level: 12, opt: 5, kind: 'revive', start: [1], walls: [[1, 1]] });
    expect(run.rescue.pieces).not.toBe(G.pieces);
    useRevive(run, G);
    expect(run.revive).toBe(0);
    expect(hasRevive(run)).toBe(false);
  });
});

describe('primeros pasos: en el primer tramo del camino Normal se repite el tablero en vez de perder la partida', () => {
  it('los reintentos de aprendizaje solo se aplican a los niveles 1-3 de Normal', () => {
    const run = { start: 1, mode: 'c' };
    expect(FREE_RETRY_UNTIL).toBe(3);
    for (let l = 1; l <= 3; l++) expect(freeRetry(run, l)).toBe(true);
    expect(freeRetry(run, 4)).toBe(false);
    expect(freeRetry({ start: 50, mode: 'c' }, 3)).toBe(false);
    expect(freeRetry({ start: 75, mode: 'c' }, 3)).toBe(false);
    expect(freeRetry({ start: 1, mode: 'p' }, 3)).toBe(false);
    expect(freeRetry(null, 3)).toBe(false);
  });
  it('repetir no cuesta puntos ni pistas, pero corta la racha, y deja el tablero listo para empezar de cero', () => {
    const run = { start: 1, mode: 'c', score: 900, hints: 2, streak: 4, revive: 0 };
    const G = { n: 3, rate: 5, pieces: [{ o: 'h', len: 2, fix: 2 }], start: [0], pos: [3], opt: 4, moves: 9, limit: 9 };
    useFreeRetry(run, G);
    expect(run).toMatchObject({ score: 900, hints: 2, streak: 0, revive: 0 });
    expect(run.rescue).toMatchObject({ kind: 'learn', level: 3, start: [0], opt: 4 });
  });
});
