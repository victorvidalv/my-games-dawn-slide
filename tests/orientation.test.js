import { describe, it, expect } from 'vitest';
import { FIRST_ROTATED_LEVEL, boardRotation, localDelta, rotatedLevels } from '../src/game/orientation.js';
import { TUTORIAL_LEVELS } from '../src/engine/calibration.js';
import { INTRO_LEVEL_LIST } from '../src/game/mechanics.js';

describe('giro del tablero (la salida cambia de lado)', () => {
  const turned = (seed) => Array.from({ length: 21 }, (_, i) => i + 1).filter((l) => boardRotation(seed, l));
  it('solo giran los niveles del calibrador: el primero lleva el tutorial y nunca coinciden con otros tutoriales', () => {
    const set = [...rotatedLevels(1)];
    expect(set).toEqual([7, 12, 15, 18, 20]);
    expect(set[0]).toBe(FIRST_ROTATED_LEVEL);
    expect(FIRST_ROTATED_LEVEL).toBe(TUTORIAL_LEVELS.curse);
    for (let l = 1; l < FIRST_ROTATED_LEVEL; l++) expect(boardRotation(123, l)).toBe(0);
    for (const l of set) {
      if (l !== FIRST_ROTATED_LEVEL) expect(INTRO_LEVEL_LIST, `nivel ${l}`).not.toContain(l);
    }
    for (let seed = 1; seed <= 20; seed++) expect(turned(seed)).toEqual(set); // los niveles son los mismos en todas las partidas
  });
  it('son una sorpresa: 5 en toda la partida, espaciados, y el resto mantienen la salida a la derecha', () => {
    const set = [...rotatedLevels(1)];
    expect(set.length).toBe(5);
    for (let i = 1; i < set.length; i++) expect(set[i] - set[i - 1], `nivel ${set[i]}`).toBeGreaterThanOrEqual(2);
    expect(turned(5).length).toBe(set.length);
  });
  it('el sentido del giro es 90, 180 o 270, determinista y repartido', () => {
    const count = { 90: 0, 180: 0, 270: 0 };
    for (let seed = 1; seed <= 200; seed++)
      for (const l of rotatedLevels(seed)) {
        const r = boardRotation(seed, l);
        expect([90, 180, 270]).toContain(r);
        count[r]++;
        expect(boardRotation(seed, l)).toBe(r);
      }
    for (const k of Object.keys(count)) expect(count[k]).toBeGreaterThan(250);
  });
  it('el arrastre se traduce al eje del tablero girado', () => {
    // 0°: derecha = +x · 90°: la derecha del tablero apunta hacia abajo · 180°: hacia la izquierda · 270°: hacia arriba
    expect(localDelta(10, 0, 0, 'h')).toBe(10);
    expect(localDelta(0, 10, 90, 'h')).toBe(10);
    expect(localDelta(-10, 0, 180, 'h')).toBe(10);
    expect(localDelta(0, -10, 270, 'h')).toBe(10);
    expect(localDelta(0, 10, 0, 'v')).toBe(10);
    expect(localDelta(-10, 0, 90, 'v')).toBe(10);
    expect(localDelta(0, -10, 180, 'v')).toBe(10);
    expect(localDelta(10, 0, 270, 'v')).toBe(10);
  });
});
