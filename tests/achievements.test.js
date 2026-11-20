import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  COLLECTIONS,
  COUNTERS,
  DEFAULT_LOOK,
  GROUPS,
  REWARDS,
  REWARD_TYPES,
  STATS,
  TIERS,
  achBalance,
  boardStats,
  bumpStat,
  buyShopItem,
  claimAchievements,
  collectAchievement,
  earnedPoints,
  lookOf,
  markStat,
  rewardUnlocked,
  setLook,
  spentPoints,
  statsOf,
  unclaimedAchievements,
} from '../src/game/achievements.js';
import { CHALLENGES } from '../src/game/daily.js';
import { BONUS_KINDS } from '../src/game/minigames.js';
import { HEROES } from '../src/game/heroes.js';
import { DICTS } from '../src/i18n.js';
import { bestAdventureRecord, mergePaths, mergeSaves } from '../src/game/save-merge.js';

describe('registro de logros y tienda', () => {
  it('cien logros (25 simples, 50 medios y 25 difíciles) en 5 grupos con estadística conocida y puntaje positivo', () => {
    expect(ACHIEVEMENTS).toHaveLength(100);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'bronze')).toHaveLength(25);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'silver')).toHaveLength(50);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'gold')).toHaveLength(25);
    const groups = GROUPS.map((g) => g.id);
    const ids = new Set();
    for (const a of ACHIEVEMENTS) {
      expect(ids.has(a.id), a.id).toBe(false);
      ids.add(a.id);
      expect(STATS[a.stat], a.id).toBeTypeOf('function');
      expect(groups, a.id).toContain(a.group);
      expect(TIERS[a.tier], a.id).toBeTruthy();
      expect(a.points, a.id).toBeGreaterThan(0);
    }
    for (const g of groups) expect(ACHIEVEMENTS.filter((a) => a.group === g).length, g).toBe(20);
    // La tienda tiene 5 categorías, cada una con un elemento de serie gratis y premios con precio > 0
    expect(REWARD_TYPES).toEqual(['board', 'pieces', 'key', 'fx', 'music', 'cover']);
    let buyable = 0;
    for (const type of REWARD_TYPES) {
      expect(REWARDS[type][0].id).toBe(DEFAULT_LOOK[type]);
      expect(REWARDS[type][0].price).toBe(0);
      for (const item of REWARDS[type].slice(1)) {
        expect(item.price, `${type}:${item.id}`).toBeGreaterThan(0);
        buyable++;
      }
    }
    expect(buyable).toBeGreaterThanOrEqual(45);
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

  it('todos los textos de logros, niveles y premios están traducidos', () => {
    const texts = [
      ...ACHIEVEMENTS.flatMap((a) => [a.name, a.desc]),
      ...GROUPS.map((g) => g.name),
      ...Object.values(TIERS).map((t) => t.name),
      ...REWARD_TYPES.flatMap((t) => REWARDS[t].map((r) => r.name)),
    ];
    for (const [lang, dict] of Object.entries(DICTS))
      for (const t of texts) expect(dict[t], `${lang}: ${t}`).toBeTruthy();
  });
});

describe('economía de logros y canje', () => {
  it('un logro cumplido queda pendiente hasta reclamarlo, suma puntos y permite canjear en la Tienda', () => {
    const store = { paths: { c1: { level: 30 } }, stats: { boardsSolved: 1 } };
    const fresh = claimAchievements(store, 100);
    expect(fresh.map((a) => a.id)).toEqual(['firstWin', 'lv5', 'city1', 'lv20', 'lv25']);
    // Aún no reclamados: saldo en 0 y 5 pendientes
    expect(unclaimedAchievements(store)).toHaveLength(5);
    expect(achBalance(store)).toBe(0);

    // Reclamar uno a uno suma sus puntos
    const r1 = collectAchievement(store, 'firstWin', 200);
    expect(r1).toMatchObject({ points: 10, balance: 10 });
    expect(collectAchievement(store, 'firstWin', 201)).toBeNull(); // no se puede cobrar dos veces
    collectAchievement(store, 'lv5', 202);
    collectAchievement(store, 'city1', 203);
    collectAchievement(store, 'lv20', 204);
    collectAchievement(store, 'lv25', 205);
    expect(unclaimedAchievements(store)).toHaveLength(0);
    expect(earnedPoints(store)).toBe(75);
    expect(achBalance(store)).toBe(75);

    // No alcanza para un objeto de 85 pts
    expect(buyShopItem(store, 'board', 'celestial', 300)).toEqual({ ok: false, reason: 'funds' });
    // Sí alcanza para Pizarra nocturna (30 pts)
    const bought = buyShopItem(store, 'board', 'slate', 301);
    expect(bought).toMatchObject({ ok: true, balance: 45 });
    expect(spentPoints(store)).toBe(30);
    expect(rewardUnlocked('board', 'slate', store)).toBe(true);
    expect(lookOf(store).board).toBe('slate');
    // Canjear el primer objeto desbloquea el logro cosmetic1 (pendiente de reclamar)
    expect(unclaimedAchievements(store).map((a) => a.id)).toEqual(['cosmetic1']);
    expect(setLook(store, 'board', 'wood')).toBe(true);
    expect(setLook(store, 'board', 'obsidian')).toBe(false);
  });
});

describe('estadísticas', () => {
  it('contadores y colecciones se guardan en store.stats y se rechazan nombres desconocidos', () => {
    const store = {};
    bumpStat(store, 'bosses');
    bumpStat(store, 'bosses', 2);
    expect(markStat(store, 'heroes', 'lia')).toBe(true);
    expect(markStat(store, 'heroes', 'lia')).toBe(false);
    markStat(store, 'heroes', 'jean');
    expect(statsOf(store)).toMatchObject({ bosses: 3, heroes: 2 });
    expect(() => bumpStat(store, 'nope')).toThrow();
    expect(() => markStat(store, 'perfects', 'x')).toThrow();
    expect(COUNTERS.some((c) => COLLECTIONS.includes(c))).toBe(false);
  });

  it('un tablero resuelto suma tableros, perfectos, mecánicas, jefes y ciudad sin ayuda', () => {
    const plain = { n: 3, moves: 9, opt: 8, pieces: [{}], walls: [] };
    expect(boardStats(plain)).toEqual(['boardsSolved']);
    expect(boardStats({ ...plain, moves: 8 })).toEqual(['boardsSolved', 'perfects']);
    expect(boardStats({ ...plain, walls: [[1, 1]] })).toEqual(['boardsSolved', 'iceRock']);
    expect(boardStats({ ...plain, pieces: [{}, { kind: 'ice' }, { kind: 'gate' }, { kind: 'heavy' }] })).toEqual([
      'boardsSolved',
      'iceRock',
      'locks',
      'heavyBoards',
    ]);
    const boss = { ...plain, n: 20, plan: { boss: true } };
    expect(boardStats(boss, { firstLevel: 1, helpAt: 0 })).toEqual(['boardsSolved', 'bosses', 'cleanCity']);
    expect(boardStats(boss, { firstLevel: 1, helpAt: 14 })).toEqual(['boardsSolved', 'bosses']);
    expect(boardStats(boss, { firstLevel: 1, helpAt: 10 })).toEqual(['boardsSolved', 'bosses', 'cleanCity']);
    expect(boardStats(boss, { firstLevel: 15 })).toEqual(['boardsSolved', 'bosses']);
  });

  it('caminos y retos diarios se leen de lo que ya guarda el juego', () => {
    const store = { paths: { c50: { level: 51 } }, stats: { paths: [75] }, daily: { by: { classic: 2, frost: 1 } } };
    expect(statsOf(store)).toMatchObject({ hardLevel: 51, expertDone: 1, paths: 1, dailyKinds: 2 });
    expect(claimAchievements(store).map((a) => a.id)).toEqual(expect.arrayContaining(['hard50', 'expert', 'lv50']));
  });
});

describe('guardado compatible con actualizaciones', () => {
  it('un guardado antiguo (sin stats ni logros nuevos) se lee sin errores y los logros cumplidos se conceden', () => {
    const old = {
      best: { score: 0, level: 0 },
      paths: { c1: { score: 900, level: 30, runs: 2 } },
      stats: { perfects: 12 },
      ach: { city1: 5 },
    };
    expect(() => statsOf(old)).not.toThrow();
    expect(claimAchievements(old, 9).map((a) => a.id)).toEqual(['lv5', 'lv20', 'lv25', 'perf1', 'perf5', 'perf10']);
    expect(old.ach.city1).toBe(5);
  });

  it('al unir dos guardados (pestaña vieja y nueva) ningún avance, reclamo ni compra se pierde', () => {
    const disk = {
      paths: { c1: { score: 500, level: 40, runs: 3 } },
      ach: { city1: 10, lv25: 20 },
      achClaimed: { city1: 12 },
      shopOwned: { 'key:amber': 50 },
      stats: { perfects: 30, heroes: ['lia', 'van'] },
      daily: {
        solved: 9,
        gold: 4,
        best: 6,
        streak: 6,
        last: 100,
        by: { classic: 9 },
        days: { 100: { classic: { moves: 10, opt: 10, medal: 'gold' } } },
      },
    };
    const mine = {
      run: { level: 3 },
      look: { key: 'amber' },
      paths: { c1: { score: 700, level: 12, runs: 1 }, c50: { score: 10, level: 2, runs: 0 } },
      ach: { city1: 15, day1: 30 },
      achClaimed: { day1: 35 },
      shopOwned: { 'board:slate': 60 },
      stats: { perfects: 2, bosses: 1, heroes: ['jean'] },
      daily: {
        solved: 1,
        gold: 0,
        best: 1,
        streak: 1,
        last: 90,
        by: { frost: 1 },
        days: { 100: { classic: { moves: 12, opt: 10, medal: 'silver' } } },
      },
    };
    const m = mergeSaves(mine, disk);
    expect(m.paths.c1).toEqual({ score: 700, level: 40, runs: 3 });
    expect(m.ach).toEqual({ city1: 10, lv25: 20, day1: 30 });
    expect(m.achClaimed).toEqual({ city1: 12, day1: 35 });
    expect(m.shopOwned).toEqual({ 'key:amber': 50, 'board:slate': 60 });
    expect(m.stats).toEqual({ perfects: 30, bosses: 1, heroes: ['jean', 'lia', 'van'] });
  });
});

it('el récord de Aventura mantiene su fecha al combinar guardados y caminos', () => {
  const first = { c1: { score: 2400, level: 10, recordAt: 1000 } };
  const second = { c1: { score: 3500, level: 8, recordAt: 2000 }, c50: { score: 3400, level: 11, recordAt: 700 } };
  const merged = mergePaths(first, second);
  expect(merged.c1).toMatchObject({ score: 3500, level: 10, recordAt: 2000 });
  expect(bestAdventureRecord(merged)).toEqual({ score: 3500, recordAt: 2000 });
  expect(bestAdventureRecord(mergePaths(merged, { c1: { score: 3600 } }))).toEqual({ score: 3600, recordAt: null });
  expect(bestAdventureRecord({ c1: { score: 3500, recordAt: 2000 }, c75: { score: 3500, recordAt: 1500 } })).toEqual({
    score: 3500,
    recordAt: 1500,
  });
  expect(bestAdventureRecord({ p1: { score: 4000 }, c1: { score: 0 } })).toBeNull();
});
