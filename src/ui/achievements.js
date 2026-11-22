/**
 * Personalizar: tablero, fichas, llave y atuendos. Cada objeto se desbloquea solo al cumplir una acción del juego
 * (sin puntos ni canje) y se puede probar en vivo sobre un tablero de muestra antes de equiparlo.
 * Las reglas puras están en src/game/achievements.js.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { CITY_REPERTOIRES, FATE_THEME, HEROES_THEME, MENU_THEME, ZONE_THEMES } from '../audio/themes.js';
import { SURVIVAL_TRACKS } from '../audio/themes-survival.js';
import { $ } from '../dom.js';
import {
  CUSTOM_TYPES,
  DEFAULT_LOOK,
  DEFAULT_OUTFIT,
  OUTFITS,
  outfitArt,
  outfitOf,
  outfitUnlocked,
  setOutfit,
  RARITY,
  REWARDS,
  bumpStat,
  raiseStat as raiseStore,
  claimAchievements,
  lookOf,
  markStat as addToCollection,
  rewardById,
  revalidateUnlocks,
  rewardUnlocked,
  setLook,
  unlockOf,
  unlockProgress,
  unlockRewards,
} from '../game/achievements.js';
import { HEROES } from '../game/heroes.js';
import { BOOKS, BOOK_SCENES, BOOK_SERIES, CHARACTERS, PEOPLES_LORE, PLACES, SCENES } from '../data/lore-book.js';
import { INSCRIPTIONS } from '../data/lore.js';
import { loreOpen, loreProgress, loreTotal, loreUnlockedKeys, sealLinesRevealed } from '../game/lore.js';
import { FATE_CARDS } from '../game/fate.js';
import { numLocale } from '../i18n.js';
import { S, persist, store } from '../state.js';
import { celebration, trailPath } from './fx.js';
import { fateCardHtml } from './fate.js';
import { icon } from './icons.js';

const TYPE_NAME = {
  board: 'Borde',
  pieces: 'Fichas',
  key: 'Llave',
  card: 'Tarjetas',
  outfit: 'Atuendos',
  cover: 'Héroes',
  music: 'Música',
  bg: 'Fondo',
  trail: 'Estelas',
  fx: 'Celebración',
  aura: 'Clima',
  ui: 'Tema',
  lore: 'Lore',
};
/**
 * Pestañas principales de Personalizar (Lore vive ahora en su propia sección desde el menú principal):
 *   Tablero → Borde · Fichas · Llave · Tarjetas · Estelas · Celebración
 *   Atuendos → Lía · Jean · Juth
 *   Portada → Héroes · Música · Fondo · Clima · Tema
 */
const GROUPS = [
  { id: 'board', label: 'Tablero', icon: 'flag', types: ['board', 'pieces', 'key', 'card', 'trail', 'fx'] },
  { id: 'outfit', label: 'Atuendos', icon: 'heart', types: ['outfit'] },
  { id: 'cover', label: 'Portada', icon: 'stars', types: ['cover', 'music', 'bg', 'aura', 'ui'] },
];
const groupOf = (type) => GROUPS.find((g) => g.types.includes(type)) || GROUPS[0];
const TYPE_HINT = {
  board: 'Así se verá en tu tablero',
  pieces: 'Así se verán en tu tablero',
  key: 'Así se verá en tu tablero',
  card: 'Así lucirán las cartas del destino',
  cover: 'Así lucirán los héroes en la portada',
  music: 'Así sonará en el menú',
  bg: 'Así lucirá el fondo de la portada',
  trail: 'Así se verá tu estela al mover fichas',
  fx: 'Así celebrará tu llave al salir',
  aura: 'Así lucirá el clima en la portada',
  ui: 'Así lucirá la interfaz de la portada',
};
const SURVIVAL_BY_ID = {
  s0: SURVIVAL_TRACKS[0],
  s1: SURVIVAL_TRACKS.find((t) => t.name === 'Amanecer de acero') || SURVIVAL_TRACKS[1],
  s2: SURVIVAL_TRACKS.find((t) => t.name === 'Cumbre astral') || SURVIVAL_TRACKS[2],
};

const themeOf = (id) => {
  if (id === 'fate') return FATE_THEME;
  if (id === 'heroes') return HEROES_THEME;
  if (SURVIVAL_BY_ID[id]) return SURVIVAL_BY_ID[id];
  if (id?.startsWith('z')) return ZONE_THEMES[Number(id.slice(1))] || MENU_THEME;
  // Canciones de los escenarios de Lía (l0–l6) y de Juth (v0–v6)
  if (/^l\d$/.test(id || '')) return CITY_REPERTOIRES.lia[Number(id.slice(1))] || MENU_THEME;
  if (/^v\d$/.test(id || '')) return CITY_REPERTOIRES.van[Number(id.slice(1))] || MENU_THEME;
  return MENU_THEME;
};

const fmt = (n) => n.toLocaleString(numLocale());
const rewardName = (type, id) => rewardById(type, id)?.name || '';
const rarityOf = (item) => RARITY[item?.rarity] || RARITY.common;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const inRun = () => !!(S.run && S.G && !S.G.done);
/** Al equipar una música, la portada pasa a sonar con ella al instante (fuera de una partida). */
const playEquippedMusic = (type) => {
  if (type === 'music' && !inRun()) Music.scene('menu');
};
let activeType = 'board';
let loreTab = 'people'; // Lore: people · world · library
let loreChar = 'lia';
let activeHero = 'lia';
const lastType = {}; // último filtro usado en cada pestaña principal
let feedback = '';

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

/* ---------- novedades: objetos desbloqueados que aún no has visto ---------- */
const unseenKeys = () => {
  const seen = store.customSeen || {};
  const keys = [];
  for (const type of CUSTOM_TYPES)
    for (const item of REWARDS[type] || [])
      if (unlockOf(type, item.id) && rewardUnlocked(type, item.id, store) && !seen[`${type}:${item.id}`])
        keys.push(`${type}:${item.id}`);
  for (const [hero, list] of Object.entries(OUTFITS))
    for (const o of list)
      if (o.id !== DEFAULT_OUTFIT[hero] && outfitUnlocked(store, hero, o.id) && !seen[`outfit:${hero}:${o.id}`])
        keys.push(`outfit:${hero}:${o.id}`);
  for (const k of loreUnlockedKeys(store)) if (!seen[k]) keys.push(k);
  return keys;
};
const unseenIn = (type) => unseenKeys().filter((k) => k.startsWith(`${type}:`)).length;
/** Marca como vistas las entradas nuevas de la pestaña activa (la biblioteca marca cada tomo al abrirlo). */
/** Entradas que eran nuevas al entrar en la vista actual: conservan su sello «Nuevo» aunque ya cuenten como vistas. */
let freshNow = new Set();
let freshView = '';
const markCurrentSeen = () => {
  if (activeType === 'outfit') return markSeen(`outfit:${activeHero}`);
  if (activeType !== 'lore') return markSeen(activeType);
  if (loreTab === 'people') return markSeen('lore:char');
  if (loreTab === 'world') return markSeen('lore:place') | markSeen('lore:people');
  return markSeen('lore:book');
};
/** Marca como vistas las novedades de un tipo (y actualiza los avisos). Devuelve 1 si había algo nuevo. */
function markSeen(type) {
  const keys = unseenKeys().filter((k) => k.startsWith(`${type}:`));
  if (!keys.length) return 0;
  const seen = (store.customSeen ||= {});
  for (const k of keys) {
    seen[k] = 1;
    freshNow.add(k);
  }
  persist();
  paintAchBadge();
  return 1;
}

/** Actualiza las insignias numéricas de Personalizar y Lore en la pantalla principal. */
export function paintAchBadge() {
  const keys = unseenKeys();
  const lorePending = keys.filter((k) => k.startsWith('lore:')).length;
  const customPending = keys.length - lorePending;
  const badge = $('homeAchBadge');
  if (badge) {
    badge.hidden = customPending === 0;
    badge.textContent = customPending > 99 ? '99+' : String(customPending);
  }
  $('tabAch')?.classList.toggle('has-news', customPending > 0);
  const loreBadge = $('homeLoreBadge');
  if (loreBadge) {
    loreBadge.hidden = lorePending === 0;
    loreBadge.textContent = lorePending > 99 ? '99+' : String(lorePending);
  }
  $('tabLore')?.classList.toggle('has-news', lorePending > 0);
  // «Otros» resume con un número discreto lo que hay por estrenar dentro del desplegable
  const others = $('homeOthersBadge');
  if (others) {
    others.hidden = keys.length === 0;
    others.textContent = keys.length > 99 ? '99+' : String(keys.length);
  }
}

/* ---------- aviso «objeto desbloqueado» (de uno en uno) ---------- */
const queue = [];
let activeToast = null;
let toastsPaused = false;
function nextToast() {
  if (toastsPaused || activeToast || !queue.length) return;
  const { type, item } = queue.shift();
  const t = document.createElement('div');
  t.className = `ach-toast tier-${item.rarity === 'legendary' ? 'gold' : item.rarity === 'common' ? 'bronze' : 'silver'}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<i aria-hidden="true">${icon('unlock')}</i><div><small>Desbloqueado</small><b></b><span></span></div>`;
  t.querySelector('b').textContent = item.name;
  t.querySelector('span').textContent = 'Personalizar';
  document.body.appendChild(t);
  sfx.unlock();
  const timer = setTimeout(() => {
    t.remove();
    activeToast = null;
    nextToast();
  }, 3200);
  activeToast = { entry: { type, item }, element: t, timer };
}

/** Guarda los avisos mientras el jugador elige el camino y viaja a la próxima ciudad. */
export function pauseAchievementToasts(paused) {
  toastsPaused = paused;
  if (paused && activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.element.remove();
    queue.unshift(activeToast.entry);
    activeToast = null;
  }
  if (!paused) nextToast();
}

/** Anota las acciones cumplidas (registro interno) y desbloquea los objetos que correspondan. */
export function checkAchievements({ silent = false } = {}) {
  const logged = claimAchievements(store);
  const fresh = unlockRewards(store);
  paintAchBadge();
  if (!fresh.length && !logged.length) return fresh;
  persist();
  if (!silent) {
    queue.push(...fresh.slice(0, 3));
    nextToast();
  }
  return fresh;
}

/** Suma 1 a uno o varios contadores y comprueba si se desbloqueó algo. */
export function countStat(...names) {
  if (!names.length) return;
  for (const name of names) bumpStat(store, name);
  persist();
  checkAchievements();
}

/** Sube una marca máxima (p. ej. la mejor racha de una partida) y comprueba si se desbloqueó algo. */
export function raiseStat(name, value) {
  if (!raiseStore(store, name, value)) return;
  persist();
  checkAchievements();
}

/** Aplica `fn(store)` (que devuelve true si cambió alguna estadística) y comprueba los desbloqueos. */
export function updateStats(fn) {
  if (!fn(store)) return;
  persist();
  checkAchievements();
}

/** Anota `key` en una colección y comprueba si se desbloqueó algo. */
export function markStat(name, key) {
  if (!addToCollection(store, name, key)) return;
  persist();
  checkAchievements();
}

/* ---------- muestras ---------- */
/** Miniatura de una portada o un fondo recortados (public/portada/thumbs, ~5-12 KB); las demás imágenes se usan tal cual. */
const thumbOf = (src) => (src.startsWith('portada/') ? `portada/thumbs/${src.split('/').pop()}` : src);
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
const DEFAULT_BG_SRC = 'portada/fondos/bosque-cascada.webp';
const swatch = (type, id) => {
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

/** Condiciones de un objeto bloqueado: una línea por condición (con su avance) y una barra con el avance total. */
function unlockHtml(type, id) {
  return reqsHtml(unlockProgress(type, id, store));
}
/** Lo mismo para cualquier avance { reqs, … }: lista de condiciones con su contador y la barra de avance. */
function reqsHtml(p) {
  const lines = p.reqs
    .map(
      (r) =>
        `<li class="${r.done ? 'ok' : ''}"><i aria-hidden="true">${icon(r.done ? 'unlock' : 'lock')}</i><span>${r.text}</span><b>${fmt(r.value)}/${fmt(r.goal)}</b></li>`,
    )
    .join('');
  const pct = p.pct ?? (p.goal ? Math.min(100, (p.value / p.goal) * 100) : 0);
  return `<ul class="unlock-reqs${p.reqs.length > 1 ? ' multi' : ''}">${lines}</ul><u class="shop-save" role="img" aria-label="${Math.round(pct)} %"><i style="width:${pct}%"></i></u>`;
}

/* ---------- cuadrícula de objetos ---------- */
function renderGrid(type) {
  const look = lookOf(store);
  const cards = REWARDS[type]
    .map((item) => {
      const owned = rewardUnlocked(type, item.id, store);
      const equipped = look[type] === item.id;
      const rar = rarityOf(item);
      const isDefault = DEFAULT_LOOK[type] === item.id;
      const foot = owned
        ? equipped
          ? `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`
          : `<button type="button" class="shop-act equip" data-equip-type="${type}" data-equip-id="${item.id}">Equipar</button>`
        : `<div class="unlock-foot">${unlockHtml(type, item.id)}</div>`;
      return `<article class="ach-shop-card r-${rar.id}${equipped ? ' on' : ''}${owned ? ' owned' : ' locked'}">
        <button type="button" class="ach-shop-open" data-open-type="${type}" data-open-id="${item.id}" aria-label="Ver ${item.name}">
          ${isDefault ? `<span class="rar-chip default-chip">Por defecto</span>` : `<span class="rar-chip">${rar.name}</span>`}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
          <span class="ach-shop-art">${swatch(type, item.id)}</span>
          <b class="ach-shop-name">${item.name}</b>
        </button>${foot}</article>`;
    })
    .join('');
  const cols3 = ['key', 'pieces', 'board', 'trail', 'fx', 'aura', 'ui'].includes(type);
  return `<div class="ach-shop-grid${cols3 ? ' cols-3' : ''}" data-grid="${type}">${cards}</div>`;
}

/* ---------- Atuendos: conjuntos de traje por héroe ---------- */
function renderOutfits() {
  const h = HEROES.find((x) => x.id === activeHero) || HEROES[0];
  const worn = outfitOf(store, h.id);
  const cards = (OUTFITS[h.id] || [])
    .map((o) => {
      const owned = outfitUnlocked(store, h.id, o.id),
        on = worn === o.id;
      const art = outfitArt(h.id, o.id, 'adv');
      const foot = owned
        ? on
          ? `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`
          : `<button type="button" class="shop-act equip" data-outfit-hero="${h.id}" data-outfit-id="${o.id}">Equipar</button>`
        : `<div class="unlock-foot">${unlockHtml('outfit', `${h.id}:${o.id}`)}</div>`;
      return `<article class="ach-shop-card outfit-card r-${rarityOf(o).id}${on ? ' on' : ''}${owned ? ' owned' : ' locked'}">
          <span class="ach-shop-open">${o.id === DEFAULT_OUTFIT[h.id] ? '<span class="rar-chip default-chip">Por defecto</span>' : `<span class="rar-chip">${rarityOf(o).name}</span>`}<span class="outfit-art"><img src="${art}" alt="" loading="lazy" decoding="async"><button type="button" class="outfit-show" data-outfit-show="${h.id}:${o.id}" aria-label="Mostrar atuendo">${icon('stars')}<span>Mostrar</span></button></span><b class="ach-shop-name">${o.name}</b></span>${foot}</article>`;
    })
    .join('');
  return `<div class="ach-shop-grid" style="--accent:${h.color}">${cards}</div>`;
}

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
const miniBoard = () =>
  `<div class="frame look-mini" data-rot="0"><div class="look-mini-board">${MINI_PIECES.map(
    (p) =>
      `<div class="piece ${p.o} ${p.c}" style="--x:${p.x};--y:${p.y};--w:${p.w};--h:${p.h}"><div class="face"></div></div>`,
  ).join('')}</div></div>`;

let pv = null; // { type, id, el, opener }

function footerFor(type, id) {
  if (rewardUnlocked(type, id, store)) {
    if (lookOf(store)[type] === id)
      return `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
    return `<button type="button" class="shop-act equip" data-pv-equip>Equipar</button><small class="look-pv-sub">Ya es tuyo</small>`;
  }
  return `<div class="unlock-foot pv-unlock">${unlockHtml(type, id)}</div>`;
}

/** Escena del probador: tablero de muestra, imagen (portada / fondo) o disco de música con botón de escuchar. */
/** Cartas de muestra: dos bendiciones y un Pacto, para ver cómo queda cada diseño con sus emblemas. */
const shortest = (list) =>
  [...list].sort((x, y) => x.gain.length + (x.cost?.length || 0) - (y.gain.length + (y.cost?.length || 0)))[0];
const SAMPLE_FATES = [
  shortest(FATE_CARDS.filter((c) => c.kind === 'blessing')) || FATE_CARDS[0],
  shortest(FATE_CARDS.filter((c) => c.kind === 'pact')) || FATE_CARDS[1],
];
/** Tablero de muestra para estelas y celebraciones: la llave recorre la fila libre (JS) y deja su rastro / lanza su festejo. */
const demoBoard = () => miniBoard().replace('class="frame look-mini"', 'class="frame look-mini demo-run"');
function stageFor(type, id) {
  if (type === 'trail' || type === 'fx')
    return `${demoBoard()}${type === 'fx' ? `<button type="button" class="look-pv-play" data-pv-fx>${id === 'none' ? 'Sin celebración' : 'Probar celebración'}</button>` : ''}`;
  if (type === 'aura') {
    const bg = rewardById('bg', lookOf(store).bg)?.src || DEFAULT_BG_SRC;
    return `<div class="look-pv-cover look-pv-aura"><img src="/${bg}" alt=""><i class="aura-fx" data-aura="${id}"><i></i></i></div>`;
  }
  if (type === 'ui')
    return `<div class="uim-stage" data-ui-scope="${id}">
      <div class="uim-menu"><b class="uim-logo">DAWN<i>SLIDE</i></b>
        <div class="uim-modes"><span class="uim-mode m1"><i></i><b>Aventura</b><small>Camino de 21 niveles</small></span><span class="uim-mode m2"><i></i><b>Desafío</b><small>Con límite de turnos</small></span><span class="uim-mode m3"><i></i><b>Retos diarios</b><small>Reto de hoy pendiente</small></span></div>
        <div class="uim-row"><span class="uim-pill">Personalizar</span><span class="uim-pill">Más</span></div>
      </div>
      <div class="uim-pick"><b>Elige tu compañero</b><div class="uim-heroes">${HEROES.map((h) => `<span class="uim-hero${h.id === 'lia' ? ' on' : ''}" style="--accent:${h.color}"><i></i><small>${h.name}</small></span>`).join('')}</div><span class="uim-go">Comenzar aventura ➜</span></div>
    </div>`;
  if (type === 'card')
    return `<div class="look-fates" data-card-scope="${id}">${SAMPLE_FATES.map((c, i) => fateCardHtml(c, { tag: 'span', index: i })).join('')}</div>`;
  if (type === 'cover' || type === 'bg') {
    const src = rewardById(type, id)?.src || '';
    return `<div class="look-pv-cover"><img src="/${src}" alt=""></div>`;
  }
  if (type === 'music')
    return `<div class="look-pv-music"><div class="look-disc" aria-hidden="true"><i>${icon('stars')}</i></div><button type="button" class="look-pv-play" data-pv-play>Escuchar</button></div>`;
  return miniBoard();
}

/** Pone el objeto «puesto» mientras dura la vista previa. */
function tryOn(type, id) {
  const look = lookOf(store);
  document.body.dataset.board = type === 'board' ? id : look.board;
  document.body.dataset.pieces = type === 'pieces' ? id : look.pieces;
  document.body.dataset.key = type === 'key' ? id : look.key;
  document.body.dataset.ui = type === 'ui' ? id : look.ui;
}

/**
 * Demostración en vivo de una estela o una celebración sobre el tablero de muestra: la llave de la fila 3 va y viene
 * (ida y vuelta suave) y, según el caso, deja su estela por el camino o lanza la celebración al llegar a la salida.
 */
function startDemo(el, type, id) {
  const key = el.querySelector('.look-mini .piece.red'),
    board = el.querySelector('.look-mini-board');
  if (!key || !board) return;
  const item = rewardById(type, id),
    calm = reducedMotion();
  let raf = 0,
    prev = null,
    lastX = -1;
  const t0 = performance.now(),
    fireFx = () => {
      const b = board.getBoundingClientRect(),
        r = key.getBoundingClientRect(),
        fx = item?.burst;
      if (fx) celebration(id, b.right - 8, r.top + r.height / 2, b.width, fx.colors);
    };
  const frame = (now) => {
    const t = (now - t0) / 1000,
      cyc = (t % 3.2) / 3.2, // 0→1: ida (0–.5) y vuelta (.5–1)
      k = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2,
      x = 4 * (1 - Math.cos(Math.PI * k)) * 0.5;
    if (!calm) key.style.setProperty('--x', x.toFixed(3));
    const r = key.getBoundingClientRect();
    if (type === 'trail' && item?.colors && !calm) {
      const fwd = lastX < 0 || x >= lastX,
        px = fwd ? r.left : r.right,
        py = r.top + r.height / 2;
      if (prev && Math.abs(x - lastX) > 0.002) trailPath(id, prev[0], prev[1], px, py, item.colors);
      prev = [px, py];
    }
    // La celebración se lanza cuando la llave llega a la salida (arriba del recorrido) y no se repite hasta que vuelve
    if (type === 'fx' && !calm && item?.burst && lastX < 3.9 && x >= 3.9) fireFx();
    lastX = x;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  const btn = el.querySelector('[data-pv-fx]');
  if (btn) btn.onclick = () => item?.burst && fireFx();
  if (type === 'fx' && calm) setTimeout(() => item?.burst && fireFx(), 300);
  return () => cancelAnimationFrame(raf);
}

function paintPreview() {
  if (!pv) return;
  pv.el.querySelector('.look-pv-foot').innerHTML = footerFor(pv.type, pv.id);
  const equip = pv.el.querySelector('[data-pv-equip]');
  if (equip)
    equip.onclick = () => {
      if (!setLook(store, pv.type, pv.id)) return;
      persist();
      sfx.ui();
      feedback = `Activado: ${rewardName(pv.type, pv.id)}`;
      if (!['board', 'pieces', 'key', 'ui'].includes(pv.type)) applyLook();
      playEquippedMusic(pv.type);
      if (pv.type === 'music') {
        pv.playing = true;
        const play = pv.el.querySelector('[data-pv-play]');
        if (play) play.textContent = 'Detener';
        pv.el.querySelector('.look-pv-music')?.classList.add('on');
      }
      paintPreview();
      renderAchievements();
    };
}

function closePreview() {
  if (!pv) return;
  pv.stopDemo?.();
  const { el, opener, playing, id } = pv;
  document.removeEventListener('keydown', pv.onKey);
  el.remove();
  pv = null;
  applyLook(); // quita lo que se estaba probando y deja lo equipado
  if (playing && !inRun() && lookOf(store).music !== id) Music.scene('menu'); // vuelve a la música equipada
  document.querySelector(`[data-open-type="${opener.type}"][data-open-id="${opener.id}"]`)?.focus?.();
}

export function openPreview(type, id) {
  const item = rewardById(type, id);
  if (!item || !['board', 'pieces', 'key', 'card', 'trail', 'fx', 'cover', 'bg', 'music', 'aura', 'ui'].includes(type))
    return;
  if (pv) closePreview();
  const rar = rarityOf(item);
  const el = document.createElement('div');
  el.className = 'look-pv-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'lookPvName');
  el.innerHTML = `<div class="look-pv r-${rar.id}${rewardUnlocked(type, id, store) ? ' unlocked' : ''}">
      <header class="look-pv-head">
        ${DEFAULT_LOOK[type] === id ? `<span class="rar-chip default-chip">Por defecto</span>` : `<span class="rar-chip">${rar.name}</span>`}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
        <small>${TYPE_NAME[type]}</small>
        <h3 id="lookPvName">${item.name}</h3>
        <button type="button" class="look-pv-x" data-pv-close aria-label="Cerrar">✕</button>
      </header>
      <div class="look-pv-stage" data-type="${type}">${stageFor(type, id)}</div>
      <p class="look-pv-note"><b>${TYPE_HINT[type]}</b><span>${rar.note}</span></p>
      <footer class="look-pv-foot"></footer>
    </div>`;
  document.body.appendChild(el);
  pv = { type, id, el, opener: { type, id }, playing: false };
  if (['board', 'pieces', 'key', 'ui'].includes(type)) tryOn(type, id);
  paintPreview();
  if (type === 'trail' || type === 'fx') pv.stopDemo = startDemo(el, type, id);
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-pv-close]')) {
      sfx.ui();
      closePreview();
    }
  });
  pv.onKey = (e) => {
    if (e.key === 'Escape') closePreview();
  };
  document.addEventListener('keydown', pv.onKey);
  const play = el.querySelector('[data-pv-play]');
  if (play) {
    if (inRun()) play.hidden = true;
    play.onclick = () => {
      if (!pv) return;
      pv.playing = !pv.playing;
      if (pv.playing) Music.playTheme(themeOf(id));
      else Music.scene('menu');
      play.textContent = pv.playing ? 'Detener' : 'Escuchar';
      el.querySelector('.look-pv-music')?.classList.toggle('on', pv.playing);
    };
  }
  sfx.ui();
  (el.querySelector('[data-pv-equip]') || el.querySelector('[data-pv-close]'))?.focus?.();
}

/* ---------- Visor de atuendos: el traje en grande, sobre un fondo oscuro animado ---------- */
const POSES = [
  ['adv', 'Aventura'],
  ['sel', 'Selección'],
  ['act', 'Pose'],
];
let showcase = null;

function closeShowcase() {
  if (!showcase) return;
  document.removeEventListener('keydown', showcase.onKey);
  showcase.el.remove();
  showcase = null;
}

/** Abre el visor de un traje (también los bloqueados: se ven, con lo que falta para tenerlos). */
function openShowcase(hero, id, pose = 'adv') {
  const h = HEROES.find((x) => x.id === hero);
  const o = OUTFITS[hero]?.find((x) => x.id === id);
  if (!h || !o) return;
  closeShowcase();
  const el = document.createElement('div');
  el.className = 'outfit-show-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'osName');
  el.style.setProperty('--accent', h.color);
  el.innerHTML = `<div class="os-bg" aria-hidden="true"><i class="os-fog"></i><i class="os-fog os-fog-2"></i><i class="os-beam"></i><i class="os-dust"></i></div>
    <button type="button" class="os-close" data-os-close aria-label="Cerrar">✕</button>
    <figure class="os-stage"><img class="os-art" alt="" decoding="async"></figure>
    <div class="os-info">
      <span class="rar-chip r-${rarityOf(o).id}"></span>
      <h3 id="osName"></h3>
      <p class="os-hero"></p>
      <div class="os-poses" role="tablist" aria-label="Pose">${POSES.map(([p, label]) => `<button type="button" role="tab" data-os-pose="${p}">${label}</button>`).join('')}</div>
      <div class="os-foot"></div>
    </div>`;
  document.body.appendChild(el);
  showcase = { el, hero, id, pose };
  const paint = () => {
    const { pose: cur } = showcase;
    el.querySelector('.os-art').src = outfitArt(hero, id, cur);
    el.querySelector('.rar-chip').textContent = DEFAULT_OUTFIT[hero] === id ? 'Por defecto' : rarityOf(o).name;
    el.querySelector('#osName').textContent = o.name;
    el.querySelector('.os-hero').textContent = h.name;
    el.querySelectorAll('[data-os-pose]').forEach((b) => {
      const on = b.dataset.osPose === cur;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
    });
    const owned = outfitUnlocked(store, hero, id);
    const worn = outfitOf(store, hero) === id;
    el.classList.toggle('is-locked', !owned);
    el.querySelector('.os-foot').innerHTML = owned
      ? worn
        ? `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`
        : `<button type="button" class="shop-act equip" data-os-equip>Equipar</button>`
      : `<p class="os-locked">Bloqueado</p><div class="unlock-foot">${unlockHtml('outfit', `${hero}:${id}`)}</div>`;
    el.querySelector('[data-os-equip]')?.addEventListener('click', () => {
      if (!setOutfit(store, hero, id)) return;
      persist();
      if (S.run?.hero === hero && $('heroHudImg')) $('heroHudImg').src = outfitArt(hero, id, 'sel');
      sfx.ui();
      feedback = `Activado: ${o.name}`;
      paint();
      renderAchievements();
    });
  };
  el.addEventListener('click', (e) => {
    const pb = e.target.closest('[data-os-pose]');
    if (pb) {
      showcase.pose = pb.dataset.osPose;
      sfx.ui();
      paint();
    } else if (e.target === el || e.target.closest('[data-os-close]')) {
      sfx.ui();
      closeShowcase();
    }
  });
  showcase.onKey = (e) => {
    if (e.key === 'Escape') closeShowcase();
  };
  document.addEventListener('keydown', showcase.onKey);
  paint();
  sfx.ui();
  el.querySelector('[data-os-close]').focus();
}

/* ---------- Lore: la historia de Thyes (personajes, mundo, biblioteca y escenas) que se abre jugando ---------- */
const LORE_TABS = [
  ['people', 'Personajes', 'heart'],
  ['world', 'Mundo', 'flag'],
  ['library', 'Biblioteca', 'book'],
  ['scenes', 'Escenas', 'stars'],
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
const loreFresh = () => new Set([...freshNow, ...unseenKeys()]);
/** Un texto del lore: abierto (con el texto y, si es nuevo, su sello) o cerrado (con lo que falta). */
function loreEntryHtml({ key, title, text, req, secret = false, badge = '' }, fresh) {
  const p = loreProgress(req, store);
  if (!p.done)
    return `<article class="lore-entry locked${secret ? ' secret' : ''}"><h4><i aria-hidden="true">${icon('lock')}</i><span>${title}</span></h4><div class="unlock-foot">${reqsHtml(p)}</div></article>`;
  return `<article class="lore-entry open${secret ? ' secret' : ''}${fresh.has(key) ? ' fresh' : ''}"><h4><span>${badge ? `<small>${badge}</small>` : secret ? `<small>Nota secreta</small>` : ''}${title}</span>${fresh.has(key) ? `<em class="lore-new">Nueva entrada</em>` : ''}</h4><p class="lore-text">${text}</p></article>`;
}
const portraitOf = (c) => (c.hero ? outfitArt(c.hero, outfitOf(store, c.hero), 'sel') : `${c.art}`);
const figureOf = (c) => (c.hero ? outfitArt(c.hero, outfitOf(store, c.hero), 'adv') : `${c.art}`);

function renderPeople(fresh) {
  const c = CHARACTERS.find((x) => x.id === loreChar) || CHARACTERS[0];
  const got = (x) => x.entries.filter((e) => loreOpen(e.req, store)).length;
  const picker = CHARACTERS.map((x) => {
    const news = unseenKeys().filter((k) => k.startsWith(`lore:char:${x.id}:`)).length;
    return `<button type="button" class="ach-filter lore-char${x.id === c.id ? ' on' : ''}" role="tab" aria-selected="${x.id === c.id}" data-lore-char="${x.id}"><img class="lore-char-av" src="/${portraitOf(x)}" alt="" decoding="async"><span>${x.name}</span><small>${got(x)}/${x.entries.length}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
  }).join('');
  const hero = HEROES.find((h) => h.id === c.hero);
  const doneCount = got(c);
  const entries = c.entries
    .map((e, idx) =>
      loreEntryHtml(
        { key: `lore:char:${c.id}:${e.id}`, title: e.title, text: e.text, req: e.req, badge: `Capítulo ${ROMAN[idx]}` },
        fresh,
      ),
    )
    .join('');
  return `<div class="ach-filters lore-chars" role="tablist" aria-label="Personajes">${picker}</div>
    <header class="lore-who" style="--accent:${hero?.color || '#d8ab52'}">
      ${c.scene ? `<img class="lore-who-bg" src="/${c.scene}" alt="" decoding="async">` : ''}
      <span class="lore-portrait${c.hero ? ' is-cutout' : ''}"><img src="/${figureOf(c)}" alt="" decoding="async"></span>
      <div class="lore-who-copy">
        <h3>${c.name}</h3>
        <p class="lore-epithet">${c.epithet}</p>
        <div class="lore-who-prog"><small>${fmt(doneCount)} de ${fmt(c.entries.length)} entradas</small><u><i style="width:${(doneCount / c.entries.length) * 100}%"></i></u></div>
      </div>
    </header>
    <div class="lore-list lore-list-2">${entries}</div>`;
}

function renderWorld(fresh) {
  const lines = sealLinesRevealed(store);
  const phrase = INSCRIPTIONS.map((l, i) =>
    i < lines
      ? `<span class="on">${l}</span>`
      : `<span class="off" style="--w:${Math.max(8, l.length)}ch" aria-hidden="true"></span>`,
  ).join('');
  const cities = PLACES.map((p) => {
    const open = loreOpen(p.main.req, store);
    return `<section class="lore-city${open ? '' : ' locked'}" style="--hue:${p.zone * 47}">
      <div class="lore-city-hero">
        <img src="/backgrounds/zone-${p.zone}.webp" alt="" loading="lazy" decoding="async">
        <div class="lore-city-overlay">
          <span class="lore-city-seal">Sello de ${p.seal}</span>
          <h3>${p.name}</h3>
        </div>
        ${open ? '' : `<i class="lore-city-lock" aria-hidden="true">${icon('lock')}</i>`}
      </div>
      <div class="lore-city-body">
        ${loreEntryHtml({ key: `lore:place:${p.id}:main`, title: p.main.title, text: p.main.text, req: p.main.req }, fresh)}
        ${p.memory ? loreEntryHtml({ key: `lore:place:${p.id}:memory`, title: p.memory.title, text: p.memory.text, req: p.memory.req }, fresh) : ''}
        ${loreEntryHtml({ key: `lore:place:${p.id}:secret`, title: p.secret.title, text: p.secret.text, req: p.secret.req, secret: true }, fresh)}
      </div>
    </section>`;
  }).join('');
  const peoples = PEOPLES_LORE.map((p) => {
    const open = loreOpen(p.req, store),
      pr = loreProgress(p.req, store);
    return `<article class="lore-people${open ? '' : ' locked'}${fresh.has(`lore:people:${p.id}`) ? ' fresh' : ''}">
      <div class="lore-people-top">
        <span class="lore-portrait"><img src="/historia/${p.id}.webp" alt="" loading="lazy" decoding="async">${open ? '' : `<i aria-hidden="true">${icon('lock')}</i>`}</span>
        <div><h4>${p.name}${fresh.has(`lore:people:${p.id}`) ? `<em class="lore-new">Nueva entrada</em>` : ''}</h4>${open ? `<p class="lore-text">${p.text}</p>` : `<div class="unlock-foot">${reqsHtml(pr)}</div>`}</div>
      </div>
      ${p.legacy ? loreEntryHtml({ key: `lore:people:${p.id}:legacy`, title: p.legacy.title, text: p.legacy.text, req: p.legacy.req }, fresh) : ''}
    </article>`;
  }).join('');
  return `<section class="lore-phrase" aria-label="La Frase de los Sellos">
      <h3>La Frase de los Sellos</h3>
      <p>Cada ciudad que alcanzas revela una línea de la frase grabada en los sellos.</p>
      <div class="lore-lines">${phrase}</div>
      <small>Frase de los sellos: ${lines} de ${INSCRIPTIONS.length} líneas</small>
    </section>
    <h3 class="lore-h">Ciudades</h3><div class="lore-cities">${cities}</div>
    <h3 class="lore-h">Pueblos antiguos</h3><div class="lore-peoples">${peoples}</div>`;
}

const bookCover = (b, fresh) => {
  const open = loreOpen(b.req, store),
    p = loreProgress(b.req, store);
  return `<button type="button" class="lore-book${open ? '' : ' locked'}${fresh.has(`lore:book:${b.id}`) ? ' fresh' : ''}" data-lore-book="${b.id}" style="--hue:${b.hue}" aria-label="${b.title}">
    <span class="lore-cover"><i class="lore-no">${ROMAN[b.no - 1]}</i><span class="lore-emblem">${icon(b.emblem)}</span><b>${b.title}</b>${open ? '' : `<i class="lore-lock" aria-hidden="true">${icon('lock')}</i>`}${fresh.has(`lore:book:${b.id}`) ? `<em class="lore-new">Nuevo</em>` : ''}</span>
    <small>${open ? 'Leer' : p.reqs.find((r) => !r.done)?.text || ''}</small></button>`;
};
function renderLibrary(fresh) {
  const shelves = BOOK_SERIES.map((s) => {
    const list = BOOKS.filter((b) => b.series === s.id);
    return `<section class="lore-shelf"><h3 class="lore-h">${s.label}<small>${list.filter((b) => loreOpen(b.req, store)).length}/${list.length}</small></h3><div class="lore-books">${list.map((b) => bookCover(b, fresh)).join('')}</div></section>`;
  }).join('');
  return `<p class="look-note">Quince tomos del universo. Tócalos para leer; los que faltan piden una hazaña.</p>${shelves}`;
}

function renderScenes(fresh) {
  const cards = SCENES.map((s) => {
    const open = loreOpen(s.req, store),
      p = loreProgress(s.req, store);
    return `<button type="button" class="lore-scene-card${open ? ' open' : ' locked'}${fresh.has(`lore:scene:${s.id}`) ? ' fresh' : ''}" data-lore-scene="${s.id}" aria-label="${s.title}">
      <span class="lore-scene-img"><img src="/${s.src}" alt="" loading="lazy" decoding="async">${open ? '' : `<i aria-hidden="true">${icon('lock')}</i>`}${fresh.has(`lore:scene:${s.id}`) ? `<em class="lore-new">Nuevo</em>` : ''}</span>
      <span class="lore-scene-meta"><small>${s.place}</small><b>${s.title}</b>${open ? '' : `<em class="lore-scene-req">${p.reqs.find((r) => !r.done)?.text || ''}</em>`}</span>
    </button>`;
  }).join('');
  return `<p class="look-note">Escenas y paisajes de Thyes. Tócalas para abrir cada crónica ilustrada.</p><div class="lore-scenes-grid">${cards}</div>`;
}

function renderLore() {
  const fresh = loreFresh();
  const countNews = (prefixes) => unseenKeys().filter((k) => prefixes.some((p) => k.startsWith(p))).length;
  const tabTotals = {
    people: [
      CHARACTERS.reduce((n, c) => n + c.entries.filter((e) => loreOpen(e.req, store)).length, 0),
      CHARACTERS.reduce((n, c) => n + c.entries.length, 0),
    ],
    world: [
      PLACES.reduce(
        (n, p) =>
          n +
          (loreOpen(p.main.req, store) ? 1 : 0) +
          (p.memory && loreOpen(p.memory.req, store) ? 1 : 0) +
          (loreOpen(p.secret.req, store) ? 1 : 0),
        0,
      ) +
        PEOPLES_LORE.reduce(
          (n, p) => n + (loreOpen(p.req, store) ? 1 : 0) + (p.legacy && loreOpen(p.legacy.req, store) ? 1 : 0),
          0,
        ),
      PLACES.reduce((n, p) => n + 2 + (p.memory ? 1 : 0), 0) +
        PEOPLES_LORE.reduce((n, p) => n + 1 + (p.legacy ? 1 : 0), 0),
    ],
    library: [BOOKS.filter((b) => loreOpen(b.req, store)).length, BOOKS.length],
    scenes: [SCENES.filter((s) => loreOpen(s.req, store)).length, SCENES.length],
  };
  const tabs = LORE_TABS.map(([id, label, ic]) => {
    const news = countNews(
      id === 'people'
        ? ['lore:char']
        : id === 'world'
          ? ['lore:place', 'lore:people']
          : id === 'library'
            ? ['lore:book']
            : ['lore:scene'],
    );
    const [gotT, totT] = tabTotals[id];
    return `<button type="button" class="ach-filter${loreTab === id ? ' on' : ''}" role="tab" aria-selected="${loreTab === id}" data-lore-tab="${id}">${icon(ic)}<span>${label}</span><small>${gotT}/${totT}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
  }).join('');
  const body =
    loreTab === 'world'
      ? renderWorld(fresh)
      : loreTab === 'library'
        ? renderLibrary(fresh)
        : loreTab === 'scenes'
          ? renderScenes(fresh)
          : renderPeople(fresh);
  return `<div class="ach-filters lore-tabs" role="tablist" aria-label="Lore">${tabs}</div>
    <div class="lore-body" data-lore="${loreTab}">${body}</div>`;
}

function bindLore(box) {
  box.querySelectorAll('[data-lore-tab]').forEach((b) => {
    b.onclick = () => {
      loreTab = b.dataset.loreTab;
      sfx.ui();
      renderLorePanel();
    };
  });
  box.querySelectorAll('[data-lore-char]').forEach((b) => {
    b.onclick = () => {
      loreChar = b.dataset.loreChar;
      sfx.ui();
      renderLorePanel();
    };
  });
  box.querySelectorAll('[data-lore-book]').forEach((b) => {
    b.onclick = () => openBook(b.dataset.loreBook);
  });
  box.querySelectorAll('[data-lore-scene]').forEach((b) => {
    b.onclick = () => openScene(b.dataset.loreScene);
  });
}

/* ---------- Visor de escenas del Lore ---------- */
let sceneOv = null;
function closeScene() {
  if (!sceneOv) return;
  document.removeEventListener('keydown', sceneOv.onKey);
  const { el, id } = sceneOv;
  el.remove();
  sceneOv = null;
  document.querySelector(`[data-lore-scene="${id}"]`)?.focus?.();
}
function openScene(id) {
  const idx = SCENES.findIndex((s) => s.id === id);
  if (idx < 0) return;
  if (sceneOv) closeScene();
  const el = document.createElement('div');
  el.className = 'book-ov scene-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="scene-sheet">
      <button type="button" class="book-x" data-scene-close aria-label="Cerrar">✕</button>
      <div class="scene-stage"><img class="scene-art" alt="" decoding="async"></div>
      <div class="scene-body"></div>
      <footer><button type="button" data-scene-prev aria-label="Anterior">←</button><span class="scene-counter"></span><button type="button" data-scene-next aria-label="Siguiente">→</button></footer>
    </div>`;
  document.body.appendChild(el);
  sceneOv = { el, index: idx, id };
  const paint = () => {
    const s = SCENES[sceneOv.index];
    sceneOv.id = s.id;
    const open = loreOpen(s.req, store);
    const img = el.querySelector('.scene-art');
    img.src = `/${s.src}`;
    el.classList.toggle('is-locked', !open);
    el.querySelector('.scene-body').innerHTML = open
      ? `<small>${s.place}</small><h3>${s.title}</h3><p class="book-text">${s.text}</p>`
      : `<small>${s.place}</small><h3>${s.title}</h3><div class="book-locked"><i aria-hidden="true">${icon('lock')}</i><p>Bloqueado</p>${reqsHtml(loreProgress(s.req, store))}</div>`;
    el.querySelector('.scene-counter').textContent = `${sceneOv.index + 1} / ${SCENES.length}`;
    el.querySelector('[data-scene-prev]').disabled = sceneOv.index === 0;
    el.querySelector('[data-scene-next]').disabled = sceneOv.index === SCENES.length - 1;
  };
  const go = (d) => {
    const n = sceneOv.index + d;
    if (n < 0 || n >= SCENES.length) return;
    sceneOv.index = n;
    sfx.ui();
    paint();
  };
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-scene-close]')) {
      sfx.ui();
      closeScene();
    } else if (e.target.closest('[data-scene-prev]')) go(-1);
    else if (e.target.closest('[data-scene-next]')) go(1);
  });
  sceneOv.onKey = (e) => {
    if (e.key === 'Escape') closeScene();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  };
  document.addEventListener('keydown', sceneOv.onKey);
  paint();
  sfx.ui();
  el.querySelector('[data-scene-close]').focus();
}

/* ---------- Lector de libros: tapa de colores, páginas breves con capitular y cita final ---------- */
let reader = null;
function closeBook() {
  if (!reader) return;
  document.removeEventListener('keydown', reader.onKey);
  const { el, id } = reader;
  el.remove();
  reader = null;
  renderLorePanel();
  document.querySelector(`[data-lore-book="${id}"]`)?.focus?.();
}
function paintBook() {
  const { el, book: b, page } = reader,
    open = loreOpen(b.req, store),
    last = page === b.pages.length - 1;
  el.querySelector('.book-body').innerHTML = open
    ? `<p class="book-text">${b.pages[page]}</p>${last ? `<blockquote class="book-quote">${b.quote}</blockquote>` : ''}`
    : `<div class="book-locked"><i aria-hidden="true">${icon('lock')}</i><p>Bloqueado</p>${reqsHtml(loreProgress(b.req, store))}</div>`;
  el.querySelector('.book-page').textContent = open ? `Página ${page + 1} de ${b.pages.length}` : '';
  el.querySelector('[data-book-prev]').disabled = !open || page === 0;
  el.querySelector('[data-book-next]').disabled = !open || last;
}
function openBook(id) {
  const b = BOOKS.find((x) => x.id === id);
  if (!b) return;
  if (reader) closeBook();
  const el = document.createElement('div');
  el.className = 'book-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'bookTitle');
  el.style.setProperty('--hue', b.hue);
  const series = BOOK_SERIES.find((s) => s.id === b.series)?.label || '';
  const scene = BOOK_SCENES[b.id];
  el.innerHTML = `<div class="book-sheet">
      <button type="button" class="book-x" data-book-close aria-label="Cerrar libro">✕</button>
      <header class="${scene ? 'has-scene' : ''}">${scene ? `<img class="book-scene" src="/${scene}" alt="" decoding="async">` : ''}<small><span>Tomo ${b.no}</span> · <span>${series}</span></small><span class="lore-emblem">${icon(b.emblem)}</span><h3 id="bookTitle">${b.title}</h3></header>
      <div class="book-body"></div>
      <footer><button type="button" data-book-prev aria-label="Página anterior">←</button><span class="book-page"></span><button type="button" data-book-next aria-label="Página siguiente">→</button></footer>
    </div>`;
  document.body.appendChild(el);
  reader = { el, book: b, page: 0, id };
  const go = (d) => {
    if (!reader) return;
    const n = reader.page + d;
    if (n < 0 || n >= b.pages.length || !loreOpen(b.req, store)) return;
    reader.page = n;
    sfx.ui();
    paintBook();
  };
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-book-close]')) {
      sfx.ui();
      closeBook();
    } else if (e.target.closest('[data-book-prev]')) go(-1);
    else if (e.target.closest('[data-book-next]')) go(1);
  });
  reader.onKey = (e) => {
    if (e.key === 'Escape') closeBook();
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'ArrowRight') go(1);
  };
  document.addEventListener('keydown', reader.onKey);
  if (loreOpen(b.req, store)) {
    const seen = (store.customSeen ||= {});
    if (!seen[`lore:book:${id}`]) {
      seen[`lore:book:${id}`] = 1;
      persist();
      paintAchBadge();
    }
  }
  paintBook();
  sfx.ui();
  el.querySelector('[data-book-close]').focus();
}

/** Cierra cualquier visor abierto al salir de Personalizar. */
export function closeCustomView() {
  closePreview();
  closeShowcase();
}

export function renderLorePanel() {
  const box = $('panelLore');
  if (!box) return;
  const view = `lore|${loreTab}|${loreChar}`;
  if (view !== freshView) {
    freshView = view;
    freshNow = new Set();
  }
  const loreGot = loreUnlockedKeys(store).length;
  const total = loreTotal();
  box.innerHTML = `<header class="lore-banner">
      <img class="lore-banner-bg" src="/backgrounds/umbral-del-alba.webp" alt="" decoding="async">
      <div class="lore-banner-copy">
        <small>THYES · AÑO 4133</small>
        <h2>Crónica de Thyes</h2>
        <div class="ach-total lore-banner-prog">
          <p><b>${loreGot}</b> / ${total} <span>entradas</span></p>
          <u role="img" aria-label="${loreGot}/${total}"><i style="width:${(loreGot / total) * 100}%"></i></u>
        </div>
      </div>
    </header>
    ${renderLore()}`;
  bindLore(box);
  const marked =
    loreTab === 'people'
      ? markSeen('lore:char')
      : loreTab === 'world'
        ? markSeen('lore:place') | markSeen('lore:people')
        : loreTab === 'scenes'
          ? markSeen('lore:scene')
          : markSeen('lore:book');
  if (marked) renderLorePanel();
}

export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const view = `${activeType}|${activeHero}`;
  if (view !== freshView) {
    freshView = view;
    freshNow = new Set();
  }
  const all = CUSTOM_TYPES.filter((t) => t !== 'outfit').flatMap((t) => REWARDS[t].map((r) => [t, r]));
  const outfitAll = Object.entries(OUTFITS).flatMap(([h, l]) => l.map((o) => [h, o]));
  const outfitGot = outfitAll.filter(([h, o]) => outfitUnlocked(store, h, o.id)).length;
  const got = all.filter(([t, r]) => rewardUnlocked(t, r.id, store)).length + outfitGot;
  const grand = all.length + outfitAll.length;
  const group = groupOf(activeType);
  const countOf = (types) =>
    types.reduce(
      (n, t) => n + (t === 'outfit' ? outfitGot : REWARDS[t].filter((r) => rewardUnlocked(t, r.id, store)).length),
      0,
    );
  const newsOf = (types) => types.reduce((n, t) => n + unseenKeys().filter((k) => k.startsWith(`${t}:`)).length, 0);
  const tabs = GROUPS.map((g) => {
    const news = newsOf(g.types);
    return `<button type="button" class="ach-tab${g.id === group.id ? ' on' : ''}" role="tab" aria-selected="${g.id === group.id}" data-custom-group="${g.id}">${icon(g.icon)}<span>${g.label}</span>${news ? `<em class="ach-tab-badge dot" role="img" aria-label="${news} novedades"></em>` : ''}</button>`;
  }).join('');

  // Una sola fila deslizable de chips (subcategorías o héroes en Atuendos)
  const chips =
    activeType === 'outfit'
      ? HEROES.map((x) => {
          const list = OUTFITS[x.id] || [];
          const gotH = list.filter((o) => outfitUnlocked(store, x.id, o.id)).length;
          const news = unseenKeys().filter((k) => k.startsWith(`outfit:${x.id}:`)).length;
          return `<button type="button" class="ach-filter${x.id === activeHero ? ' on' : ''}" role="tab" aria-selected="${x.id === activeHero}" data-outfit-hero-tab="${x.id}"><span>${x.name}</span><small>${gotH}/${list.length}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
        }).join('')
      : group.types
          .map((type) => {
            const news = unseenIn(type);
            return `<button type="button" class="ach-filter${activeType === type ? ' on' : ''}" role="tab" aria-selected="${activeType === type}" data-custom-type="${type}"><span>${TYPE_NAME[type]}</span><small>${countOf([type])}/${REWARDS[type].length}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
          })
          .join('');

  box.innerHTML = `<div class="custom-header">
      <div class="ach-tabs ach-tabs-3" role="tablist" aria-label="Personalizar">${tabs}</div>
      <div class="ach-total custom-total">
        <p><b>${got}</b> / ${grand} <span>desbloqueados</span></p>
        <u role="img" aria-label="${got}/${grand}"><i style="width:${(got / grand) * 100}%"></i></u>
      </div>
    </div>
    <div class="custom-subbar">
      <div class="ach-filters custom-chips" role="tablist" aria-label="${group.label}">${chips}</div>
    </div>
    <section class="custom-catalog">
      <p class="look-note" id="lookNote" role="status">${feedback || (activeType === 'outfit' ? 'Cada conjunto cambia a tu héroe en la aventura y en la selección de personaje.' : 'Todo se desbloquea jugando. Toca un objeto para probarlo.')}</p>
      ${activeType === 'outfit' ? renderOutfits() : renderGrid(activeType)}
    </section>`;

  box.querySelectorAll('[data-custom-group]').forEach((btn) => {
    btn.onclick = () => {
      lastType[group.id] = activeType;
      const next = GROUPS.find((g) => g.id === btn.dataset.customGroup);
      activeType = lastType[next.id] || next.types[0];
      feedback = '';
      sfx.ui();
      renderAchievements();
    };
  });
  box.querySelectorAll('[data-custom-type]').forEach((btn) => {
    btn.onclick = () => {
      activeType = btn.dataset.customType;
      feedback = '';
      sfx.ui();
      renderAchievements();
    };
  });
  box.querySelectorAll('[data-open-id]').forEach((btn) => {
    btn.onclick = () => openPreview(btn.dataset.openType, btn.dataset.openId);
  });
  box.querySelectorAll('[data-outfit-hero-tab]').forEach((btn) => {
    btn.onclick = () => {
      activeHero = btn.dataset.outfitHeroTab;
      sfx.ui();
      renderAchievements();
    };
  });
  box.querySelectorAll('[data-outfit-show]').forEach((btn) => {
    btn.onclick = () => {
      const [hero, id] = btn.dataset.outfitShow.split(':');
      openShowcase(hero, id);
    };
  });
  box.querySelectorAll('[data-outfit-id]').forEach((btn) => {
    btn.onclick = () => {
      const { outfitHero: hero, outfitId: id } = btn.dataset;
      if (!setOutfit(store, hero, id)) return;
      persist();
      if (S.run?.hero === hero && $('heroHudImg')) $('heroHudImg').src = outfitArt(hero, id, 'sel');
      sfx.ui();
      feedback = `Activado: ${OUTFITS[hero].find((o) => o.id === id).name}`;
      renderAchievements();
    };
  });
  box.querySelectorAll('[data-equip-id]').forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.equipType;
      const id = btn.dataset.equipId;
      if (!setLook(store, type, id)) return;
      persist();
      applyLook();
      playEquippedMusic(type);
      sfx.ui();
      feedback = `Activado: ${rewardName(type, id)}`;
      renderAchievements();
    };
  });
  // Visitar una pestaña marca sus novedades como vistas (los avisos numéricos desaparecen; los sellos «Nuevo» de esta visita se quedan)
  if (markCurrentSeen()) renderAchievements();
}

// Al arrancar: desbloquear en silencio lo ya cumplido (también en guardados antiguos) y aplicar el aspecto
if (revalidateUnlocks(store)) persist(); // cierra lo abierto con reglas anteriores
checkAchievements({ silent: true });
applyLook();
