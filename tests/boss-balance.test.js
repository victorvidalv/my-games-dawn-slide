import { describe, it, expect } from 'vitest';
import { BOSS_LEVELS, BOSS_TARGET, FAMILY_HARD, REP_SKILL, bossBoardLength, bossDuel, bossWinRate, secondsPerMove, solveSeconds } from '../src/game/boss-balance.js';
import { BOSS_RULES, bossTimeFor } from '../src/game/bosses.js';
import { mulberry32 } from '../src/engine/rng.js';

const RUNS = 300;

describe('segundo simulador: reloj humano y piezas especiales', () => {
  it('pensar y ejecutar cuestan menos cuanto más habilidad, y más cuanto más largo es el tablero', () => {
    expect(secondsPerMove(0.4, 26)).toBeGreaterThan(secondsPerMove(0.92, 26));
    expect(secondsPerMove(0.6, 39)).toBeGreaterThan(secondsPerMove(0.6, 10));
    const rng = mulberry32(5);
    expect(solveSeconds(rng, 0.6, 26, 60)).toBeGreaterThan(solveSeconds(rng, 0.6, 26, 20));
  });
  it('las piezas especiales hacen los tableros más propensos a errores', () => {
    expect(FAMILY_HARD.plain).toBe(1);
    for (const k of Object.keys(FAMILY_HARD)) expect(FAMILY_HARD[k], k).toBeGreaterThanOrEqual(1);
    expect(FAMILY_HARD.mixed).toBeGreaterThan(FAMILY_HARD.walls);
  });
  it('un duelo se pierde por turnos o por tiempo, y la contrarreloj solo existe en los jefes que la tienen', () => {
    for (const level of BOSS_LEVELS) {
      const r = bossDuel({ level, skill: 0.5, seed: 11 });
      expect(r.timeLimit > 0, `jefe ${level}`).toBe(BOSS_RULES[level].kind !== 'turns');
      expect([null, 'turns', 'time']).toContain(r.reason);
    }
  });
});

describe('segundo simulador: los jefes están bien ajustados', () => {
  it('el jugador típico de cada jefe lo supera al primer intento cerca de la tasa objetivo (y el último es el más duro)', () => {
    const rates = BOSS_LEVELS.map((level) => bossWinRate({ level, start: 1, skill: REP_SKILL[level], runs: RUNS }).rate);
    BOSS_LEVELS.forEach((level, i) => {
      expect(rates[i], `jefe ${level}`).toBeGreaterThanOrEqual(BOSS_TARGET[level] - 0.06);
      expect(rates[i], `jefe ${level}`).toBeLessThanOrEqual(BOSS_TARGET[level] + 0.16);
    });
    expect(rates[9]).toBe(Math.min(...rates.slice(5)));          // Vhorn es el más difícil de los últimos
    expect(rates[9]).toBeLessThan(0.85);
  });

  it('un jugador hábil los supera casi siempre en los tres caminos, y uno flojo aún tiene opciones en los primeros', () => {
    for (const start of [1, 50, 75]) {
      for (const level of BOSS_LEVELS) {
        expect(bossWinRate({ level, start, skill: 0.92, runs: 200 }).rate, `camino ${start} jefe ${level}`).toBeGreaterThanOrEqual(level === 100 ? 0.6 : 0.8);
      }
    }
    for (const level of [10, 20, 30]) expect(bossWinRate({ level, start: 1, skill: 0.4, runs: 200 }).rate, `jefe ${level}`).toBeGreaterThanOrEqual(0.55);
  });

  it('la contrarreloj pesa: los jefes de tiempo pierden a gente por tiempo y los de turnos, por turnos', () => {
    let time = 0;
    let turns = 0;
    for (const level of BOSS_LEVELS) {
      const r = bossWinRate({ level, start: 50, skill: 0.5, runs: RUNS });
      if (BOSS_RULES[level].kind === 'time') time += r.byTime;
      if (BOSS_RULES[level].kind === 'turns') turns += r.byTurns;
    }
    expect(time).toBeGreaterThan(0.05);
    expect(turns).toBeGreaterThan(0.05);
  });

  it('el tiempo es razonable frente a lo que tarda el jugador típico (nunca es imposible ni regalado)', () => {
    for (const level of BOSS_LEVELS.filter((l) => BOSS_RULES[l].kind !== 'turns')) {
      const d = bossBoardLength(level, 1);
      const typical = d * 1.25 * secondsPerMove(REP_SKILL[level], d);
      expect(bossTimeFor(level, d), `jefe ${level}`).toBeGreaterThan(typical * 0.8);   // el jefe final es deliberadamente justo
      expect(bossTimeFor(level, d), `jefe ${level}`).toBeLessThan(typical * 3);
    }
  });
});
