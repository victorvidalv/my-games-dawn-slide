// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { bootApp } from './app.js';

it('Personalizar: está en el menú principal, solo muestra los cosméticos seleccionados y permite probar y equipar', async () => {
  // Ficha Seda (épica): se desbloquea al completar el modo Normal con los 3 héroes (heroWins = 1|2|4 = 7)
  const app = await bootApp({ save: { paths: { c1: { level: 3, score: 900 } }, stats: { heroWins: 7 } } });

  // Menú principal: Aventura, Desafío (entra directo) y Personalizar (sin Lore ni Guía)
  expect([...app.$('menuHome').querySelectorAll('button')].map((b) => b.id)).toEqual(['tabAdv', 'tabDaily', 'tabAch']);
  expect(app.$('tabSurvival')).toBeNull();
  expect(app.$('tabLore')).toBeNull();
  expect(app.$('tabGuide')).toBeNull();
  expect(app.$('homeOthers')).toBeNull();
  expect(app.$('homeMore')).toBeTruthy();

  // Se desbloqueó solo y la insignia avisa en el botón principal de Personalizar
  const owned = Object.keys(app.store.shopOwned);
  expect(owned).toContain('pieces:silk');
  expect(app.$('homeAchBadge').hidden).toBe(false);
  expect(Number(app.$('homeAchBadge').textContent)).toBeGreaterThanOrEqual(1);

  app.$('tabAch').click();
  const panel = app.$('panelAch');
  // Una sola fila de pestañas (sin pestañas principales): Atuendos primero, luego Llave, Fichas y Estelas
  expect(panel.querySelectorAll('[data-custom-group]')).toHaveLength(0);
  expect([...panel.querySelectorAll('[data-custom-type]')].map((b) => b.dataset.customType)).toEqual([
    'outfit',
    'key',
    'pieces',
    'trail',
  ]);
  expect(panel.querySelector('[data-claim]')).toBeNull();
  expect(app.$('achWallet')).toBeNull();

  // Atuendos (primera pestaña): todos los héroes juntos (3 por héroe)
  expect([...panel.querySelectorAll('[data-outfit-show]')].map((b) => b.dataset.outfitShow)).toEqual([
    'lia:capitana',
    'lia:ingeniera',
    'lia:brasas',
    'jean:vigia',
    'jean:oni',
    'jean:sakura',
    'van:escriba',
    'van:carmesi',
    'van:cuervos',
  ]);

  // Visor de atuendos: el botón «Mostrar» abre el traje en grande (también los bloqueados), con sus poses
  panel.querySelector('[data-outfit-show="jean:sakura"]').click();
  const show = document.querySelector('.outfit-show-ov');
  expect(show).toBeTruthy();
  expect([...show.querySelectorAll('[data-os-pose]')].map((tab) => tab.textContent)).toEqual([
    'Cuerpo entero',
    'Pasiva',
    'Combate',
  ]);
  expect(show.querySelector('.os-art').getAttribute('src')).toContain('jean-sakura-adv');
  show.querySelector('[data-os-pose="sel"]').click();
  expect(show.querySelector('.os-art').getAttribute('src')).toContain('jean-sakura-sel');
  show.querySelector('[data-os-pose="act"]').click();
  expect(show.querySelector('.os-art').getAttribute('src')).toContain('jean-sakura-act');
  expect(show.classList.contains('is-locked')).toBe(true); // aún no lo tienes: muestra qué falta
  expect(show.querySelector('.unlock-reqs li')).toBeTruthy();
  show.querySelector('[data-os-close]').click();
  expect(document.querySelector('.outfit-show-ov')).toBeNull();

  // Llaves: solo default, neon y galaxy
  panel.querySelector('[data-custom-type="key"]').click();
  expect([...panel.querySelectorAll('[data-open-type="key"]')].map((b) => b.dataset.openId)).toEqual([
    'red',
    'neon',
    'galaxy',
  ]);

  // Probar una llave bloqueada muestra cómo conseguirla, sin equiparla
  panel.querySelector('[data-open-type="key"][data-open-id="galaxy"]').click();
  let preview = document.querySelector('.look-pv-ov');
  expect(preview.querySelectorAll('.unlock-reqs li')).toHaveLength(1);
  expect(preview.querySelector('.unlock-reqs li').textContent).toContain('300');
  expect(preview.querySelector('[data-pv-equip]')).toBeNull();
  expect(document.body.dataset.key).toBe('galaxy');
  preview.querySelector('[data-pv-close]').click();
  expect(document.body.dataset.key).toBe('red');

  // Fichas: solo default, silk y lava; equipar silk desde el probador
  panel.querySelector('[data-custom-type="pieces"]').click();
  expect([...panel.querySelectorAll('[data-open-type="pieces"]')].map((b) => b.dataset.openId)).toEqual([
    'paint',
    'silk',
    'lava',
  ]);
  panel.querySelector('[data-open-type="pieces"][data-open-id="silk"]').click();
  preview = document.querySelector('.look-pv-ov');
  preview.querySelector('[data-pv-equip]').click();
  preview.querySelector('[data-pv-close]').click();
  expect(document.body.dataset.pieces).toBe('silk');

  // Estelas: solo default, starlight y comet
  panel.querySelector('[data-custom-type="trail"]').click();
  expect([...panel.querySelectorAll('[data-open-type="trail"]')].map((b) => b.dataset.openId)).toEqual([
    'none',
    'starlight',
    'comet',
  ]);
});

it('Atuendo equipado: se muestra al seleccionar cartas del destino, al morir (rescate y derrota) y en la victoria', async () => {
  const { outfitArt } = await import('../../src/game/achievements.js');
  const customId = 'ingeniera'; // épica: pide completar el modo Normal con Lía
  const app = await bootApp({
    save: {
      paths: { c1: { level: 3, score: 900 } },
      stats: { heroWins: 1 },
      run: { level: 2, seed: 123, start: 1, mode: 'c', hero: 'lia', score: 50, hints: 2, adj: 0, streak: 0 },
    },
  });
  const { fateOffer } = await import('../../src/game/fate.js');
  const { showFateDialog } = await import('../../src/ui/fate.js');
  const { showRescue } = await import('../../src/ui/heroes.js');
  const { endingStory } = await import('../../src/ui/story.js');
  const { HEROES } = await import('../../src/game/heroes.js');

  // Equipar desde la pestaña Atuendos (activa por defecto en Personalizar)
  app.$('tabAch').click();
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
