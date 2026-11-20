import { afterEach, describe, expect, it, vi } from 'vitest';
import { dayNumber } from '../src/game/daily.js';
import { exportSaveLink, readSaveHash, readSaveLink } from '../src/game/save-transfer.js';
import { QR_MAX_BYTES, qrMatrix } from '../src/qr.js';

const now = new Date('2026-11-18T10:00:00Z');
const recordAt = now.getTime();
const run = {
  mode: 'c',
  level: 40,
  hero: 'van',
  start: 75,
  route: 'brave',
  seed: 2147483647,
  hints: 17,
  score: 123456,
  adj: 2,
  firstLevel: 21,
  helpAt: 39,
  streak: 4,
  revivesBought: 1,
  bossRetry: { level: 40, used: 1 },
};
const snapshot = {
  paths: {
    c1: { score: 600000, level: 100, runs: 4, recordAt },
    c50: { score: 4200000000, level: 90, runs: 320 },
    c75: { score: 123456, level: 40, runs: 1 },
  },
  ach: { perf10: recordAt, perf50: recordAt, lv50: recordAt, day7: recordAt },
  stats: { perfects: 55555, heroes: ['lia', 'van'], paths: [1, 75], mini5Kinds: ['catch', 'shell'] },
  daily: { last: dayNumber(now), streak: 5, best: 7, solved: 25, gold: 12, by: { classic: 13, all: 12 } },
  look: { music: 'z4', key: 'crystal', pieces: 'stone', fx: 'sparks' },
  tips: { tut_heavy: true },
  run,
};

describe('enlaces de transferencia', () => {
  it.each(['sun', 'purse', 'lantern'])('transfiere la reliquia %s con las pistas restantes', (relic) => {
    const link = exportSaveLink({ ...snapshot, run: { ...run, relic, hints: 4 } });
    expect(new TextEncoder().encode(link).length).toBeLessThan(QR_MAX_BYTES);
    expect(readSaveLink(link, now).run).toMatchObject({ relic, hints: 4 });
  });

  it('conserva Aventura, logros, aspecto y retos dentro del límite del QR', () => {
    const link = exportSaveLink(snapshot);
    expect(new TextEncoder().encode(link).length).toBeLessThan(QR_MAX_BYTES);
    expect(qrMatrix(link).length).toBeGreaterThan(21);
    const imported = readSaveLink(link, now);
    expect(imported).toMatchObject(snapshot);
    expect(imported.run.board).toBeUndefined();
    expect(readSaveHash(new URL(link).hash, now)).toEqual(imported);
  });

  it('acepta guardados antiguos o vacíos y conserva cruces de ciudad pendientes', () => {
    expect(readSaveLink(exportSaveLink({}), now)).toMatchObject({ paths: {}, ach: {}, run: null, daily: { last: -1 } });
    const crossing = { ...run, level: 10, firstLevel: 1, helpAt: 3, pendingClear: { level: 10, routeChosen: true } };
    expect(readSaveLink(exportSaveLink({ run: crossing }), now).run).toMatchObject({
      level: 10,
      route: 'brave',
      pendingClear: { level: 10, routeChosen: true },
    });
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

  it('preserva la aventura local hasta confirmar y combina máximos, logros y racha al aceptar', async () => {
    const local = {
      run: { ...run, level: 20 },
      paths: { c1: { score: 750000, level: 93 } },
      ach: { clean: recordAt - 86400000 },
      daily: { streak: 9, best: 9, last: dayNumber(now) - 1 },
    };
    const { importProgress, store, disk } = await withLocal(local);
    const incoming = readSaveLink(exportSaveLink(snapshot), now);
    expect(importProgress(incoming)).toBe('confirm');
    expect(store.run.level).toBe(20);
    expect(JSON.parse(disk.get(key))).toEqual(local);
    expect(importProgress(incoming, { replaceRun: true })).toBe('done');
    expect(store).toMatchObject({
      run: { level: 40 },
      paths: { c1: { score: 750000, level: 100 } },
      ach: { clean: local.ach.clean, perf10: recordAt },
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
});
