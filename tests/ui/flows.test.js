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

  it('«Abandonar» muestra el rango con su escala, borra la partida y guarda el récord', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('bContinue').click();
    await untilPlayable(app, 2);
    app.$('pQuit').click();
    await until(() => shown(app, 'ask'));
    app.$('askYes').click();
    await until(() => shown(app, 'over'));
    expect(app.$('overTitle').textContent).toBe('Te retiraste');
    expect(app.$('overGrade').textContent).toBe('C');
    expect(app.$('overScale').querySelectorAll('.rank-step')).toHaveLength(5);
    expect(app.S.run).toBeNull();
    expect(saved().run ?? null).toBeNull();
    expect(saved().paths.c1).toMatchObject({ level: 2, runs: 1 });
    app.$('bToMenu').click();
    expect(shown(app, 'menu')).toBe(true);
  });

  it('al perder muestra «Es el final», estadísticas y solo la opción de volver al menú', async () => {
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
    expect(app.$('overTitle').textContent).toBe('Es el final');
    expect(app.$('bRetryOver')).toBeNull();
    expect(app.$('overGrade').textContent).toBe('C');
    expect(app.$('overScale').hidden).toBe(false);
    expect(app.$('overScale').querySelectorAll('.rank-step')).toHaveLength(5);
    expect(app.$('overNear').textContent).toContain('1.500');
    expect(app.$('overStats').textContent).toContain('5/9');
    app.$('bToMenu').click();
    expect(shown(app, 'over')).toBe(false);
    expect(shown(app, 'menu')).toBe(true);
  });
});

describe('interfaz: desafío diario', () => {
  it('muestra el estado de hoy y el récord de tablero en el botón de inicio', async () => {
    const { dayNumber, emptyDaily } = await import('../../src/game/daily.js');
    const day = dayNumber();
    const app = await bootApp({ save: { daily: { ...emptyDaily(), bestCleared: 9 } } });
    expect(app.$('homeDailySub').textContent).toBe('15 tableros · 150 turnos');
    expect(app.$('homeDailyRecord').hidden).toBe(false);
    expect(app.$('homeDailyBest').textContent).toBe('9/15');

    const { paintDailyHome } = await import('../../src/ui/daily.js');
    paintDailyHome(day);
    expect(app.$('homeDailyBest').textContent).toBe('9/15');
  });

  it('entra directo en 1 clic, muestra 1/15 y 150 turnos, sin pistas ni reinicio, y salir no toca la aventura', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('tabDaily').click();
    await untilPlayable(app, app.S.G?.n || 1);
    expect(document.body.classList.contains('daily-run')).toBe(true);
    expect(app.$('lvl').textContent).toBe('1/15');
    expect(app.$('lim').textContent).toBe('150');
    expect(app.$('bHint').hidden).toBe(true);
    expect(app.$('bDailyReset')).toBeNull();
    app.session.fail('limit');
    expect(shown(app, 'dailyEnd')).toBe(true);
    app.session.leaveDaily();
    expect(app.S.run).toBeNull();
    expect(document.body.classList.contains('daily-run')).toBe(false);
    expect(saved().run.level).toBe(2);
  });

  it('el menú de pausa ofrece «Rendirse» y termina el intento mostrando resultados', async () => {
    const app = await bootApp({ save: savedRun });
    app.$('tabDaily').click();
    await untilPlayable(app, app.S.G?.n || 1);
    app.$('bMenu').click();
    expect(shown(app, 'pause')).toBe(true);
    expect(app.$('pQuit').hidden).toBe(false);
    expect(app.$('pQuit').firstElementChild.textContent).toBe('Rendirme');
    app.$('pQuit').click();
    await until(() => shown(app, 'ask'));
    app.$('askYes').click();
    await until(() => shown(app, 'dailyEnd'));
    expect(app.$('dailyEndTitle').textContent).toBe('Te has rendido');
    expect(app.$('dailyRetry').hidden).toBe(true);
    expect(app.$('dailyShare').hidden).toBe(true);
    expect(app.$('dailyBack').textContent).toBe('Entendido');
    app.$('dailyBack').click();
    expect(shown(app, 'dailyEnd')).toBe(false);
    expect(shown(app, 'menu')).toBe(true);
    expect(saved().run.level).toBe(2);
  });

  it('si el jugador nunca jugó, muestra el tutorial de sacar la llave también al entrar en Desafío', async () => {
    const app = await bootApp({ save: {} });
    app.$('tabDaily').click();
    await until(() => shown(app, 'coach'));
    expect(app.$('coachTitle').textContent).toBe('¡Saca la llave roja!');
    app.$('coachOk').click();
    expect(shown(app, 'coach')).toBe(false);
    expect(saved().tips.drag).toBe(true);
  });
});
