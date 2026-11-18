// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { bootApp, until, untilPlayable } from './app.js';

const SAVE_KEY = 'desbloquea.rogue.v2';
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
const shown = (app, id) => app.$(id).classList.contains('show');
/** Partida guardada en el nivel 3 del camino Normal (sin tablero en curso). */
const savedRun = { run: { level: 3, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 2, adj: 0, streak: 0 } };

describe('interfaz: aventura', () => {
  it('«Continuar» retoma la partida guardada y pinta el HUD del nivel', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    expect(app.S.run).toMatchObject({ hero: 'van', level: 3, revive: 0 });   // restoreRun completa los campos que faltan
    expect(app.$('lvl').textContent).toBe('3');
    expect(app.$('lim').textContent).toBe(String(app.S.G.limit));
    expect(app.$('board').querySelectorAll('.piece').length).toBe(app.S.G.pieces.length);
  });

  it('ganar suma puntos y pasa al nivel siguiente', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    app.session.win();
    expect(app.$('msg').textContent).toMatch(/\+\d+ puntos/);
    await until(() => app.S.G?.n === 4, { timeout: 15000 });
    expect(app.S.run.score).toBeGreaterThan(50);
    expect(saved().run.level).toBe(4);
  });

  it('perder en los primeros niveles ofrece repetir gratis y el tablero vuelve a empezar', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    app.S.G.moves = 4;
    app.session.fail('limit');
    expect(shown(app, 'rescue')).toBe(true);
    expect(app.S.run.rescue).toBeTruthy();
    app.$('rescueContinue').click();
    expect(shown(app, 'rescue')).toBe(false);
    expect(app.S.run.rescue).toBeUndefined();
    expect(app.S.G).toMatchObject({ moves: 0, done: false });
    expect(app.S.busy).toBe(false);
  });

  it('«Guardar y salir» deja la partida guardada y libera el juego', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    app.$('pSave').click();
    expect(app.S.run).toBeNull();
    expect(saved().run.level).toBe(3);
  });

  it('«Abandonar» borra la partida y guarda el récord', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    app.$('pQuit').click();
    expect(app.S.run).toBeNull();
    expect(saved().run ?? null).toBeNull();
    expect(saved().paths.c1).toMatchObject({ level: 3, runs: 1 });
  });
});

describe('interfaz: reto diario', () => {
  it('abre el primer tablero, se puede repetir al perder y salir no toca la aventura', async () => {
    const app = await bootApp({ save: savedRun });
    const { CHALLENGES } = await import('../../src/game/daily.js');
    await app.session.startDaily(CHALLENGES[0].id);
    await untilPlayable(app, app.S.G.n);
    expect(document.body.classList.contains('daily-run')).toBe(true);
    expect(app.$('lvl').textContent).toMatch(/· 1\/3$/);
    app.session.fail('limit');
    expect(app.S.run.rescue.kind).toBe('daily');
    expect(shown(app, 'rescue')).toBe(true);
    app.session.leaveDaily();
    expect(app.S.run).toBeNull();
    expect(document.body.classList.contains('daily-run')).toBe(false);
    expect(saved().run.level).toBe(3);
  });
});
