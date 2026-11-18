import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, COLLECTIONS, COUNTERS, GROUPS, REWARDS, REWARD_TYPES, STATS, boardStats, bumpStat, claimAchievements, markStat, statsOf } from '../src/game/achievements.js';
import { CHALLENGES } from '../src/game/daily.js';
import { BONUS_KINDS } from '../src/game/minigames.js';
import { HEROES } from '../src/game/heroes.js';
import { DICTS } from '../src/i18n.js';
import { bestAdventureRecord, mergePaths, mergeSaves } from '../src/game/save-merge.js';

describe('registro de logros', () => {
  it('treinta logros, cada uno con estadística conocida, grupo y una recompensa propia', () => {
    expect(ACHIEVEMENTS).toHaveLength(30);
    const groups = GROUPS.map((g) => g.id);
    for (const a of ACHIEVEMENTS) {
      expect(STATS[a.stat], a.id).toBeTypeOf('function');
      expect(groups, a.id).toContain(a.group);
      expect(a.reward, a.id).toBeTruthy();
    }
    for (const g of groups) expect(ACHIEVEMENTS.filter((a) => a.group === g).length, g).toBeGreaterThanOrEqual(8);
    // cada recompensa que no es de serie la da exactamente un logro
    for (const type of REWARD_TYPES) for (const r of REWARDS[type].slice(1)) expect(ACHIEVEMENTS.filter((a) => a.reward[0] === type && a.reward[1] === r.id).length, `${type}:${r.id}`).toBe(1);
  });
  it('las metas son alcanzables', () => {
    const goal = (id) => ACHIEVEMENTS.find((a) => a.id === id).goal;
    expect(goal('heroes')).toBe(HEROES.length);
    expect(goal('mini9')).toBe(BONUS_KINDS.length);
    expect(goal('kinds')).toBe(CHALLENGES.length);
  });
  it('cada celebración trae sus partículas', () => {
    for (const r of REWARDS.fx.slice(1)) expect(r.burst?.colors?.length, r.id).toBeGreaterThan(0);
  });
  it('todos los textos de logros y recompensas están traducidos', () => {
    const texts = [...ACHIEVEMENTS.flatMap((a) => [a.name, a.desc]), ...GROUPS.map((g) => g.name), ...REWARD_TYPES.flatMap((t) => REWARDS[t].map((r) => r.name))];
    for (const [lang, dict] of Object.entries(DICTS)) for (const t of texts) expect(dict[t], `${lang}: ${t}`).toBeTruthy();
  });
});

describe('estadísticas', () => {
  it('contadores y colecciones se guardan en store.stats y se rechazan nombres desconocidos', () => {
    const store = {};
    bumpStat(store, 'bosses'); bumpStat(store, 'bosses', 2);
    expect(markStat(store, 'heroes', 'lia')).toBe(true);
    expect(markStat(store, 'heroes', 'lia')).toBe(false);
    markStat(store, 'heroes', 'jean');
    expect(statsOf(store)).toMatchObject({ bosses: 3, heroes: 2 });
    expect(() => bumpStat(store, 'nope')).toThrow();
    expect(() => markStat(store, 'perfects', 'x')).toThrow();
    expect(COUNTERS.some((c) => COLLECTIONS.includes(c))).toBe(false);
  });
  it('un tablero resuelto suma perfectos, mecánicas, jefes y ciudad sin ayuda', () => {
    const plain = { n: 3, moves: 9, opt: 8, pieces: [{}], walls: [], doors: [] };
    expect(boardStats(plain)).toEqual([]);
    expect(boardStats({ ...plain, moves: 8 })).toEqual(['perfects']);
    expect(boardStats({ ...plain, walls: [[1, 1]] })).toEqual(['iceRock']);
    expect(boardStats({ ...plain, pieces: [{}, { kind: 'ice' }, { kind: 'gate' }] })).toEqual(['iceRock', 'locks']);
    expect(boardStats({ ...plain, doors: [[0, 2, 1]] })).toEqual(['locks']);
    const boss = { ...plain, n: 20, plan: { boss: true } };
    expect(boardStats(boss, { firstLevel: 1, helpAt: 0 })).toEqual(['bosses', 'cleanCity']);
    expect(boardStats(boss, { firstLevel: 1, helpAt: 14 })).toEqual(['bosses']);            // pista en esta ciudad
    expect(boardStats(boss, { firstLevel: 1, helpAt: 10 })).toEqual(['bosses', 'cleanCity']); // la pista fue en la ciudad anterior
    expect(boardStats(boss, { firstLevel: 15 })).toEqual(['bosses']);                          // no jugó la ciudad entera
    expect(boardStats(boss, {})).toEqual(['bosses']);                                          // partida antigua sin datos
  });
  it('caminos y retos diarios se leen de lo que ya guarda el juego', () => {
    const store = { paths: { c50: { level: 51 } }, stats: { paths: [75] }, daily: { by: { classic: 2, frost: 1 } } };
    expect(statsOf(store)).toMatchObject({ hardLevel: 51, expertDone: 1, paths: 1, dailyKinds: 2 });
    expect(claimAchievements(store).map((a) => a.id)).toEqual(expect.arrayContaining(['hard50', 'expert', 'lv50']));
  });
});

describe('guardado compatible con actualizaciones', () => {
  it('un guardado antiguo (sin stats ni logros nuevos) se lee sin errores y los logros cumplidos se conceden', () => {
    const old = { best: { score: 0, level: 0 }, paths: { c1: { score: 900, level: 30, runs: 2 } }, stats: { perfects: 12 }, ach: { city1: 5 } };
    expect(() => statsOf(old)).not.toThrow();
    expect(claimAchievements(old, 9).map((a) => a.id)).toEqual(['lv25', 'perf10']);
    expect(old.ach.city1).toBe(5);
  });
  it('al unir dos guardados (pestaña vieja y nueva) ningún avance se pierde', () => {
    const disk = {
      paths: { c1: { score: 500, level: 40, runs: 3 } }, ach: { city1: 10, lv25: 20 },
      stats: { perfects: 30, heroes: ['lia', 'van'] },
      daily: { solved: 9, gold: 4, best: 6, streak: 6, last: 100, by: { classic: 9 }, days: { 100: { classic: { moves: 10, opt: 10, medal: 'gold' } } } },
    };
    const mine = {
      run: { level: 3 }, look: { key: 'amber' },
      paths: { c1: { score: 700, level: 12, runs: 1 }, c50: { score: 10, level: 2, runs: 0 } }, ach: { city1: 15, day1: 30 },
      stats: { perfects: 2, bosses: 1, heroes: ['jean'] },
      daily: { solved: 1, gold: 0, best: 1, streak: 1, last: 90, by: { frost: 1 }, days: { 100: { classic: { moves: 12, opt: 10, medal: 'silver' } } } },
    };
    const m = mergeSaves(mine, disk);
    expect(m.paths.c1).toEqual({ score: 700, level: 40, runs: 3 });
    expect(m.paths.c50.level).toBe(2);
    expect(m.ach).toEqual({ city1: 10, lv25: 20, day1: 30 });
    expect(m.stats).toEqual({ perfects: 30, bosses: 1, heroes: ['jean', 'lia', 'van'] });
    expect(m.daily).toMatchObject({ solved: 9, gold: 4, best: 6, streak: 6, last: 100, by: { classic: 9, frost: 1 } });
    expect(m.daily.days[100].classic.medal).toBe('gold');
    expect(m.run).toEqual({ level: 3 });                                  // la partida y el aspecto son de esta pestaña
    expect(m.look).toEqual({ key: 'amber' });
    expect(mergeSaves(disk, {})).toMatchObject({ paths: disk.paths, ach: disk.ach, stats: disk.stats, daily: disk.daily });
    expect(mergeSaves({}, null).paths).toEqual({});
  });
});


it('el récord de Aventura mantiene su fecha al combinar guardados y caminos', () => {
  const first = { c1: { score: 2400, level: 10, recordAt: 1000 } };
  const second = { c1: { score: 3500, level: 8, recordAt: 2000 }, c50: { score: 3400, level: 11, recordAt: 700 } };
  const merged = mergePaths(first, second);
  expect(merged.c1).toMatchObject({ score: 3500, level: 10, recordAt: 2000 });
  expect(bestAdventureRecord(merged)).toEqual({ score: 3500, recordAt: 2000 });
  expect(bestAdventureRecord(mergePaths(merged, { c1: { score: 3600 } }))).toEqual({ score: 3600, recordAt: null });
  expect(bestAdventureRecord({ c1: { score: 3500, recordAt: 2000 }, c75: { score: 3500, recordAt: 1500 } })).toEqual({ score: 3500, recordAt: 1500 });
  expect(bestAdventureRecord({ p1: { score: 4000 }, c1: { score: 0 } })).toBeNull();
});
