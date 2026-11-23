/** Muestras de cada objeto (miniaturas de la cuadrícula) y el tablero de muestra del probador. */
import { FATE_CARDS } from '../../game/fate.js';
import { lookOf, rewardById } from '../../game/achievements.js';
import { store } from '../../state.js';
import { fateCardHtml } from '../fate.js';
import { icon } from '../icons.js';

/* ---------- muestras ---------- */
/** Miniatura de una portada o un fondo recortados (public/portada/thumbs, ~5-12 KB); las demás imágenes se usan tal cual. */
export const thumbOf = (src) => (src.startsWith('portada/') ? `portada/thumbs/${src.split('/').pop()}` : src);
/** Forma de la partícula en la muestra de cada estela (el CSS dibuja una fila de cinco, de más grande a más pequeña). */
const TRAIL_SHAPE = {
  dust: 'dot',
  embers: 'dot',
  leaves: 'leaf',
  petals: 'leaf',
  bubbles: 'ring',
  ink: 'blob',
  frost: 'flake',
  sparks: 'streak',
  lightning: 'zig',
  rainbow: 'blob',
  starlight: 'star',
  comet: 'comet',
  phoenix: 'leaf',
  eclipse: 'blob',
};
const colorVars = (cols = []) => cols.map((c, i) => `--c${i + 1}:${c}`).join(';');
/** Miniatura del fondo equipado (sobre ella se ven los climas). */
const equippedBgThumb = () => thumbOf(rewardById('bg', lookOf(store).bg)?.src || DEFAULT_BG_SRC);
export const DEFAULT_BG_SRC = 'portada/fondos/bosque-cascada.webp';
export const swatch = (type, id) => {
  if (type === 'board') return `<i class="sw sw-board" data-board="${id}"></i>`;
  if (type === 'trail') {
    const t = rewardById('trail', id);
    return `<i class="swx sw-trail${t?.colors ? '' : ' none'}" data-shape="${TRAIL_SHAPE[id] || 'dot'}" style="${colorVars(t?.colors)}"><b></b><b></b><b></b><b></b><b></b><em class="sw-piece"></em></i>`;
  }
  if (type === 'fx') {
    const b = rewardById('fx', id)?.burst;
    return `<i class="swx swfx${b ? '' : ' none'}" data-fx="${id}" style="${colorVars(b?.colors)}"><b></b><b></b><b></b><b></b><b></b><b></b><b></b><b></b></i>`;
  }
  if (type === 'aura')
    return `<span class="swx sw-aura"><img src="/${equippedBgThumb()}" alt="" loading="lazy" decoding="async"><i class="aura-fx" data-aura="${id}"><i></i></i></span>`;
  if (type === 'ui')
    return `<span class="swx sw-ui" data-ui-scope="${id}"><i class="uim-card"><b class="uim-title"></b><i class="uim-btn a"></i><i class="uim-btn b"></i><i class="uim-btn c"></i></i></span>`;
  if (type === 'cover' || type === 'bg') {
    const src = thumbOf(rewardById(type, id)?.src || '');
    return `<img class="sw sw-cover sw-${type}" src="/${src}" alt="" loading="lazy" decoding="async">`;
  }
  if (type === 'card')
    // Una carta del destino real, pequeña: el emblema es el mismo en todas y cambian el marco, los colores y la forma
    return `<span class="sw-fate" data-card-scope="${id}">${fateCardHtml(SAMPLE_FATES[0], { tag: 'span' })}</span>`;
  if (type === 'music') return `<i class="sw sw-music" data-music="${id}">${icon('stars')}</i>`;
  // Fichas y llave de verdad en miniatura: usan el mismo diseño que el tablero (src/styles/40-piece-key-skins.css)
  if (type === 'key')
    return `<i class="sw sw-real" data-key="${id}"><i class="piece h red"><i class="face"></i></i></i>`;
  return `<i class="sw sw-real" data-pieces="${id}"><i class="piece h c4"><i class="face"></i></i><i class="piece h c1"><i class="face"></i></i><i class="piece v c2"><i class="face"></i></i></i>`;
};

/* ---------- Probador: vista previa en vivo ---------- */
/** Tablero de muestra 6×6: la llave roja sale por la derecha (fila 3) y el resto de fichas la rodean. */
const MINI_PIECES = [
  { c: 'red', o: 'h', x: 0, y: 2, w: 2, h: 1 },
  { c: 'c0', o: 'h', x: 0, y: 0, w: 3, h: 1 },
  { c: 'c2', o: 'v', x: 3, y: 0, w: 1, h: 2 },
  { c: 'c4', o: 'v', x: 5, y: 3, w: 1, h: 3 },
  { c: 'c1', o: 'v', x: 2, y: 3, w: 1, h: 3 },
  { c: 'c5', o: 'h', x: 3, y: 3, w: 2, h: 1 },
  { c: 'c6', o: 'h', x: 0, y: 4, w: 2, h: 1 },
  { c: 'c3', o: 'h', x: 3, y: 5, w: 2, h: 1 },
  { c: 'c7', o: 'v', x: 4, y: 0, w: 1, h: 2 },
];
export const miniBoard = () =>
  `<div class="frame look-mini" data-rot="0"><div class="look-mini-board">${MINI_PIECES.map(
    (p) =>
      `<div class="piece ${p.o} ${p.c}" style="--x:${p.x};--y:${p.y};--w:${p.w};--h:${p.h}"><div class="face"></div></div>`,
  ).join('')}</div></div>`;

/** Cartas de muestra: una bendición y un Pacto (los más cortos), para ver cómo queda cada diseño con sus emblemas. */
const shortest = (list) =>
  [...list].sort((x, y) => x.gain.length + (x.cost?.length || 0) - (y.gain.length + (y.cost?.length || 0)))[0];
export const SAMPLE_FATES = [
  shortest(FATE_CARDS.filter((c) => c.kind === 'blessing')) || FATE_CARDS[0],
  shortest(FATE_CARDS.filter((c) => c.kind === 'pact')) || FATE_CARDS[1],
];
/** Tablero de muestra para estelas y celebraciones: la llave recorre la fila libre (JS) y deja su rastro / lanza su festejo. */
export const demoBoard = () => miniBoard().replace('class="frame look-mini"', 'class="frame look-mini demo-run"');
