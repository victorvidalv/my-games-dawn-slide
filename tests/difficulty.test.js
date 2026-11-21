import { describe, it, expect } from 'vitest';
import {
  curve,
  rateAt,
  minReach,
  moveLimit,
  MAX_LEVEL,
  TARGET_KNOTS,
  targetFor,
  ratingForMin,
} from '../src/engine/difficulty.js';
import { levelPlan, mechanicsOfFamily } from '../src/game/mechanics.js';
import { TUTORIAL_LEVELS, hasCurse, minFor } from '../src/engine/calibration.js';
import { calcGain, gainFor } from '../src/engine/scoring.js';

const PATHS = { Normal: 1, Difícil: 50, Experto: 75 };
const targetAt = (start, level) => curve(rateAt(start, level)).target;

describe('dificultad: la curva calibrada de 21 niveles se siente apropiada', () => {
  it('Normal sube de 3 a 22 movimientos sin saltos bruscos', () => {
    expect(MAX_LEVEL).toBe(21);
    const at = (l) => minFor(1, l);
    expect([at(1), at(10), at(21)]).toEqual([3, 12, 22]);
    for (let l = 2; l <= MAX_LEVEL; l++) {
      expect(at(l), `nivel ${l}`).toBeGreaterThanOrEqual(at(l - 1));
      expect(at(l) - at(l - 1), `nivel ${l}`).toBeLessThanOrEqual(1);
    }
    for (let l = 1; l <= MAX_LEVEL; l++) expect(Math.abs(targetAt(1, l) - at(l)), `nivel ${l}`).toBeLessThanOrEqual(1);
  });
  it('llegar al nivel 21 es desafiante: Normal ≥ 22, Difícil ≥ 28 y Experto ≥ 32', () => {
    expect(targetAt(1, 21)).toBeGreaterThanOrEqual(22);
    expect(targetAt(50, 21)).toBeGreaterThanOrEqual(28);
    expect(targetAt(75, 21)).toBeGreaterThanOrEqual(32);
  });
  it('Difícil y Experto empiezan más arriba que Normal, y Experto más arriba que Difícil', () => {
    expect(targetAt(50, 1)).toBeGreaterThanOrEqual(9);
    expect(targetAt(75, 1)).toBeGreaterThanOrEqual(targetAt(50, 1) + 5);
    expect(targetAt(50, 1)).toBeLessThan(targetAt(1, 21));
  });
  it('cada camino es más difícil que el anterior en el mismo nivel y nunca retrocede', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      expect(targetAt(50, l)).toBeGreaterThanOrEqual(targetAt(1, l));
      expect(targetAt(75, l)).toBeGreaterThanOrEqual(targetAt(50, l));
    }
    for (const start of Object.values(PATHS)) {
      for (let l = 2; l <= MAX_LEVEL; l++) {
        const d = targetAt(start, l) - targetAt(start, l - 1);
        expect(d, `camino ${start}, nivel ${l}`).toBeGreaterThanOrEqual(0);
        expect(d, `camino ${start}, nivel ${l}`).toBeLessThanOrEqual(2);
      }
    }
  });
  it('ratingForMin devuelve la dificultad cuyo mínimo se acerca más', () => {
    for (const m of [3, 6, 11, 20, 37]) expect(targetFor(ratingForMin(m))).toBe(m);
  });
  it('los puntos de control están ordenados y son crecientes', () => {
    for (let i = 1; i < TARGET_KNOTS.length; i++) {
      expect(TARGET_KNOTS[i][0]).toBeGreaterThan(TARGET_KNOTS[i - 1][0]);
      expect(TARGET_KNOTS[i][1]).toBeGreaterThanOrEqual(TARGET_KNOTS[i - 1][1]);
    }
    for (const [r, t] of TARGET_KNOTS) expect(targetFor(r)).toBe(t);
  });
  it('el mínimo exigido al generador baja solo un poco en las dificultades más altas', () => {
    for (let r = 1; r <= 100; r++) {
      expect(minReach(r)).toBeLessThanOrEqual(curve(r).target);
      expect(minReach(r)).toBeGreaterThanOrEqual(curve(r).target - 3);
    }
    expect(minReach(30)).toBe(curve(30).target);
  });
  it('el límite en Normal va de ×2,0 a ×1,30 (siempre 4 turnos de sobra) y es más estricto en Difícil y Experto', () => {
    expect(moveLimit(20, 1, 1)).toBe(40);
    expect(moveLimit(22, 1, 21)).toBe(29);
    expect(moveLimit(2, 1, 21)).toBe(6); // margen mínimo de 4 turnos en los tableros cortos
    expect(moveLimit(20, 50)).toBeLessThan(moveLimit(20, 1));
    expect(moveLimit(20, 75)).toBeLessThan(moveLimit(20, 50));
    expect(moveLimit(20, 75)).toBeGreaterThan(20);
    expect(moveLimit(20, 1, 21)).toBeLessThan(moveLimit(20, 1, 1));
    expect(moveLimit(20, 1, 21)).toBeGreaterThan(20);
  });
});

describe('calendario de piezas especiales (21 niveles)', () => {
  const ORDER = ['wall', 'heavy', 'gate', 'ice'];
  const plans = Array.from({ length: MAX_LEVEL }, (_, i) => levelPlan(i + 1));
  it('cada mecánica llega en su nivel de tutorial, solas, una tras otra y nunca antes', () => {
    const lv = ORDER.map((m) => TUTORIAL_LEVELS[m]);
    for (let i = 1; i < lv.length; i++) expect(lv[i]).toBeGreaterThan(lv[i - 1]);
    ORDER.forEach((m) => {
      const t = TUTORIAL_LEVELS[m];
      expect(levelPlan(t).mechanics, m).toEqual([m]);
      expect(levelPlan(t).intro).toBe(true);
      for (let l = 1; l < t; l++)
        expect(levelPlan(l).mechanics, `${m} antes de su tutorial (nivel ${l})`).not.toContain(m);
    });
  });
  it('los primeros niveles son normales y los 5 maleficios están bien repartidos', () => {
    for (let l = 1; l < TUTORIAL_LEVELS.wall; l++) expect(plans[l - 1].family, `nivel ${l}`).toBe('plain');
    const curses = Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).filter(hasCurse);
    expect(curses).toEqual([7, 12, 15, 18, 20]);
  });
  it('las mezclas crecen: pocas al principio y todas juntas al final (el nivel 21 lleva las cuatro)', () => {
    const avg = (a, b) => {
      const s = plans.slice(a - 1, b).filter((p) => p.mechanics.length);
      return s.reduce((x, p) => x + p.mechanics.length, 0) / s.length;
    };
    expect(avg(1, 10)).toBeLessThan(avg(11, 16));
    expect(avg(11, 16)).toBeLessThan(avg(17, 21));
    expect(plans[20].mechanics).toEqual(ORDER);
  });
  it('cada mecánica sigue apareciendo hasta el final (ninguna se pierde)', () => {
    for (const m of ORDER)
      for (const [a, b] of [
        [TUTORIAL_LEVELS[m], 15],
        [16, 21],
      ])
        expect(
          plans.slice(a - 1, b).some((p) => p.mechanics.includes(m)),
          `${m} en ${a}-${b}`,
        ).toBe(true);
  });
  it('cada familia declara qué mecánicas contiene', () => {
    expect(mechanicsOfFamily('plain')).toEqual([]);
    expect(mechanicsOfFamily('ice')).toEqual(['ice']);
    expect(mechanicsOfFamily('gates')).toEqual(['gate']);
    expect(mechanicsOfFamily('combo_hgi')).toEqual(['heavy', 'gate', 'ice']);
    expect(mechanicsOfFamily('combo_whgi')).toEqual(ORDER);
  });
  it('calcGain y gainFor coinciden sin bonos extra', () => {
    const base = calcGain(15, 15, 0).total;
    const g = gainFor(15, 15, 0);
    expect(g.total).toBe(base);
  });
});
