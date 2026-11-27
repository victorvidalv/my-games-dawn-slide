import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import data from '../src/data/calibration.js';

describe('calendario de dificultad', () => {
  it('calibration.json (lo que lee `npm run calibrate`) coincide con el módulo calibration.js que usa el juego', () => {
    const json = JSON.parse(readFileSync(new URL('../src/data/calibration.json', import.meta.url), 'utf8'));
    expect(json).toEqual(data);
  });
});
