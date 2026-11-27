// Compatibilidad con guardados y QR: compara el estado actual con una captura (tests/fixtures/compat-golden.json)
// hecha ANTES de compactar las tablas de logros, premios y desbloqueos. Si falla, se cambió un id, su orden o un dato visible.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as A from '../src/game/achievements.js';
import { exportSaveLink, readSaveLink } from '../src/game/save-transfer.js';

const golden = JSON.parse(readFileSync(new URL('./fixtures/compat-golden.json', import.meta.url), 'utf8'));
const json = (x) => JSON.parse(JSON.stringify(x));
const now = new Date('2026-11-18T10:00:00Z');

describe('compatibilidad con la captura anterior a la compactación', () => {
  it('logros: mismos id, estadística y meta, en el mismo orden (los QR v4/v5 los leen por posición)', () => {
    expect(A.ACHIEVEMENTS.map((a) => [a.id, a.stat, a.goal])).toEqual(golden.achievements);
  });

  it('premios, atuendos, desbloqueos y listas históricas idénticos (id, orden y datos)', () => {
    expect(json(A.REWARDS)).toEqual(golden.rewards);
    expect(json(A.OUTFITS)).toEqual(golden.outfits);
    expect(json(A.UNLOCKS)).toEqual(golden.unlocks);
    expect(json(A.LEGACY_REWARDS)).toEqual(golden.legacyRewards);
    expect(json(A.DEFAULT_LOOK)).toEqual(golden.defaultLook);
    expect(A.CUSTOM_TYPES).toEqual(golden.customTypes);
    // el orden de claves de REWARDS también se conserva
    expect(Object.keys(A.REWARDS)).toEqual(Object.keys(golden.rewards));
  });

  it('los enlaces QR de antes se leen igual y los de ahora salen idénticos byte a byte', () => {
    for (const { link, decoded } of golden.links) expect(json(readSaveLink(link, now))).toEqual(decoded);
    // Re-exportar lo leído reproduce el mismo enlace
    for (const { link } of golden.links) expect(exportSaveLink(readSaveLink(link, now))).toBe(link);
  });
});
