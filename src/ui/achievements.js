/**
 * Logros (60 logros con reclamo manual y animación de premio) y Tienda de elementos cosméticos.
 * Las reglas y la economía pura están en src/game/achievements.js.
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { HEROES_THEME, MENU_THEME, ZONE_THEMES, bossThemeFor } from '../audio/themes.js';
import { SURVIVAL_TRACKS } from '../audio/themes-survival.js';
import { $ } from '../dom.js';
import {
  ACHIEVEMENTS,
  GROUPS,
  REWARDS,
  REWARD_TYPES,
  TIERS,
  achBalance,
  bumpStat,
  buyShopItem,
  claimAchievements,
  collectAchievement,
  lookOf,
  markStat as addToCollection,
  progressOf,
  rewardById,
  rewardUnlocked,
  setLook,
  statsOf,
  unclaimedAchievements,
} from '../game/achievements.js';
import { numLocale } from '../i18n.js';
import { S, persist, store } from '../state.js';
import { burst } from './fx.js';
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
const SURVIVAL_BY_ID = {
  s0: SURVIVAL_TRACKS[0],
  s1: SURVIVAL_TRACKS.find((t) => t.name === 'Alba de acero') || SURVIVAL_TRACKS[1],
  s2: SURVIVAL_TRACKS.find((t) => t.name === 'Cumbre astral') || SURVIVAL_TRACKS[2],
};

const themeOf = (id) => {
  if (id === 'boss') return bossThemeFor(0);
  if (id === 'heroes') return HEROES_THEME;
  if (SURVIVAL_BY_ID[id]) return SURVIVAL_BY_ID[id];
  if (id?.startsWith('z')) return ZONE_THEMES[Number(id.slice(1))] || MENU_THEME;
  return MENU_THEME;
};

const fmt = (n) => n.toLocaleString(numLocale());
const rewardName = (type, id) => rewardById(type, id)?.name || '';
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  Music.setMenuTheme(themeOf(look.music));
  return look;
}

/** Celebración elegida al sacar la llave (nada si es «Sin adornos»). */
export function celebrate(el) {
  const fx = rewardById('fx', lookOf(store).fx)?.burst;
  if (!fx || !el || reducedMotion()) return;
  const b = $('board').getBoundingClientRect(),
    r = el.getBoundingClientRect();
  burst(b.right - 8, r.top + r.height / 2, fx.n, fx.colors, fx.speed);
}

/** Actualiza la badge numérica del botón Logros en la pantalla principal. */
export function paintAchBadge() {
  const pending = unclaimedAchievements(store).length;
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
  t.className = 'ach-toast';
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

/** Anota `key` en una colección de logros y comprueba si se desbloqueó alguno. */
export function markStat(name, key) {
  if (!addToCollection(store, name, key)) return;
  persist();
  checkAchievements();
}

/* ---------- animación de premio al reclamar o canjear ---------- */
function spawnRewardPop(originEl, text, colors = ['#ffd24a', '#fff6c9', '#ff9f43', '#ffffff']) {
  if (!originEl || reducedMotion()) return;
  const rect = originEl.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  burst(x, y, 26, colors, 7);
  const pop = document.createElement('div');
  pop.className = 'ach-reward-pop';
  pop.textContent = text;
  pop.style.left = `${x}px`;
  pop.style.top = `${y}px`;
  document.body.appendChild(pop);
  setTimeout(() => pop.remove(), 900);
}

function pulseWallet() {
  const pill = $('achWallet');
  if (!pill) return;
  pill.classList.remove('pop');
  void pill.offsetWidth;
  pill.classList.add('pop');
}

/* ---------- vistas previa de la Tienda ---------- */
const swatch = (type, id) => {
  if (type === 'board') return `<i class="sw sw-board" data-board="${id}"></i>`;
  if (type === 'key') return `<i class="sw sw-key" data-key="${id}"></i>`;
  if (type === 'pieces') return `<i class="sw sw-piece" data-pieces="${id}"></i>`;
  if (type === 'fx') return `<i class="sw sw-fx" data-fx="${id}"></i>`;
  if (type === 'cover') {
    const src = rewardById('cover', id)?.src || 'backgrounds/cover-heroes.webp';
    return `<img class="sw sw-cover" src="/${src}" alt="" loading="lazy">`;
  }
  return `<i class="sw sw-music">${icon('stars')}</i>`;
};

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

function renderAchList(stats) {
  const ach = store.ach || {};
  const claimed = store.achClaimed || {};
  const pending = unclaimedAchievements(store);

  const readySection = pending.length
    ? `<h3 class="panel-h">Listos para reclamar</h3><ul class="ach-list">${pending.map((a) => renderAchRow(a, ach, claimed, stats)).join('')}</ul>`
    : '';

  const groupSections = GROUPS.map((g) => {
    const groupItems = ACHIEVEMENTS.filter((a) => a.group === g.id && !(ach[a.id] && !claimed[a.id]));
    if (!groupItems.length) return '';
    return `<h3 class="panel-h">${g.name}</h3><ul class="ach-list">${groupItems.map((a) => renderAchRow(a, ach, claimed, stats)).join('')}</ul>`;
  }).join('');

  return `${readySection}${groupSections}`;
}

function renderAchShop() {
  const balance = achBalance(store);
  const look = lookOf(store);
  const subtabs = REWARD_TYPES.map((type) => {
    const ownedCount = REWARDS[type].filter((r) => rewardUnlocked(type, r.id, store)).length;
    return `<button type="button" class="ach-filter${activeShopType === type ? ' on' : ''}" role="tab" aria-selected="${activeShopType === type}" data-shop-type="${type}">${icon(TYPE_ICON[type])}<span>${TYPE_NAME[type]}</span><small>${ownedCount}/${REWARDS[type].length}</small></button>`;
  }).join('');

  const cards = REWARDS[activeShopType]
    .map((item) => {
      const owned = rewardUnlocked(activeShopType, item.id, store);
      const equipped = look[activeShopType] === item.id;
      const canBuy = !owned && balance >= item.price;
      const previewBtn =
        activeShopType === 'music'
          ? `<button type="button" class="shop-preview-btn" data-preview="${item.id}" aria-label="Escuchar ${item.name}">▶</button>`
          : '';
      const actionBtn = equipped
        ? `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`
        : owned
          ? `<button type="button" class="shop-act equip" data-equip-type="${activeShopType}" data-equip-id="${item.id}">Equipar</button>`
          : `<button type="button" class="shop-act buy${canBuy ? ' affordable' : ''}" data-buy-type="${activeShopType}" data-buy-id="${item.id}" ${canBuy ? '' : 'aria-disabled="true"'}>Canjear · ${item.price} pts</button>`;
      return `<article class="ach-shop-card${equipped ? ' on' : ''}${owned ? ' owned' : ''}"><div class="ach-shop-art">${swatch(activeShopType, item.id)}${previewBtn}</div><b class="ach-shop-name">${item.name}</b>${actionBtn}</article>`;
    })
    .join('');

  return `<div class="ach-filters shop-cats" role="tablist" aria-label="Categorías de la tienda">${subtabs}</div>
    <p class="look-note" id="lookNote" role="status">${shopFeedback || (activeShopType === 'board' ? 'El borde equipado se aplica al tablero de Aventura.' : 'Canjea tus puntos por estilos para el tablero, fichas, llaves, celebraciones y melodías.')}</p>
    <div class="ach-shop-grid">${cards}</div>`;
}

export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const stats = statsOf(store);
  const ach = store.ach || {};
  const balance = achBalance(store);
  const unlockedCount = ACHIEVEMENTS.filter((a) => ach[a.id]).length;
  const pendingCount = unclaimedAchievements(store).length;
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

  // Pestañas principales: Logros / Tienda
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
      const res = collectAchievement(store, btn.dataset.claim);
      if (!res) return;
      persist();
      paintAchBadge();
      sfx.unlock();
      spawnRewardPop(btn, `+${res.points} pts`);
      renderAchievements();
      pulseWallet();
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

  // Vista previa de melodía antes de comprar
  box.querySelectorAll('[data-preview]').forEach((btn) => {
    btn.onclick = () => {
      const id = btn.dataset.preview;
      sfx.ui();
      if (!(S.run && S.G && !S.G.done)) Music.playTheme(themeOf(id));
      shopFeedback = `Escuchando: ${rewardName('music', id)}`;
      const note = $('lookNote');
      if (note) note.textContent = shopFeedback;
    };
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
      if (type === 'music' && !(S.run && S.G && !S.G.done)) Music.scene('menu');
      if (type === 'fx') {
        const fx = rewardById('fx', id)?.burst;
        if (fx) spawnRewardPop(btn, rewardName(type, id), fx.colors);
      }
      renderAchievements();
    };
  });

  // Canjear elemento nuevo en la Tienda
  box.querySelectorAll('[data-buy-id]').forEach((btn) => {
    btn.onclick = () => {
      const type = btn.dataset.buyType;
      const id = btn.dataset.buyId;
      const res = buyShopItem(store, type, id);
      if (!res.ok) {
        const item = rewardById(type, id);
        const missing = Math.max(0, (item?.price || 0) - achBalance(store));
        shopFeedback = `Te faltan ${fmt(missing)} pts. Reclama más logros para canjearlo.`;
        const note = $('lookNote');
        if (note) note.textContent = shopFeedback;
        btn.classList.remove('shake');
        void btn.offsetWidth;
        btn.classList.add('shake');
        sfx.merchantNope();
        return;
      }
      persist();
      applyLook();
      paintAchBadge();
      sfx.merchantCoin();
      shopFeedback = `¡Canjeado y equipado: ${res.item.name}!`;
      if (type === 'music' && !(S.run && S.G && !S.G.done)) Music.scene('menu');
      spawnRewardPop(btn, `¡${res.item.name}!`);
      renderAchievements();
      pulseWallet();
    };
  });
}

// Al arrancar: detectar logros ya cumplidos en silencio, actualizar badge y aplicar aspecto guardado
checkAchievements({ silent: true });
applyLook();
