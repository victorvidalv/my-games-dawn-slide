// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bootApp } from './app.js';

it('muestra la badge de logros pendientes en inicio, permite reclamar uno a uno y canjear cosméticos', async () => {
  const app = await bootApp({
    save: {
      paths: { c1: { level: 30, score: 1000 } },
      stats: { boardsSolved: 1 },
    },
  });

  // 6 logros cumplidos (firstWin: 10, lv5: 10, city1: 15, lv20: 15, lv25: 25, score1k: 15 = 90 pts) -> badge con "6"
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(app.$('homeAchBadge').textContent).toBe('6');

  app.$('tabAch').click();
  const panel = app.$('panelAch');
  expect(panel.querySelectorAll('[data-claim]').length).toBe(6);
  expect(app.$('achWallet').textContent).toContain('0');

  // Reclamar logros individualmente
  panel.querySelector('[data-claim="firstWin"]').click();
  expect(app.$('homeAchBadge').textContent).toBe('5');
  expect(app.$('achWallet').textContent).toContain('10');

  for (const id of ['lv5', 'city1', 'lv20', 'lv25', 'score1k']) {
    panel.querySelector(`[data-claim="${id}"]`).click();
  }
  expect(app.$('homeAchBadge').hidden).toBe(true);
  expect(app.$('achWallet').textContent).toContain('90');

  // Ir a la pestaña Canjear y comprar borde "Pizarra nocturna" (30 pts)
  panel.querySelector('[data-ach-tab="shop"]').click();
  panel.querySelector('[data-buy-type="board"][data-buy-id="slate"]').click();
  expect(document.body.dataset.board).toBe('slate');
  expect(app.$('achWallet').textContent).toContain('60');
  // Comprar el primer elemento desbloquea "Primer estilo" -> badge vuelve a mostrar "1"
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(app.$('homeAchBadge').textContent).toBe('1');
});
