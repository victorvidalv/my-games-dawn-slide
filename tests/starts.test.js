import { describe, it, expect } from 'vitest';
import { START_LEVELS, canStartAt, startHintsAt, startOptions } from '../src/game/starts.js';
import { startHintsFor } from '../src/engine/difficulty.js';

describe('empezar desde un nivel desbloqueado', () => {
  it('las opciones son 1, 21, 51 y 71; el 1 siempre está abierto y el resto se abre al alcanzarlo en ese camino', () => {
    expect(START_LEVELS).toEqual([1, 21, 51, 71]);
    expect(startOptions(0).map((o) => o.unlocked)).toEqual([true, false, false, false]);
    expect(startOptions(20).map((o) => o.unlocked)).toEqual([true, false, false, false]);
    expect(startOptions(21).map((o) => o.unlocked)).toEqual([true, true, false, false]);
    expect(startOptions(60).map((o) => o.unlocked)).toEqual([true, true, true, false]);
    expect(startOptions(100).every((o) => o.unlocked)).toBe(true);
  });
  it('canStartAt rechaza niveles bloqueados y niveles que no son una opción', () => {
    expect(canStartAt(0, 1)).toBe(true);
    expect(canStartAt(30, 21)).toBe(true);
    expect(canStartAt(30, 51)).toBe(false);
    expect(canStartAt(100, 30)).toBe(false);
  });
  it('al empezar más adelante se reciben las pistas que se habrían ganado subiendo', () => {
    for (const start of [1, 50, 75]) {
      expect(startHintsAt(start, 1)).toBe(startHintsFor(start));
      expect(startHintsAt(start, 51)).toBeGreaterThan(startHintsAt(start, 21));
    }
  });
});
