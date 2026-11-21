/**
 * Logros (100 logros con reclamo manual, cofres de colección y animación de premio) y Canjear (tienda cosmética con
 * rarezas y probador: cada objeto se ve en vivo sobre un tablero de muestra antes de gastar los puntos).
 * Las reglas y la economía pura están en src/game/achievements.js.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { FATE_THEME, HEROES_THEME, MENU_THEME, ZONE_THEMES } from '../audio/themes.js';
import { SURVIVAL_TRACKS } from '../audio/themes-survival.js';
import { $ } from '../dom.js';
import {
  ACHIEVEMENTS,
  GROUPS,
  MILESTONES,
  RARITY,
  REWARDS,
  REWARD_TYPES,
  TIERS,
  achBalance,
  bumpStat,
  raiseStat as raiseStore,
  buyShopItem,
  claimAchievements,
  claimedCount,
  collectAchievement,
  collectAllAchievements,
  lookOf,
  markStat as addToCollection,
  migrateShop,
  nearAchievements,
  nextMilestone,
  openMilestone,
  progressOf,
  readyMilestones,
  rewardById,
  rewardUnlocked,
  setLook,
  statsOf,
  unclaimedAchievements,
} from '../game/achievements.js';
import { numLocale } from '../i18n.js';
import { S, persist, store } from '../state.js';
import { burst, celebration } from './fx.js';
import { icon } from './icons.js';

const TYPE_NAME = {
  board: 'Borde del tablero',
  pieces: 'Fichas',
  key: 'Llaves',
  fx: 'Celebraciones',
  music: 'Melodías',
  cover: 'Portada',
};
const TYPE_ICON = { board: 'flag', pieces: 'rock', key: 'unlock', fx: 'crown', music: 'stars', cover: 'heart' };
const TYPE_HINT = {
  board: 'Así se verá en tu tablero',
  pieces: 'Así se verá en tu tablero',
  key: 'Así se verá en tu tablero',
  fx: 'Así celebrarás cada llave',
  music: 'Así sonará en el menú',
  cover: 'Así lucirá la portada del menú',
};
/** Colores de las chispas al canjear, según la rareza. */
const RARITY_FX = {
  common: { n: 22, colors: ['#e9dcc0', '#fff6c9', '#c9b48a'] },
  rare: { n: 34, colors: ['#6cb6ff', '#b8e0ff', '#ffffff', '#3d8bff'] },
  epic: { n: 46, colors: ['#c08cff', '#ffb0ff', '#ffffff', '#8a5cff'] },
  legendary: { n: 70, colors: ['#ffd24a', '#fff6c9', '#ff9f43', '#ffffff', '#ffe38a'] },
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
  return MENU_THEME;
};

const fmt = (n) => n.toLocaleString(numLocale());
const rewardName = (type, id) => rewardById(type, id)?.name || '';
const rarityOf = (item) => RARITY[item?.rarity] || RARITY.common;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const inRun = () => !!(S.run && S.G && !S.G.done);

let activeTab = 'list';
let activeShopType = 'board';
let shopFeedback = '';

/** Aplica el aspecto guardado: atributos en <body> para tablero, fichas y llave, y música del menú. */
export function applyLook() {
  const look = lookOf(store);
  document.body.dataset.board = look.board;
  document.body.dataset.pieces = look.pieces;
  document.body.dataset.key = look.key;
  const cover = rewardById('cover', look.cover);
  const coverImg = document.querySelector('#menu .cover-heroes');
  if (coverImg && cover?.src) coverImg.src = `/${cover.src}`;
  document.body.dataset.cover = look.cover;
  Music.setMenuTheme(themeOf(look.music));
  return look;
}

/** Celebración elegida al sacar la llave (nada si es «Sin adornos»): cada una tiene su forma y su movimiento (fx.js). */
export function celebrate(el) {
  const id = lookOf(store).fx,
    fx = rewardById('fx', id)?.burst;
  if (!fx || !el || reducedMotion()) return;
  const b = $('board').getBoundingClientRect(),
    r = el.getBoundingClientRect();
  celebration(id, b.right - 8, r.top + r.height / 2, b.width, fx.colors);
}

/** Actualiza la badge numérica del botón Logros en la pantalla principal (logros y cofres por abrir). */
export function paintAchBadge() {
  const pending = unclaimedAchievements(store).length + readyMilestones(store).length;
  const badge = $('homeAchBadge');
  if (badge) {
    badge.hidden = pending === 0;
    badge.textContent = pending > 99 ? '99+' : String(pending);
  }
  $('tabAch')?.classList.toggle('has-news', pending > 0);
}

/* ---------- aviso «logro listo para reclamar» (de uno en uno) ---------- */
const queue = [];
let activeToast = null;
let toastsPaused = false;
function nextToast() {
  if (toastsPaused || activeToast || !queue.length) return;
  const a = queue.shift();
  const t = document.createElement('div');
  t.className = `ach-toast tier-${a.tier}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<i aria-hidden="true">${icon('trophy')}</i><div><small>Logro desbloqueado</small><b></b><span></span></div>`;
  t.querySelector('b').textContent = a.name;
  t.querySelector('span').textContent = `+${a.points} pts · Reclámalo en Logros`;
  document.body.appendChild(t);
  sfx.unlock();
  const timer = setTimeout(() => {
    t.remove();
    activeToast = null;
    nextToast();
  }, 3200);
  activeToast = { achievement: a, element: t, timer };
}

/** Guarda los avisos mientras el jugador elige el camino y viaja a la próxima ciudad. */
export function pauseAchievementToasts(paused) {
  toastsPaused = paused;
  if (paused && activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.element.remove();
    queue.unshift(activeToast.achievement);
    activeToast = null;
  }
  if (!paused) nextToast();
}

/** Comprueba si se ha cumplido algún logro, lo guarda, actualiza la badge y avisa. */
export function checkAchievements({ silent = false } = {}) {
  const fresh = claimAchievements(store);
  paintAchBadge();
  if (!fresh.length) return fresh;
  persist();
  if (!silent) {
    queue.push(...fresh.slice(0, 3));
    nextToast();
  }
  return fresh;
}

/** Suma 1 a uno o varios contadores de logros y comprueba si se desbloqueó alguno. */
export function countStat(...names) {
  if (!names.length) return;
  for (const name of names) bumpStat(store, name);
  persist();
  checkAchievements();
}

/** Sube una marca máxima (p. ej. la mejor racha de una partida) y comprueba si se desbloqueó algún logro. */
export function raiseStat(name, value) {
  if (!raiseStore(store, name, value)) return;
  persist();
  checkAchievements();
}

/** Aplica `fn(store)` (que devuelve true si cambió alguna estadística) y comprueba los logros. */
export function updateStats(fn) {
  if (!fn(store)) return;
  persist();
  checkAchievements();
}

/** Anota `key` en una colección de logros y comprueba si se desbloqueó alguno. */
export function markStat(name, key) {
  if (!addToCollection(store, name, key)) return;
  persist();
  checkAchievements();
}

/* ---------- animación de premio al reclamar o canjear ---------- */
function spawnRewardPop(originEl, text, colors = ['#ffd24a', '#fff6c9', '#ff9f43', '#ffffff'], n = 26) {
  if (!originEl || reducedMotion()) return;
  const rect = originEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  burst(x, y, n, colors, 7);
  const pop = document.createElement('div');
  pop.className = 'ach-reward-pop';
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 900);
}

/** El saldo sube contando (de `from` al saldo actual) y la cartera da un saltito. */
function pulseWallet(from) {
  const pill = $('achWallet');
  if (!pill) return;
  pill.classList.remove('pop');
  void pill.offsetWidth;
  pill.classList.add('pop');
  const b = pill.querySelector('b'),
    to = achBalance(store);
  if (!b || from == null || from === to || reducedMotion()) return;
  const t0 = performance.now(),
    dur = 520;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur);
    b.textContent = fmt(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- muestras de la Tienda ---------- */
const swatch = (type, id) => {
  if (type === 'board') return `<i class="sw sw-board" data-board="${id}"></i>`;
  // Fichas y llave de verdad en miniatura: usan el mismo diseño que el tablero (src/styles/40-piece-key-skins.css)
  if (type === 'key')
    return `<i class="sw sw-real" data-key="${id}"><i class="piece h red"><i class="face"></i></i></i>`;
  if (type === 'pieces')
    return `<i class="sw sw-real" data-pieces="${id}"><i class="piece h c4"><i class="face"></i></i><i class="piece h c1"><i class="face"></i></i><i class="piece v c2"><i class="face"></i></i></i>`;
  if (type === 'fx') return `<i class="sw sw-fx" data-fx="${id}"></i>`;
  if (type === 'cover') {
    const src = rewardById('cover', id)?.src || 'backgrounds/cover-heroes.webp';
    return `<img class="sw sw-cover" src="/${src}" alt="" loading="lazy">`;
  }
  return `<i class="sw sw-music" data-music="${id}">${icon('stars')}</i>`;
};

/* ---------- lista de logros ---------- */
function renderAchRow(a, ach, claimed, stats) {
  const ready = !!(ach[a.id] && !claimed[a.id]);
  const done = !!claimed[a.id];
  const p = ach[a.id] ? a.goal : progressOf(a, stats);
  const tier = TIERS[a.tier] || TIERS.bronze;
  const right = ready
    ? `<button type="button" class="ach-claim-btn" data-claim="${a.id}">Reclamar <b>+${a.points}</b></button>`
    : done
      ? `<span class="ach-claimed-tag">✓ +${a.points}</span>`
      : `<div class="ach-prog" role="img" aria-label="${p}/${a.goal}"><em>+${a.points} pts</em><u><i style="width:${(p / a.goal) * 100}%"></i></u><span>${fmt(p)}/${fmt(a.goal)}</span></div>`;
  return `<li class="ach tier-${tier.id}${done ? ' got' : ''}${ready ? ' ready' : ''}"><i class="ach-ico" aria-hidden="true">${icon(done || ready ? 'trophy' : 'lock')}</i><div class="ach-copy"><div class="ach-head"><b>${a.name}</b><i class="ach-tier">${tier.name}</i></div><span>${a.desc}</span></div>${right}</li>`;
}

/** Barra de cofres de colección: avanza con cada logro reclamado. */
function renderChests() {
  const count = claimedCount(store),
    opened = store.achMilestones || {},
    next = nextMilestone(store),
    ready = readyMilestones(store);
  // Cofres repartidos a partes iguales; la barra se llena por tramos (de un cofre al siguiente).
  const posOf = (i) => ((i + 1) / MILESTONES.length) * 100;
  const k = MILESTONES.findIndex((m) => count < m.n);
  const fill =
    k === -1
      ? 100
      : (k ? posOf(k - 1) : 0) +
        ((count - (k ? MILESTONES[k - 1].n : 0)) / (MILESTONES[k].n - (k ? MILESTONES[k - 1].n : 0))) *
          (posOf(k) - (k ? posOf(k - 1) : 0));
  const nodes = MILESTONES.map((m, i) => {
    const state = opened[m.n] ? 'open' : count >= m.n ? 'ready' : 'locked';
    const inner = `<i aria-hidden="true">${icon(state === 'open' ? 'unlock' : state === 'ready' ? 'purse' : 'lock')}</i><b>${m.n}</b><small>+${m.points}</small>`;
    return state === 'ready'
      ? `<li class="chest ready" style="--at:${posOf(i)}"><button type="button" data-chest="${m.n}" aria-label="${m.name}">${inner}</button></li>`
      : `<li class="chest ${state}" style="--at:${posOf(i)}" title="${m.name}">${inner}</li>`;
  }).join('');
  const note = ready.length
    ? `<button type="button" class="ach-chest-open" data-chest="${ready[0].n}">${icon('purse')}<span>${ready[0].name}</span><b>Abrir +${ready[0].points}</b></button>`
    : next
      ? `<p class="ach-chests-note">Faltan ${next.n - count} logros para el ${next.name}</p>`
      : `<p class="ach-chests-note">¡Todos los cofres abiertos!</p>`;
  return `<section class="ach-chests" aria-label="Cofres de colección">
    <div class="ach-chests-head"><b>Cofres de colección</b><small>${count}/${ACHIEVEMENTS.length}</small></div>
    <div class="ach-chest-track"><u><i style="width:${fill}%"></i></u><ol>${nodes}</ol></div>
    ${note}
  </section>`;
}

function renderAchList(stats) {
  const ach = store.ach || {};
  const claimed = store.achClaimed || {};
  const pending = unclaimedAchievements(store);
  const pendingPts = pending.reduce((s, a) => s + a.points, 0);

  const readySection = pending.length
    ? `<div class="ach-claim-banner"><div><b>${pending.length === 1 ? `${pending.length} logro listo` : `${pending.length} logros listos`}</b><small>Reclama tus puntos para usarlos en Canjear</small></div>${pending.length > 1 ? `<button type="button" class="ach-claim-btn ach-claim-all" data-claim-all>Reclamar todos (+${pendingPts})</button>` : ''}</div>
      <ul class="ach-list">${pending.map((a) => renderAchRow(a, ach, claimed, stats)).join('')}</ul>`
    : '';

  const near = nearAchievements(store, 3);
  const nearSection = near.length
    ? `<h3 class="panel-h ach-near-h">Casi lo tienes</h3><ul class="ach-list ach-near">${near.map((a) => renderAchRow(a, ach, claimed, stats)).join('')}</ul>`
    : '';

  const groupSections = GROUPS.map((g) => {
    const all = ACHIEVEMENTS.filter((a) => a.group === g.id);
    const groupItems = all.filter((a) => !(ach[a.id] && !claimed[a.id]));
    if (!groupItems.length) return '';
    const got = all.filter((a) => ach[a.id]).length;
    return `<h3 class="panel-h ach-group-h${got === all.length ? ' full' : ''}"><span>${g.name}</span><small>${got}/${all.length}</small><u><i style="width:${(got / all.length) * 100}%"></i></u></h3><ul class="ach-list">${groupItems.map((a) => renderAchRow(a, ach, claimed, stats)).join('')}</ul>`;
  }).join('');

  return `${renderChests()}${readySection}${nearSection}${groupSections}`;
}

/* ---------- Canjear ---------- */
function renderAchShop() {
  const balance = achBalance(store);
  const look = lookOf(store);
  const subtabs = REWARD_TYPES.map((type) => {
    const ownedCount = REWARDS[type].filter((r) => rewardUnlocked(type, r.id, store)).length;
    return `<button type="button" class="ach-filter${activeShopType === type ? ' on' : ''}" role="tab" aria-selected="${activeShopType === type}" data-shop-type="${type}">${icon(TYPE_ICON[type])}<span>${TYPE_NAME[type]}</span><small>${ownedCount}/${REWARDS[type].length}</small></button>`;
  }).join('');

  const items = [...REWARDS[activeShopType]].sort((a, b) => a.price - b.price);
  const cards = items
    .map((item) => {
      const type = activeShopType;
      const owned = rewardUnlocked(type, item.id, store);
      const equipped = look[type] === item.id;
      const canBuy = !owned && balance >= item.price;
      const rar = rarityOf(item);
      const actionBtn = equipped
        ? `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`
        : owned
          ? `<button type="button" class="shop-act equip" data-equip-type="${type}" data-equip-id="${item.id}">Equipar</button>`
          : `<button type="button" class="shop-act buy${canBuy ? ' affordable' : ''}" data-buy-type="${type}" data-buy-id="${item.id}">Ver · ${item.price} pts</button>`;
      const progress =
        !owned && !canBuy
          ? `<u class="shop-save" role="img" aria-label="${fmt(balance)}/${fmt(item.price)}"><i style="width:${Math.min(100, (balance / item.price) * 100)}%"></i></u>`
          : '';
      return `<article class="ach-shop-card r-${rar.id}${equipped ? ' on' : ''}${owned ? ' owned' : ''}${canBuy ? ' can-buy' : ''}">
        <button type="button" class="ach-shop-open" data-open-type="${type}" data-open-id="${item.id}" aria-label="Ver ${item.name}">
          ${item.price === 0 ? `<span class="rar-chip default-chip">Por defecto</span>` : `<span class="rar-chip">${rar.name}</span>`}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
          <span class="ach-shop-art">${swatch(type, item.id)}</span>
          <b class="ach-shop-name">${item.name}</b>
        </button>${progress}${actionBtn}</article>`;
    })
    .join('');

  return `<div class="ach-filters shop-cats" role="tablist" aria-label="Categorías de la tienda">${subtabs}</div>
    <p class="look-note" id="lookNote" role="status">${shopFeedback || 'Toca un objeto para verlo en vivo antes de canjearlo.'}</p>
    <div class="ach-shop-grid">${cards}</div>`;
}

/* ---------- Probador: vista previa en vivo antes de canjear ---------- */
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

let pv = null; // { type, id, el, opener, timers, playing }

function stageFor(type, id) {
  if (type === 'cover') {
    const src = rewardById('cover', id)?.src || 'backgrounds/cover-heroes.webp';
    return `<div class="look-pv-cover"><img src="/${src}" alt=""></div>`;
  }
  if (type === 'music')
    return `<div class="look-pv-music"><div class="look-disc" aria-hidden="true"><i>${icon('stars')}</i></div><button type="button" class="look-pv-play" data-pv-play>Escuchar</button></div>`;
  return `${miniBoard()}${type === 'fx' ? `<button type="button" class="look-pv-replay" data-pv-replay>Repetir celebración</button>` : ''}`;
}

function footerFor(type, id) {
  const item = rewardById(type, id);
  const owned = rewardUnlocked(type, id, store);
  const equipped = lookOf(store)[type] === id;
  const balance = achBalance(store);
  if (equipped) return `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
  if (owned)
    return `<button type="button" class="shop-act equip" data-pv-equip>Equipar</button><small class="look-pv-sub">Ya es tuyo</small>`;
  if (balance >= item.price)
    return `<button type="button" class="shop-act buy affordable" data-confirm-buy>Canjear por ${item.price} pts</button><small class="look-pv-sub">Te quedarán ${fmt(balance - item.price)} pts</small>`;
  return `<u class="shop-save pv-save" role="img" aria-label="${fmt(balance)}/${fmt(item.price)}"><i style="width:${Math.min(100, (balance / item.price) * 100)}%"></i></u><button type="button" class="shop-act buy" data-confirm-buy aria-disabled="true">Te faltan ${fmt(item.price - balance)} pts</button><small class="look-pv-sub">Tienes ${fmt(balance)} pts</small>`;
}

/** Pone el objeto «puesto» mientras dura la vista previa (solo tablero, fichas y llave cambian el <body>). */
function tryOn(type, id) {
  const look = lookOf(store);
  document.body.dataset.board = type === 'board' ? id : look.board;
  document.body.dataset.pieces = type === 'pieces' ? id : look.pieces;
  document.body.dataset.key = type === 'key' ? id : look.key;
}

function previewBurst() {
  if (!pv || reducedMotion()) return;
  const id = pv.type === 'fx' ? pv.id : lookOf(store).fx;
  const fx = rewardById('fx', id)?.burst;
  const frame = pv.el.querySelector('.look-mini');
  if (!fx || !frame) return;
  const r = frame.getBoundingClientRect();
  const cell = r.width / 6.8;
  celebration(id, r.right - 6, r.top + cell * 2.9, r.width, fx.colors);
}

function paintPreview() {
  if (!pv) return;
  const item = rewardById(pv.type, pv.id);
  const rar = rarityOf(item);
  const box = pv.el.querySelector('.look-pv');
  box.className = `look-pv r-${rar.id}${pv.unlocked ? ' unlocked' : ''}`;
  pv.el.querySelector('.look-pv-foot').innerHTML = footerFor(pv.type, pv.id);
  bindPreviewFoot();
}

function bindPreviewFoot() {
  const el = pv.el;
  const buy = el.querySelector('[data-confirm-buy]');
  if (buy)
    buy.onclick = () => {
      const { type, id } = pv;
      const before = achBalance(store);
      const res = buyShopItem(store, type, id);
      if (!res.ok) {
        buy.classList.remove('shake');
        void buy.offsetWidth;
        buy.classList.add('shake');
        sfx.merchantNope();
        return;
      }
      persist();
      paintAchBadge();
      const rar = rarityOf(res.item);
      if (rar.id === 'legendary') sfx.fanfare();
      else if (rar.id === 'epic') sfx.success();
      else sfx.merchantCoin();
      const rfx = RARITY_FX[rar.id];
      spawnRewardPop(el.querySelector('.look-pv-stage'), `¡${res.item.name}!`, rfx.colors, rfx.n);
      pv.unlocked = true;
      pv.spent = before;
      shopFeedback = `¡Canjeado y equipado: ${res.item.name}!`;
      if (type === 'music' && !inRun()) {
        Music.setMenuTheme(themeOf(id));
        pv.musicOwned = true;
      }
      if (type === 'fx') setTimeout(previewBurst, 380);
      paintPreview();
      renderAchievements();
    };
  const equip = el.querySelector('[data-pv-equip]');
  if (equip)
    equip.onclick = () => {
      if (!setLook(store, pv.type, pv.id)) return;
      persist();
      sfx.ui();
      shopFeedback = `Activado: ${rewardName(pv.type, pv.id)}`;
      paintPreview();
      renderAchievements();
    };
}

function closePreview() {
  if (!pv) return;
  const { el, opener, timers, type, playing, spent, musicOwned } = pv;
  timers.forEach(clearTimeout);
  el.querySelector('.look-mini .piece.red .face')?.removeEventListener('animationiteration', pv.onLoop);
  document.removeEventListener('keydown', pv.onKey);
  el.remove();
  pv = null;
  applyLook(); // quita lo que se estaba probando y deja lo equipado
  if (type === 'music' && (playing || musicOwned) && !inRun()) Music.scene('menu');
  if (spent != null) pulseWallet(spent);
  const back = opener && document.querySelector(`[data-open-type="${opener.type}"][data-open-id="${opener.id}"]`);
  back?.focus?.();
}

export function openPreview(type, id) {
  const item = rewardById(type, id);
  if (!item) return;
  if (pv) closePreview();
  const rar = rarityOf(item);
  const el = document.createElement('div');
  el.className = 'look-pv-ov';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-labelledby', 'lookPvName');
  el.innerHTML = `<div class="look-pv r-${rar.id}">
      <header class="look-pv-head">
        ${item.price === 0 ? `<span class="rar-chip default-chip">Por defecto</span>` : `<span class="rar-chip">${rar.name}</span>`}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
        <small>${TYPE_NAME[type]}</small>
        <h3 id="lookPvName">${item.name}</h3>
        <button type="button" class="look-pv-x" data-pv-close aria-label="Cerrar">✕</button>
      </header>
      <div class="look-pv-stage" data-type="${type}">${stageFor(type, id)}</div>
      <p class="look-pv-note"><b>${TYPE_HINT[type]}</b><span>${rar.note}</span></p>
      <footer class="look-pv-foot"></footer>
    </div>`;
  document.body.appendChild(el);
  pv = { type, id, el, opener: { type, id }, timers: [], playing: false, unlocked: false, spent: null };
  if (['board', 'pieces', 'key'].includes(type)) tryOn(type, id);
  else tryOn(null, null);
  paintPreview();

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

  // La llave del tablero de muestra sale una y otra vez; con «Celebraciones» estalla la ráfaga al cruzar la salida.
  const keyFace = el.querySelector('.look-mini .piece.red .face');
  if (keyFace && !reducedMotion()) {
    const fire = () => pv?.timers.push(setTimeout(previewBurst, 1500));
    pv.onLoop = fire;
    keyFace.addEventListener('animationiteration', fire);
    if (type === 'fx') fire();
  }
  el.querySelector('[data-pv-replay]')?.addEventListener('click', () => {
    sfx.ui();
    previewBurst();
  });
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
  (el.querySelector('[data-confirm-buy]:not([aria-disabled])') || el.querySelector('[data-pv-close]'))?.focus?.();
}

export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const stats = statsOf(store);
  const ach = store.ach || {};
  const balance = achBalance(store);
  const unlockedCount = ACHIEVEMENTS.filter((a) => ach[a.id]).length;
  const pendingCount = unclaimedAchievements(store).length + readyMilestones(store).length;
  const ownedTotal = REWARD_TYPES.reduce(
    (sum, t) => sum + REWARDS[t].filter((r) => rewardUnlocked(t, r.id, store)).length,
    0,
  );
  const catalogTotal = REWARD_TYPES.reduce((sum, t) => sum + REWARDS[t].length, 0);

  box.innerHTML = `<div class="ach-top-summary">
      <div class="ach-total">
        <p><b>${unlockedCount}</b> / ${ACHIEVEMENTS.length} <span>logros</span></p>
        <u role="img" aria-label="${unlockedCount}/${ACHIEVEMENTS.length}"><i style="width:${(unlockedCount / ACHIEVEMENTS.length) * 100}%"></i></u>
      </div>
      <div class="ach-wallet" id="achWallet" title="Puntos disponibles para la Tienda">
        <i aria-hidden="true">${icon('stars')}</i>
        <div><b>${fmt(balance)}</b><small>pts</small></div>
      </div>
    </div>
    <div class="ach-tabs" role="tablist" aria-label="Secciones de logros">
      <button type="button" class="ach-tab${activeTab === 'list' ? ' on' : ''}" role="tab" aria-selected="${activeTab === 'list'}" data-ach-tab="list">
        ${icon('trophy')}<span>Logros</span>${pendingCount ? `<em class="ach-tab-badge">${pendingCount}</em>` : ''}
      </button>
      <button type="button" class="ach-tab${activeTab === 'shop' ? ' on' : ''}" role="tab" aria-selected="${activeTab === 'shop'}" data-ach-tab="shop">
        ${icon('purse')}<span>Canjear</span><small>${ownedTotal}/${catalogTotal}</small>
      </button>
    </div>
    ${activeTab === 'shop' ? renderAchShop() : renderAchList(stats)}`;

  // Pestañas principales: Logros / Canjear
  box.querySelectorAll('[data-ach-tab]').forEach((btn) => {
    btn.onclick = () => {
      activeTab = btn.dataset.achTab;
      shopFeedback = '';
      sfx.ui();
      renderAchievements();
    };
  });

  // Reclamar un logro individual
  box.querySelectorAll('[data-claim]').forEach((btn) => {
    btn.onclick = () => {
      const before = achBalance(store);
      const res = collectAchievement(store, btn.dataset.claim);
      if (!res) return;
      persist();
      paintAchBadge();
      sfx.unlock();
      spawnRewardPop(btn, `+${res.points} pts`);
      renderAchievements();
      pulseWallet(before);
    };
  });

  // Reclamar todos de golpe
  const all = box.querySelector('[data-claim-all]');
  if (all)
    all.onclick = () => {
      const before = achBalance(store);
      const res = collectAllAchievements(store);
      if (!res.achievements.length) return;
      persist();
      paintAchBadge();
      sfx.fanfare();
      spawnRewardPop(all, `+${res.points} pts`, undefined, 44);
      renderAchievements();
      pulseWallet(before);
    };

  // Abrir un cofre de colección
  box.querySelectorAll('[data-chest]').forEach((btn) => {
    btn.onclick = () => {
      const before = achBalance(store);
      const res = openMilestone(store, Number(btn.dataset.chest));
      if (!res) return;
      persist();
      paintAchBadge();
      sfx.fanfare();
      spawnRewardPop(btn, `+${res.points} pts`, RARITY_FX.legendary.colors, 54);
      renderAchievements();
      pulseWallet(before);
    };
  });

  // Categorías de la Tienda
  box.querySelectorAll('[data-shop-type]').forEach((btn) => {
    btn.onclick = () => {
      activeShopType = btn.dataset.shopType;
      shopFeedback = '';
      sfx.ui();
      renderAchievements();
    };
  });

  // Abrir el probador (tocar la tarjeta o «Ver · X pts»)
  box.querySelectorAll('[data-open-id], [data-buy-id]').forEach((btn) => {
    btn.onclick = () =>
      openPreview(btn.dataset.openType || btn.dataset.buyType, btn.dataset.openId || btn.dataset.buyId);
  });

  // Equipar elemento ya adquirido
  box.querySelectorAll('[data-equip-id]').forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.equipType;
      const id = btn.dataset.equipId;
      if (!setLook(store, type, id)) return;
      persist();
      applyLook();
      sfx.ui();
      shopFeedback = `Activado: ${rewardName(type, id)}`;
      if (type === 'music' && !inRun()) Music.scene('menu');
      if (type === 'fx') {
        const fx = rewardById('fx', id)?.burst;
        if (fx) spawnRewardPop(btn, rewardName(type, id), fx.colors);
      }
      renderAchievements();
    };
  });
}

// Al arrancar: pasar el guardado a la economía actual, detectar logros ya cumplidos en silencio y aplicar el aspecto
if (migrateShop(store)) persist();
checkAchievements({ silent: true });
applyLook();
