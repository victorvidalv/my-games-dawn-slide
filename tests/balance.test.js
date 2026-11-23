import { describe, it, expect } from 'vitest';
import { averageRuns, simulateRun, PATHS, SKILLS } from '../src/game/balance.js';
import { hintEvery } from '../src/game/heroes.js';
import { POWER_READY_SHARE, powerReady } from '../src/game/powers.js';
import { MAX_REVIVES, REVIVE_SHARE } from '../src/game/shop.js';

/**
 * Equilibrio del juego de 21 niveles con el modelo de src/game/balance.js (determinista).
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

describe('curva de dificultad de cada camino en 21 niveles (simulación)', () => {
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
      expect(n - d, `habilidad ${skill}: Normal − Difícil`).toBeGreaterThan(0.5);
      expect(d - e, `habilidad ${skill}: Difícil − Experto`).toBeGreaterThan(2);
    }
  });

  it('alcance esperado por camino en 21 niveles', () => {
    const r = (s, k) => reach(s, k);
    expect(r(NORMAL, 0.6)).toBeGreaterThan(14);
    expect(r(NORMAL, 0.8)).toBeGreaterThan(17);
    expect(r(DIFICIL, 0.6)).toBeGreaterThan(10);
    expect(r(DIFICIL, 0.8)).toBeGreaterThan(15);
    expect(r(EXPERTO, 0.6)).toBeGreaterThan(6);
    expect(r(EXPERTO, 0.6)).toBeLessThan(14);
    expect(r(EXPERTO, 0.92)).toBeGreaterThan(17);
  });
});

describe('equilibrio de los poderes de héroe (simulación)', () => {
  it('los tres poderes ayudan de verdad en cada camino (≥ 1,5 niveles extra de media sobre 21)', () => {
    for (const start of PATHS)
      for (const hero of HEROES) expect(uplift(hero, start), `${hero} camino ${start}`).toBeGreaterThanOrEqual(1.5);
  });

  it('en total son justos entre sí: ninguno aporta más de un 25 % sobre la media ni menos de un 25 % por debajo', () => {
    const u = Object.fromEntries(HEROES.map((h) => [h, PATHS.reduce((a, s) => a + uplift(h, s), 0) / PATHS.length]));
    const mean = (u.lia + u.jean + u.van) / 3;
    for (const [hero, v] of Object.entries(u)) {
      expect(v / mean, `${hero} (${v.toFixed(1)} niveles, media ${mean.toFixed(1)})`).toBeGreaterThan(0.75);
      expect(v / mean, `${hero} (${v.toFixed(1)} niveles, media ${mean.toFixed(1)})`).toBeLessThan(1.25);
    }
  });

  it('Jean/Juth descansan en algunos tableros (nunca en el primero ni dos seguidos)', () => {
    expect(POWER_READY_SHARE).toEqual({ jean: { 1: 0.9, 50: 0.8, 75: 0.7 }, van: { 1: 1, 50: 0.8, 75: 0.75 } });
    for (const hero of ['jean', 'van'])
      for (const s of PATHS) {
        expect(powerReady(1, s, hero)).toBe(true);
        for (let level = 2; level <= 21; level++)
          expect(powerReady(level, s, hero) || powerReady(level - 1, s, hero), `${hero} ${s} ${level}`).toBe(true);
      }
  });
});

describe('economía de pistas y revivir (simulación)', () => {
  it('las pistas ganadas son más escasas cuanto más difícil es el camino', () => {
    expect([NORMAL, DIFICIL, EXPERTO].map(hintEvery)).toEqual([4, 5, 6]);
  });

  it('sin revivir por defecto (MAX_REVIVES = 0) y cuesta 33 % cuando Fénix lo habilita', () => {
    expect(MAX_REVIVES).toBe(0);
    expect(REVIVE_SHARE).toBe(0.33);
    for (let seed = 1; seed <= 30; seed++)
      expect(simulateRun({ hero: 'none', start: 1, skill: 0.7, seed, revive: 'city' }).revivesBought).toBe(0);
  });
});
