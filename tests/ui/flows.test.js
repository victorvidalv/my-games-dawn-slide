// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest';
import { bootApp, until, untilPlayable } from './app.js';

afterEach(async () => {
  const { Music } = await import('../../src/audio/music.js');
  Music.background();
});

const SAVE_KEY = 'desbloquea.rogue.v2';
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
const shown = (app, id) => app.$(id).classList.contains('show');
/** Partida guardada en el nivel 3 del camino Normal (sin tablero en curso). */
const savedRun = {
  run: { level: 3, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 2, adj: 0, streak: 0 },
};

describe('interfaz: aventura', () => {
  it('el selector conserva una sola reliquia al cambiar de héroe y la guarda al empezar', async () => {
    const app = await bootApp();
    const started = app.session.startRun(1, 'c');
    const relics = app.$('heroRelics');
    expect(relics.querySelector('input:checked').value).toBe('sun');
    relics.querySelector('[value="lantern"]').click();
    app.$('heroCards').querySelector('[data-hero="jean"]').click();
    expect(app.$('heroRouteName').textContent).toBe('Camino del Péndulo');
    expect([...relics.querySelectorAll('input:checked')].map((r) => r.value)).toEqual(['lantern']);
    app.$('heroConfirm').click();
    await until(() => shown(app, 'journey'));
    expect(saved().run).toMatchObject({ relic: 'lantern', hero: 'jean', hints: 10 });
    app.$('mapClose').click();
    await started;
  });

  it('muestra al héroe de la partida al elegir camino, incluso al cambiar de personaje', async () => {
    const app = await bootApp();
    const { HEROES } = await import('../../src/game/heroes.js');
    const { showTravelDialog } = await import('../../src/ui/session-view.js');
    for (const hero of HEROES) {
      const picked = showTravelDialog({
        run: { pendingClear: { level: 10 } },
        hero,
        onChoose: () => {},
        isActive: () => true,
      });
      await until(() => shown(app, 'travel'));
      const portrait = app.$('travelHero');
      expect(portrait.getAttribute('src')).toBe(`heroes/${hero.id}-route.webp`);
      expect(portrait.alt).toBe(hero.name);
      app.$('routeNormal').click();
      await picked;
    }
  });

  it('«Continuar» retoma la partida guardada y pinta el HUD del nivel', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 3);
    expect(app.S.run).toMatchObject({ hero: 'van', level: 3, revive: 0 }); // restoreRun completa los campos que faltan
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

  it('la oferta de revivir muestra el costo, conserva el foco y reinicia al aceptar', async () => {
    const app = await bootApp({ save: { run: { ...savedRun.run, level: 11, hero: 'jean', score: 900 } } });
    app.$('bContinue').click();
    await untilPlayable(app, 11);
    app.S.G.moves = 4;
    app.session.fail('limit');
    expect(shown(app, 'reviveOffer')).toBe(true);
    expect(app.$('reviveNow').textContent).toBe('900');
    expect(app.$('reviveCost').textContent).toBe('−297');
    expect(app.$('reviveAfter').textContent).toBe('603');
    expect(document.activeElement).toBe(app.$('reviveAccept'));
    app.$('reviveAccept').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(document.activeElement).toBe(app.$('reviveEnd'));
    app.$('reviveAccept').click();
    await untilPlayable(app, 11);
    expect(shown(app, 'reviveOffer')).toBe(false);
    expect(app.S.run).toMatchObject({ score: 603, revivesBought: 1 });
    expect(app.S.G.moves).toBe(0);
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
  it('muestra la racha vigente en el inicio aunque el reto de hoy esté pendiente', async () => {
    const { dayNumber, emptyDaily } = await import('../../src/game/daily.js');
    const day = dayNumber();
    const app = await bootApp({ save: { daily: { ...emptyDaily(), last: day - 1, streak: 3, best: 8 } } });
    expect(app.$('homeDailyStreak').textContent).toBe('3 días');
    expect(app.$('homeDailySub').textContent).toBe('Reto de hoy pendiente');

    const { paintDailyHome } = await import('../../src/ui/daily.js');
    paintDailyHome(day - 1);
    expect(app.$('homeDailyStreak').textContent).toBe('3 días');
    expect(app.$('homeDailySub').textContent).toBe('Hecho hoy');
    paintDailyHome(day + 1);
    expect(app.$('homeDailyStreak').textContent).toBe('0 días');
    expect(app.$('homeDailySub').textContent).toBe('Reto de hoy pendiente');
  });

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
