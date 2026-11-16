import { describe, it, expect } from 'vitest';
import { averageRuns, simulateRun, PATHS, SKILLS } from '../src/game/balance.js';
import { hintEvery } from '../src/game/heroes.js';
import { POWER_READY_SHARE, powerReady } from '../src/game/powers.js';
import { maxPrize, bonusPrize } from '../src/game/minigames.js';
import { MAX_REVIVES, REVIVE_SHARE } from '../src/game/shop.js';
import { braveExtra, moveLimit } from '../src/engine/difficulty.js';

/**
 * Equilibrio del juego con el modelo de src/game/balance.js (determinista). Los rangos salen de `npm run simulate`:
 * son anchas a propósito, pero detectan un cambio que rompa la progresión de cada camino, los poderes o el camino heroico.
 * Habilidad: 0,4 casual · 0,6 media · 0,8 buena · 0,92 experta.
 */
const RUNS = 250;
const HEROES = ['lia', 'jean', 'van'];
const [NORMAL, DIFICIL, EXPERTO] = PATHS;

/** Niveles que alcanza de media un jugador (promedio de los tres héroes, sin tienda). */
const reach = (start, skill) => HEROES.reduce((a, hero) => a + averageRuns({ hero, start, skill, runs: RUNS }).cleared, 0) / HEROES.length;
/** Niveles extra de un héroe frente a no tener poder, promediados en habilidades 0,4–0,92 para un camino. */
function uplift(hero, start) {
  let t = 0;
  for (const skill of SKILLS) t += averageRuns({ hero, start, skill, runs: RUNS }).cleared - averageRuns({ hero: 'none', start, skill, runs: RUNS }).cleared;
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
    expect(n).toBeGreaterThanOrEqual(d - 1);
    expect(d - e).toBeGreaterThan(5);
  });

  it('alcance esperado por camino: Normal se puede completar con maña; en Experto solo los muy buenos llegan lejos', () => {
    const r = (s, k) => reach(s, k);
    expect(r(NORMAL, 0.6)).toBeGreaterThan(45); expect(r(NORMAL, 0.6)).toBeLessThan(68);
    expect(r(NORMAL, 0.8)).toBeGreaterThan(75); expect(r(NORMAL, 0.8)).toBeLessThan(96);
    expect(r(NORMAL, 0.92)).toBeGreaterThan(85);
    expect(r(DIFICIL, 0.6)).toBeGreaterThan(24); expect(r(DIFICIL, 0.6)).toBeLessThan(44);
    expect(r(DIFICIL, 0.8)).toBeGreaterThan(52); expect(r(DIFICIL, 0.8)).toBeLessThan(78);
    expect(r(DIFICIL, 0.92)).toBeGreaterThan(78);
    expect(r(EXPERTO, 0.6)).toBeGreaterThan(9); expect(r(EXPERTO, 0.6)).toBeLessThan(27);
    expect(r(EXPERTO, 0.8)).toBeGreaterThan(32); expect(r(EXPERTO, 0.8)).toBeLessThan(58);
    expect(r(EXPERTO, 0.92)).toBeGreaterThan(65); expect(r(EXPERTO, 0.92)).toBeLessThan(93);
  });

  it('con poder, un jugador medio no llega al final de ningún camino', () => {
    for (const start of PATHS) for (const hero of HEROES) expect(averageRuns({ hero, start, skill: 0.5, runs: RUNS }).completion, `${hero} ${start}`).toBeLessThan(0.5);
  });
});

describe('equilibrio de los poderes de héroe (simulación)', () => {
  it('los tres poderes ayudan de verdad en cada camino (≥ 7,5 niveles extra de media; con los jefes más duros y la reserva de Lía a la mitad en ellos)', () => {
    for (const start of PATHS) for (const hero of HEROES) expect(uplift(hero, start), `${hero} camino ${start}`).toBeGreaterThanOrEqual(7.5);
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
      u.forEach((v, i) => { expect(v / mean, `${HEROES[i]} camino ${start}`).toBeGreaterThan(0.5); expect(v / mean, `${HEROES[i]} camino ${start}`).toBeLessThan(1.5); });
    }
    const n = HEROES.map((h) => uplift(h, NORMAL));
    const mean = n.reduce((a, b) => a + b, 0) / 3;
    n.forEach((v) => { expect(v / mean).toBeGreaterThan(0.6); expect(v / mean).toBeLessThan(1.5); });
  });

  it('Jean/Juth descansan en algunos tableros', () => {
    expect(POWER_READY_SHARE).toEqual({ 1: 1, 50: 0.85, 75: 0.7 });
    const ready = (s) => Array.from({ length: 100 }, (_, i) => powerReady(i + 1, s)).filter(Boolean).length;
    expect(ready(NORMAL)).toBe(100);
    expect(ready(DIFICIL)).toBeGreaterThanOrEqual(84); expect(ready(DIFICIL)).toBeLessThanOrEqual(86);
    expect(ready(EXPERTO)).toBeGreaterThanOrEqual(69); expect(ready(EXPERTO)).toBeLessThanOrEqual(71);
  });
});

describe('camino heroico (simulación)', () => {
  const avgOver = (skill, hero) => {
    let dl = 0; let pr = 0;
    for (const start of PATHS) {
      const a = averageRuns({ hero, start, skill, runs: RUNS });
      const b = averageRuns({ hero, start, skill, runs: RUNS, route: 'brave' });
      dl += b.cleared - a.cleared; pr += b.score / Math.max(1, a.score);
    }
    return { levels: dl / PATHS.length, points: pr / PATHS.length };
  };

  it('es un riesgo real pero no un castigo: pierde a lo sumo unos pocos niveles y al jugador experto le da más puntos con cualquier héroe', () => {
    for (const hero of HEROES) {
      const g = avgOver(0.92, hero);
      expect(g.levels, `${hero} niveles`).toBeGreaterThan(-9);
      expect(g.points, `${hero} puntos`).toBeGreaterThan(1.05);   // más puntos por nivel compensan que los poderes valgan la mitad
    }
    for (const hero of HEROES) expect(avgOver(0.6, hero).levels, `${hero} jugador medio`).toBeGreaterThan(-12);
  });

  it('el camino heroico cuesta algunos niveles por igual a los tres héroes (poderes a la mitad) y lo compensan los puntos', () => {
    const lia = avgOver(0.8, 'lia');
    const jean = avgOver(0.8, 'jean');
    const juth = avgOver(0.8, 'van');
    for (const g of [lia, jean, juth]) {
      expect(g.levels).toBeLessThan(0);   // es un riesgo real: con los poderes a la mitad se llega algo menos lejos
      expect(g.levels).toBeGreaterThan(-12);   // pero no es un castigo
    }
    expect(Math.max(lia.levels, jean.levels, juth.levels) - Math.min(lia.levels, jean.levels, juth.levels)).toBeLessThan(6);   // parecidos entre héroes
    for (const g of [lia, jean, juth]) expect(g.points).toBeGreaterThan(1.0);
  });

  it('con tienda, el descuento compensa el camino heroico de Juth', () => {
    let withDiscount = 0; let without = 0;
    for (const start of PATHS) {
      const a = averageRuns({ hero: 'van', start, skill: 0.8, runs: RUNS, shop: true });
      const b = averageRuns({ hero: 'van', start, skill: 0.8, runs: RUNS, shop: true, route: 'brave' });
      withDiscount += b.cleared - a.cleared;
      const c = averageRuns({ hero: 'van', start, skill: 0.8, runs: RUNS });
      const d = averageRuns({ hero: 'van', start, skill: 0.8, runs: RUNS, route: 'brave' });
      without += d.cleared - c.cleared;
    }
    expect(withDiscount).toBeGreaterThan(without);
  });

  it('el tablero heroico pide más movimientos y su límite es más estricto', () => {
    expect(braveExtra(2)).toBe(1);
    expect(braveExtra(37)).toBe(4);
    for (const opt of [15, 30, 37]) expect(moveLimit(opt + braveExtra(opt), 1, 50, true)).toBeLessThan(moveLimit(opt + braveExtra(opt), 1, 50, false));
  });
});

describe('economía de pistas y sellos (simulación)', () => {
  it('las pistas ganadas y los premios de los minijuegos son más escasos cuanto más difícil es el camino', () => {
    expect([NORMAL, DIFICIL, EXPERTO].map(hintEvery)).toEqual([5, 6, 8]);
    expect(maxPrize(95, NORMAL)).toBe(10);
    expect(maxPrize(95, DIFICIL)).toBeLessThan(maxPrize(95, NORMAL));
    expect(maxPrize(95, EXPERTO)).toBeLessThan(maxPrize(95, DIFICIL));
    expect(bonusPrize(0, 95, EXPERTO)).toBeGreaterThanOrEqual(1);     // participar siempre da al menos una pista
  });

  it('los sellos opcionales son un riesgo con premio: dan entre un 8 % y un 25 % de los puntos y cuestan algunos niveles', () => {
    for (const start of PATHS) {
      const con = averageRuns({ hero: 'none', start, skill: 0.8, runs: RUNS });
      const sin = averageRuns({ hero: 'none', start, skill: 0.8, runs: RUNS, seals: false });
      const share = con.sealPts / con.score;
      expect(share, `camino ${start}`).toBeGreaterThan(0.08);
      expect(share, `camino ${start}`).toBeLessThan(0.25);
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
    for (let seed = 1; seed <= 50; seed++) expect(simulateRun({ hero: 'none', start: 1, skill: 0.7, seed, revive: 'city' }).revivesBought).toBeLessThanOrEqual(MAX_REVIVES);
  });
});

describe('tienda (simulación)', () => {
  const gain = (start, skill) => {
    const a = averageRuns({ hero: 'none', start, skill, runs: RUNS });
    const b = averageRuns({ hero: 'none', start, skill, runs: RUNS, shop: true });
    return { levels: b.cleared - a.cleared, score: b.score / Math.max(1, a.score), spent: b.spent };
  };
  it('ayuda de verdad pero sin romper el juego, y menos cuanto más difícil es el camino', () => {
    const g = PATHS.map((start) => gain(start, 0.8).levels);
    for (const l of g) { expect(l).toBeGreaterThan(0.5); expect(l).toBeLessThan(20); }
    expect(g[2]).toBeLessThan(g[0]);
  });
  it('duele: en los caminos difíciles comprar a fondo se come casi todo el puntaje', () => {
    for (const start of PATHS) expect(gain(start, 0.8).spent, `camino ${start}`).toBeGreaterThan(5000);
    expect(gain(DIFICIL, 0.8).score).toBeLessThan(0.52);
    expect(gain(EXPERTO, 0.8).score).toBeLessThan(0.52);
  });
  it('el jugador perfecto casi no necesita comprar', () => {
    expect(gain(NORMAL, 0.92).levels).toBeLessThan(15);
  });
});
