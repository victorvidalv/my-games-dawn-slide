import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACHIEVEMENTS } from '../src/game/achievements.js';
import { dayNumber } from '../src/game/daily.js';
import { mergePaths } from '../src/game/save-merge.js';
import { exportSaveLink, readSaveHash, readSaveLink } from '../src/game/save-transfer.js';
import { QR_MAX_BYTES, qrMatrix } from '../src/qr.js';

const now = new Date('2026-11-18T10:00:00Z');
const recordAt = now.getTime();
const run = {
  mode: 'c',
  level: 14,
  hero: 'van',
  start: 75,
  seed: 2147483647,
  hints: 17,
  score: 123456,
  adj: 2,
  firstLevel: 1,
  helpAt: 13,
  streak: 4,
  revivesBought: 1,
  fate: ['brillo', 'juramento', 'respiro'],
  fatePicked: 3,
  fateCityPaid: 3,
};
const snapshot = {
  paths: {
    c1: { score: 600000, level: 21, runs: 4, recordAt },
    c50: { score: 4200000000, level: 18, runs: 320 },
    c75: { score: 123456, level: 14, runs: 1 },
  },
  ach: { perf10: recordAt, perf50: recordAt, lv50: recordAt, day7: recordAt, ch250: recordAt, cosmetic30: recordAt },
  achClaimed: { perf10: recordAt, lv50: recordAt, ch250: recordAt },
  shopOwned: {
    'board:celestial': recordAt,
    'music:s2': recordAt,
    'key:crystal': recordAt,
    'pieces:brass': recordAt,
    'fx:prism': recordAt,
    'cover:battle': recordAt,
  },
  stats: {
    perfects: 55555,
    boardsSolved: 180,
    challengeBoards: 42,
    challengeRelicsUsed: 12,
    heroes: ['lia', 'van'],
    paths: [1, 75],
    mini5Kinds: ['catch', 'shell'],
    challengeRelics: ['hint', 'undo'],
    challengeRoutesPlayed: ['150', '250'],
  },
  daily: { last: dayNumber(now), streak: 5, best: 7, solved: 25, gold: 12, by: { classic: 13, all: 12 } },
  look: { board: 'celestial', music: 's2', key: 'crystal', pieces: 'brass', fx: 'prism', cover: 'battle' },
  tips: { tut_heavy: true },
  run,
};

describe('enlaces de transferencia v4 (con las cartas del destino)', () => {
  it.each(['sun', 'purse', 'lantern'])('transfiere la reliquia %s con las pistas restantes', (relic) => {
    const link = exportSaveLink({ ...snapshot, run: { ...run, relic, hints: 4 } });
    expect(new TextEncoder().encode(link).length).toBeLessThan(QR_MAX_BYTES);
    expect(readSaveLink(link, now).run).toMatchObject({ relic, hints: 4 });
  });

  it('transfiere el mejor rango (porcentaje) de cada camino y lo combina con el máximo', () => {
    const paths = { c1: { score: 9000, level: 21, runs: 3, pct: 72.5 }, c50: { score: 4000, level: 9, runs: 1 } };
    const imported = readSaveLink(exportSaveLink({ ...snapshot, paths }), now);
    expect(imported.paths.c1.pct).toBe(72.5);
    expect(imported.paths.c50.pct).toBeUndefined();
    expect(mergePaths({ c1: { score: 5, pct: 80 } }, { c1: { score: 9, pct: 72.5 } }).c1.pct).toBe(80);
  });

  it('conserva Aventura, los 100 logros, reclamos, tienda Canjear, Desafío y retos dentro del límite del QR', () => {
    const link = exportSaveLink(snapshot);
    expect(new TextEncoder().encode(link).length).toBeLessThan(QR_MAX_BYTES);
    expect(qrMatrix(link).length).toBeGreaterThan(21);
    const imported = readSaveLink(link, now);
    expect(imported).toMatchObject(snapshot);
    expect(imported.run.board).toBeUndefined();
    expect(readSaveHash(new URL(link).hash, now)).toEqual(imported);
  });

  it('soporta todos los logros y objetos de Canjear (pendientes, reclamados y nuevos) sin superar el tamaño máximo del QR', () => {
    const ach = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, recordAt]));
    const achClaimed = Object.fromEntries(ACHIEVEMENTS.slice(0, 50).map((a) => [a.id, recordAt]));
    const stats = {
      ...snapshot.stats,
      emberBoards: 30,
      bestGrade: 5,
      heroWins: 7,
      heroHardWins: 5,
      fateSeen: 2 ** 31 - 1,
    };
    const link = exportSaveLink({ ...snapshot, ach, achClaimed, stats });
    expect(new TextEncoder().encode(link).length).toBeLessThan(QR_MAX_BYTES);
    const imported = readSaveLink(link, now);
    expect(Object.keys(imported.ach)).toHaveLength(ACHIEVEMENTS.length);
    expect(Object.keys(imported.achClaimed)).toHaveLength(50);
    expect(imported.stats).toMatchObject({
      emberBoards: 30,
      bestGrade: 5,
      heroWins: 7,
      heroHardWins: 5,
      fateSeen: 2 ** 31 - 1,
    });
    // con todo reclamado alcanza para los objetos nuevos de Canjear, que también viajan en el enlace
    const shopOwned = { ...snapshot.shopOwned, 'board:dawnfire': recordAt, 'key:eclipse': recordAt };
    const rich = readSaveLink(exportSaveLink({ ...snapshot, ach, achClaimed: ach, stats, shopOwned }), now);
    expect(rich.shopOwned).toHaveProperty('board:dawnfire');
    expect(rich.shopOwned).toHaveProperty('key:eclipse');
  });

  it('acepta guardados antiguos o vacíos y conserva cruces de ciudad pendientes', () => {
    expect(readSaveLink(exportSaveLink({}), now)).toMatchObject({
      paths: {},
      ach: {},
      achClaimed: {},
      shopOwned: {},
      run: null,
      daily: { last: -1 },
    });
    const crossing = {
      ...run,
      level: 10,
      firstLevel: 1,
      helpAt: 3,
      fate: [],
      fatePicked: 0,
      fateCityPaid: 0,
      pendingClear: { level: 10 },
    };
    const back = readSaveLink(exportSaveLink({ run: crossing }), now).run;
    expect(back).toMatchObject({ level: 10, fate: [], fatePicked: 0, pendingClear: { level: 10 } });
    expect(back.route).toBeUndefined();
    expect(readSaveLink(exportSaveLink({ run: { ...run, daily: {} } }), now).run).toBeNull();
  });

  it('rechaza enlaces ajenos, demasiado largos, alterados y datos fuera de intervalo', () => {
    const link = exportSaveLink(snapshot);
    for (const invalid of [
      'https://example.org/' + new URL(link).hash,
      link + 'AAA'.repeat(100),
      link.replace(/#s=(.)/, (_, first) => '#s=' + (first === 'Z' ? 'A' : 'Z')),
      link.slice(0, -5),
      exportSaveLink({ daily: { last: dayNumber(now) + 2, streak: 1, best: 1 } }),
    ])
      expect(() => readSaveLink(invalid, now)).toThrow();
  });
});

describe('importar al guardado local', () => {
  const key = 'desbloquea.rogue.v2';
  afterEach(() => vi.unstubAllGlobals());

  async function withLocal(local, { fail = false } = {}) {
    const disk = new Map([[key, JSON.stringify(local)]]);
    vi.resetModules();
    vi.stubGlobal('localStorage', {
      getItem: (name) => disk.get(name),
      setItem(name, value) {
        if (fail) throw new Error();
        disk.set(name, value);
      },
    });
    return { ...(await import('../src/state.js')), disk };
  }

  it('preserva la aventura local hasta confirmar y combina máximos, logros, compras y Desafío al aceptar', async () => {
    const local = {
      run: { ...run, level: 10 },
      paths: { c1: { score: 750000, level: 19 } },
      ach: { clean: recordAt - 86400000 },
      achClaimed: { clean: recordAt - 86400000 },
      shopOwned: { 'board:slate': recordAt - 86400000 },
      daily: { streak: 9, best: 9, last: dayNumber(now) - 1 },
    };
    const { importProgress, store, disk } = await withLocal(local);
    const incoming = readSaveLink(exportSaveLink(snapshot), now);
    expect(importProgress(incoming)).toBe('confirm');
    expect(store.run.level).toBe(10);
    expect(JSON.parse(disk.get(key))).toEqual(local);
    expect(importProgress(incoming, { replaceRun: true })).toBe('done');
    expect(store).toMatchObject({
      run: { level: 14 },
      paths: { c1: { score: 750000, level: 21 } },
      ach: { clean: local.ach.clean, perf10: recordAt, ch250: recordAt },
      achClaimed: { clean: local.achClaimed.clean, perf10: recordAt, ch250: recordAt },
      shopOwned: { 'board:slate': local.shopOwned['board:slate'], 'board:celestial': recordAt },
      daily: { streak: 5, best: 9 },
      look: snapshot.look,
    });
    expect(JSON.parse(disk.get(key + '.bak'))).toEqual(JSON.parse(disk.get(key)));
  });

  it('importa solo el progreso cuando no viene una aventura y conserva el guardado si falla la escritura', async () => {
    const incoming = readSaveLink(exportSaveLink(snapshot), now);
    const local = { run: { ...run, level: 27 } };
    let target = await withLocal(local);
    expect(target.importProgress({ ...incoming, run: null })).toBe('done');
    expect(target.store.run.level).toBe(27);
    target = await withLocal(local, { fail: true });
    expect(target.importProgress(incoming, { replaceRun: true })).toBe('error');
    expect(target.store.run.level).toBe(27);
    expect(JSON.parse(target.disk.get(key))).toEqual(local);
  });

  it('persist con merge=false guarda la revocación de revalidateUnlocks sin resucitar claves del disco', async () => {
    const local = {
      stats: { paths: [1], heroHardWins: 0b111 },
      shopOwned: { 'pieces:lava': recordAt, 'board:slate': recordAt },
      outfitsOwned: { 'lia:brasas': recordAt },
    };
    const { persist, store, disk } = await withLocal(local);
    const { revalidateUnlocks } = await import('../src/game/achievements.js');
    expect(revalidateUnlocks(store)).toBe(true);
    expect(persist(store, { merge: false })).toBe(true);
    const saved = JSON.parse(disk.get(key));
    expect(saved.shopOwned['pieces:lava']).toBeUndefined();
    expect(saved.shopOwned['board:slate']).toBe(recordAt);
    expect(saved.outfitsOwned).toEqual({});
    expect(saved.stats.heroHardWins).toBe(0);
    expect(saved.stats.fateSeen).toBe(0b111);
  });
});
