/**
 * Personalizar: atuendos, llaves, fichas y estelas. Cada objeto se desbloquea solo al cumplir una acción del juego
 * (sin puntos ni canje) y se puede probar en vivo sobre un tablero de muestra antes de equiparlo.
 * Las reglas puras están en src/game/achievements.js.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { MENU_THEME } from '../audio/themes.js';
import { $ } from '../dom.js';
import {
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
import { persist, store } from '../state.js';
import { trailPath } from './fx.js';
import { fmtNum, reducedMotion } from './dom-utils.js';
import { icon } from './icons.js';
import { openOverlay } from './modal.js';
import { rarityBackdrop } from './outfit-fx.js';

const TYPE_NAME = {
  outfit: 'Atuendos',
  key: 'Llave',
  pieces: 'Fichas',
  trail: 'Estelas',
};
const TABS = ['outfit', 'key', 'pieces', 'trail'];
const VISIBLE_REWARDS = {
  key: ['red', 'neon', 'galaxy'],
  pieces: ['paint', 'silk', 'lava'],
  trail: ['none', 'starlight', 'comet'],
};
const VISIBLE_OUTFITS = {
  lia: ['capitana', 'ingeniera', 'brasas'],
  jean: ['vigia', 'oni', 'sakura'],
  van: ['escriba', 'carmesi', 'cuervos'],
};
const VISIBLE_REWARD_TYPES = TABS.filter((t) => t !== 'outfit');
const visibleItems = (type) => {
  const ids = VISIBLE_REWARDS[type];
  const list = REWARDS[type] || [];
  return ids ? ids.map((id) => list.find((r) => r.id === id)).filter(Boolean) : [];
};
const isVisibleReward = (type, id) => VISIBLE_REWARDS[type]?.includes(id) || false;
const visibleOutfits = (hero) => {
  const ids = VISIBLE_OUTFITS[hero];
  const list = OUTFITS[hero] || [];
  return ids ? ids.map((id) => list.find((o) => o.id === id)).filter(Boolean) : [];
};
const isVisibleOutfit = (hero, id) => VISIBLE_OUTFITS[hero]?.includes(id) || false;

const TYPE_HINT = {
  pieces: 'Así se verán en tu tablero',
  key: 'Así se verá en tu tablero',
  trail: 'Así se verá tu estela al mover fichas',
};

const rewardName = (type, id) => rewardById(type, id)?.name || '';
const rarityOf = (item) => RARITY[item?.rarity] || RARITY.common;

let activeType = 'outfit';
let feedback = '';

/** Aplica el aspecto guardado: llave, fichas y estelas (el resto usa el estilo por defecto). */
export function applyLook() {
  const look = lookOf(store);
  document.body.dataset.board = DEFAULT_LOOK.board;
  document.body.dataset.pieces = isVisibleReward('pieces', look.pieces) ? look.pieces : DEFAULT_LOOK.pieces;
  document.body.dataset.key = isVisibleReward('key', look.key) ? look.key : DEFAULT_LOOK.key;
  document.body.dataset.trail = isVisibleReward('trail', look.trail) ? look.trail : DEFAULT_LOOK.trail;
  document.body.dataset.card = DEFAULT_LOOK.card;
  document.body.dataset.ui = DEFAULT_LOOK.ui;
  Music.setMenuTheme(MENU_THEME);
  return look;
}

/* ---------- novedades: objetos desbloqueados que aún no has visto ---------- */
const unseenKeys = () => {
  const seen = store.customSeen || {};
  const keys = [];
  for (const type of VISIBLE_REWARD_TYPES)
    for (const item of visibleItems(type))
      if (unlockOf(type, item.id) && rewardUnlocked(type, item.id, store) && !seen[`${type}:${item.id}`])
        keys.push(`${type}:${item.id}`);
  for (const hero of Object.keys(VISIBLE_OUTFITS))
    for (const o of visibleOutfits(hero))
      if (o.id !== DEFAULT_OUTFIT[hero] && outfitUnlocked(store, hero, o.id) && !seen[`outfit:${hero}:${o.id}`])
        keys.push(`outfit:${hero}:${o.id}`);
  return keys;
};
const unseenIn = (type) => unseenKeys().filter((k) => k.startsWith(`${type}:`)).length;

let freshNow = new Set();
let freshView = '';

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

/** Actualiza la insignia numérica de Personalizar en la pantalla principal. */
export function paintAchBadge() {
  const customPending = unseenKeys().length;
  const badge = $('homeAchBadge');
  if (badge) {
    badge.hidden = customPending === 0;
    badge.textContent = customPending > 99 ? '99+' : String(customPending);
  }
  $('tabAch')?.classList.toggle('has-news', customPending > 0);
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

/** Guarda los avisos mientras el jugador elige carta del destino. */
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
    const visibleFresh = fresh.filter(
      (entry) =>
        (entry.type === 'outfit' && isVisibleOutfit(entry.hero, entry.item?.id)) ||
        isVisibleReward(entry.type, entry.item?.id),
    );
    queue.push(...visibleFresh.slice(0, 3));
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
const TRAIL_SHAPE = {
  starlight: 'star',
  comet: 'comet',
};
const colorVars = (cols = []) => cols.map((c, i) => `--c${i + 1}:${c}`).join(';');
const swatch = (type, id) => {
  if (type === 'trail') {
    const t = rewardById('trail', id);
    return `<i class="swx sw-trail${t?.colors ? '' : ' none'}" data-shape="${TRAIL_SHAPE[id] || 'dot'}" style="${colorVars(t?.colors)}"><b></b><b></b><b></b><b></b><b></b><em class="sw-piece"></em></i>`;
  }
  if (type === 'key')
    return `<i class="sw sw-real" data-key="${id}"><i class="piece h red"><i class="face"></i></i></i>`;
  return `<i class="sw sw-real" data-pieces="${id}"><i class="piece h c4"><i class="face"></i></i><i class="piece h c1"><i class="face"></i></i><i class="piece v c2"><i class="face"></i></i></i>`;
};

function reqsHtml(p) {
  const lines = p.reqs
    .map(
      (r) =>
        `<li class="${r.done ? 'ok' : ''}"><i aria-hidden="true">${icon(r.done ? 'unlock' : 'lock')}</i><span>${r.text}</span><b>${fmtNum(r.value)}/${fmtNum(r.goal)}</b></li>`,
    )
    .join('');
  const pct = p.pct ?? (p.goal ? Math.min(100, (p.value / p.goal) * 100) : 0);
  return `<ul class="unlock-reqs${p.reqs.length > 1 ? ' multi' : ''}">${lines}</ul><u class="shop-save" role="img" aria-label="${Math.round(pct)} %"><i style="width:${pct}%"></i></u>`;
}
const unlockHtml = (type, id) => reqsHtml(unlockProgress(type, id, store));

const PREVIEW_EYE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';

/* ---------- cuadrícula de objetos ---------- */
function renderGrid(type) {
  const look = lookOf(store);
  const cards = visibleItems(type)
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
        <span class="ach-shop-open">
          ${isDefault ? `<span class="rar-chip default-chip">Por defecto</span>` : `<span class="rar-chip">${rar.name}</span>`}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
          <span class="ach-shop-art">${swatch(type, item.id)}<button type="button" class="custom-preview-btn" data-open-type="${type}" data-open-id="${item.id}" aria-label="Ver ${item.name}" title="Mostrar">${PREVIEW_EYE_SVG}</button></span>
          <b class="ach-shop-name">${item.name}</b>
        </span>${foot}</article>`;
    })
    .join('');
  return `<div class="ach-shop-grid cols-3" data-grid="${type}">${cards}</div>`;
}

/* ---------- Atuendos: todos los héroes juntos ---------- */
function renderOutfits() {
  return HEROES.map((h) => {
    const worn = outfitOf(store, h.id);
    const list = visibleOutfits(h.id);
    const gotH = list.filter((o) => outfitUnlocked(store, h.id, o.id)).length;
    const cards = list
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
          <span class="ach-shop-open">${o.id === DEFAULT_OUTFIT[h.id] ? '<span class="rar-chip default-chip">Por defecto</span>' : `<span class="rar-chip">${rarityOf(o).name}</span>`}<span class="outfit-art">${rarityBackdrop(rarityOf(o).id)}<img src="${art}" alt="" loading="lazy" decoding="async"><button type="button" class="custom-preview-btn outfit-show" data-outfit-show="${h.id}:${o.id}" aria-label="Mostrar atuendo" title="Mostrar">${PREVIEW_EYE_SVG}</button></span><b class="ach-shop-name">${o.name}</b></span>${foot}</article>`;
      })
      .join('');
    return `<section class="outfit-hero" style="--accent:${h.color}"><h3 class="panel-h">${h.name}<small>${gotH}/${list.length}</small></h3><div class="ach-shop-grid">${cards}</div></section>`;
  }).join('');
}

/* ---------- Probador: vista previa en vivo ---------- */
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
const demoBoard = () => miniBoard().replace('class="frame look-mini"', 'class="frame look-mini demo-run"');

let pv = null;

function footerFor(type, id) {
  if (rewardUnlocked(type, id, store)) {
    if (lookOf(store)[type] === id)
      return `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
    return `<button type="button" class="shop-act equip" data-pv-equip>Equipar</button><small class="look-pv-sub">Ya es tuyo</small>`;
  }
  return `<div class="unlock-foot pv-unlock">${unlockHtml(type, id)}</div>`;
}

function tryOn(type, id) {
  const look = lookOf(store);
  document.body.dataset.pieces = type === 'pieces' ? id : look.pieces;
  document.body.dataset.key = type === 'key' ? id : look.key;
}

function startDemo(el, id) {
  const key = el.querySelector('.look-mini .piece.red'),
    board = el.querySelector('.look-mini-board');
  if (!key || !board) return;
  const item = rewardById('trail', id),
    calm = reducedMotion();
  let raf = 0,
    prev = null,
    lastX = -1;
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000,
      cyc = (t % 3.2) / 3.2,
      k = cyc < 0.5 ? cyc * 2 : 2 - cyc * 2,
      x = 4 * (1 - Math.cos(Math.PI * k)) * 0.5;
    if (!calm) key.style.setProperty('--x', x.toFixed(3));
    const r = key.getBoundingClientRect();
    if (item?.colors && !calm) {
      const fwd = lastX < 0 || x >= lastX,
        px = fwd ? r.left : r.right,
        py = r.top + r.height / 2;
      if (prev && Math.abs(x - lastX) > 0.002) trailPath(id, prev[0], prev[1], px, py, item.colors);
      prev = [px, py];
    }
    lastX = x;
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
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
      if (pv.type === 'trail') applyLook();
      paintPreview();
      renderAchievements();
    };
}

function closePreview() {
  pv?.close();
}

function openPreview(type, id) {
  const item = rewardById(type, id);
  if (!item || !isVisibleReward(type, id)) return;
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
      <div class="look-pv-stage" data-type="${type}">${type === 'trail' ? demoBoard() : miniBoard()}</div>
      <p class="look-pv-note"><b>${TYPE_HINT[type]}</b><span>${rar.note}</span></p>
      <footer class="look-pv-foot"></footer>
    </div>`;
  pv = { type, id, el, opener: { type, id } };
  const closed = () => {
    const { opener, stopDemo } = pv;
    stopDemo?.();
    pv = null;
    applyLook();
    document.querySelector(`[data-open-type="${opener.type}"][data-open-id="${opener.id}"]`)?.focus?.();
  };
  pv.close = openOverlay(el, {
    closeSelector: '[data-pv-close]',
    onClose: closed,
  });
  if (type === 'pieces' || type === 'key') tryOn(type, id);
  paintPreview();
  // Ejemplo vivo: la llave se desliza hasta la salida (dejando la estela, si es una) para ver el objeto en acción
  if (type === 'trail' || type === 'key') pv.stopDemo = startDemo(el, id);
  sfx.ui();
  (el.querySelector('[data-pv-equip]') || el.querySelector('[data-pv-close]'))?.focus?.();
}

/* ---------- Visor de atuendos ---------- */
const POSES = [
  ['adv', 'Cuerpo entero'],
  ['sel', 'Pasiva'],
  ['act', 'Combate'],
];
let showcase = null;

function closeShowcase() {
  showcase?.close();
}

function openShowcase(hero, id, pose = 'adv') {
  const h = HEROES.find((x) => x.id === hero);
  const o = OUTFITS[hero]?.find((x) => x.id === id);
  if (!h || !o || !isVisibleOutfit(hero, id)) return;
  closeShowcase();
  const el = document.createElement('div');
  el.className = `outfit-show-ov r-${rarityOf(o).id}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'osName');
  el.style.setProperty('--accent', h.color);
  el.innerHTML = `<div class="os-bg" aria-hidden="true"><i class="os-fog"></i><i class="os-fog os-fog-2"></i><i class="os-beam"></i><i class="os-dust"></i>${rarityBackdrop(rarityOf(o).id)}</div>
    <button type="button" class="os-close" data-os-close aria-label="Cerrar">✕</button>
    <figure class="os-stage"><img class="os-art" alt="" decoding="async"></figure>
    <div class="os-info">
      <span class="rar-chip r-${rarityOf(o).id}"></span>
      <h3 id="osName"></h3>
      <p class="os-hero"></p>
      <div class="os-poses" role="tablist" aria-label="Pose">${POSES.map(([p, label]) => `<button type="button" role="tab" data-os-pose="${p}">${label}</button>`).join('')}</div>
      <div class="os-foot"></div>
    </div>`;
  showcase = { el, hero, id, pose };
  showcase.close = openOverlay(el, { closeSelector: '[data-os-close]', onClose: () => (showcase = null) });
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
    }
  });
  paint();
  sfx.ui();
  el.querySelector('[data-os-close]').focus();
}

export function closeCustomView() {
  closePreview();
  closeShowcase();
}

function snapScroll(box) {
  const scrolls = (root) =>
    [...root.querySelectorAll('*')].filter(
      (e) => e.scrollHeight > e.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(e).overflowY),
    );
  const parents = [];
  for (let e = box; e && e !== document.body; e = e.parentElement)
    if (e.scrollTop || e.scrollLeft) parents.push([e, e.scrollTop, e.scrollLeft]);
  const inner = scrolls(box).map((e) => [e.className, e.scrollTop]);
  const rows = [...box.querySelectorAll('[role="tablist"]')].map((r) => r.scrollLeft);
  return () => {
    for (const [e, top, left] of parents) {
      e.scrollTop = top;
      e.scrollLeft = left;
    }
    for (const [cls, top] of inner)
      if (cls) box.querySelector(`.${cls.trim().split(/\s+/).join('.')}`)?.scrollTo(0, top);
    box.querySelectorAll('[role="tablist"]').forEach((r, i) => {
      r.scrollLeft = rows[i] || 0;
    });
  };
}

export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const view = activeType;
  const prevView = freshView;
  if (view !== freshView) {
    freshView = view;
    freshNow = new Set();
  }
  const all = VISIBLE_REWARD_TYPES.flatMap((t) => visibleItems(t).map((r) => [t, r]));
  const outfitAll = Object.keys(VISIBLE_OUTFITS).flatMap((h) => visibleOutfits(h).map((o) => [h, o]));
  const outfitGot = outfitAll.filter(([h, o]) => outfitUnlocked(store, h, o.id)).length;
  const got = all.filter(([t, r]) => rewardUnlocked(t, r.id, store)).length + outfitGot;
  const grand = all.length + outfitAll.length;
  const totalOf = (t) => (t === 'outfit' ? outfitAll.length : visibleItems(t).length);
  const countOf = (t) =>
    t === 'outfit' ? outfitGot : visibleItems(t).filter((r) => rewardUnlocked(t, r.id, store)).length;

  const chips = TABS.map((type) => {
    const news = unseenIn(type);
    return `<button type="button" class="ach-filter${activeType === type ? ' on' : ''}" role="tab" aria-selected="${activeType === type}" data-custom-type="${type}"><span>${TYPE_NAME[type]}</span><small>${countOf(type)}/${totalOf(type)}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
  }).join('');

  const restore = view === prevView ? snapScroll(box) : null;
  box.innerHTML = `<div class="custom-header">
      <div class="ach-filters custom-chips" role="tablist" aria-label="Personalizar">${chips}</div>
      <div class="ach-total custom-total">
        <p><b>${got}</b> / ${grand} <span>desbloqueados</span></p>
        <u role="img" aria-label="${got}/${grand}"><i style="width:${(got / grand) * 100}%"></i></u>
      </div>
    </div>
    <section class="custom-catalog">
      <p class="look-note" id="lookNote" role="status">${feedback || (activeType === 'outfit' ? 'Cada conjunto cambia a tu héroe en la aventura y en la selección de personaje.' : 'Todo se desbloquea jugando. Toca un objeto para probarlo.')}</p>
      ${activeType === 'outfit' ? renderOutfits() : renderGrid(activeType)}
    </section>`;
  restore?.();

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
      sfx.ui();
      feedback = `Activado: ${rewardName(type, id)}`;
      renderAchievements();
    };
  });
  if (markSeen(activeType)) renderAchievements();
}

// Al arrancar: desbloquear en silencio lo ya cumplido (también en guardados antiguos) y aplicar el aspecto
if (revalidateUnlocks(store)) persist(store, { merge: false });
checkAchievements({ silent: true });
applyLook();
