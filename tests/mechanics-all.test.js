import { describe, it, expect } from 'vitest';
import levelBank from '../src/data/levels.json';
import specialBank from '../src/data/special.json';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { levelPlan, isBossLevel } from '../src/game/mechanics.js';
import { N, analyze, decode, expand, isValidState, minMoves, slideRange, hintMove } from '../src/engine/index.js';

const run = (level, start = 1) => ({
  seed: 46,
  hero: 'lia',
  start,
  level,
  route: 'normal',
  mode: 'c',
  adj: 0,
  hints: 3,
  score: 0,
});
const allTips = Object.fromEntries(['tut_wall', 'tut_heavy', 'tut_gate', 'tut_ice'].map((k) => [k, true]));
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

describe('mecánicas: los 100 niveles', () => {
  it('todos los niveles se generan válidos, resolubles, con el mínimo correcto y siempre con pista', () => {
    for (const start of [1, 75]) {
      for (let level = 1; level <= 100; level++) {
        if (start !== 1 && level % 10 !== 0) continue; // el camino Experto: solo los jefes (ya se prueban todos los niveles en Normal)
        const label = `camino ${start} nivel ${level}`;
        const G = build(level, start);
        expect(isValidState(G.pieces, G.pos, G.walls), `${label}: estado válido`).toBe(true);
        expect(minMoves(G.pieces, G.pos, G.walls), `${label}: mínimo`).toBe(G.opt);
        expect(G.limit, `${label}: límite`).toBeGreaterThan(G.opt);
        const plan = levelPlan(level);
        expect(G.plan?.boss ?? plan.boss, label).toBe(isBossLevel(level));
        // la salida no está cerrada: siempre hay una pista que acerca a la meta
        const hint = hintMove(G.pieces, G.pos, G.walls);
        if (G.opt > 0) expect(hint, `${label}: pista`).not.toBeNull();
      }
    }
  }, 600000);

  it('los movimientos del solver y los del arrastre coinciden en los niveles con hielo, candados y pesadas', () => {
    for (const level of [8, 18, 28, 38, 48, 50, 58, 64, 70, 78, 88, 100]) {
      parity(build(level), `nivel ${level}`);
    }
  }, 600000);

  it('los jefes (10…100) tienen tablero de jefe, más exigente, con límite ajustado', () => {
    for (let level = 10; level <= 100; level += 10) {
      const G = build(level);
      expect(levelPlan(level).boss, `nivel ${level}`).toBe(true);
      expect(G.opt, `nivel ${level}`).toBeGreaterThan(2);
    }
  });
});
