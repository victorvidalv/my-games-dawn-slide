// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { bootApp, untilPlayable } from './app.js';

describe('clima del fondo', () => {
  it('el sorteo nunca repite el clima anterior si hay otra opción', async () => {
    const { rollWeather } = await import('../../src/ui/weather.js');
    let k = 0;
    const seq = () => [0, 0, 0.99, 0.99, 0.5][k++ % 5];
    const list = ['rain', 'snow', 'mist'];
    const picks = Array.from({ length: 10 }, () => rollWeather(list, seq));
    for (let i = 1; i < picks.length; i++) expect(picks[i]).not.toBe(picks[i - 1]);
    expect(picks.every((w) => list.includes(w))).toBe(true);
  });

  it('el inicio sortea un clima tranquilo y cada tablero sortea el suyo', async () => {
    const { WEATHERS } = await import('../../src/ui/weather.js');
    const app = await bootApp({
      save: {
        run: { level: 2, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 2, adj: 0, streak: 0 },
        tips: { tut_wall: true },
      },
    });
    expect(['fireflies', 'stars', 'snow', 'rain', 'mist', 'leaves']).toContain(document.body.dataset.weather);
    document.body.dataset.weather = '';
    app.$('bContinue').click();
    await untilPlayable(app, 2);
    expect(WEATHERS).toContain(document.body.dataset.weather);
  });
});
