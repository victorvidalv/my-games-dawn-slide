import { describe, it, expect, beforeAll } from 'vitest';
import levelBank from '../src/data/levels.json';
import specialBank from '../src/data/special.json';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { levelPlan } from '../src/game/mechanics.js';
import { runPoolCached as runPool } from './parallel/pool.js';

const build = (level, start = 1) =>
  buildAdventureLevel(
    { seed: 46, hero: 'lia', start, level, mode: 'c', adj: 0, hints: 3, score: 0 },
    { levels: levelBank.ratings, special: specialBank },
  );

/** Niveles que se revisan: los 21 de Normal y los cierres de tramo de Experto. */
const LEVELS = [
  ...Array.from({ length: 21 }, (_, i) => ({ start: 1, level: i + 1 })),
  ...[3, 6, 9, 12, 15, 18, 21].map((level) => ({ start: 75, level })),
];
/** Niveles con hielo, candados y pesadas: además se compara el solver con el arrastre (paridad). */
const PARITY = new Set([3, 5, 6, 8, 10, 13, 15, 16, 18, 21]);

describe('mecánicas: los 21 niveles (en paralelo)', () => {
  let rows = [];
  beforeAll(async () => {
    rows = await runPool(
      'adventure',
      LEVELS.map((x) => ({ ...x, parity: x.start === 1 && PARITY.has(x.level) ? 120 : 0 })),
      { batch: 1 },
    );
  }, 600000);

  it('todos los niveles se generan válidos, resolubles, con el mínimo correcto y siempre con pista', () => {
    expect(rows).toHaveLength(LEVELS.length);
    for (const r of rows) {
      const label = `camino ${r.start} nivel ${r.level}`;
      expect(r.valid, `${label}: estado válido`).toBe(true);
      expect(r.real, `${label}: mínimo`).toBe(r.opt);
      expect(r.limit, `${label}: límite`).toBeGreaterThan(r.opt);
      expect(r.boss, `${label}: sin jefes`).toBeUndefined();
      expect(r.timeLimit, `${label}: sin contrarreloj`).toBeUndefined();
      // la salida no está cerrada: siempre hay una pista que acerca a la meta
      if (r.opt > 0) expect(r.hint, `${label}: pista`).toBe(true);
    }
  });

  it('los movimientos del solver y los del arrastre coinciden en los niveles con hielo, candados y pesadas', () => {
    const checked = rows.filter((r) => r.start === 1 && PARITY.has(r.level));
    expect(checked).toHaveLength(PARITY.size);
    for (const r of checked) expect(r.violations, `nivel ${r.level}`).toEqual([]);
  });

  it('los cierres de tramo (3…21) son tableros válidos con el límite habitual de su camino', () => {
    for (let level = 3; level <= 21; level += 3) {
      const r = rows.find((x) => x.start === 1 && x.level === level);
      expect(levelPlan(level).boss, `nivel ${level}`).toBeUndefined();
      expect(r.opt, `nivel ${level}`).toBeGreaterThan(2);
      expect(r.limit, `nivel ${level}`).toBeGreaterThanOrEqual(r.opt + 2);
    }
  });

  it('el nivel construido en el hilo principal es el mismo que en los hilos (determinista)', () => {
    const G = build(7);
    const r = rows.find((x) => x.start === 1 && x.level === 7);
    expect(G.opt).toBe(r.opt);
    expect(G.limit).toBe(r.limit);
  });
});
