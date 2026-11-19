import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { SHOP_PERSONAS, shopPersona } from '../src/game/shop-personas.js';

describe('tiendas propias de cada héroe', () => {
  it('conserva a Don Dublón para Jean y da a Lía y Juth nombres y escenas diferentes', () => {
    expect(shopPersona('jean').name).toBe('Don Dublón');
    expect(shopPersona('lia').name).toBe('Maela');
    expect(shopPersona('van').name).toBe('Azhar');
    for (const key of ['name', 'background', 'portrait'])
      expect(new Set(Object.values(SHOP_PERSONAS).map((p) => p[key])).size).toBe(3);
  });
  it('los recursos existen y los nuevos vendedores tienen diálogos propios', () => {
    for (const p of Object.values(SHOP_PERSONAS)) {
      expect(existsSync('public/' + p.background)).toBe(true);
      expect(existsSync('public/' + p.portrait)).toBe(true);
    }
    for (const hero of ['lia', 'van'])
      for (const key of ['greet', 'hint', 'moves3', 'moves', 'redo', 'skip', 'poor', 'bought', 'decline', 'nothing'])
        expect(shopPersona(hero).lines[key].length).toBeGreaterThan(0);
  });
});
