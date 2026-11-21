import { describe, it, expect, beforeAll } from 'vitest';
import bank from '../src/data/levels.json';
import special from '../src/data/special.json';
import {
  CHALLENGES,
  buildDaily,
  challengeById,
  challengeTargets,
  currentStreak,
  dailyProgress,
  dayNumber,
  emptyDaily,
  isUnlocked,
  maxLevelReached,
  medalFor,
  msToReset,
  recordDaily,
  resetText,
  shareText,
  streakHintBonus,
  todayFamily,
  todayResult,
  writeDailyProgress,
} from '../src/game/daily.js';
import {
  ACHIEVEMENTS,
  DEFAULT_LOOK,
  REWARDS,
  REWARD_TYPES,
  claimAchievements,
  isDone,
  lookOf,
  progressOf,
  rewardUnlocked,
  setLook,
  statsOf,
} from '../src/game/achievements.js';
import { mergeSaves } from '../src/game/save-merge.js';
import { resultRating } from '../src/engine/scoring.js';
import { isValidState, minMoves } from '../src/engine/index.js';

const banks = { levels: bank.ratings, special };

describe('retos diarios: calendario y desbloqueo', () => {
  it('cinco retos: el Clásico siempre abierto y los demás al llegar al nivel 10, 13, 18 y 21 en Aventura', () => {
    expect(CHALLENGES.map((c) => [c.id, c.name, c.unlock])).toEqual([
      ['classic', 'Clásico', 0],
      ['rocks', 'Rocas', 10],
      ['frost', 'Hielo', 13],
      ['gears', 'Mecanismos', 18],
      ['all', 'Todo junto', 21],
    ]);
    expect(CHALLENGES.map((c) => isUnlocked(c, 0))).toEqual([true, false, false, false, false]);
    for (const c of CHALLENGES.slice(1)) {
      expect(isUnlocked(c, c.unlock - 1), c.id).toBe(false);
      expect(isUnlocked(c, c.unlock), c.id).toBe(true);
    }
    expect(maxLevelReached({ c1: { level: 12 }, c50: { level: 18 }, c75: {} })).toBe(18); // cuenta cualquier camino
    expect(maxLevelReached({})).toBe(0);
    expect(challengeById('nope').id).toBe('classic');
    for (const c of CHALLENGES) {
      expect(c.level).toBeGreaterThanOrEqual(1);
      expect(c.level).toBeLessThanOrEqual(21);
    }
  });
  it('el día cambia a la medianoche local y la cuenta atrás dice cuánto falta', () => {
    const a = new Date(2026, 10, 17, 23, 59, 30),
      b = new Date(2026, 10, 18, 0, 0, 5);
    expect(dayNumber(b)).toBe(dayNumber(a) + 1);
    expect(dayNumber(new Date(2026, 10, 17, 0, 0, 0))).toBe(dayNumber(a));
    expect(msToReset(a)).toBe(30000);
    expect(msToReset(new Date(2026, 10, 17, 18, 48, 0))).toBe((5 * 60 + 12) * 60000);
    expect(resetText((5 * 60 + 12) * 60000)).toBe('5 h 12 min');
    expect(resetText(48 * 60000 + 30000)).toBe('48 min');
    expect(resetText(20000)).toBe('menos de 1 min');
    expect(dayNumber(new Date(2027, 0, 1))).toBe(dayNumber(new Date(2026, 11, 31)) + 1); // cambio de año
  });
});

describe('retos diarios: el tablero del día', () => {
  const days = Array.from({ length: 6 }, (_, i) => 20770 + i * 7 + i);
  let built = [];
  beforeAll(() => {
    built = CHALLENGES.flatMap((c) =>
      days.flatMap((d) => challengeTargets(c).map((target, i) => ({ c, d, target, G: buildDaily(c, d, banks, i) }))),
    );
  }, 600000);

  it('es el mismo para todos (determinista por fecha) y distinto de un día a otro', () => {
    const c = CHALLENGES[0];
    expect(JSON.stringify(buildDaily(c, days[0], banks))).toBe(JSON.stringify(built[0].G));
    expect(
      new Set(built.filter((b) => b.c === c && b.target === 5).map((b) => JSON.stringify([b.G.pieces, b.G.pos]))).size,
    ).toBe(days.length);
  });
  it('todos tienen solución y el mínimo anunciado coincide con la curva escalonada de cada reto', () => {
    // Clásico 5·9·12 y cada reto siguiente un movimiento más en cada tablero
    expect(CHALLENGES.map((c) => challengeTargets(c))).toEqual([
      [5, 9, 12],
      [6, 10, 13],
      [7, 11, 14],
      [8, 12, 15],
      [9, 13, 16],
    ]);
    for (const { c, d, target, G } of built) {
      expect(isValidState(G.pieces, G.pos, G.walls), `${c.id} día ${d}`).toBe(true);
      expect(minMoves(G.pieces, G.pos, G.walls), `${c.id} día ${d}`).toBe(G.opt);
      expect(G.opt, `${c.id} día ${d}`).toBe(target);
      expect(G.limit, `${c.id} día ${d}`).toBeGreaterThanOrEqual(G.opt + 2);
      expect(G).toMatchObject({
        moves: 0,
        bought: 0,
        seal: null,
        tutorial: null,
        daily: c.id,
        n: c.level,
      });
      expect(G.plan.boss).toBeUndefined();
    }
  });
  it('cada reto trae las piezas que promete', () => {
    const kinds = (G) => new Set(G.pieces.map((p) => p.kind).filter(Boolean));
    for (const { c, d, G } of built) {
      const k = kinds(G),
        walls = G.walls.length > 0;
      if (c.id === 'classic') {
        expect(k.size, `clásico día ${d}`).toBe(0);
        expect(walls).toBe(false);
      }
      if (c.id === 'rocks') expect(walls, `rocas día ${d}`).toBe(true);
      if (c.id === 'frost') expect(k.has('ice'), `hielo día ${d}`).toBe(true);
      if (c.id === 'gears') expect(k.has('heavy') || k.has('lock') || k.has('gate'), `mecanismos día ${d}`).toBe(true);
      if (c.id === 'all') expect(k.size + (walls ? 1 : 0), `${c.id} día ${d}`).toBeGreaterThanOrEqual(3);
    }
  });
  it('Rocas y Hielo son retos separados, cada uno con su familia todos los días', () => {
    for (const day of [20800, 20801, 20802]) {
      expect(todayFamily(challengeById('rocks'), day)).toBe('walls');
      expect(todayFamily(challengeById('frost'), day)).toBe('ice');
    }
  });
});

describe('retos diarios: medallas y racha', () => {
  it('el premio de pistas usa solo el tramo vigente al iniciar la aventura', () => {
    expect([0, 2, 3, 4, 5, 6, 7, 10].map(streakHintBonus)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    const daily = { last: 100, streak: 7 };
    expect(streakHintBonus(currentStreak(daily, 101))).toBe(3);
    expect(streakHintBonus(currentStreak(daily, 102))).toBe(0);
  });

  it('oro en el mínimo, plata hasta un 15 % más (al menos 2) y bronce al resolver', () => {
    expect(medalFor(15, 15)).toBe('gold');
    expect(medalFor(14, 15)).toBe('gold');
    expect(medalFor(17, 15)).toBe('silver');
    expect(medalFor(18, 15)).toBe('silver'); // 15 % de 15 = 3
    expect(medalFor(19, 15)).toBe('bronze');
    expect(medalFor(40, 34)).toBe('silver');
    expect(medalFor(41, 34)).toBe('bronze');
  });
  it('la racha crece con cualquier reto, una vez por día, y se rompe al saltarse un día', () => {
    const s = emptyDaily();
    expect(currentStreak(s, 100)).toBe(0);
    expect(recordDaily(s, 'classic', 100, 20, 15)).toMatchObject({
      medal: 'bronze',
      first: true,
      streak: 1,
      streakUp: true,
    });
    expect(recordDaily(s, 'classic', 100, 15, 15)).toMatchObject({
      medal: 'gold',
      first: false,
      improved: true,
      streak: 1,
      streakUp: false,
    });
    expect(recordDaily(s, 'frost', 100, 25, 25)).toMatchObject({ streak: 1, streakUp: false });
    expect(recordDaily(s, 'gears', 101, 26, 25).streak).toBe(2);
    expect(recordDaily(s, 'classic', 102, 16, 15).streak).toBe(3);
    expect(currentStreak(s, 103)).toBe(3); // hoy aún no jugó: la racha sigue viva
    expect(currentStreak(s, 104)).toBe(0); // se saltó el 103
    expect(recordDaily(s, 'classic', 105, 16, 15).streak).toBe(1);
    expect(s.best).toBe(3);
    expect(s.solved).toBe(5);
    expect(s.gold).toBe(2);
  });
  it('se guarda la mejor marca del día y solo la última semana', () => {
    const s = emptyDaily();
    expect(recordDaily(s, 'frost', 200, 30, 20)).toMatchObject({ medal: 'bronze', streak: 1, streakUp: true });
    expect(recordDaily(s, 'frost', 200, 35, 20)).toMatchObject({ medal: 'bronze', improved: false }); // peor: no pisa la marca
    expect(todayResult(s, 'frost', 200)).toEqual({ moves: 30, opt: 20, medal: 'bronze' });
    expect(recordDaily(s, 'frost', 200, 20, 20).medal).toBe('gold');
    recordDaily(s, 'frost', 200, 20, 20);
    expect(s.gold).toBe(1); // el oro del mismo reto y día cuenta una vez
    expect(s.by.frost).toBe(1);
    expect(todayResult(s, 'frost', 201)).toBeNull();
    recordDaily(s, 'master', 210, 40, 36);
    expect(Object.keys(s.days)).toEqual(['210']);
    expect(shareText(challengeById('classic'), 210, { moves: 16, opt: 15 }, 4)).toBe(
      'DAWNSLIDE · Clásico #210 · 16/15 · 4',
    );
    expect(
      shareText(
        challengeById('classic'),
        210,
        {
          moves: 26,
          opt: 25,
          boards: [
            { moves: 5, opt: 5 },
            { moves: 9, opt: 8 },
            { moves: 12, opt: 12 },
          ],
        },
        4,
      ),
    ).toBe('DAWNSLIDE · Clásico #210 · 26/25 🥇🥈🥇 · 4');
  });
});

it('guarda el tablero en curso por reto, preserva la aventura y separa cada día', () => {
  const day = 21000;
  const save = { run: { level: 23 } };
  const boards = [{ moves: 6, opt: 5, points: 450 }, null, null];
  const attempt = { index: 1, pos: [1, 2], moves: 3, hist: [[0, 1]] };
  writeDailyProgress(save, { id: 'classic', day }, { boards, attempt });
  const otherTab = {};
  writeDailyProgress(otherTab, { id: 'gears', day }, { boards: [], attempt: null });
  const reopened = JSON.parse(JSON.stringify(mergeSaves(save, otherTab)));
  expect(reopened.run).toEqual({ level: 23 });
  expect(dailyProgress(reopened, 'classic', day)).toMatchObject({ boards, attempt });
  expect(dailyProgress(reopened, 'gears', day)).toMatchObject({ boards: [], attempt: null });
  expect(dailyProgress(reopened, 'classic', day + 1)).toBeUndefined();
});

it('el mensaje y la diferencia dependen de los movimientos que se podrían ahorrar', () => {
  expect([25, 26, 27, 28].map((moves) => resultRating(moves, 25))).toEqual([
    { title: 'PERFECTO', delta: '0' },
    { title: 'CASI', delta: '−1' },
    { title: 'CASI', delta: '−2' },
    { title: 'MEJORABLE', delta: '−3' },
  ]);
});

describe('logros y recompensas', () => {
  it('cada logro tiene meta y estadística válidas, y ninguna recompensa se repite', () => {
    const stats = statsOf({});
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.name)).size).toBe(ACHIEVEMENTS.length);
    const rewards = ACHIEVEMENTS.filter((a) => a.reward).map((a) => a.reward.join(':'));
    expect(new Set(rewards).size).toBe(rewards.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.stat in stats, a.id).toBe(true);
      expect(a.goal).toBeGreaterThan(0);
      expect(['adventure', 'mastery', 'challenge', 'daily', 'collection']).toContain(a.group);
      if (a.reward)
        expect(
          REWARDS[a.reward[0]].some((r) => r.id === a.reward[1]),
          a.id,
        ).toBe(true);
    }
    // toda recompensa que no es de serie tiene un precio positivo en la tienda Canjear
    for (const type of REWARD_TYPES)
      for (const r of REWARDS[type])
        if (DEFAULT_LOOK[type] !== r.id) expect(r.price, `${type}:${r.id}`).toBeGreaterThan(0);
    expect(ACHIEVEMENTS.filter((a) => a.group === 'daily').length).toBeGreaterThanOrEqual(5);
    expect(ACHIEVEMENTS.filter((a) => a.group === 'adventure').length).toBeGreaterThanOrEqual(8);
  });
  it('se ganan una sola vez, con progreso visible, y no se pierden', () => {
    const store = {
      paths: { c1: { level: 10 } },
      stats: { perfects: 4 },
      daily: { solved: 1, best: 2, gold: 0, by: {} },
    };
    const stats = statsOf(store);
    expect(stats).toMatchObject({ maxLevel: 10, perfects: 4, dailySolved: 1, bestStreak: 2 });
    const perf = ACHIEVEMENTS.find((a) => a.id === 'perf10');
    expect([progressOf(perf, stats), perf.goal, isDone(perf, stats)]).toEqual([4, 75, false]);
    expect(claimAchievements(store, 1).map((a) => a.id)).toEqual(['city1', 'lv25', 'day1', 'streak2']);
    expect(claimAchievements(store, 2)).toEqual([]); // ya anotados
    store.paths = {};
    expect(claimAchievements(store, 3)).toEqual([]);
    expect(store.ach.lv25).toBe(1); // sigue ganado
  });
  it('las recompensas se activan solo si están desbloqueadas y un aspecto guardado inválido vuelve al de serie', () => {
    const store = { shopOwned: { 'key:amber': 1 } };
    expect(lookOf(store)).toEqual(DEFAULT_LOOK);
    expect(rewardUnlocked('key', 'red', {})).toBe(true);
    expect(rewardUnlocked('key', 'amber', store)).toBe(true);
    expect(rewardUnlocked('key', 'gold', store)).toBe(false);
    expect(setLook(store, 'key', 'gold')).toBe(false);
    expect(setLook(store, 'key', 'amber')).toBe(true);
    expect(setLook(store, 'key', 'nope')).toBe(false);
    expect(setLook(store, 'nope', 'red')).toBe(false);
    expect(lookOf(store)).toEqual({ ...DEFAULT_LOOK, key: 'amber' });
    expect(lookOf({ look: { key: 'gold', music: 'z9', fx: 'zzz', pieces: 'glass' }, shopOwned: {} })).toEqual(
      DEFAULT_LOOK,
    );
    expect(REWARD_TYPES).toEqual(['board', 'pieces', 'key', 'fx', 'music', 'cover']);
    for (const type of REWARD_TYPES) expect(REWARDS[type][0].id).toBe(DEFAULT_LOOK[type]);
    expect(setLook(store, 'key', 'red')).toBe(true);
    expect(lookOf(store).key).toBe('red');
  });
});
