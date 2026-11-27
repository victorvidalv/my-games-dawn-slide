import { describe, it, expect } from 'vitest';
import {
  ACHIEVEMENTS,
  COUNTERS,
  CUSTOM_TYPES,
  DEFAULT_OUTFIT,
  OUTFITS,
  outfitUnlocked,
  revalidateUnlocks,
  unlockOutfits,
  RARITY_ORDER,
  UNLOCKS,
  unlockProgress,
  unlockRewards,
  RARITY,
  DEFAULT_LOOK,
  GROUPS,
  LEGACY_REWARDS,
  REWARDS,
  REWARD_TYPES,
  STATS,
  TIERS,
  claimAchievements,
  migrateAchievements,
  lookOf,
  rewardUnlocked,
  setLook,
  statsOf,
  adventureStartStats,
  boardWinStats,
  flagStat,
  isDone,
  rewardById,
  victoryStats,
} from '../src/game/achievements.js';
import { CHALLENGES } from '../src/game/daily.js';
import { HEROES } from '../src/game/heroes.js';
import { DICTS, loadAllDicts } from '../src/i18n.js';

await loadAllDicts();
import { bestAdventureRecord, mergePaths, mergeSaves } from '../src/game/save-merge.js';

describe('registro de logros y tienda', () => {
  it('113 logros (25 simples, 55 medios y 33 difíciles) en 5 grupos con estadística conocida y puntaje positivo', () => {
    expect(ACHIEVEMENTS).toHaveLength(113);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'bronze')).toHaveLength(25);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'silver')).toHaveLength(55);
    expect(ACHIEVEMENTS.filter((a) => a.tier === 'gold')).toHaveLength(33);
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
    // 20 por grupo de base y los 13 del roguelite repartidos (Aventura 6, Maestría 5, Desafío 1, Diario 1)
    expect(Object.fromEntries(groups.map((g) => [g, ACHIEVEMENTS.filter((a) => a.group === g).length]))).toEqual({
      adventure: 26,
      mastery: 25,
      challenge: 21,
      daily: 21,
      collection: 20,
    });
    // La tienda tiene 5 categorías, cada una con un elemento de serie gratis y premios con precio > 0
    expect(REWARD_TYPES).toEqual([
      'board',
      'pieces',
      'key',
      'fx',
      'music',
      'cover',
      'card',
      'bg',
      'trail',
      'aura',
      'ui',
    ]);
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

describe('Personalizar: objetos que se desbloquean por acciones', () => {
  it('cada categoría va de lo más común a lo más raro (el de serie primero) y los trajes también', () => {
    const rank = (r) => RARITY_ORDER.indexOf(r.rarity);
    for (const type of Object.keys(REWARDS)) {
      const list = REWARDS[type];
      expect(list[0].id, type).toBe(DEFAULT_LOOK[type]);
      for (let i = 1; i < list.length; i++)
        expect(rank(list[i]), `${type}:${list[i].id}`).toBeGreaterThanOrEqual(rank(list[i - 1]));
    }
    for (const [hero, list] of Object.entries(OUTFITS)) {
      expect(list[0].id, hero).toBe(DEFAULT_OUTFIT[hero]);
      for (let i = 1; i < list.length; i++)
        expect(rank(list[i]), `${hero}:${list[i].id}`).toBeGreaterThanOrEqual(rank(list[i - 1]));
      // los más raros piden más: el último de cada héroe es legendario
      expect(list.at(-1).rarity, hero).toBe('legendary');
    }
    // las animaciones propias son de épicas en adelante
    for (const type of Object.keys(REWARDS))
      for (const r of REWARDS[type].filter((x) => x.anim))
        expect(['epic', 'legendary'], `${type}:${r.id}`).toContain(r.rarity);
  });

  const custom = () => CUSTOM_TYPES.filter((t) => REWARDS[t]).flatMap((t) => REWARDS[t].slice(1).map((r) => [t, r]));

  it('categorías (tablero, fichas, llave, música, portada, fondo, atuendos) y cada objeto no inicial tiene su acción de desbloqueo', () => {
    expect(CUSTOM_TYPES).toEqual([
      'board',
      'pieces',
      'key',
      'card',
      'trail',
      'fx',
      'music',
      'cover',
      'bg',
      'aura',
      'ui',
      'outfit',
    ]);
    for (const [type, item] of custom()) {
      const u = UNLOCKS[`${type}:${item.id}`];
      expect(u, `${type}:${item.id}`).toBeTruthy();
      expect(STATS[u.stat], `${type}:${item.id}`).toBeTypeOf('function');
      expect(u.goal).toBeGreaterThan(0);
      expect(RARITY[item.rarity], `${type}:${item.id}`).toBeTruthy();
    }
    // Lo animado es siempre épico o legendario
    for (const [, item] of custom().filter(([, r]) => r.anim))
      expect(['epic', 'legendary'], item.id).toContain(item.rarity);
    // Cada atuendo es un conjunto por héroe: hoy solo el traje de serie
    expect(Object.keys(OUTFITS)).toEqual(HEROES.map((h) => h.id));
  });

  /** Primer objeto de una categoría que pide una sola condición y que se cumple con un contador simple. */
  const simple = (type) => {
    const id = REWARDS[type].slice(1).find((r) => {
      const u = UNLOCKS[`${type}:${r.id}`];
      return u.reqs.length === 1 && COUNTERS.includes(u.stat);
    }).id;
    return { id, u: UNLOCKS[`${type}:${id}`] };
  };

  it('al cumplir la acción el objeto queda desbloqueado solo (sin reclamar ni gastar) y una sola vez', () => {
    const { id, u } = simple('board');
    const store = { stats: { [u.stat]: u.goal - 1 } };
    expect(rewardUnlocked('board', id, store)).toBe(false);
    store.stats[u.stat] = u.goal;
    const fresh = unlockRewards(store, 100).map((f) => `${f.type}:${f.item.id}`);
    expect(fresh).toContain(`board:${id}`);
    expect(rewardUnlocked('board', id, store)).toBe(true);
    expect(store.shopOwned[`board:${id}`]).toBe(100);
    expect(unlockRewards(store, 101)).toEqual([]);
    expect(setLook(store, 'board', id)).toBe(true);
    expect(lookOf(store).board).toBe(id);
    const locked = REWARDS.board.at(-1).id;
    expect(setLook(store, 'board', locked)).toBe(false); // el último (legendario) sigue bloqueado
  });

  it('el avance se limita a la meta, los de serie cuentan como hechos y varias condiciones se miden todas', () => {
    const { id, u } = simple('pieces');
    const half = Math.floor(u.goal / 2);
    expect(unlockProgress('pieces', id, { stats: { [u.stat]: half } })).toMatchObject({
      value: half,
      goal: u.goal,
      done: false,
    });
    expect(unlockProgress('pieces', id, { stats: { [u.stat]: u.goal * 5 } })).toMatchObject({
      value: u.goal,
      done: true,
    });
    expect(unlockProgress('board', 'wood', {}).done).toBe(true); // de serie
    // Una legendaria pide tres condiciones a la vez: con una sola cumplida no basta
    const leg = REWARDS.board.at(-1).id;
    const reqs = UNLOCKS[`board:${leg}`].reqs;
    expect(reqs).toHaveLength(3);
    const saved = { ...STATS };
    try {
      for (const k of Object.keys(STATS)) STATS[k] = () => 0;
      STATS[reqs[0].stat] = () => reqs[0].goal;
      const p = unlockProgress('board', leg, {});
      expect(p.done).toBe(false);
      expect(p.reqs.filter((r) => r.done)).toHaveLength(1);
    } finally {
      Object.assign(STATS, saved);
    }
  });

  it('el plan de desbloqueos: ninguno trivial, todos los modos cuentan y lo complejo es de las legendarias', () => {
    const MODE_OF = (stat) =>
      ['challengeBoards', 'challengeBest', 'challengeWonCount'].includes(stat)
        ? 'desafio'
        : ['dailySolved', 'dailyGold', 'bestStreak', 'dailyKinds', 'masterSolved'].includes(stat)
          ? 'diario'
          : 'aventura';
    const WANT = { common: 1, rare: 1, epic: 2, legendary: 3 };
    const modes = new Set();
    let checked = 0;
    const SINGLE_REQ_OVERRIDES = new Set([
      'key:neon',
      'key:galaxy',
      'pieces:silk',
      'pieces:lava',
      'trail:starlight',
      'trail:comet',
      'outfit:lia:ingeniera',
      'outfit:lia:brasas',
      'outfit:jean:oni',
      'outfit:jean:sakura',
      'outfit:van:carmesi',
      'outfit:van:cuervos',
    ]);
    const check = (key, rarity) => {
      const u = UNLOCKS[key];
      expect(u, key).toBeTruthy();
      const expectedLen = SINGLE_REQ_OVERRIDES.has(key) ? 1 : WANT[rarity];
      expect(u.reqs, key).toHaveLength(expectedLen);
      for (const r of u.reqs) {
        expect(STATS[r.stat], `${key}: ${r.stat}`).toBeTypeOf('function');
        expect(r.goal, key).toBeGreaterThanOrEqual(1);
        // nada de metas triviales: los contadores piden al menos unas decenas de acciones o varios días
        if (
          COUNTERS.includes(r.stat) &&
          !['completed', 'pacts', 'cleanRun', 'oathWin', 'maxPactsWin', 'bestGrade'].includes(r.stat)
        )
          expect(r.goal, key).toBeGreaterThanOrEqual(6);
        modes.add(MODE_OF(r.stat));
      }
      // Las legendarias piden una condición de cada modo (salvo las simplificadas a una condición directa)
      if (rarity === 'legendary' && !SINGLE_REQ_OVERRIDES.has(key))
        expect(new Set(u.reqs.map((r) => MODE_OF(r.stat))).size, key).toBe(3);
      checked++;
    };
    for (const type of ['board', 'pieces', 'key', 'card', 'trail', 'fx', 'music', 'cover', 'bg', 'aura', 'ui'])
      for (const r of REWARDS[type].slice(1)) check(`${type}:${r.id}`, r.rarity);
    for (const [hero, list] of Object.entries(OUTFITS))
      for (const o of list.slice(1))
        check(
          `outfit:${hero}:${o.id}`,
          o.rarity === 'rare' && o.id === list.slice(1).find((x) => x.rarity === 'rare').id ? 'rare' : o.rarity,
        );
    expect([...modes].sort()).toEqual(['aventura', 'desafio', 'diario']);
    expect(checked).toBe(249);
  });

  it('cada traje pide jugar con SU héroe: no se abren los de un héroe que no usas', () => {
    const own = { lia: 'heroBoardsLia', jean: 'heroBoardsJean', van: 'heroBoardsVan' };
    for (const [hero, list] of Object.entries(OUTFITS))
      for (const o of list.slice(1)) {
        const stats = UNLOCKS[`outfit:${hero}:${o.id}`].reqs.map((r) => r.stat);
        // todos piden tableros con su héroe, o victoria en Normal / Difícil con él
        const suffix = own[hero].slice(10);
        expect(
          stats.includes(own[hero]) || stats.includes(`heroWin${suffix}`) || stats.includes(`heroHardWin${suffix}`),
          `${hero}:${o.id}`,
        ).toBe(true);
      }
    // mucho juego con Lía no abre ni un traje de Jean ni de Juth
    const store = { stats: { heroBoards_lia: 1000 } };
    const fresh = unlockOutfits(store);
    expect(fresh.length).toBeGreaterThan(0);
    expect(fresh.every((f) => f.hero === 'lia')).toBe(true);
    // y con un guardado vacío no se abre ninguno
    expect(unlockOutfits({})).toEqual([]);
  });

  it('lo abierto con reglas anteriores se cierra si ya no se cumple, salvo lo que ya existía', () => {
    const hard = OUTFITS.lia.at(-1).id;
    const store = {
      stats: {},
      outfitsOwned: { [`lia:${hard}`]: 1 },
      shopOwned: { [`board:${REWARDS.board.at(-1).id}`]: 1, 'board:slate': 1 },
    };
    expect(revalidateUnlocks(store)).toBe(true);
    expect(store.outfitsOwned).toEqual({});
    expect(store.shopOwned[`board:${REWARDS.board.at(-1).id}`]).toBeUndefined(); // nuevo y sin cumplir: se cierra
    expect(store.shopOwned['board:slate']).toBe(1); // existía antes (compra con puntos): se conserva
    expect(revalidateUnlocks(store)).toBe(false);
  });

  it('las máscaras de héroes ignoran bits fuera de los 3 héroes y revalidateUnlocks limpia heroHardWins contaminado', () => {
    // Bits >= 3 (p. ej. por el antiguo bug de cartas del destino) no cuentan como victorias de héroe
    expect(statsOf({ stats: { heroWins: 0b1111000, heroHardWins: 0b1111000 } })).toMatchObject({
      heroWinsCount: 0,
      heroHardWinsCount: 0,
    });
    expect(statsOf({ stats: { heroWins: 0b10101, heroHardWins: 0b11010 } })).toMatchObject({
      heroWinsCount: 2,
      heroHardWinsCount: 1,
    });

    // Sin victorias en Difícil/Experto: heroHardWins se limpia, los bits se preservan en fateSeen y se revocan los premios
    const polluted = {
      stats: { paths: [1], heroHardWins: 0b111 },
      shopOwned: { 'pieces:lava': 1 },
      outfitsOwned: { 'lia:brasas': 1, 'jean:sakura': 1, 'van:cuervos': 1 },
    };
    expect(revalidateUnlocks(polluted)).toBe(true);
    expect(polluted.stats.heroHardWins).toBe(0);
    expect(polluted.stats.fateSeen).toBe(0b111);
    expect(polluted.shopOwned['pieces:lava']).toBeUndefined();
    expect(polluted.outfitsOwned).toEqual({});

    // Con victoria en Difícil: solo se conservan los bits de los 3 héroes (0..2)
    const partial = {
      stats: { paths: [1, 50], heroHardWins: 0b11001, fateSeen: 0b10 },
      outfitsOwned: { 'lia:brasas': 1, 'jean:sakura': 1 },
    };
    expect(revalidateUnlocks(partial)).toBe(true);
    expect(partial.stats.heroHardWins).toBe(0b001);
    expect(partial.stats.fateSeen).toBe(0b11011);
    expect(partial.outfitsOwned).toEqual({ 'lia:brasas': 1 });
  });

  it('con todas las acciones cumplidas se desbloquea todo lo de Personalizar', () => {
    const saved = { ...STATS };
    try {
      for (const k of Object.keys(STATS)) STATS[k] = () => 1e6;
      const store = {};
      unlockRewards(store);
      const missing = [];
      for (const type of ['board', 'pieces', 'key', 'card', 'trail', 'fx', 'music', 'cover', 'bg', 'aura', 'ui'])
        for (const r of REWARDS[type].slice(1)) if (!rewardUnlocked(type, r.id, store)) missing.push(`${type}:${r.id}`);
      for (const [hero, list] of Object.entries(OUTFITS))
        for (const o of list.slice(1)) if (!outfitUnlocked(store, hero, o.id)) missing.push(`${hero}:${o.id}`);
      expect(missing).toEqual([]);
    } finally {
      Object.assign(STATS, saved);
    }
  });
});

describe('guardado compatible con actualizaciones', () => {
  it('los logros retirados por relleno conservan sus puntos como puntos heredados (una sola vez)', () => {
    const old = { ach: { lv5: 1, perf1: 2, city1: 3 }, achClaimed: { lv5: 4, boards10: 5 }, stats: { bosses: 2 } };
    expect(migrateAchievements(old)).toBe(true);
    expect(old.ach).toEqual({ city1: 3 });
    expect(old.achClaimed).toEqual({});
    expect(old.stats).toMatchObject({ legacyAchPoints: 10 + 10 + 15, fateCards: 2 });
    expect(migrateAchievements(old)).toBe(false);
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

describe('logros del roguelite: rangos, héroes, reliquias, cartas y retos combinados', () => {
  const reached = (store, id) =>
    isDone(
      ACHIEVEMENTS.find((a) => a.id === id),
      statsOf(store),
    );

  it('las máscaras cuentan reliquias, héroes y cartas distintas (repetir no suma)', () => {
    const store = {};
    adventureStartStats(store, { relic: 'sun' });
    adventureStartStats(store, { relic: 'sun' });
    expect(statsOf(store).relicsSeenCount).toBe(1);
    adventureStartStats(store, { relic: 'purse' });
    adventureStartStats(store, { relic: 'lantern' });
    expect(reached(store, 'relics3')).toBe(true);
    for (let i = 0; i < 30; i++) flagStat(store, 'fateSeen', i);
    expect(reached(store, 'fateAll')).toBe(false);
    flagStat(store, 'fateSeen', 30);
    expect(statsOf(store).fateSeenCount).toBe(31);
    expect(reached(store, 'fateAll')).toBe(true);
    expect(flagStat(store, 'fateSeen', 31), 'fuera de rango').toBe(false);
  });

  it('una victoria anota héroe, rango, Pactos, aventura sin pistas y Juramento', () => {
    const store = {};
    victoryStats(store, { hero: 'lia', grade: 'S', pacts: 2, oath: false, helped: true });
    expect(reached(store, 'gradeS')).toBe(true);
    expect(reached(store, 'gradeSPlus')).toBe(false);
    expect(reached(store, 'cleanRun')).toBe(false);
    expect(reached(store, 'pacts3win')).toBe(false);
    victoryStats(store, { hero: 'jean', grade: 'A', pacts: 3, oath: true, helped: false });
    expect(statsOf(store).bestGrade, 'el rango guarda el mejor').toBe(4);
    expect(reached(store, 'pacts3win')).toBe(true);
    expect(reached(store, 'oathWin')).toBe(true);
    expect(reached(store, 'cleanRun')).toBe(true);
    expect(reached(store, 'heroWins3')).toBe(false);
    victoryStats(store, { hero: 'van', grade: 'S+' });
    expect(reached(store, 'heroWins3')).toBe(true);
    expect(reached(store, 'gradeSPlus')).toBe(true);
  });

  it('un tablero suma Brasa intacta y marca el tope de puntos de las cartas', () => {
    const store = {};
    for (let i = 0; i < 24; i++) boardWinStats(store, { ember: true });
    expect(reached(store, 'ember25')).toBe(false);
    boardWinStats(store, { ember: true, capped: true });
    expect(reached(store, 'ember25')).toBe(true);
    expect(reached(store, 'fateCap')).toBe(true);
  });

  it('los nuevos objetos animados de Canjear son épicos o legendarios y la Llave lunar es rara', () => {
    const ids = (type) => REWARDS[type].map((r) => r.id);
    expect(ids('board')).toEqual(expect.arrayContaining(['tide', 'sakura', 'dawnfire']));
    expect(ids('pieces')).toEqual(expect.arrayContaining(['frostedge', 'neon', 'ember']));
    expect(ids('key')).toEqual(expect.arrayContaining(['moon', 'phoenix', 'eclipse']));
    expect(rewardById('key', 'moon').rarity).toBe('rare');
    for (const [type, id] of [
      ['board', 'dawnfire'],
      ['pieces', 'ember'],
      ['key', 'eclipse'],
    ])
      expect(rewardById(type, id)).toMatchObject({ rarity: 'legendary', anim: true });
  });
});

describe('Personalizar: estelas, celebración, clima y tema de interfaz', () => {
  it('estelas y celebraciones tienen 15 elementos cada una, con sus colores de partículas', () => {
    expect(REWARDS.trail).toHaveLength(15);
    expect(REWARDS.fx).toHaveLength(15);
    for (const r of REWARDS.trail.slice(1)) expect(r.colors?.length, `trail:${r.id}`).toBeGreaterThanOrEqual(3);
    for (const r of REWARDS.fx.slice(1)) expect(r.burst.colors.length, `fx:${r.id}`).toBeGreaterThanOrEqual(3);
    // las diez celebraciones de antes siguen en su orden (el código QR las lee por posición)
    expect(LEGACY_REWARDS.fx).toHaveLength(10);
  });

  it('clima (aura) y tema de interfaz: de serie «sin clima» y «Tinta clásica», y se desbloquean por acciones', () => {
    expect(DEFAULT_LOOK).toMatchObject({ trail: 'none', aura: 'none', ui: 'ink' });
    expect(REWARDS.aura.map((r) => r.id)).toEqual(
      expect.arrayContaining(['fireflies', 'snow', 'petals', 'ash', 'drizzle', 'meteors']),
    );
    expect(REWARDS.ui.map((r) => r.id)).toEqual(expect.arrayContaining(['ink', 'thyes', 'crimson', 'faro', 'neon']));
    for (const type of ['trail', 'fx', 'aura', 'ui'])
      for (const r of REWARDS[type].slice(1)) expect(UNLOCKS[`${type}:${r.id}`], `${type}:${r.id}`).toBeTruthy();
  });

  it('un objeto nuevo solo se equipa si está desbloqueado', () => {
    const store = { shopOwned: { 'trail:comet': 1 } };
    expect(setLook(store, 'trail', 'phoenix')).toBe(false);
    expect(setLook(store, 'trail', 'comet')).toBe(true);
    expect(lookOf(store).trail).toBe('comet');
    expect(setLook(store, 'ui', 'neon')).toBe(false);
    expect(lookOf({ look: { aura: 'snow' } }).aura).toBe('none');
  });
});
