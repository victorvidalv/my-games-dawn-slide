// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { bootApp, until, untilPlayable } from './app.js';

const SAVE_KEY = 'desbloquea.rogue.v2';
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY));

it('elige ruta y reliquia en Desafío, usa la pista por turno, guarda y continúa tras recargar', async () => {
  const adventure = { level: 3, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 3 };
  let app = await bootApp({ save: { run: adventure } });

  expect([...app.$('menuHome').querySelectorAll('button')].map((b) => b.id)).toEqual([
    'tabAdv',
    'tabSurvival',
    'tabDaily',
  ]);
  expect(app.$('homeSurvivalSub').textContent).toBe('Con límite de turnos');
  app.$('tabSurvival').click();
  expect(app.$('survivalRoutes').querySelectorAll('input').length).toBe(3);
  expect(app.$('survivalRelics').querySelectorAll('input').length).toBe(3);

  // Elegir ruta 150 y reliquia de pista por turno
  app.$('survivalRoutes').querySelector('input[value="150"]').click();
  app.$('survivalRelics').querySelector('input[value="hint"]').click();
  app.$('survivalPlay').click();

  expect(document.body.classList.contains('survival-run')).toBe(true);
  expect(app.$('survivalTurns').textContent).toBe('150');
  expect(app.$('bChallengeRelic').disabled).toBe(false);

  // Usa la pista: se gasta en este turno y no se puede repetir hasta mover
  app.$('bChallengeRelic').click();
  expect(app.$('bChallengeRelic').disabled).toBe(true);
  expect(app.$('challengeRelicState').textContent).toBe('0');

  const { G } = app.S;
  const { hintMove } = await import('../../src/engine/solver.js');
  const { i, from, to } = hintMove(G.pieces, G.pos, G.walls);
  const drag = (piece, fromPos, toPos) => {
    const axis = app.S.G.pieces[piece].o === 'h' ? 'clientX' : 'clientY';
    const events = { pointerId: 1, bubbles: true };
    const el = app.S.G.els[piece];
    el.dispatchEvent(new PointerEvent('pointerdown', { ...events, [axis]: 0 }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...events, [axis]: (toPos - fromPos) * 48 }));
    el.dispatchEvent(new PointerEvent('pointerup', events));
  };
  vi.spyOn(app.$('board'), 'clientWidth', 'get').mockReturnValue(288);
  drag(i, from, to);

  // Al mover: gasta 1 turno y la pista sigue usada en este mismo tablero
  expect(G.pos[i]).toBe(to);
  expect(app.$('bChallengeRelic').disabled).toBe(true);
  expect(saved().survival).toMatchObject({ route: '150', relic: 'hint', remaining: 149, cleared: 0 });
  expect(saved().run).toEqual(adventure);

  // Guardar y recargar
  app.$('bMenu').click();
  app.$('pSave').click();
  expect(app.$('survivalSaved').hidden).toBe(false);

  app = await bootApp({ save: saved() });
  app.$('tabSurvival').click();
  app.$('survivalContinue').click();
  expect(app.S.G.pos).toEqual(saved().survival.pos);
  expect(app.$('survivalTurns').textContent).toBe('149');

  // Completar tablero 1 y avanzar al 2: la pista vuelve a estar disponible
  const audio = (await import('../../src/audio/music.js')).Music;
  const resumedTrack = audio.themeName;
  vi.spyOn(app.$('board'), 'clientWidth', 'get').mockReturnValue(288);
  for (let move = 0; move < G.opt - 1; move++) {
    const { pieces, pos, walls } = app.S.G;
    const next = hintMove(pieces, pos, walls);
    drag(next.i, next.from, next.to);
  }
  expect(saved().survival).toMatchObject({ remaining: 147, cleared: 1, pos: null });
  await untilPlayable(app, 2);
  expect(app.$('bChallengeRelic').disabled).toBe(false);
  expect(audio.themeName).toBe(resumedTrack);
});

it('permite usar rehacer tablero (+2 turnos, 1 vez por partida) y deshacer (2 por tablero) desde el HUD', async () => {
  const app = await bootApp({ save: { survivalWon: { 150: true, 200: true } } });
  app.$('tabSurvival').click();
  app.$('survivalRoutes').querySelector('input[value="200"]').click();
  app.$('survivalRelics').querySelector('input[value="reset"]').click();
  app.$('survivalPlay').click();

  expect(app.$('survivalTurns').textContent).toBe('202');
  expect(app.$('bChallengeRelic').disabled).toBe(true);

  const { applyMove } = await import('../../src/game/run-logic.js');
  const { hintMove } = await import('../../src/engine/solver.js');
  const { afterMove } = await import('../../src/ui/board.js');
  const startPos = app.S.G.pos.slice();
  const move1 = hintMove(app.S.G.pieces, app.S.G.pos, app.S.G.walls);
  applyMove(app.S.G, move1.i, move1.to);
  afterMove();
  expect(app.$('survivalTurns').textContent).toBe('201');
  expect(app.$('bChallengeRelic').disabled).toBe(false);

  // Rehacer tablero: restaura posiciones y turnos, queda usada para toda la partida
  app.$('bChallengeRelic').click();
  expect(app.S.G.pos).toEqual(startPos);
  expect(app.$('survivalTurns').textContent).toBe('202');
  expect(app.$('bChallengeRelic').disabled).toBe(true);

  // Ahora probar reliquia de deshacer en ruta 250
  app.$('bMenu').click();
  app.$('pSave').click();
  expect(app.$('survivalPlay').textContent).toBe('Empezar de nuevo');
  app.$('survivalRoutes').querySelector('input[value="250"]').click();
  app.$('survivalRelics').querySelector('input[value="undo"]').click();
  app.$('survivalPlay').click();
  app.$('askYes').click();
  await until(() => app.$('survivalTurns').textContent === '250');
  const initPos = app.S.G.pos.slice();
  const m = hintMove(app.S.G.pieces, app.S.G.pos, app.S.G.walls);
  applyMove(app.S.G, m.i, m.to);
  afterMove();
  expect(app.$('survivalTurns').textContent).toBe('249');
  expect(app.$('bChallengeRelic').disabled).toBe(false);

  app.$('bChallengeRelic').click();
  expect(app.S.G.pos).toEqual(initPos);
  expect(app.$('survivalTurns').textContent).toBe('250');
  expect(app.$('bChallengeRelic').disabled).toBe(true);
});

it('termina al agotar la reserva y al completar el último tablero muestra la victoria', async () => {
  const app = await bootApp({
    save: {
      survival: {
        routeVersion: 2,
        route: '150',
        relic: 'hint',
        cleared: 14,
        remaining: 17,
        boardStartRemaining: 17,
        pos: null,
        lastPos: null,
        hintUsedTurn: false,
        resetUsed: false,
        undoUsedBoard: false,
        status: 'active',
        updatedAt: 1,
      },
    },
  });
  app.$('tabSurvival').click();
  app.$('survivalContinue').click();
  const { applyMove } = await import('../../src/game/run-logic.js');
  const { hintMove } = await import('../../src/engine/solver.js');
  const { afterMove } = await import('../../src/ui/board.js');
  const G = app.S.G;
  expect(G.n).toBe(15);
  for (let remaining = 17; remaining > 0; remaining--) {
    const move = hintMove(G.pieces, G.pos, G.walls);
    applyMove(G, move.i, move.to);
    afterMove();
  }
  await until(() => app.$('survivalEnd').classList.contains('show'));
  expect(app.$('survivalEndTitle').textContent).toBe('¡Desafío completado!');
  expect(saved().survival).toMatchObject({ remaining: 0, cleared: 15, status: 'won' });
  app.$('survivalBack').click();
  // Al volver al menú de Desafío tras ganar 150: 200 ya está desbloqueado y 250 sigue bloqueado
  expect(app.$('survivalRoutes').querySelector('input[value="200"]').disabled).toBe(false);
  expect(app.$('survivalRoutes').querySelector('input[value="250"]').disabled).toBe(true);
  app.$('menuBack').click();
  expect(app.$('homeSurvivalBest').textContent).toBe('1/3');
});

it('desbloquea Desafío en orden: 150 → 200 → 250, con candado y explicación', async () => {
  // Inicio sin progreso: solo 150 desbloqueado
  let app = await bootApp();
  app.$('tabSurvival').click();
  expect(app.$('survivalRoutes').querySelector('input[value="150"]').disabled).toBe(false);
  expect(app.$('survivalRoutes').querySelector('input[value="200"]').disabled).toBe(true);
  expect(app.$('survivalRoutes').querySelector('input[value="250"]').disabled).toBe(true);
  expect(app.$('survivalRoutes').textContent).toContain('Completa 150 turnos para desbloquear');
  expect(app.$('survivalRoutes').textContent).toContain('Completa 200 turnos para desbloquear');

  // Con 150 completado: 200 desbloqueado, 250 bloqueado
  app = await bootApp({ save: { survivalWon: { 150: true } } });
  app.$('tabSurvival').click();
  expect(app.$('survivalRoutes').querySelector('input[value="150"]').disabled).toBe(false);
  expect(app.$('survivalRoutes').querySelector('input[value="200"]').disabled).toBe(false);
  expect(app.$('survivalRoutes').querySelector('input[value="250"]').disabled).toBe(true);

  // Con 150 y 200 completados: los tres desbloqueados
  app = await bootApp({ save: { survivalWon: { 150: true, 200: true } } });
  app.$('tabSurvival').click();
  expect(app.$('survivalRoutes').querySelector('input[value="250"]').disabled).toBe(false);
});

it('lo ya jugado en Desafío no se cierra: con progreso en la ruta de 250, 200 y 250 están abiertas', async () => {
  const app = await bootApp({ save: { survivalBests: { 250: 4 } } });
  app.$('tabSurvival').click();
  const route = (id) => app.$('survivalRoutes').querySelector(`input[value="${id}"]`);
  expect([route('150').disabled, route('200').disabled, route('250').disabled]).toEqual([false, false, false]);
});
