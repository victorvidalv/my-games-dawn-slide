// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bootApp } from './app.js';
import { BOOKS, SCENES } from '../../src/data/lore-book.js';
import { loreTotal } from '../../src/game/lore.js';

it('Lore: sección propia con 100 desbloqueables (personajes, mundo, biblioteca y escenas)', async () => {
  expect(loreTotal()).toBe(100);
  const app = await bootApp({
    save: {
      paths: { c1: { level: 13, score: 900 } },
      stats: { boardsSolved: 40, heroBoards_lia: 30, completed: 1, heroWins: 1 },
    },
  });
  app.$('tabLore').click();
  const panel = () => app.$('panelLore');
  expect(panel().hidden).toBe(false);

  // Personajes: Lía con su historia abierta hasta donde ha jugado, y lo demás cerrado con su requisito
  expect([...panel().querySelectorAll('[data-lore-tab]')].map((b) => b.dataset.loreTab)).toEqual([
    'people',
    'world',
    'library',
    'scenes',
  ]);
  expect([...panel().querySelectorAll('[data-lore-char]')].map((b) => b.dataset.loreChar)).toEqual([
    'lia',
    'jean',
    'van',
    'tri',
    'vhorn',
  ]);
  expect(panel().querySelectorAll('.lore-entry.open').length).toBeGreaterThanOrEqual(3);
  expect(panel().querySelectorAll('.lore-entry.locked .unlock-reqs li').length).toBeGreaterThan(0);

  // Mundo: la frase de los sellos se revela línea a línea según las ciudades alcanzadas (nivel 13 = ciudad 5)
  panel().querySelector('[data-lore-tab="world"]').click();
  expect(panel().querySelectorAll('.lore-lines .on')).toHaveLength(7);
  expect(panel().querySelectorAll('.lore-lines .off')).toHaveLength(3);
  expect(panel().querySelectorAll('.lore-city')).toHaveLength(7);
  expect(panel().querySelectorAll('.lore-people')).toHaveLength(4);

  // Biblioteca: quince tomos; abrir uno desbloqueado muestra sus páginas y se navega con ← →
  panel().querySelector('[data-lore-tab="library"]').click();
  expect(panel().querySelectorAll('.lore-book')).toHaveLength(15);
  expect(BOOKS).toHaveLength(15);
  panel().querySelector('[data-lore-book="h1"]').click();
  const ov = document.querySelector('.book-ov');
  expect(ov.querySelector('.book-text').textContent).toContain('Thyes tenía diez reinos');
  expect(ov.querySelector('.book-page').textContent).toBe('Página 1 de 2');
  expect(ov.querySelector('[data-book-prev]').disabled).toBe(true);
  ov.querySelector('[data-book-next]').click();
  expect(ov.querySelector('.book-quote')).toBeTruthy(); // la cita va en la última página
  expect(ov.querySelector('[data-book-next]').disabled).toBe(true);
  ov.querySelector('[data-book-close]').click();
  expect(document.querySelector('.book-ov')).toBeNull();

  // Uno bloqueado enseña qué falta y no deja pasar páginas
  panel().querySelector('[data-lore-book="f3"]').click();
  const locked = document.querySelector('.book-ov');
  expect(locked.querySelector('.unlock-reqs li')).toBeTruthy();
  expect(locked.querySelector('[data-book-next]').disabled).toBe(true);
  locked.querySelector('[data-book-close]').click();

  // Escenas: 26 escenas ilustradas con visor panorámico
  panel().querySelector('[data-lore-tab="scenes"]').click();
  expect(panel().querySelectorAll('.lore-scene-card')).toHaveLength(26);
  expect(SCENES).toHaveLength(26);
  panel().querySelector('[data-lore-scene="s01"]').click();
  const sv = document.querySelector('.scene-ov');
  expect(sv.querySelector('.scene-art').getAttribute('src')).toContain('bosque-cascada.webp');
  expect(sv.querySelector('.book-text').textContent).toContain('tres luces');
  sv.querySelector('[data-scene-close]').click();
  expect(document.querySelector('.scene-ov')).toBeNull();
});
