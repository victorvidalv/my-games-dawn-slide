// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bootApp } from './app.js';
import { COUNTERS, REWARDS, UNLOCKS } from '../../src/game/achievements.js';

it('Personalizar: lo cumplido se desbloquea solo, la badge avisa y se puede probar y equipar', async () => {
  // Un borde que se desbloquea con un contador simple: el guardado ya lo cumple
  const pick = REWARDS.board
    .slice(1)
    .find((r) => UNLOCKS[`board:${r.id}`].reqs.length === 1 && COUNTERS.includes(UNLOCKS[`board:${r.id}`].stat));
  const u = UNLOCKS[`board:${pick.id}`];
  const app = await bootApp({ save: { paths: { c1: { level: 3, score: 900 } }, stats: { [u.stat]: u.goal } } });

  // Se desbloqueó solo y la insignia avisa
  const owned = Object.keys(app.store.shopOwned);
  expect(owned).toContain(`board:${pick.id}`);
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(Number(app.$('homeAchBadge').textContent)).toBeGreaterThanOrEqual(1);

  app.$('tabAch').click();
  const panel = app.$('panelAch');
  // Tres pestañas (Tablero, Atuendos y Portada) y, dentro de Tablero, los filtros Borde · Fichas · Llave / Tarjetas · Estelas · Celebración; no hay puntos ni «Reclamar»
  expect([...panel.querySelectorAll('[data-custom-group]')].map((b) => b.dataset.customGroup)).toEqual([
    'board',
    'outfit',
    'cover',
  ]);
  expect([...panel.querySelectorAll('[data-custom-type]')].map((b) => b.dataset.customType)).toEqual([
    'board',
    'pieces',
    'key',
    'card',
    'trail',
    'fx',
  ]);
  expect(panel.querySelector('[data-claim]')).toBeNull();
  expect(app.$('achWallet')).toBeNull();

  // Ver la categoría marca sus novedades como vistas
  panel.querySelector('[data-custom-type="board"]').click();
  expect(app.$('panelAch').querySelectorAll('.ach-shop-card.locked .unlock-reqs li').length).toBeGreaterThan(0);

  // Probar un objeto bloqueado muestra cómo conseguirlo, sin equiparlo
  const legendary = REWARDS.board.at(-1).id;
  app.$('panelAch').querySelector(`[data-open-type="board"][data-open-id="${legendary}"]`).click();
  let preview = document.querySelector('.look-pv-ov');
  expect(preview.querySelectorAll('.unlock-reqs li')).toHaveLength(3); // la legendaria pide tres condiciones
  expect(preview.querySelector('[data-pv-equip]')).toBeNull();
  expect(document.body.dataset.board).toBe(legendary);
  preview.querySelector('[data-pv-close]').click();
  expect(document.body.dataset.board).toBe('wood');

  // Equipar uno desbloqueado desde el probador
  app.$('panelAch').querySelector(`[data-open-type="board"][data-open-id="${pick.id}"]`).click();
  preview = document.querySelector('.look-pv-ov');
  preview.querySelector('[data-pv-equip]').click();
  preview.querySelector('[data-pv-close]').click();
  expect(document.body.dataset.board).toBe(pick.id);

  // Atuendos: conjuntos por héroe
  app.$('panelAch').querySelector('[data-custom-group="outfit"]').click();
  expect(app.$('panelAch').querySelectorAll('[data-outfit-hero-tab]').length).toBe(3);
  expect(app.$('panelAch').querySelectorAll('.outfit-card').length).toBe(15);
  app.$('panelAch').querySelector('[data-outfit-hero-tab="jean"]').click();
  expect(app.$('panelAch').querySelector('.outfit-card.on .ach-shop-name').textContent).toBe('Vigía del reloj');

  // Visor de atuendos: el botón «Mostrar» abre el traje en grande (también los bloqueados), con sus poses
  app.$('panelAch').querySelector('[data-outfit-show="jean:aviador"]').click();
  const show = document.querySelector('.outfit-show-ov');
  expect(show).toBeTruthy();
  expect(show.querySelector('.os-art').getAttribute('src')).toContain('jean-aviador-adv');
  show.querySelector('[data-os-pose="act"]').click();
  expect(show.querySelector('.os-art').getAttribute('src')).toContain('jean-aviador-act');
  expect(show.classList.contains('is-locked')).toBe(true); // aún no lo tienes: muestra qué falta
  expect(show.querySelector('.unlock-reqs li')).toBeTruthy();
  show.querySelector('[data-os-close]').click();
  expect(document.querySelector('.outfit-show-ov')).toBeNull();

  // Portada: Héroes · Música · Fondo / Clima · Tema
  app.$('panelAch').querySelector('[data-custom-group="cover"]').click();
  expect([...app.$('panelAch').querySelectorAll('[data-custom-type]')].map((b) => b.dataset.customType)).toEqual([
    'cover',
    'music',
    'bg',
    'aura',
    'ui',
  ]);
  app.$('panelAch').querySelector('[data-custom-type="bg"]').click();
  expect(app.$('panelAch').querySelectorAll('.ach-shop-card').length).toBe(16); // 16 fondos
});

it('Atuendo equipado: se muestra al seleccionar cartas del destino, al morir (rescate y derrota) y en la victoria', async () => {
  const { OUTFITS, outfitArt } = await import('../../src/game/achievements.js');
  const customId = OUTFITS.lia[1].id; // 'aviadora' (pide 16 tableros con Lía)
  const app = await bootApp({
    save: {
      paths: { c1: { level: 3, score: 900 } },
      stats: { heroBoards_lia: 16 },
      run: { level: 2, seed: 123, start: 1, mode: 'c', hero: 'lia', score: 50, hints: 2, adj: 0, streak: 0 },
    },
  });
  const { fateOffer } = await import('../../src/game/fate.js');
  const { showFateDialog } = await import('../../src/ui/fate.js');
  const { showRescue } = await import('../../src/ui/heroes.js');
  const { endingStory } = await import('../../src/ui/story.js');
  const { HEROES } = await import('../../src/game/heroes.js');

  // Equipar desde la pestaña Atuendos en Personalizar
  app.$('tabAch').click();
  app.$('panelAch').querySelector('[data-custom-group="outfit"]').click();
  const equipBtn = app.$('panelAch').querySelector(`[data-outfit-hero="lia"][data-outfit-id="${customId}"]`);
  expect(equipBtn).toBeTruthy();
  equipBtn.click();
  expect(app.store.outfit?.lia).toBe(customId);

  // Cartas del destino
  const lia = HEROES.find((h) => h.id === 'lia');
  const run = { seed: 9, mode: 'c', fate: [], fatePicked: 0, pendingClear: { level: 10 } };
  showFateDialog({
    run,
    hero: lia,
    city: 1,
    cards: fateOffer(run, 1),
    rewards: null,
    onChoose: () => {},
    isActive: () => false,
  });
  expect(app.$('travelHero').getAttribute('src')).toBe(outfitArt('lia', customId, 'adv'));

  // Al morir: rescate y derrota
  app.S.run = { hero: 'lia', level: 2, revive: 0, rescue: { kind: 'lia' } };
  app.S.G = { done: false };
  showRescue('lia');
  expect(app.$('rescueHero').getAttribute('src')).toBe(outfitArt('lia', customId, 'act'));
  showRescue('learn');
  expect(app.$('rescueHero').getAttribute('src')).toBe(outfitArt('lia', customId, 'adv'));

  endingStory(false, 'lia', 5);
  expect(app.$('overPortrait').getAttribute('src')).toBe(outfitArt('lia', customId, 'act'));

  // Victoria con traje personalizado
  endingStory(true, 'lia', 21);
  expect(app.$('fPortrait').getAttribute('src')).toBe(outfitArt('lia', customId, 'act'));
});
