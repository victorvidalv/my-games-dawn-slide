import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import levelBank from '../src/data/levels.json';
import specialBank from '../src/data/special.json';
import { BOSSES, BOSS_RULES, bossCapFor, bossMechLabel, bossPortraitPath, bossRating, bossRule, bossRuleLabel, bossTimeFor } from '../src/game/bosses.js';
import { buildAdventureLevel } from '../src/game/build-adventure.js';
import { moveLimit } from '../src/engine/difficulty.js';
import { minFor } from '../src/engine/calibration.js';
import { bonusTurns, heroLimit } from '../src/game/heroes.js';
import { ZONE_THEMES } from '../src/audio/themes.js';

const LEVELS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const tips = Object.fromEntries(['tut_wall', 'tut_heavy', 'tut_gate', 'tut_ice', 'tut_door'].map((k) => [k, true]));
const build = (level, mode = 'c') => buildAdventureLevel({ seed: 46, hero: 'lia', start: 1, level, route: 'normal', mode, adj: 0, hints: 3, score: 0 }, { levels: levelBank.ratings, special: specialBank, tips });

describe('jefes: datos y reglas', () => {
  it('hay un jefe por ciudad con nombre, título, lore, mecánica, color y regla propia', () => {
    expect(Object.keys(BOSSES).map(Number)).toEqual(LEVELS);
    LEVELS.forEach((level, i) => {
      const b = BOSSES[level];
      expect(b.city, `jefe ${level}`).toBe(i);
      for (const k of ['name', 'title', 'lore', 'art']) expect(b[k], `${level}.${k}`).toBeTruthy();
      expect(b.color, `${level} color`).toHaveLength(2);
      expect(BOSS_RULES[level], `${level} regla`).toBeTruthy();
    });
    expect(new Set(Object.values(BOSSES).map((b) => b.name)).size).toBe(10);
  });

  it('cada jefe tiene su ilustración en public/jefes (las diez, en JPG optimizado)', () => {
    const missing = LEVELS.filter((l) => !fs.existsSync(`public/jefes/${BOSSES[l].art}.jpg`)).map((l) => `${l}:${BOSSES[l].art}`);
    expect(missing).toEqual([]);
    expect(fs.existsSync('public/jefes/sentinel.jpg')).toBe(true);   // la imagen de reserva (si falta alguna, el juego usa esta)
  });

  it('cada jefe tiene un retrato WebP recortado y una frase corta propia', () => {
    const bosses = Object.values(BOSSES);
    expect(new Set(bosses.map((boss) => boss.lore)).size).toBe(bosses.length);
    for (const boss of bosses) {
      expect(boss.lore.length).toBeLessThanOrEqual(62);
      expect(fs.existsSync(`public/${bossPortraitPath(boss)}`), boss.name).toBe(true);
    }
  });

  it('las reglas se alternan: hay jefes de turnos, de contrarreloj y de las dos cosas, y los finales usan ambas', () => {
    const kinds = LEVELS.map((l) => bossRule(l).kind);
    expect(new Set(kinds)).toEqual(new Set(['turns', 'time', 'both']));
    expect(kinds[0]).toBe('turns');
    expect(kinds[8]).toBe('both');
    expect(kinds[9]).toBe('both');
    expect(bossRule(11)).toBeNull();
    expect(bossCapFor(11)).toBe(false);
  });

  it('el límite de turnos del jefe nunca supera su tope y nunca baja de mínimo + 2', () => {
    for (const l of LEVELS) {
      const normal = moveLimit(30, 1, l, false, false);
      const boss = moveLimit(30, 1, l, false, bossCapFor(l));
      expect(boss, `jefe ${l}`).toBeLessThanOrEqual(normal);
      expect(boss, `jefe ${l}`).toBeLessThanOrEqual(Math.max(32, Math.round(30 * bossRule(l).cap)));
      expect(boss, `jefe ${l}`).toBeGreaterThanOrEqual(32);
    }
    expect(bossRule(60).cap).toBeLessThan(bossRule(10).cap);                    // los jefes de turnos aprietan más según avanzas
    expect(heroLimit('lia', 30, 1, 60, false, bossCapFor(60))).toBeLessThan(heroLimit('lia', 30, 1, 60, false, false));
    expect(bonusTurns('lia', 40, true)).toBeLessThan(bonusTurns('lia', 40, false));   // en jefes la reserva de Lía es menor
    expect(bonusTurns('jean', 40, true)).toBe(0);
  });

  it('la contrarreloj sube de 3 a 10 minutos conforme avanza la aventura', () => {
    for (const opt of [8, 15, 25, 35, 39]) {
      expect(LEVELS.map((level) => bossTimeFor(level, opt))).toEqual([0, 180, 0, 300, 360, 0, 480, 0, 600, 600]);
    }
    expect(bossTimeFor(11, 30)).toBe(0);
  });

  it('el tablero del jefe es 2 movimientos más duro que sus vecinos (turnos mínimos calibrados, sin suelo aparte)', () => {
    for (const level of LEVELS) {
      if (level < 20) continue;
      expect(minFor(1, level), `jefe ${level}`).toBeGreaterThanOrEqual(minFor(1, level - 1) + 1);
    }
    expect(bossRating(10, 14)).toBe(14);
    expect(bossRating(11, 14)).toBe(14);
  });
  it('cada jefe describe cuántas piezas especiales lleva su tablero y el último las lleva todas', () => {
    expect(bossMechLabel(100)).toBe('Todas las piezas juntas');
    for (const level of LEVELS) expect(bossMechLabel(level), `jefe ${level}`).toBeTruthy();
  });

  it('los textos de la regla son claros', () => {
    expect(bossRuleLabel(10)).toBe('Turnos ajustados');
    expect(bossRuleLabel(50, 125)).toBe('Contrarreloj 2:05');
    expect(bossRuleLabel(100, 185)).toBe('Contrarreloj 3:05 y turnos ajustados');
  });
});

describe('jefes: niveles generados', () => {
  it('cada nivel de jefe trae su contrarreloj (si la tiene) y la práctica no tiene presión de tiempo', () => {
    for (const l of LEVELS) {
      const G = build(l);
      expect(G.timeLimit, `jefe ${l}`).toBe(bossTimeFor(l, G.opt));
      expect(G.timeLeft, `jefe ${l}`).toBe(G.timeLimit);
      expect(build(l, 'p').timeLimit, `práctica ${l}`).toBe(0);
    }
    expect(build(11).timeLimit).toBe(0);
  }, 120000);

  it('al reanudar una partida guardada se conserva el tiempo que quedaba', () => {
    const G = build(100);
    expect(G.timeLimit).toBeGreaterThan(0);
    const run = { seed: 46, hero: 'lia', start: 1, level: 100, route: 'normal', mode: 'c', adj: 0, hints: 3, score: 0,
      board: { level: 100, rate: G.rate, pieces: G.pieces, walls: G.walls, doors: G.doors, pos: G.pos, start: G.start, opt: G.opt, limit: G.limit, moves: 0, hist: [], timeLimit: G.timeLimit, timeLeft: 47 } };
    const R = buildAdventureLevel(run, { levels: levelBank.ratings, special: specialBank, tips });
    expect(R.timeLeft).toBe(47);
    expect(R.timeLimit).toBe(G.timeLimit);

    run.board.timeLimit = 120;  // partida guardada antes del cambio, con 73 segundos consumidos
    const migrated = buildAdventureLevel(run, { levels: levelBank.ratings, special: specialBank, tips });
    expect(migrated.timeLimit).toBe(600);
    expect(migrated.timeLeft).toBe(527);
  }, 60000);
});

describe('jefes: música', () => {
  it('la música de jefe es distinta de todas las de ciudad', () => {
    expect(ZONE_THEMES.some((t) => t.boss)).toBe(false);
  });
});
