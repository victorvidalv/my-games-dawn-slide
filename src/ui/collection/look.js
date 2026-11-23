/** Aspecto equipado: lo aplica a la portada y al tablero, y elige la música del menú. */
import { Music } from '../../audio/music.js';
import { CITY_REPERTOIRES, FATE_THEME, HEROES_THEME, MENU_THEME, ZONE_THEMES } from '../../audio/themes.js';
import { SURVIVAL_TRACKS } from '../../audio/themes-survival.js';
import { $ } from '../../dom.js';
import { lookOf, rewardById } from '../../game/achievements.js';
import { store } from '../../state.js';
import { celebration } from '../fx.js';
import { inRun, reducedMotion } from './common.js';

const SURVIVAL_BY_ID = {
  s0: SURVIVAL_TRACKS[0],
  s1: SURVIVAL_TRACKS.find((t) => t.name === 'Amanecer de acero') || SURVIVAL_TRACKS[1],
  s2: SURVIVAL_TRACKS.find((t) => t.name === 'Cumbre astral') || SURVIVAL_TRACKS[2],
};

export const themeOf = (id) => {
  if (id === 'fate') return FATE_THEME;
  if (id === 'heroes') return HEROES_THEME;
  if (SURVIVAL_BY_ID[id]) return SURVIVAL_BY_ID[id];
  if (id?.startsWith('z')) return ZONE_THEMES[Number(id.slice(1))] || MENU_THEME;
  // Canciones de los escenarios de Lía (l0–l6) y de Juth (v0–v6)
  if (/^l\d$/.test(id || '')) return CITY_REPERTOIRES.lia[Number(id.slice(1))] || MENU_THEME;
  if (/^v\d$/.test(id || '')) return CITY_REPERTOIRES.van[Number(id.slice(1))] || MENU_THEME;
  return MENU_THEME;
};

/** Al equipar una música, la portada pasa a sonar con ella al instante (fuera de una partida). */
export const playEquippedMusic = (type) => {
  if (type === 'music' && !inRun()) Music.scene('menu');
};

/** Aplica el aspecto guardado: atributos en <body> para tablero, fichas y llave (y lo ya equipado de otras versiones). */
export function applyLook() {
  const look = lookOf(store);
  document.body.dataset.board = look.board;
  document.body.dataset.pieces = look.pieces;
  document.body.dataset.key = look.key;
  const cover = rewardById('cover', look.cover);
  const bg = rewardById('bg', look.bg);
  const scene = document.querySelector('#menu .cover-scene');
  const coverImg = document.querySelector('#menu .cover-heroes');
  const world = document.querySelector('#menu .cover-world');
  // Héroes: la capa de los héroes sobre el paisaje (los recortes con transparencia)
  if (coverImg && cover?.src) coverImg.src = `/${cover.src}`;
  // Fondo: paisaje propio con desvanecido, capa de efecto y movimiento suave (15-cover.css); solo en la portada
  if (bg?.src && world) {
    world.src = `/${bg.src}`;
    scene?.style.setProperty('--world-fx', bg.fx || '#ffe8ad');
    scene?.classList.add('cover-world-on');
  } else scene?.classList.remove('cover-world-on');
  document.body.dataset.cover = look.cover;
  document.body.dataset.bg = look.bg;
  document.body.dataset.card = look.card;
  document.body.dataset.trail = look.trail;
  document.body.dataset.ui = look.ui;
  const aura = document.querySelector('#menu .cover-aura');
  if (aura) aura.dataset.aura = look.aura;
  Music.setMenuTheme(themeOf(look.music));
  return look;
}

/** Celebración equipada en versiones anteriores (ya no se elige): sigue sonando para quien la tenía. */
export function celebrate(el) {
  const id = lookOf(store).fx,
    fx = rewardById('fx', id)?.burst;
  if (!fx || !el || reducedMotion()) return;
  const b = $('board').getBoundingClientRect(),
    r = el.getBoundingClientRect();
  celebration(id, b.right - 8, r.top + r.height / 2, b.width, fx.colors);
}
