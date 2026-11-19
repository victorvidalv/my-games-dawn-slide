// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { bootApp, untilPlayable } from './app.js';

/** Aventura con Van en el nivel 12 del camino Normal y puntos de sobra para la tienda. */
const savedRun = {
  run: {
    level: 12,
    seed: 77,
    start: 1,
    mode: 'c',
    hero: 'van',
    score: 500000,
    hints: 0,
    adj: 0,
    streak: 0,
    route: 'normal',
  },
};

describe('interfaz: tienda', () => {
  it('comprar una pista deja la pista y el poder del héroe listos al cerrar la tienda', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 12);
    app.$('bShop').click();
    expect(app.$('shop').classList.contains('show')).toBe(true);
    app.$('shopList').querySelector('[data-id="hint"]').click();
    await Promise.resolve();
    app.$('askYes').click();
    await new Promise((r) => setTimeout(r, 0));
    expect(app.S.run.hints).toBe(1);
    app.$('shopClose').click();
    expect(app.S.busy).toBe(false);
    expect(app.$('bHint').disabled).toBe(false);
    const { powerState } = await import('../../src/game/powers.js');
    expect(powerState(app.S.run, app.S.G).ok).toBe(true);
    expect(app.$('bPower').disabled).toBe(false);
  });
});
