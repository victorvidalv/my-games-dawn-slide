import { describe, it, expect } from 'vitest';
import { levelPlan } from '../src/game/mechanics.js';
import { TUTORIAL_LEVELS } from '../src/engine/calibration.js';
import {
  decodeBoard,
  isValidState,
  minMoves,
  hintMove,
  analyze,
  slideRange,
  isLocked,
  expand,
  N,
  encode,
} from '../src/engine/index.js';

/** Tableros mínimos (3 movimientos) que ejercitan cada pieza: sirven para probar sus reglas. */
const TUTORIALS = {
  wall: { level: TUTORIAL_LEVELS.wall, board: 'h2.2.0 v2.3.2 h2.4.3 #1.3' },
  heavy: { level: TUTORIAL_LEVELS.heavy, board: 'h2.2.0 v2.3.2p #4.3' },
  gate: { level: TUTORIAL_LEVELS.gate, board: 'h2.2.0 v2.3.1g5.0 h2.5.3' },
  ice: { level: TUTORIAL_LEVELS.ice, board: 'h2.2.0 v3.3.0i h2.3.2' },
};

const board = (t) => decodeBoard(t.board);

describe('tableros mínimos por pieza', () => {
  it('uno por mecánica (cuatro piezas), en el nivel que decide el calibrador, y ese nivel es de esa mecánica', () => {
    expect(Object.keys(TUTORIALS).sort()).toEqual(['gate', 'heavy', 'ice', 'wall']);
    for (const [mech, t] of Object.entries(TUTORIALS)) {
      expect(t.level, mech).toBe(TUTORIAL_LEVELS[mech]);
      const plan = levelPlan(t.level);
      expect(plan.intro, `nivel ${t.level}`).toBe(true);
      expect(plan.mechanics, `nivel ${t.level}`).toContain(mech);
    }
    // el orden de aprendizaje de las piezas: roca → pesada → candado → hielo
    const L = (m) => TUTORIALS[m].level;
    expect(L('wall')).toBeLessThan(L('heavy'));
    expect(L('heavy')).toBeLessThan(L('gate'));
    expect(L('gate')).toBeLessThan(L('ice'));
    expect(new Set(Object.values(TUTORIALS).map((t) => t.level)).size).toBe(4); // nunca dos tutoriales en el mismo nivel
  });

  it('cada tablero es válido, se resuelve en exactamente 3 movimientos y contiene la pieza que enseña', () => {
    for (const [mech, t] of Object.entries(TUTORIALS)) {
      const b = board(t);
      expect(isValidState(b.pieces, b.pos, b.walls), mech).toBe(true);
      expect(minMoves(b.pieces, b.pos, b.walls), mech).toBe(3);
      if (mech === 'wall') expect(b.walls.length).toBeGreaterThan(0);
      if (mech === 'gate') expect(b.pieces.some((p) => p.kind === 'gate')).toBe(true);
      if (mech === 'heavy') expect(b.pieces.some((p) => p.kind === 'heavy')).toBe(true);
      if (mech === 'ice') expect(b.pieces.some((p) => p.kind === 'ice')).toBe(true);
    }
  });

  it('la guía señala la pieza correcta en cada paso (la mejor jugada siempre acerca a la salida)', () => {
    for (const [mech, t] of Object.entries(TUTORIALS)) {
      const b = board(t);
      let pos = b.pos.slice();
      for (let step = 0; step < 3; step++) {
        const h = hintMove(b.pieces, pos, b.walls);
        expect(h, `${mech} paso ${step}`).not.toBeNull();
        expect(h.left).toBe(3 - step);
        pos = pos.slice();
        pos[h.i] = h.to;
      }
      expect(pos[0]).toBe(N - 2);
    }
  });

  it('candado: está cerrado al empezar, lo abre el único bloque que llega a la placa, y no hay otra salida', () => {
    const b = board(TUTORIALS.gate);
    const g = b.pieces.findIndex((p) => p.kind === 'gate');
    expect(isLocked(b.pieces, b.pos, g, b.walls)).toBe(true);
    expect(slideRange(b.pieces, b.pos, g, b.walls)).toEqual([b.pos[g], b.pos[g]]);
    const without = b.pieces.map((p) => ({ ...p, kind: p.kind === 'gate' ? undefined : p.kind, plate: undefined }));
    expect(minMoves(without, b.pos, b.walls)).toBeLessThan(3 + 1); // sin candado sería más corto o igual: el candado importa
    // cubrir la placa lo abre
    const covering = b.pieces.findIndex((p, i) => i !== 0 && i !== g);
    const pos = b.pos.slice();
    pos[covering] = 0;
    expect(isLocked(b.pieces, pos, g, b.walls)).toBe(false);
  });

  it('pesada: avanza de a una casilla y la roca le impide bajar', () => {
    const b = board(TUTORIALS.heavy);
    const h = b.pieces.findIndex((p) => p.kind === 'heavy');
    const [lo, hi] = slideRange(b.pieces, b.pos, h, b.walls);
    expect(hi).toBe(b.pos[h]); // abajo no puede (roca)
    expect(lo).toBe(b.pos[h] - 1); // arriba, solo una casilla aunque haya más sitio
  });

  it('roca: el bloque vertical solo puede bajar', () => {
    const b = board(TUTORIALS.wall);
    const [lo] = slideRange(b.pieces, b.pos, 1, b.walls);
    expect(lo).toBe(b.pos[1]);
  });

  it('hielo: tras apartar el tope, patina de golpe hasta el extremo sin detenerse a medias', () => {
    const b = board(TUTORIALS.ice);
    const ice = b.pieces.findIndex((p) => p.kind === 'ice');
    expect(slideRange(b.pieces, b.pos, ice, b.walls)).toEqual([0, 0]);
    const cleared = [0, 0, 0];
    const [lo, hi] = slideRange(b.pieces, cleared, ice, b.walls);
    expect([lo, hi]).toEqual([0, 3]);
    const iceMoves = [];
    expand(
      b.pieces,
      encode(cleared),
      new Array(3).fill(0),
      new Int8Array(N * N),
      (i, y) => {
        if (i === ice) iceMoves.push(y);
      },
      b.walls,
    );
    expect(iceMoves).toEqual([3]);
  });

  it('todos los estados de cada tablero de aprendizaje tienen movimientos (no se puede atascar)', () => {
    for (const [mech, t] of Object.entries(TUTORIALS)) {
      const b = board(t);
      const an = analyze(b.pieces, b.pos, 600000, b.walls);
      for (const k of an.list) {
        let moves = 0;
        expand(b.pieces, k, new Array(b.pieces.length).fill(0), new Int8Array(N * N), () => moves++, b.walls);
        expect(moves, `${mech} ${k}`).toBeGreaterThan(0);
        expect(an.dist.get(k), `${mech} ${k}`).not.toBeUndefined();
      }
    }
  });
});
