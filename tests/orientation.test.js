import { describe, it, expect } from 'vitest';
import { FIRST_ROTATED_LEVEL, boardRotation, localDelta, rotatedLevels } from '../src/game/orientation.js';

describe('giro del tablero (la salida cambia de lado)', () => {
  it('hasta el 16, los tutoriales y los jefes nunca giran', () => {
    for (let l = 1; l < FIRST_ROTATED_LEVEL; l++) expect(boardRotation(123, l)).toBe(0);
    expect(boardRotation(123, 17, true)).toBe(0);
    for (let seed = 1; seed <= 50; seed++) for (let l = 10; l <= 100; l += 10) expect(boardRotation(seed, l)).toBe(0);
  });
  it('el primero es el 17 y luego aparece uno cada 6 o 7 niveles, el resto con la orientación de siempre', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const levels = [...rotatedLevels(seed)];
      expect(levels[0]).toBe(17);
      for (let k = 1; k < levels.length; k++) expect([6, 7]).toContain(levels[k] - levels[k - 1]);
      let turned = 0;
      for (let l = 1; l <= 100; l++) { const r = boardRotation(seed, l); if (r) { turned++; expect([90, 180, 270]).toContain(r); expect(levels).toContain(l); } }
      expect(turned).toBeGreaterThanOrEqual(8); expect(turned).toBeLessThanOrEqual(14);
    }
  });
  it('es determinista y reparte los tres giros', () => {
    const count = { 90: 0, 180: 0, 270: 0 };
    for (let seed = 1; seed <= 300; seed++) for (const l of rotatedLevels(seed)) { const r = boardRotation(seed, l); if (r) count[r]++; expect(boardRotation(seed, l)).toBe(r); }
    for (const k of Object.keys(count)) expect(count[k]).toBeGreaterThan(300);
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
