import { describe, it, expect } from 'vitest';
import { FIRST_ROTATED_LEVEL, boardRotation, localDelta } from '../src/game/orientation.js';

describe('giro del tablero (la salida cambia de lado)', () => {
  it('los tutoriales y los diez primeros niveles nunca giran', () => {
    for (let l = 1; l < FIRST_ROTATED_LEVEL; l++) expect(boardRotation(123, l)).toBe(0);
    expect(boardRotation(123, 40, true)).toBe(0);
  });
  it('es determinista y usa los cuatro giros de forma pareja', () => {
    const count = { 0: 0, 90: 0, 180: 0, 270: 0 };
    for (let seed = 1; seed <= 400; seed++) {
      const r = boardRotation(seed, 25);
      expect(boardRotation(seed, 25)).toBe(r);
      count[r]++;
    }
    for (const k of Object.keys(count)) expect(count[k]).toBeGreaterThan(60);
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
