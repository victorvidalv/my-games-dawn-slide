import { describe, it, expect } from 'vitest';
import { averageRuns, simulateRun, PATHS, SKILLS } from '../src/game/balance.js';
import { hintEvery } from '../src/game/heroes.js';
import { POWER_READY_SHARE, powerReady } from '../src/game/powers.js';
import { maxPrize, bonusPrize } from '../src/game/minigames.js';
import { MAX_REVIVES, REVIVE_SHARE } from '../src/game/shop.js';

/**
 * Equilibrio del juego con el modelo de src/game/balance.js (determinista). Los rangos salen de `npm run simulate`:
 * son anchas a propósito, pero detectan un cambio que rompa la progresión de cada camino, los poderes, la tienda o los sellos.
 * Habilidad: 0,4 casual · 0,6 media · 0,8 buena · 0,92 experta.
 */
const RUNS = 250;
const HEROES = ['lia', 'jean', 'van'];
const [NORMAL, DIFICIL, EXPERTO] = PATHS;

/** Niveles que alcanza de media un jugador (promedio de los tres héroes, sin tienda). */
const reach = (start, skill) =>
  HEROES.reduce((a, hero) => a + averageRuns({ hero, start, skill, runs: RUNS }).cleared, 0) / HEROES.length;
/** Niveles extra de un héroe frente a no tener poder, promediados en habilidades 0,4–0,92 para un camino. */
function uplift(hero, start) {
  let t = 0;
  for (const skill of SKILLS)
    t +=
      averageRuns({ hero, start, skill, runs: RUNS }).cleared -
      averageRuns({ hero: 'none', start, skill, runs: RUNS }).cleared;
  return t / SKILLS.length;
}

describe('curva de dificultad de cada camino (simulación)', () => {
  it('el modelo es determinista y la habilidad importa: más habilidad, más niveles', () => {
    const a = simulateRun({ hero: 'jean', start: 1, skill: 0.6, seed: 7 });
    expect(simulateRun({ hero: 'jean', start: 1, skill: 0.6, seed: 7 })).toEqual(a);
    for (const start of PATHS) {
      let prev = -1;
      for (const skill of SKILLS) {
        const lv = reach(start, skill);
        expect(lv, `camino ${start}, habilidad ${skill}`).toBeGreaterThan(prev);
        prev = lv;
      }
    }
  });

  it('cada camino es claramente más duro que el anterior para un jugador medio y bueno', () => {
    for (const skill of [0.6, 0.8]) {
      const [n, d, e] = [NORMAL, DIFICIL, EXPERTO].map((s) => reach(s, skill));
      expect(n - d, `habilidad ${skill}: Normal − Difícil`).toBeGreaterThan(8);
      expect(d - e, `habilidad ${skill}: Difícil − Experto`).toBeGreaterThan(8);
    }
  });

  it('también para el jugador experto: Normal ≥ Difícil y Experto queda bastante por debajo', () => {
    const [n, d, e] = [NORMAL, DIFICIL, EXPERTO].map((s) => reach(s, 0.92));
    expect(n).toBeGreaterThanOrEqual(d - 4); // con los mínimos calibrados, Normal y Difícil acaban casi igual para el experto
    expect(d - e).toBeGreaterThan(4); // sin jefes, el experto llega algo más lejos en Experto
  });

  it('alcance esperado por camino: Normal se puede completar con maña; en Experto solo los muy buenos llegan lejos', () => {
    const r = (s, k) => reach(s, k);
    expect(r(NORMAL, 0.6)).toBeGreaterThan(38);
    expect(r(NORMAL, 0.6)).toBeLessThan(68);
    expect(r(NORMAL, 0.8)).toBeGreaterThan(70);
    expect(r(NORMAL, 0.8)).toBeLessThan(96);
    expect(r(NORMAL, 0.92)).toBeGreaterThan(85);
    expect(r(DIFICIL, 0.6)).toBeGreaterThan(24);
    expect(r(DIFICIL, 0.6)).toBeLessThan(44);
    expect(r(DIFICIL, 0.8)).toBeGreaterThan(52);
    expect(r(DIFICIL, 0.8)).toBeLessThan(78);
    expect(r(DIFICIL, 0.92)).toBeGreaterThan(78);
    expect(r(EXPERTO, 0.6)).toBeGreaterThan(9);
    expect(r(EXPERTO, 0.6)).toBeLessThan(27);
    expect(r(EXPERTO, 0.8)).toBeGreaterThan(32);
    expect(r(EXPERTO, 0.8)).toBeLessThan(58);
    expect(r(EXPERTO, 0.92)).toBeGreaterThan(65);
    expect(r(EXPERTO, 0.92)).toBeLessThan(93);
  });

  it('con poder, un jugador medio no llega al final de ningún camino', () => {
    for (const start of PATHS)
      for (const hero of HEROES)
        expect(averageRuns({ hero, start, skill: 0.5, runs: RUNS }).completion, `${hero} ${start}`).toBeLessThan(0.5);
  });
});

describe('equilibrio de los poderes de héroe (simulación)', () => {
  it('los tres poderes ayudan de verdad en cada camino (≥ 7,5 niveles extra de media)', () => {
    for (const start of PATHS)
      for (const hero of HEROES) expect(uplift(hero, start), `${hero} camino ${start}`).toBeGreaterThanOrEqual(7.5);
  });

  it('en total son justos entre sí: ninguno aporta más de un 25 % sobre la media ni menos de un 25 % por debajo', () => {
    const u = Object.fromEntries(HEROES.map((h) => [h, PATHS.reduce((a, s) => a + uplift(h, s), 0) / PATHS.length]));
    const mean = (u.lia + u.jean + u.van) / 3;
    for (const [hero, v] of Object.entries(u)) {
      expect(v / mean, `${hero} (${v.toFixed(1)} niveles, media ${mean.toFixed(1)})`).toBeGreaterThan(0.75);
      expect(v / mean, `${hero} (${v.toFixed(1)} niveles, media ${mean.toFixed(1)})`).toBeLessThan(1.25);
    }
  });

  it('y por camino: en Difícil y Experto los tres quedan a menos de ±30 % de la media (en Normal Jean destaca algo más)', () => {
    for (const start of [DIFICIL, EXPERTO]) {
      const u = HEROES.map((h) => uplift(h, start));
      const mean = u.reduce((a, b) => a + b, 0) / 3;
      u.forEach((v, i) => {
        expect(v / mean, `${HEROES[i]} camino ${start}`).toBeGreaterThan(0.5);
        expect(v / mean, `${HEROES[i]} camino ${start}`).toBeLessThan(1.5);
      });
    }
    const n = HEROES.map((h) => uplift(h, NORMAL));
    const mean = n.reduce((a, b) => a + b, 0) / 3;
    n.forEach((v) => {
      expect(v / mean).toBeGreaterThan(0.6);
      expect(v / mean).toBeLessThan(1.5);
    });
  });

  it('Jean/Juth descansan en algunos tableros (nunca en el primero, en el cierre de una ciudad ni dos seguidos)', () => {
    expect(POWER_READY_SHARE).toEqual({ jean: { 1: 0.85, 50: 0.75, 75: 0.65 }, van: { 1: 1, 50: 0.65, 75: 0.7 } });
    const ready = (s, hero) => Array.from({ length: 100 }, (_, i) => powerReady(i + 1, s, hero)).filter(Boolean).length;
    expect(ready(NORMAL, 'van')).toBe(100);
    for (const hero of ['jean', 'van'])
      for (const s of PATHS) {
        const share = POWER_READY_SHARE[hero][s];
        expect(Math.abs(ready(s, hero) - 100 * share), `${hero} ${s}`).toBeLessThanOrEqual(1);
        expect(powerReady(1, s, hero)).toBe(true);
        for (let level = 2; level <= 100; level++) {
          if (level % 10 === 0) expect(powerReady(level, s, hero), `${hero} ${s} cierre ${level}`).toBe(true);
          expect(powerReady(level, s, hero) || powerReady(level - 1, s, hero), `${hero} ${s} ${level}`).toBe(true);
        }
      }
  });
});

describe('economía de pistas y sellos (simulación)', () => {
  it('las pistas ganadas y los premios de los minijuegos son más escasos cuanto más difícil es el camino', () => {
    expect([NORMAL, DIFICIL, EXPERTO].map(hintEvery)).toEqual([5, 6, 8]);
    expect(maxPrize(95, NORMAL)).toBe(10);
    expect(maxPrize(95, DIFICIL)).toBeLessThan(maxPrize(95, NORMAL));
    expect(maxPrize(95, EXPERTO)).toBeLessThan(maxPrize(95, DIFICIL));
    expect(bonusPrize(0, 95, EXPERTO)).toBe(0); // 0 estrellas: sin premio
    expect(bonusPrize(1, 95, EXPERTO)).toBeGreaterThanOrEqual(1); // cualquier estrella da al menos una pista
  });

  it('los sellos opcionales son un riesgo con premio: dan entre un 8 % y un 28 % de los puntos y cuestan algunos niveles', () => {
    for (const start of PATHS) {
      const con = averageRuns({ hero: 'none', start, skill: 0.8, runs: RUNS });
      const sin = averageRuns({ hero: 'none', start, skill: 0.8, runs: RUNS, seals: false });
      const share = con.sealPts / con.score;
      expect(share, `camino ${start}`).toBeGreaterThan(0.08);
      expect(share, `camino ${start}`).toBeLessThan(0.28);
      expect(sin.cleared - con.cleared, `camino ${start}`).toBeLessThan(14);
    }
  });
});

describe('revivir comprado (simulación)', () => {
  it('ayuda más a quien más pierde y le duele más al que más puntos tiene', () => {
    const none = averageRuns({ hero: 'none', start: 50, skill: 0.55, runs: RUNS });
    const rev = averageRuns({ hero: 'none', start: 50, skill: 0.55, runs: RUNS, revive: 'city' });
    expect(rev.cleared).toBeGreaterThan(none.cleared + 1);
    const goodNone = averageRuns({ hero: 'none', start: 75, skill: 1, runs: RUNS });
    const goodRev = averageRuns({ hero: 'none', start: 75, skill: 1, runs: RUNS, revive: 'city' });
    expect(goodRev.score).toBeLessThan(goodNone.score * 0.99);
  });
  it('máximo 1 por partida y cuesta el 33 % de los puntos del momento', () => {
    expect(MAX_REVIVES).toBe(1);
    expect(REVIVE_SHARE).toBe(0.33);
    for (let seed = 1; seed <= 50; seed++)
      expect(
        simulateRun({ hero: 'none', start: 1, skill: 0.7, seed, revive: 'city' }).revivesBought,
      ).toBeLessThanOrEqual(MAX_REVIVES);
  });
});

describe('tienda (simulación)', () => {
  const gain = (start, skill) => {
    const a = averageRuns({ hero: 'none', start, skill, runs: RUNS });
    const b = averageRuns({ hero: 'none', start, skill, runs: RUNS, shop: true });
    return { levels: b.cleared - a.cleared, spent: b.spent };
  };
  it('los nuevos precios ayudan sin añadir de media más de unos 20 niveles', () => {
    for (const start of PATHS) {
      const { levels, spent } = gain(start, 0.8);
      expect(levels, `camino ${start}`).toBeGreaterThan(0.5);
      expect(levels, `camino ${start}`).toBeLessThan(22);
      expect(spent, `camino ${start}`).toBeGreaterThan(300); // en Normal, con más margen, casi no hace falta comprar
    }
  });
  it('el jugador perfecto casi no necesita comprar', () => {
    expect(gain(NORMAL, 0.92).levels).toBeLessThan(15);
  });
});
