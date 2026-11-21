import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  COLLECTIONS,
  MILESTONES,
  RARITY,
  RARITY_ORDER,
  collectAllAchievements,
  migrateShop,
  nearAchievements,
  openMilestone,
  readyMilestones,
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
  migrateAchievements,
  lookOf,
  markStat,
  rewardUnlocked,
  setLook,
  spentPoints,
  statsOf,
  unclaimedAchievements,
} from '../src/game/achievements.js';
import { CHALLENGES } from '../src/game/daily.js';
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
    expect(goal('mini9')).toBe(8);
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
    const store = { paths: { c1: { level: 10 } }, stats: { boardsSolved: 1 } };
    const fresh = claimAchievements(store, 100);
    expect(fresh.map((a) => a.id)).toEqual(['firstWin', 'city1', 'lv25']);
    // Aún no reclamados: saldo en 0 y 3 pendientes
    expect(unclaimedAchievements(store)).toHaveLength(3);
    expect(achBalance(store)).toBe(0);

    // Reclamar uno a uno suma sus puntos
    const r1 = collectAchievement(store, 'firstWin', 200);
    expect(r1).toMatchObject({ points: 10, balance: 10 });
    expect(collectAchievement(store, 'firstWin', 201)).toBeNull(); // no se puede cobrar dos veces
    collectAchievement(store, 'city1', 203);
    collectAchievement(store, 'lv25', 205);
    expect(unclaimedAchievements(store)).toHaveLength(0);
    expect(earnedPoints(store)).toBe(50);
    expect(achBalance(store)).toBe(50);

    // No alcanza para un objeto de 85 pts
    expect(buyShopItem(store, 'board', 'celestial', 300)).toEqual({ ok: false, reason: 'funds' });
    // Sí alcanza para Pizarra nocturna (30 pts)
    const bought = buyShopItem(store, 'board', 'slate', 301);
    expect(bought).toMatchObject({ ok: true, balance: 20 });
    expect(spentPoints(store)).toBe(30);
    expect(rewardUnlocked('board', 'slate', store)).toBe(true);
    expect(lookOf(store).board).toBe('slate');
    // Canjear el primer objeto desbloquea el logro cosmetic1 (pendiente de reclamar)
    expect(unclaimedAchievements(store).map((a) => a.id)).toEqual(['cosmetic1']);
    expect(setLook(store, 'board', 'wood')).toBe(true);
    expect(setLook(store, 'board', 'obsidian')).toBe(false);
  });
});

describe('economía equilibrada: rarezas, cofres y precios justos', () => {
  const all = () => REWARD_TYPES.flatMap((t) => REWARDS[t].slice(1).map((r) => ({ ...r, type: t })));

  it('cada objeto tiene rareza y lo más vistoso cuesta más: común < rara < épica < legendaria', () => {
    for (const r of all()) expect(RARITY[r.rarity], `${r.type}:${r.id}`).toBeTruthy();
    for (const type of REWARD_TYPES) {
      const by = (rar) =>
        REWARDS[type]
          .slice(1)
          .filter((r) => r.rarity === rar)
          .map((r) => r.price);
      for (let i = 1; i < RARITY_ORDER.length; i++) {
        const lower = by(RARITY_ORDER[i - 1]),
          higher = by(RARITY_ORDER[i]);
        if (lower.length && higher.length) expect(Math.min(...higher), type).toBeGreaterThan(Math.max(...lower) - 1);
      }
    }
    // Lo animado es siempre épico o legendario
    for (const r of all().filter((x) => x.anim)) expect(['epic', 'legendary'], r.id).toContain(r.rarity);
  });

  it('con todos los logros y cofres se puede canjear todo el catálogo, pero solo con dedicación (≥ 85 %)', () => {
    const earn = ACHIEVEMENTS.reduce((s, a) => s + a.points, 0) + MILESTONES.reduce((s, m) => s + m.points, 0);
    const cost = all().reduce((s, r) => s + r.price, 0);
    expect(cost).toBeLessThanOrEqual(earn);
    expect(cost / earn).toBeGreaterThan(0.85);
    // Los logros simples alcanzan para varios objetos comunes desde la primera sesión
    const bronze = ACHIEVEMENTS.filter((a) => a.tier === 'bronze').reduce((s, a) => s + a.points, 0);
    const commons = all()
      .filter((r) => r.rarity === 'common')
      .map((r) => r.price);
    expect(bronze).toBeGreaterThan(Math.min(...commons) * 8);
  });

  it('los cofres se abren al reclamar 5, 15, 30… logros y suman sus puntos una sola vez', () => {
    const store = { ach: {}, achClaimed: {} };
    ACHIEVEMENTS.slice(0, 16).forEach((a, i) => (store.ach[a.id] = i + 1));
    expect(readyMilestones(store)).toEqual([]); // cumplidos pero sin reclamar: aún no cuentan
    const res = collectAllAchievements(store, 50);
    expect(res.achievements).toHaveLength(16);
    expect(readyMilestones(store).map((m) => m.n)).toEqual([5, 15]);
    const before = achBalance(store);
    expect(openMilestone(store, 5, 60)).toMatchObject({ points: 25, balance: before + 25 });
    expect(openMilestone(store, 5, 61)).toBeNull();
    expect(openMilestone(store, 30, 62)).toBeNull(); // aún no alcanzado
    expect(readyMilestones(store).map((m) => m.n)).toEqual([15]);
  });

  it('los canjes anteriores al reajuste se cuentan a su precio de entonces (nadie pierde saldo)', () => {
    const store = {
      achClaimed: { firstWin: 1, lv5: 1, city1: 1, lv20: 1, lv25: 1 },
      shopOwned: { 'board:celestial': 1 }, // costaba 85; ahora es legendaria
    };
    expect(migrateShop(store)).toBe(true);
    expect(spentPoints(store)).toBe(85);
    expect(migrateShop(store)).toBe(false); // una sola vez
    // Lo que se canjea después paga el precio nuevo
    store.achClaimed.lv100 = 1;
    store.achClaimed.done = 1;
    store.achClaimed.hard100 = 1;
    store.achClaimed.expert = 1;
    store.achClaimed.paths3 = 1;
    const bal = achBalance(store);
    expect(buyShopItem(store, 'key', 'gold', 5)).toMatchObject({ ok: true, balance: bal - 280 });
    expect(store.shopPaid['key:gold']).toBe(280);
  });

  it('«Casi lo tienes» propone los logros pendientes con más avance', () => {
    const store = { stats: { perfects: 22, boardsSolved: 45 }, paths: { c1: { level: 4 } } };
    claimAchievements(store, 1);
    const near = nearAchievements(store, 3).map((a) => a.id);
    expect(near).toHaveLength(3);
    expect(near).toContain('perf5'); // 22 de 25 perfectos
    expect(near).toContain('boards50'); // 45 de 50 tableros
    for (const id of near) expect(store.ach[id]).toBeUndefined();
  });
});

describe('estadísticas', () => {
  it('contadores y colecciones se guardan en store.stats y se rechazan nombres desconocidos', () => {
    const store = {};
    bumpStat(store, 'fateCards');
    bumpStat(store, 'fateCards', 2);
    expect(markStat(store, 'heroes', 'lia')).toBe(true);
    expect(markStat(store, 'heroes', 'lia')).toBe(false);
    markStat(store, 'heroes', 'jean');
    expect(statsOf(store)).toMatchObject({ fateCards: 3, heroes: 2 });
    expect(() => bumpStat(store, 'nope')).toThrow();
    expect(() => markStat(store, 'perfects', 'x')).toThrow();
    expect(COUNTERS.some((c) => COLLECTIONS.includes(c))).toBe(false);
  });

  it('un tablero resuelto suma tableros, perfectos, mecánicas y ciudad sin ayuda', () => {
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
    const last = { ...plain, n: 6 };
    expect(boardStats(last, { firstLevel: 1, helpAt: 0 })).toEqual(['boardsSolved', 'cleanCity']);
    expect(boardStats(last, { firstLevel: 1, helpAt: 5 })).toEqual(['boardsSolved']);
    expect(boardStats(last, { firstLevel: 1, helpAt: 3 })).toEqual(['boardsSolved', 'cleanCity']);
    expect(boardStats(last, { firstLevel: 5 })).toEqual(['boardsSolved']);
  });

  it('caminos y retos diarios se leen de lo que ya guarda el juego', () => {
    const store = { paths: { c50: { level: 51 } }, stats: { paths: [75] }, daily: { by: { classic: 2, frost: 1 } } };
    expect(statsOf(store)).toMatchObject({ hardLevel: 51, expertDone: 1, paths: 1, dailyKinds: 2 });
    expect(claimAchievements(store).map((a) => a.id)).toEqual(expect.arrayContaining(['hard50', 'expert', 'lv50']));
  });
});

describe('guardado compatible con actualizaciones', () => {
  it('los logros retirados por relleno conservan sus puntos como puntos heredados (una sola vez)', () => {
    const old = { ach: { lv5: 1, perf1: 2, city1: 3 }, achClaimed: { lv5: 4, boards10: 5 }, stats: { bosses: 2 } };
    expect(migrateAchievements(old)).toBe(true);
    expect(old.ach).toEqual({ city1: 3 });
    expect(old.achClaimed).toEqual({});
    expect(old.stats).toMatchObject({ legacyAchPoints: 10 + 10 + 15, fateCards: 2 });
    expect(earnedPoints(old)).toBe(35);
    expect(migrateAchievements(old)).toBe(false);
    expect(earnedPoints(old)).toBe(35);
  });

  it('una primera partida no llena de logros de relleno: llegar al 9 de Normal da solo unos pocos', () => {
    const store = {
      paths: { c1: { level: 9, score: 9000 } },
      stats: {
        boardsSolved: 8,
        perfects: 5,
        iceRock: 2,
        locks: 0,
        heavyBoards: 2,
        powersUsed: 5,
        fateCards: 2,
        cleanCity: 1,
      },
    };
    expect(claimAchievements(store, 1).length).toBeLessThanOrEqual(6);
  });

  it('un guardado antiguo (sin stats ni logros nuevos) se lee sin errores y los logros cumplidos se conceden', () => {
    const old = {
      best: { score: 0, level: 0 },
      paths: { c1: { score: 900, level: 10, runs: 2 } },
      stats: { perfects: 12 },
      ach: { city1: 5 },
    };
    expect(() => statsOf(old)).not.toThrow();
    expect(claimAchievements(old, 9).map((a) => a.id)).toEqual(['lv25']);
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
      stats: { perfects: 2, fateCards: 1, heroes: ['jean'] },
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
    expect(mergeSaves({ shopPaid: { 'key:gold': 280 }, shopEco: 2 }, { achMilestones: { 5: 9 } })).toMatchObject({
      shopPaid: { 'key:gold': 280 },
      achMilestones: { 5: 9 },
      shopEco: 2,
    });
    expect(m.stats).toEqual({ perfects: 30, fateCards: 1, heroes: ['jean', 'lia', 'van'] });
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
