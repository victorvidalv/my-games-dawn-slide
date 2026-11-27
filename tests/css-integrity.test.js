import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../src/styles/', import.meta.url);

describe('CSS', () => {
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.css'))) {
    it(`${f}: llaves equilibradas (una sin cerrar anida las capas siguientes en el build)`, () => {
      const s = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(s.split('{').length).toBe(s.split('}').length);
    });
  }

  it('el orden de capas se declara en index.html', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    expect(html).toMatch(/@layer tokens, base, layout, world, components, screens, unify, skins, states, lite;/);
  });
});
