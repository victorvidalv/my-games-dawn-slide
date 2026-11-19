import { describe, it, expect } from 'vitest';
import { qrMatrix, qrSvg, QR_MAX_BYTES } from '../src/qr.js';

/* La decodificación real se comprobó con el lector de códigos del navegador (BarcodeDetector); aquí, la estructura del estándar. */
describe('generador de QR', () => {
  it('elige la versión más pequeña que cabe y devuelve una matriz cuadrada', () => {
    expect(qrMatrix('A').length).toBe(21); // versión 1
    expect(qrMatrix('https://dawnslide.com/').length).toBe(25); // versión 2
    expect(qrMatrix('x'.repeat(100)).length).toBe(17 + 4 * 6); // versión 6
  });
  it('dibuja los tres patrones de posición y el módulo oscuro fijo', () => {
    const m = qrMatrix('https://dawnslide.com/');
    const n = m.length;
    for (const [r0, c0] of [
      [0, 0],
      [0, n - 7],
      [n - 7, 0],
    ]) {
      for (let i = 0; i < 7; i++)
        for (let j = 0; j < 7; j++) {
          const ring = i === 0 || i === 6 || j === 0 || j === 6;
          const core = i >= 2 && i <= 4 && j >= 2 && j <= 4;
          expect(m[r0 + i][c0 + j], `${r0},${c0} ${i},${j}`).toBe(ring || core);
        }
    }
    expect(m[n - 8][8]).toBe(true);
    expect(m[6][8]).toBe(true);
    expect(m[8][6]).toBe(true);
  });
  it('es determinista y cambia con el texto', () => {
    expect(qrMatrix('a')).toEqual(qrMatrix('a'));
    expect(qrMatrix('a')).not.toEqual(qrMatrix('b'));
  });
  it('rechaza textos demasiado largos y exporta un SVG', () => {
    expect(QR_MAX_BYTES).toBe(213);
    expect(qrMatrix('x'.repeat(QR_MAX_BYTES)).length).toBe(57);
    expect(() => qrMatrix('x'.repeat(QR_MAX_BYTES + 1))).toThrow();
    expect(qrSvg('hola')).toMatch(/^<svg[\s\S]*<path d="M/);
  });
});
