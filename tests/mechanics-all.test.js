import { describe, it, expect } from 'vitest';
import levelBank from '../src/data/levels.json';
import specialBank from '../src/data/special.json';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { levelPlan } from '../src/game/mechanics.js';
import { N, analyze, decode, expand, isValidState, minMoves, slideRange, hintMove } from '../src/engine/index.js';

const run = (level, start = 1) => ({
  seed: 46,
  hero: 'lia',
  start,
  level,
  mode: 'c',
  adj: 0,
  hints: 3,
  score: 0,
});
const allTips = Object.fromEntries(['tut_wall', 'tut_heavy', 'tut_gate', 'tut_ice', 'tut_curse'].map((k) => [k, true]));
const build = (level, start = 1) =>
  buildAdventureLevel(run(level, start), { levels: levelBank.ratings, special: specialBank, tips: allTips });

/** Cada movimiento del solver coincide con lo que el jugador puede arrastrar (slideRange) en una muestra de estados alcanzables. */
function parity(G, label, sample = 120) {
  const { pieces, walls = [] } = G;
  const an = analyze(pieces, G.pos, 600000, walls);
  expect(an, `${label}: con solución`).not.toBeNull();
  const g = new Int8Array(N * N);
  const tmp = new Array(pieces.length).fill(0);
  const step = Math.max(1, Math.floor(an.list.length / sample));
  for (let q = 0; q < an.list.length; q += step) {
    const k = an.list[q];
    const here = decode(k, pieces.length);
    const targets = pieces.map(() => new Set());
    expand(pieces, k, tmp, g, (i, to) => targets[i].add(to), walls);
    pieces.forEach((p, i) => {
      const [lo, hi] = slideRange(pieces, here, i, walls);
      for (const t of targets[i])
        expect(t >= lo && t <= hi && t !== here[i], `${label}: pieza ${i} a ${t} fuera de [${lo},${hi}]`).toBe(true);
      if (!p.kind && lo < hi) {
        // pieza normal: puede ir a cualquier casilla libre de su recorrido
        for (let x = lo; x <= hi; x++)
          if (x !== here[i]) expect(targets[i].has(x), `${label}: pieza ${i} debería poder ir a ${x}`).toBe(true);
      }
    });
  }
}

describe('mecánicas: los 21 niveles', () => {
  it('todos los niveles se generan válidos, resolubles, con el mínimo correcto y siempre con pista', () => {
    for (const start of [1, 75]) {
      for (let level = 1; level <= 21; level++) {
        if (start !== 1 && level % 3 !== 0) continue;
        const label = `camino ${start} nivel ${level}`;
        const G = build(level, start);
        expect(isValidState(G.pieces, G.pos, G.walls), `${label}: estado válido`).toBe(true);
        expect(minMoves(G.pieces, G.pos, G.walls), `${label}: mínimo`).toBe(G.opt);
        expect(G.limit, `${label}: límite`).toBeGreaterThan(G.opt);
        expect(G.plan.boss, `${label}: sin jefes`).toBeUndefined();
        expect(G.timeLimit, `${label}: sin contrarreloj`).toBeUndefined();
        // la salida no está cerrada: siempre hay una pista que acerca a la meta
        const hint = hintMove(G.pieces, G.pos, G.walls);
        if (G.opt > 0) expect(hint, `${label}: pista`).not.toBeNull();
      }
    }
  }, 600000);

  it('los movimientos del solver y los del arrastre coinciden en los niveles con hielo, candados y pesadas', () => {
    for (const level of [3, 5, 6, 8, 10, 13, 15, 16, 18, 21]) {
      parity(build(level), `nivel ${level}`);
    }
  }, 600000);

  it('los cierres de tramo (3…21) son tableros válidos con el límite habitual de su camino', () => {
    for (let level = 3; level <= 21; level += 3) {
      const G = build(level);
      expect(levelPlan(level).boss, `nivel ${level}`).toBeUndefined();
      expect(G.opt, `nivel ${level}`).toBeGreaterThan(2);
      expect(G.limit, `nivel ${level}`).toBeGreaterThanOrEqual(G.opt + 2);
    }
  });
});
