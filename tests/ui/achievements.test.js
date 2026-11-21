// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bootApp } from './app.js';

it('muestra la badge de logros pendientes en inicio, permite reclamar uno a uno y canjear cosméticos', async () => {
  const app = await bootApp({
    save: {
      paths: { c1: { level: 50, score: 25000 } },
      stats: { boardsSolved: 1 },
    },
  });

  // 5 logros cumplidos (firstWin: 10, city1: 15, lv25: 25, lv50: 35, score1k: 15 = 100 pts) -> badge con "5"
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(app.$('homeAchBadge').textContent).toBe('5');

  app.$('tabAch').click();
  const panel = app.$('panelAch');
  expect(panel.querySelectorAll('[data-claim]').length).toBe(5);
  expect(app.$('achWallet').textContent).toContain('0');

  // Reclamar logros individualmente
  panel.querySelector('[data-claim="firstWin"]').click();
  expect(app.$('homeAchBadge').textContent).toBe('4');
  expect(app.$('achWallet').textContent).toContain('10');

  for (const id of ['city1', 'lv25', 'lv50', 'score1k']) {
    panel.querySelector(`[data-claim="${id}"]`).click();
  }
  expect(app.$('achWallet').textContent).toContain('100');
  // 5 logros reclamados abren el primer cofre de colección (+25): la badge lo avisa
  expect(app.$('homeAchBadge').textContent).toBe('1');
  panel.querySelector('[data-chest="5"]').click();
  expect(app.$('homeAchBadge').hidden).toBe(true);
  expect(app.$('achWallet').textContent).toContain('125');

  // Ir a la pestaña Canjear: «Ver» abre el probador con el borde puesto, sin gastar nada todavía
  panel.querySelector('[data-ach-tab="shop"]').click();
  panel.querySelector('[data-buy-type="board"][data-buy-id="slate"]').click();
  const preview = document.querySelector('.look-pv-ov');
  expect(preview).toBeTruthy();
  expect(preview.querySelector('.look-mini')).toBeTruthy();
  expect(document.body.dataset.board).toBe('slate');
  expect(app.$('achWallet').textContent).toContain('125');
  // Cerrar sin canjear devuelve el borde equipado
  preview.querySelector('[data-pv-close]').click();
  expect(document.querySelector('.look-pv-ov')).toBeNull();
  expect(document.body.dataset.board).toBe('wood');

  // Canjear «Pizarra nocturna» (30 pts) desde el probador
  panel.querySelector('[data-open-type="board"][data-open-id="slate"]').click();
  document.querySelector('[data-confirm-buy]').click();
  expect(app.$('achWallet').textContent).toContain('95');
  document.querySelector('[data-pv-close]').click();
  expect(document.body.dataset.board).toBe('slate');
  // Comprar el primer elemento desbloquea "Primer estilo" -> badge vuelve a mostrar "1"
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(app.$('homeAchBadge').textContent).toBe('1');
});
