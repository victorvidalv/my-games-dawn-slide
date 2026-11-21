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

/** Cierre de ciudad (10, 20 … 100): el calendario calibrado le da un tablero algo más largo antes de elegir carta. */
const isCityEnd = (level) => level >= 10 && level % 10 === 0;
import { TUTORIAL_LEVELS, hasCurse, minFor } from '../src/engine/calibration.js';
import { calcGain, gainFor } from '../src/engine/scoring.js';

const PATHS = { Normal: 1, Difícil: 50, Experto: 75 };
const targetAt = (start, level) => curve(rateAt(start, level)).target;

describe('dificultad: la curva calibrada se siente apropiada', () => {
  it('en Normal los mínimos parten de 3 y suben un movimiento cada 3 niveles (los cierres de ciudad, 2 más desde el 20)', () => {
    for (let l = 1; l <= MAX_LEVEL; l++) {
      const want = Math.min(37, 3 + Math.floor((l - 1) / 3) + (isCityEnd(l) && l >= 20 ? 2 : 0));
      expect(minFor(1, l), `nivel ${l}`).toBe(want);
      expect(targetAt(1, l), `nivel ${l}`).toBe(want);
    }
    expect(minFor(1, 1)).toBe(3);
  });
  it('llegar al nivel 100 es desafiante (≥ 35 movimientos mínimos) en todos los caminos', () => {
    for (const start of Object.values(PATHS)) expect(targetAt(start, 100)).toBeGreaterThanOrEqual(35);
  });
  it('Difícil y Experto empiezan donde Normal ya exige pensar, y Experto más arriba que Difícil', () => {
    expect(targetAt(50, 1)).toBeGreaterThanOrEqual(9);
    expect(targetAt(75, 1)).toBeGreaterThanOrEqual(targetAt(50, 1) + 5);
    expect(targetAt(50, 1)).toBeLessThan(targetAt(1, 100));
  });
  it('sus curvas son más empinadas: llegan al máximo antes que Normal (Experto antes que Difícil)', () => {
    const first = (start) => {
      for (let l = 1; l <= MAX_LEVEL; l++) if (targetAt(start, l) >= 37) return l;
      return MAX_LEVEL + 1;
    };
    expect(first(75)).toBeLessThan(first(50));
    expect(first(50)).toBeLessThan(first(1));
    expect(first(75)).toBeLessThanOrEqual(45);
    expect(first(50)).toBeLessThanOrEqual(60);
    expect(first(1)).toBeGreaterThanOrEqual(95);
    expect(targetAt(50, 50) - targetAt(1, 50)).toBeGreaterThanOrEqual(8);
  });
  it('cada camino es más difícil que el anterior en el mismo nivel', () => {
    for (let l = 1; l <= MAX_LEVEL; l += 1) {
      expect(targetAt(50, l)).toBeGreaterThanOrEqual(targetAt(1, l));
      expect(targetAt(75, l)).toBeGreaterThanOrEqual(targetAt(50, l));
    }
  });
  it('la dificultad solo baja justo después de un cierre de ciudad (que es 2 más duro) y no da saltos bruscos', () => {
    for (const start of Object.values(PATHS)) {
      for (let l = 2; l <= MAX_LEVEL; l++) {
        const d = targetAt(start, l) - targetAt(start, l - 1);
        expect(d, `camino ${start}, nivel ${l}`).toBeLessThanOrEqual(5);
        if (!isCityEnd(l - 1)) expect(d, `camino ${start}, nivel ${l}`).toBeGreaterThanOrEqual(0);
        else expect(d, `camino ${start}, nivel ${l}`).toBeGreaterThanOrEqual(-3);
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
  it('el límite es el doble en Normal y se vuelve más estricto en Difícil y Experto', () => {
    expect(moveLimit(20)).toBe(40);
    expect(moveLimit(20, 1)).toBe(40);
    expect(moveLimit(20, 50)).toBeLessThan(moveLimit(20, 1));
    expect(moveLimit(20, 75)).toBeLessThan(moveLimit(20, 50));
    expect(moveLimit(20, 75)).toBeGreaterThan(20);
    expect(moveLimit(20, 1, 100)).toBeLessThan(moveLimit(20, 1, 1));
    expect(moveLimit(20, 1, 100)).toBeGreaterThan(20);
  });
});

describe('calendario de piezas especiales (calibrado)', () => {
  const ORDER = ['wall', 'heavy', 'gate', 'ice'];
  const plans = Array.from({ length: 100 }, (_, i) => levelPlan(i + 1));
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
  it('los primeros niveles son normales y en todos los tramos hay respiros normales', () => {
    for (let l = 1; l < TUTORIAL_LEVELS.wall; l++) expect(plans[l - 1].family, `nivel ${l}`).toBe('plain');
    for (let c = 1; c < 10; c++)
      expect(
        plans.slice(c * 10, c * 10 + 10).filter((p) => p.family === 'plain').length,
        `tramo ${c + 1}`,
      ).toBeGreaterThanOrEqual(1);
    for (let l = 1; l <= 100; l++) expect(plans[l - 1].boss, `nivel ${l}: ya no hay jefes`).toBeUndefined();
  });
  it('las mecánicas no se repiten seguidas: nunca la misma mezcla en dos niveles especiales consecutivos ni tres especiales pegados', () => {
    let run = 0;
    for (let l = 1; l <= 100; l++) {
      run = plans[l - 1].family === 'plain' ? 0 : run + 1;
      if (!isCityEnd(l)) expect(run, `nivel ${l}`).toBeLessThanOrEqual(3);
    }
    let prev = null;
    for (let l = 1; l <= 100; l++) {
      const f = plans[l - 1].family;
      if (f === 'plain') continue;
      // salvo la práctica en solitario de una pieza recién llegada (los 8 niveles tras su tutorial), nunca la misma mezcla seguida
      const single = plans[l - 1].mechanics.length === 1 ? plans[l - 1].mechanics[0] : null;
      const practising = single && l - TUTORIAL_LEVELS[single] <= 8;
      if (!isCityEnd(l) && l > TUTORIAL_LEVELS.heavy && !practising)
        expect(f === prev, `nivel ${l}: ${f} repetida`).toBe(false);
      prev = f;
    }
  });
  it('cada pieza nueva se practica sola al menos 2 niveles en los 8 siguientes a su tutorial, y las parejas llegan después', () => {
    for (const m of ORDER.slice(1)) {
      const t = TUTORIAL_LEVELS[m];
      const solo = plans.slice(t, t + 8).filter((p) => p.mechanics.length === 1 && p.mechanics[0] === m).length;
      expect(solo, m).toBeGreaterThanOrEqual(2);
      const firstMix = plans.findIndex((p, i) => i + 1 > t && p.mechanics.length > 1 && p.mechanics.includes(m)) + 1;
      expect(firstMix === 0 || firstMix > t + 2, `${m}: primera mezcla en ${firstMix}`).toBe(true);
    }
  });
  it('el maleficio no compite con el aprendizaje: ninguno en los 4 niveles tras el tutorial de una pieza', () => {
    for (const m of ORDER)
      for (let l = TUTORIAL_LEVELS[m] + 1; l <= TUTORIAL_LEVELS[m] + 4; l++)
        expect(hasCurse(l), `nivel ${l}`).toBe(false);
  });
  it('las mezclas crecen: pocas al principio y todas juntas al final (el nivel 100 lleva las cuatro)', () => {
    const avg = (a, b) => {
      const s = plans.slice(a - 1, b).filter((p) => p.mechanics.length);
      return s.reduce((x, p) => x + p.mechanics.length, 0) / s.length;
    };
    expect(avg(12, 40)).toBeLessThan(avg(41, 70));
    expect(avg(41, 70)).toBeLessThan(avg(71, 100));
    expect(avg(80, 100)).toBeGreaterThanOrEqual(2.5);
    expect(plans[99].mechanics).toEqual(ORDER);
    expect(Math.max(...plans.slice(80).map((p) => p.mechanics.length))).toBe(4);
  });
  it('cada mecánica sigue apareciendo hasta el final (ninguna se pierde)', () => {
    for (const m of ORDER)
      for (const [a, b] of [
        [TUTORIAL_LEVELS[m], 60],
        [61, 100],
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
