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
const buttons0 = (app) => [...app.$('fateOffer').querySelectorAll('.fate-card')];
/** Partida guardada en el nivel 2 del camino Normal (sin tablero en curso). */
const savedRun = {
  run: { level: 2, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 2, adj: 0, streak: 0 },
  tips: { tut_wall: true },
};

describe('interfaz: aventura', () => {
  it('el selector conserva una sola reliquia al cambiar de héroe y la guarda al empezar', async () => {
    const app = await bootApp();
    const started = app.session.startRun(1, 'c');
    const relics = app.$('heroRelics');
    expect(relics.querySelector('input:checked').value).toBe('sun');
    relics.querySelector('[value="lantern"]').click();
    app.$('heroCards').querySelector('[data-hero="jean"]').click();
    expect([...app.$('heroCards').querySelectorAll('.hero-choice-power')].map((el) => el.textContent)).toEqual([
      '+ turnos',
      'Rebobinar',
      'Ver destino',
    ]);
    expect([...relics.querySelectorAll('input:checked')].map((r) => r.value)).toEqual(['lantern']);
    app.$('heroConfirm').click();
    await started;
    await untilPlayable(app, 1);
    expect(saved().run).toMatchObject({ relic: 'lantern', hero: 'jean', hints: 6 });
  });

  it('desbloquea Aventura en orden: Normal → Difícil → Experto, solo al completar cada senda', async () => {
    // Sin completar Normal (incluso si llegó al nivel 21 y perdió ahí): Difícil y Experto bloqueados
    let app = await bootApp({ save: { paths: { c1: { level: 21, score: 5000, runs: 1 } } } });
    app.$('tabAdv').click();
    const lockedCards = () => [...app.$('paths').querySelectorAll('.path')];
    expect(lockedCards().map((el) => el.classList.contains('locked'))).toEqual([false, true, true]);
    expect(app.$('paths').textContent).toContain('Completa Normal (21 niveles) para desbloquear');
    expect(app.$('paths').textContent).toContain('Completa Difícil (21 niveles) para desbloquear');
    // Tocar un camino bloqueado no abre el selector de héroe
    lockedCards()[1].click();
    expect(shown(app, 'heroSelect')).toBe(false);

    // Al completar Normal (victoria en nivel 21): Difícil se desbloquea y Experto sigue bloqueado
    app = await bootApp({ save: { stats: { paths: [1] } } });
    app.$('tabAdv').click();
    expect(lockedCards().map((el) => el.classList.contains('locked'))).toEqual([false, false, true]);

    // Al completar Difícil: Experto también se desbloquea
    app = await bootApp({ save: { stats: { paths: [1, 50] } } });
    app.$('tabAdv').click();
    expect(lockedCards().map((el) => el.classList.contains('locked'))).toEqual([false, false, false]);
  });

  it('lo que ya se jugó no se vuelve a cerrar: un guardado con récord en Difícil conserva su acceso', async () => {
    // Sin la victoria anotada (guardado de antes del bloqueo) pero con récord en Difícil: Difícil abierto, Experto no
    let app = await bootApp({ save: { paths: { c1: { level: 5, score: 100 }, c50: { level: 9, score: 0 } } } });
    app.$('tabAdv').click();
    const locks = () => [...app.$('paths').querySelectorAll('.path')].map((el) => el.classList.contains('locked'));
    expect(locks()).toEqual([false, false, true]);
    // Con récord en Experto, Difícil y Experto están abiertos aunque no haya victorias anotadas
    app = await bootApp({ save: { paths: { c75: { level: 3, score: 0 } } } });
    app.$('tabAdv').click();
    expect(locks()).toEqual([false, false, false]);
  });

  it('al cerrar la ciudad muestra al héroe de la partida y reparte 3 cartas del destino; elegir una la aplica una vez', async () => {
    const app = await bootApp();
    const { HEROES } = await import('../../src/game/heroes.js');
    const { DEFAULT_OUTFIT, outfitArt } = await import('../../src/game/achievements.js');
    const { fateOffer } = await import('../../src/game/fate.js');
    const { showFateDialog } = await import('../../src/ui/fate.js');
    for (const hero of HEROES) {
      const run = { seed: 9, mode: 'c', fate: [], fatePicked: 0, pendingClear: { level: 10 } };
      const cards = fateOffer(run, 1);
      const chosen = [];
      const picked = showFateDialog({
        run,
        hero,
        city: 1,
        cards,
        rewards: null,
        onChoose: (id) => chosen.push(id),
        isActive: () => true,
      });
      await until(() => shown(app, 'travel'));
      const portrait = app.$('travelHero');
      expect(portrait.getAttribute('src')).toBe(outfitArt(hero.id, DEFAULT_OUTFIT[hero.id], 'adv'));
      expect(portrait.alt).toBe(hero.name);
      expect(app.$('travel').classList.contains('intro'), 'primero la entrada «Ciudad completada»').toBe(true);
      buttons0(app)[0].click(); // durante la entrada no se elige nada
      await until(() => app.$('travel').classList.contains('fate-dealt'));
      await new Promise((r) => setTimeout(r, 400));
      const buttons = buttons0(app);
      expect(buttons.map((b) => b.dataset.card)).toEqual(cards.map((c) => c.id));
      for (const b of buttons) expect(b.querySelector('svg.fate-art')).toBeTruthy();
      buttons[1].click();
      buttons[0].click(); // un segundo toque no elige otra
      await picked;
      expect(chosen).toEqual([cards[1].id]);
    }
  });

  it('«Continuar» retoma la partida guardada y pinta el HUD del nivel', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 2);
    expect(app.S.run).toMatchObject({ hero: 'van', level: 2, revive: 0 }); // restoreRun completa los campos que faltan
    expect(app.$('lvl').textContent).toBe('2');
    expect(app.$('lim').textContent).toBe(String(app.S.G.limit));
    expect(app.$('board').querySelectorAll('.piece').length).toBe(app.S.G.pieces.length);
  });

  it('ganar suma puntos y pasa al nivel siguiente', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 2);
    app.session.win();
    expect(app.$('msg').textContent).toMatch(/\+\d+ puntos/);
    await until(() => app.S.G?.n === 3, { timeout: 15000 });
    expect(app.S.run.score).toBeGreaterThan(50);
    expect(saved().run.level).toBe(3);
  });

  it('perder en los primeros niveles ofrece repetir gratis y el tablero vuelve a empezar', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 2);
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

  it('la oferta de revivir (con Fénix) muestra el costo, conserva el foco y reinicia al aceptar', async () => {
    const app = await bootApp({
      save: { run: { ...savedRun.run, level: 11, hero: 'jean', score: 900, fate: ['fenix'] } },
    });
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
    await untilPlayable(app, 2);
    app.$('pSave').click();
    expect(app.S.run).toBeNull();
    expect(saved().run.level).toBe(2);
  });

  it('«Abandonar» borra la partida y guarda el récord', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 2);
    app.$('pQuit').click();
    expect(app.S.run).toBeNull();
    expect(saved().run ?? null).toBeNull();
    expect(saved().paths.c1).toMatchObject({ level: 2, runs: 1 });
  });

  it('al perder muestra rango, estadísticas y permite reintentar en 1 toque con el mismo héroe y reliquia', async () => {
    const app = await bootApp({
      save: {
        paths: { c50: { score: 8000, level: 12, runs: 2 } },
        run: {
          level: 10,
          seed: 77,
          start: 50,
          mode: 'c',
          hero: 'jean',
          relic: 'lantern',
          score: 6500,
          hints: 2,
          adj: 0,
          streak: 3,
          bestStreak: 4,
          perfects: 5,
          fate: ['juramento'],
        },
        tips: { tut_wall: true, tut_heavy: true, tut_gate: true, tut_ice: true },
      },
    });
    app.$('bContinue').click();
    await untilPlayable(app, 10);
    app.session.fail('limit');
    await until(() => shown(app, 'over'));
    expect(app.$('overGrade').textContent).toBe('B');
    expect(app.$('overNear').textContent).toContain('1.500');
    expect(app.$('overStats').textContent).toContain('5/9');
    app.$('bRetryOver').click();
    await untilPlayable(app, 1);
    expect(shown(app, 'over')).toBe(false);
    expect(app.S.run).toMatchObject({ start: 50, hero: 'jean', relic: 'lantern', level: 1 });
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
    expect(saved().run.level).toBe(2);
  });
});
