// @vitest-environment happy-dom
import { expect, it, vi } from 'vitest';
import { bootApp, until, untilPlayable } from './app.js';

const SAVE_KEY = 'desbloquea.rogue.v2';
const saved = () => JSON.parse(localStorage.getItem(SAVE_KEY));

it('abre Supervivencia desde el menú, debita un turno y restaura el tablero tras recargar', async () => {
  const adventure = { level: 3, seed: 123, start: 1, mode: 'c', hero: 'van', score: 50, hints: 3 };
  let app = await bootApp({
    save: {
      run: adventure,
      survival: { cleared: 17, remaining: 1950, status: 'active', updatedAt: 1 },
    },
  });
  expect([...app.$('menuHome').querySelectorAll('button')].map((b) => b.id)).toEqual([
    'tabAdv',
    'tabSurvival',
    'tabDaily',
  ]);
  expect(app.$('homeSurvivalRecord').hidden).toBe(true);
  app.$('homeMore').click();
  expect(app.$('homeTools').hidden).toBe(false);
  app.$('tabAch').click();
  expect(app.$('panelAch').hidden).toBe(false);
  app.$('menuBack').click();
  app.$('tabSurvival').click();
  expect(app.$('survivalPlay').textContent).toBe('Empezar');
  expect(app.$('survivalIntro').textContent).toContain('150 turnos para resolver los 15 tableros');
  app.$('survivalPlay').click();

  const { G } = app.S;
  const { hintMove } = await import('../../src/engine/solver.js');
  const { i, from, to } = hintMove(G.pieces, G.pos, G.walls);
  const drag = (piece, from, to) => {
    const axis = app.S.G.pieces[piece].o === 'h' ? 'clientX' : 'clientY';
    const events = { pointerId: 1, bubbles: true };
    const el = app.S.G.els[piece];
    el.dispatchEvent(new PointerEvent('pointerdown', { ...events, [axis]: 0 }));
    el.dispatchEvent(new PointerEvent('pointermove', { ...events, [axis]: (to - from) * 48 }));
    el.dispatchEvent(new PointerEvent('pointerup', events));
  };
  vi.spyOn(app.$('board'), 'clientWidth', 'get').mockReturnValue(288);
  drag(i, from, to);
  expect(G.pos[i]).toBe(to);
  expect(app.$('survivalTurnFlash').hidden).toBe(true);
  const pos = G.pos.slice();
  expect(saved().survival).toMatchObject({ remaining: 149, cleared: 0, pos });
  expect(saved().run).toEqual(adventure);
  app.$('bMenu').click();
  expect(app.$('pProgress').hidden).toBe(true);
  app.$('pSave').click();
  expect(app.S.run).toBeNull();
  expect(app.$('panelSurvival').hidden).toBe(false);
  expect(app.$('survivalPlay').textContent).toBe('Continuar');

  app = await bootApp({ save: saved() });
  app.$('tabSurvival').click();
  app.$('survivalPlay').click();
  expect(app.S.G.pos).toEqual(pos);
  expect(document.body.classList.contains('survival-run')).toBe(true);
  expect(app.$('survivalTurns').textContent).toBe('149');

  const audio = (await import('../../src/audio/music.js')).Music;
  const resumedTrack = audio.themeName;
  vi.spyOn(app.$('board'), 'clientWidth', 'get').mockReturnValue(288);
  for (let move = 0; move < G.opt - 1; move++) {
    const { pieces, pos, walls } = app.S.G;
    const next = hintMove(pieces, pos, walls);
    drag(next.i, next.from, next.to);
  }
  expect(saved().survival).toMatchObject({ remaining: 147, cleared: 1, pos: null });
  expect(app.$('survivalTurnFlash').hidden).toBe(false);
  expect(app.$('survivalTurnFlash').textContent).toBe('147 turnos restantes');
  await untilPlayable(app, 2);
  expect(audio.themeName).toBe(resumedTrack);
  expect(app.$('result')?.classList.contains('show')).toBeFalsy();
  await until(() => app.$('survivalTurnFlash').hidden);

  app.$('bMenu').click();
  app.$('pSave').click();
  app.$('menuBack').click();
  expect(app.$('homeSurvivalRecord').hidden).toBe(false);
  expect(app.$('homeSurvivalBest').textContent).toBe('2');
  app.$('tabSurvival').click();
  app.$('survivalRestart').click();
  app.$('askNo').click();
  expect(saved().survival.cleared).toBe(1);
  app.$('survivalRestart').click();
  app.$('askYes').click();
  await untilPlayable(app, 1);
  expect(saved().survival).toMatchObject({ remaining: 150, cleared: 0, status: 'active' });
  app = await bootApp({ save: saved() });
  expect(app.$('homeSurvivalBest').textContent).toBe('2');
});

it('termina al agotar la reserva y permite volver a empezar', async () => {
  const app = await bootApp({
    save: { survival: { routeVersion: 1, cleared: 0, remaining: 1, pos: null, status: 'active', updatedAt: 1 } },
  });
  app.$('tabSurvival').click();
  app.$('survivalPlay').click();
  const { applyMove } = await import('../../src/game/run-logic.js');
  const { hintMove } = await import('../../src/engine/solver.js');
  const { afterMove } = await import('../../src/ui/board.js');
  const G = app.S.G;
  const { i, to } = hintMove(G.pieces, G.pos, G.walls);
  applyMove(G, i, to);
  afterMove();
  expect(saved().survival).toMatchObject({ remaining: 0, cleared: 0, status: 'lost' });
  expect(app.$('survivalEnd').classList.contains('show')).toBe(true);
  app.$('survivalBack').click();
  expect(app.$('survivalPlay').textContent).toBe('Jugar de nuevo');
  app.$('survivalPlay').click();
  expect(app.S.G.n).toBe(1);
  expect(saved().survival).toMatchObject({ remaining: 150, cleared: 0, status: 'active' });
});

it('completar el último tablero en el turno final muestra la victoria y el récord de nivel 15', async () => {
  const app = await bootApp({
    save: { survival: { routeVersion: 1, cleared: 14, remaining: 17, pos: null, status: 'active', updatedAt: 1 } },
  });
  app.$('tabSurvival').click();
  app.$('survivalPlay').click();
  const { applyMove } = await import('../../src/game/run-logic.js');
  const { hintMove } = await import('../../src/engine/solver.js');
  const { afterMove } = await import('../../src/ui/board.js');
  const G = app.S.G;
  expect(G.n).toBe(15);
  for (let remaining = 17; remaining > 0; remaining--) {
    const move = hintMove(G.pieces, G.pos, G.walls);
    expect(move.left).toBe(remaining);
    applyMove(G, move.i, move.to);
    afterMove();
  }
  await until(() => app.$('survivalEnd').classList.contains('show'));
  expect(app.$('survivalEndTitle').textContent).toBe('¡Supervivencia completada!');
  expect(saved().survival).toMatchObject({ remaining: 0, cleared: 15, status: 'won' });
  app.$('survivalBack').click();
  app.$('menuBack').click();
  expect(app.$('homeSurvivalBest').textContent).toBe('15');
});
