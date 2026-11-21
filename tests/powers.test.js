import { describe, it, expect } from 'vitest';
import { decodeBoard, encode, isValidState, N } from '../src/engine/board.js';
import { analyze, expand } from '../src/engine/solver.js';
import { beginPower, destinyCount, rewindCount, destinyPlan, powerState, reserveState } from '../src/game/powers.js';
import bank from '../src/data/levels.json';
import special from '../src/data/special.json';

const rewindBoard = (n) => ({ n: 8, moves: n, limit: 30, pos: [n], hist: Array.from({ length: n }, (_, i) => [i]) });
const run = (hero) => ({ hero, hints: 4, score: 1234 });

describe('Jean: ~33 % de los movimientos hechos, mínimo 3', () => {
  for (const count of [0, 1, 4, 5, 8, 12, 20])
    it(`rebobina el historial real de ${count} movimientos`, () => {
      const r = run('jean'),
        G = rewindBoard(count),
        action = beginPower(r, G);
      if (!count) {
        expect(action).toBeNull();
        expect(r.powerUsedLevel).toBeUndefined();
        return;
      }
      const k = rewindCount(count);
      expect(k).toBe(Math.min(count, Math.max(3, Math.round(count / 3))));
      expect(action.steps).toHaveLength(k);
      expect(action.steps.at(-1)).toEqual([count - k]);
      expect(beginPower(r, G)).toBeNull();
      expect(r.hints).toBe(4);
      expect(r.score).toBe(1234);
    });
  it('guardar y cargar, rehacer y revivir no recargan el poder del mismo nivel', () => {
    const r = run('jean'),
      G = rewindBoard(3);
    beginPower(r, G);
    const loaded = JSON.parse(JSON.stringify(r));
    expect(powerState(loaded, G).ok).toBe(false);
    expect(powerState(loaded, { ...G, moves: 0, hist: [] }).ok).toBe(false);
    expect(powerState(loaded, { ...G, n: 9 }).ok).toBe(true);
  });
  it('en tableros largos (mínimo ≥ 16) Jean rebobina dos veces; en los cortos, una', () => {
    const r = run('jean'),
      long = { ...rewindBoard(12), opt: 16 };
    expect(powerState(r, long).reason).toBe('2 usos en este tablero');
    expect(beginPower(r, long)).not.toBeNull();
    const loaded = JSON.parse(JSON.stringify(r));
    expect(powerState(loaded, long).ok).toBe(true);
    expect(beginPower(loaded, long)).not.toBeNull();
    expect(powerState(loaded, long).ok).toBe(false);
    expect(powerState(loaded, { ...long, n: 9 }).ok).toBe(true);
    const short = run('jean');
    beginPower(short, { ...rewindBoard(12), opt: 13 });
    expect(powerState(short, { ...rewindBoard(12), opt: 13 }).ok).toBe(false);
  });
  it('con Eco del poder Jean tiene un rebobinado extra en el último tablero de cada ciudad', () => {
    const last = { ...rewindBoard(12), n: 18, opt: 10 };
    const eco = { ...run('jean'), mode: 'c', fate: ['power-echo'] };
    expect(powerState(eco, last).reason).toBe('2 usos en este tablero');
    expect(powerState({ ...run('jean'), mode: 'c' }, last).reason).toBe('1 uso por tablero');
    expect(powerState(eco, { ...last, n: 17 }).reason).toBe('1 uso por tablero');
  });
  it('Juramento apaga el poder del héroe', () => {
    const oath = { ...run('jean'), mode: 'c', fate: ['juramento'] };
    expect(powerState(oath, rewindBoard(12))).toEqual({ ok: false, reason: 'Apagado por tu Juramento' });
  });
  it('un uso antiguo de Jean cuenta como poder gastado en ese tablero', () => {
    expect(powerState({ ...run('jean'), undoUsedLevel: 8, undoUsedCount: 1 }, rewindBoard(4)).ok).toBe(false);
  });
});

describe('Juth: ~25 % de los pasos que faltan, legales', () => {
  for (const family of ['plain', 'walls', 'gates', 'heavy', 'ice', 'combo_hg', 'combo_wh'])
    it(`respeta ${family} y reduce la distancia exacta en su parte`, () => {
      const raw = family === 'plain' ? bank.ratings[29][0] : special[family].find((l, k) => k >= 20 && l.length)[0];
      const G = { ...decodeBoard(raw), n: 45, moves: 0, limit: 100, hist: [] };
      const an = analyze(G.pieces, G.pos, 600000, G.walls),
        before = an.dist.get(encode(G.pos));
      expect(before).toBeGreaterThan(2);
      const n = destinyCount(before);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(before);
      const action = beginPower(run('van'), G);
      expect(action.steps).toHaveLength(n);
      for (const step of action.steps) {
        const legal = [];
        expand(
          G.pieces,
          encode(G.pos),
          Array(G.pieces.length).fill(0),
          new Int8Array(N * N),
          (i, to) => legal.push([i, to]),
          G.walls,
        );
        expect(legal).toContainEqual([step.i, step.to]);
        G.pos[step.i] = step.to;
        expect(isValidState(G.pieces, G.pos, G.walls)).toBe(true);
      }
      expect(an.dist.get(encode(G.pos))).toBe(before - n);
    });
  it('se desactiva cuando quedan tres o menos pasos y no consume la carga', () => {
    const G = { ...decodeBoard('h2.2.0'), n: 10, moves: 0, limit: 10, hist: [] },
      r = run('van');
    expect(destinyPlan(G)).toBeNull();
    expect(beginPower(r, G)).toBeNull();
    expect(r.powerUsedLevel).toBeUndefined();
  });
  it('la parte es ~25 %, mínimo 1 con 4+ pasos, nada con 3 o menos, y nunca el último', () => {
    expect([1, 2, 3].map((l) => destinyCount(l))).toEqual([0, 0, 0]);
    expect([4, 5, 6, 8, 12, 20].map((l) => destinyCount(l))).toEqual([1, 1, 2, 2, 3, 5]);
    for (let l = 3; l < 40; l++) expect(destinyCount(l, 0.4)).toBeLessThan(l);
  });
  it('no activa una secuencia si quedan menos turnos que pasos a ejecutar', () => {
    const G = { ...decodeBoard(bank.ratings[29][0]), n: 4, moves: 9, limit: 11, hist: [] };
    expect(powerState(run('van'), G)).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/^Necesitas \d+ turnos$/),
    });
  });
  it('ningún héroe recibe el poder del otro', () => {
    expect(beginPower(run('lia'), rewindBoard(4))).toBeNull();
  });
});

describe('reserva de Lía antes de los turnos comprados', () => {
  it('marca y consume solo su tramo, dejando la compra al final', () => {
    const G = { limit: 16, bought: 3, moves: 9 };
    expect(reserveState(G, 3)).toEqual({ start: 10, end: 13, left: 3 });
    G.moves = 11;
    expect(reserveState(G, 3).left).toBe(2);
    G.moves = 14;
    expect(reserveState(G, 3).left).toBe(0);
  });
});
