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
  // Tres pestañas (Tablero, Atuendos y Portada) y, dentro de Tablero, los filtros Borde · Fichas · Llave · Tarjetas; no hay puntos ni «Reclamar»
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

  // Portada: Héroes · Música · Fondo
  app.$('panelAch').querySelector('[data-custom-group="cover"]').click();
  expect([...app.$('panelAch').querySelectorAll('[data-custom-type]')].map((b) => b.dataset.customType)).toEqual([
    'cover',
    'music',
    'bg',
  ]);
  app.$('panelAch').querySelector('[data-custom-type="bg"]').click();
  expect(app.$('panelAch').querySelectorAll('.ach-shop-card').length).toBe(16); // 16 fondos
});
