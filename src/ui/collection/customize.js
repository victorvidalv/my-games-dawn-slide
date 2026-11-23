/**
 * Personalizar: pestañas (Tablero · Atuendos · Portada), subcategorías, barra «Equipado» con filtro y la cuadrícula de
 * objetos. Cada objeto se desbloquea jugando y se puede probar antes de equiparlo.
 */
import { sfx } from '../../audio/sound.js';
import { $ } from '../../dom.js';
import {
  DEFAULT_LOOK,
  DEFAULT_OUTFIT,
  OUTFITS,
  REWARDS,
  lookOf,
  outfitArt,
  outfitOf,
  outfitUnlocked,
  rewardUnlocked,
  setLook,
} from '../../game/achievements.js';
import { HEROES } from '../../game/heroes.js';
import { persist, store } from '../../state.js';
import { icon } from '../icons.js';
import { snapScroll } from '../keep-scroll.js';
import { GROUPS, TYPE_NAME, groupOf, rarityOf, reducedMotion, rewardName } from './common.js';
import { applyLook, playEquippedMusic } from './look.js';
import { enterView, markSeen, unseenIn, unseenKeys } from './news.js';
import { closePreview, openPreview } from './preview.js';
import { unlockHtml } from './requirements.js';
import { closeShowcase, openShowcase, wearOutfit } from './showcase.js';
import { swatch } from './swatches.js';

/** Estado de la vista (se conserva al salir y volver a Personalizar). */
const view = {
  type: 'board', // subcategoría activa, u «outfit» en Atuendos
  hero: 'lia', // héroe activo en Atuendos
  ownedOnly: false, // filtro «Tuyos»
  feedback: '', // aviso tras equipar
  lastType: {}, // última subcategoría usada en cada pestaña
};
const isOutfit = () => view.type === 'outfit';
const heroOutfits = () => OUTFITS[view.hero] || [];
const ownedIn = (type) => REWARDS[type].filter((r) => rewardUnlocked(type, r.id, store));
const EQUIPPED = `<button type="button" class="shop-act equipped" disabled>Equipado ✓</button>`;
/** Subcategorías con muestras pequeñas: van en tres columnas. */
const COLS_3 = ['key', 'pieces', 'board', 'trail', 'fx', 'aura', 'ui'];

/* ---------- tarjetas ---------- */
function rewardCard(type, item, look) {
  const owned = rewardUnlocked(type, item.id, store);
  const equipped = look[type] === item.id;
  const rar = rarityOf(item);
  const chip =
    DEFAULT_LOOK[type] === item.id
      ? `<span class="rar-chip default-chip">Por defecto</span>`
      : `<span class="rar-chip">${rar.name}</span>`;
  const foot = !owned
    ? `<div class="unlock-foot">${unlockHtml(type, item.id)}</div>`
    : equipped
      ? EQUIPPED
      : `<button type="button" class="shop-act equip" data-equip-type="${type}" data-equip-id="${item.id}">Equipar</button>`;
  return `<article class="ach-shop-card r-${rar.id}${equipped ? ' on' : ''}${owned ? ' owned' : ' locked'}">
        <button type="button" class="ach-shop-open" data-open-type="${type}" data-open-id="${item.id}" aria-label="Ver ${item.name}">
          ${chip}${item.anim ? `<span class="anim-chip">Animado</span>` : ''}
          <span class="ach-shop-art">${swatch(type, item.id)}</span>
          <b class="ach-shop-name">${item.name}</b>
        </button>${foot}</article>`;
}

function outfitCard(hero, o, worn) {
  const owned = outfitUnlocked(store, hero, o.id),
    on = worn === o.id;
  const chip =
    o.id === DEFAULT_OUTFIT[hero]
      ? '<span class="rar-chip default-chip">Por defecto</span>'
      : `<span class="rar-chip">${rarityOf(o).name}</span>`;
  const foot = !owned
    ? `<div class="unlock-foot">${unlockHtml('outfit', `${hero}:${o.id}`)}</div>`
    : on
      ? EQUIPPED
      : `<button type="button" class="shop-act equip" data-outfit-hero="${hero}" data-outfit-id="${o.id}">Equipar</button>`;
  return `<article class="ach-shop-card outfit-card r-${rarityOf(o).id}${on ? ' on' : ''}${owned ? ' owned' : ' locked'}">
          <span class="ach-shop-open">${chip}<span class="outfit-art"><img src="${outfitArt(hero, o.id, 'adv')}" alt="" loading="lazy" decoding="async"><button type="button" class="outfit-show" data-outfit-show="${hero}:${o.id}" aria-label="Mostrar atuendo">${icon('stars')}<span>Mostrar</span></button></span><b class="ach-shop-name">${o.name}</b></span>${foot}</article>`;
}

function gridHtml() {
  if (isOutfit()) {
    const h = HEROES.find((x) => x.id === view.hero) || HEROES[0];
    const worn = outfitOf(store, h.id);
    const cards = heroOutfits()
      .filter((o) => !view.ownedOnly || outfitUnlocked(store, h.id, o.id))
      .map((o) => outfitCard(h.id, o, worn))
      .join('');
    return `<div class="ach-shop-grid" style="--accent:${h.color}">${cards}</div>`;
  }
  const type = view.type,
    look = lookOf(store);
  const cards = REWARDS[type]
    .filter((item) => !view.ownedOnly || rewardUnlocked(type, item.id, store))
    .map((item) => rewardCard(type, item, look))
    .join('');
  return `<div class="ach-shop-grid${COLS_3.includes(type) ? ' cols-3' : ''}" data-grid="${type}">${cards}</div>`;
}

/* ---------- cabecera: pestañas, subcategorías y barra «Equipado» ---------- */
const newsDot = (n) => (n ? `<em class="ach-tab-badge">${n}</em>` : '');

function tabsHtml(group) {
  return GROUPS.map((g) => {
    const news = g.types.reduce((n, t) => n + unseenIn(t), 0);
    const on = g.id === group.id;
    return `<button type="button" class="ach-tab${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-custom-group="${g.id}">${icon(g.icon)}<span>${g.label}</span>${news ? `<em class="ach-tab-badge dot" role="img" aria-label="${news} novedades"></em>` : ''}</button>`;
  }).join('');
}

function chipsHtml(group) {
  if (isOutfit())
    return HEROES.map((x) => {
      const news = unseenKeys().filter((k) => k.startsWith(`outfit:${x.id}:`)).length;
      const on = x.id === view.hero;
      return `<button type="button" class="ach-filter${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-outfit-hero-tab="${x.id}"><span>${x.name}</span>${newsDot(news)}</button>`;
    }).join('');
  return group.types
    .map((type) => {
      const on = view.type === type;
      return `<button type="button" class="ach-filter${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-custom-type="${type}"><span>${TYPE_NAME[type]}</span>${newsDot(unseenIn(type))}</button>`;
    })
    .join('');
}

/** Lo que llevas puesto en la subcategoría activa: nombre, miniatura y cuántos objetos hay (todos / tuyos). */
function equippedInfo() {
  if (isOutfit()) {
    const id = outfitOf(store, view.hero);
    return {
      name: heroOutfits().find((o) => o.id === id)?.name || '',
      art: `<img src="${outfitArt(view.hero, id, 'sel')}" alt="" decoding="async">`,
      all: heroOutfits().length,
      owned: heroOutfits().filter((o) => outfitUnlocked(store, view.hero, o.id)).length,
    };
  }
  const id = lookOf(store)[view.type];
  return {
    name: rewardName(view.type, id),
    art: swatch(view.type, id),
    all: REWARDS[view.type].length,
    owned: ownedIn(view.type).length,
  };
}

function barHtml() {
  const e = equippedInfo();
  return `<div class="custom-bar">
      <button type="button" class="custom-equipped" data-jump-equipped aria-label="Ver equipado: ${e.name}">
        <span class="ce-art" data-type="${view.type}" aria-hidden="true">${e.art}</span>
        <span class="ce-copy"><small>Equipado</small><b>${e.name}</b></span>
      </button>
      <div class="custom-filter" role="group" aria-label="Filtro">
        <button type="button" data-owned-filter="all" aria-pressed="${!view.ownedOnly}"><span>Todos</span><small>${e.all}</small></button>
        <button type="button" data-owned-filter="owned" aria-pressed="${view.ownedOnly}"><span>Tuyos</span><small>${e.owned}</small></button>
      </div>
    </div>`;
}

/* ---------- acciones ---------- */
/** Repinta con un aviso (o sin él) tras un cambio. */
function refresh(feedback = view.feedback) {
  view.feedback = feedback;
  renderAchievements();
}
const announce = (message) => refresh(message);

function jumpToEquipped(box) {
  const card = box.querySelector('.ach-shop-card.on');
  if (!card) return;
  sfx.ui();
  card.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  card.classList.remove('flash');
  void card.offsetWidth; // reinicia la animación si se pulsa dos veces
  card.classList.add('flash');
  setTimeout(() => card.classList.remove('flash'), 1400);
  (card.querySelector('.ach-shop-open') || card).focus?.({ preventScroll: true });
}

function equipReward(type, id) {
  if (!setLook(store, type, id)) return;
  persist();
  applyLook();
  playEquippedMusic(type);
  sfx.ui();
  refresh(`Activado: ${rewardName(type, id)}`);
}

function switchGroup(groupId) {
  const current = groupOf(view.type);
  view.lastType[current.id] = view.type;
  const next = GROUPS.find((g) => g.id === groupId);
  view.type = view.lastType[next.id] || next.types[0];
  sfx.ui();
  refresh('');
}

/** Un solo manejador para todo el panel: cada botón dice qué hacer con sus atributos data-*. */
const ACTIONS = [
  ['[data-custom-group]', (b) => switchGroup(b.dataset.customGroup)],
  [
    '[data-custom-type]',
    (b) => {
      view.type = b.dataset.customType;
      sfx.ui();
      refresh('');
    },
  ],
  [
    '[data-outfit-hero-tab]',
    (b) => {
      view.hero = b.dataset.outfitHeroTab;
      sfx.ui();
      refresh();
    },
  ],
  [
    '[data-owned-filter]',
    (b, box) => {
      const next = b.dataset.ownedFilter === 'owned';
      if (next === view.ownedOnly) return;
      view.ownedOnly = next;
      sfx.ui();
      refresh();
      box.querySelector('.custom-catalog')?.scrollTo(0, 0);
    },
  ],
  ['[data-jump-equipped]', (b, box) => jumpToEquipped(box)],
  ['[data-open-id]', (b) => openPreview(b.dataset.openType, b.dataset.openId, { onChange: announce })],
  [
    '[data-outfit-show]',
    (b) => {
      const [hero, id] = b.dataset.outfitShow.split(':');
      openShowcase(hero, id, { onChange: announce });
    },
  ],
  [
    '[data-outfit-id]',
    (b) => {
      const { outfitHero: hero, outfitId: id } = b.dataset;
      if (wearOutfit(hero, id)) refresh(`Activado: ${OUTFITS[hero].find((o) => o.id === id).name}`);
    },
  ],
  ['[data-equip-id]', (b) => equipReward(b.dataset.equipType, b.dataset.equipId)],
];

function bindPanel(box) {
  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  box.addEventListener('click', (e) => {
    for (const [selector, run] of ACTIONS) {
      const b = e.target.closest(selector);
      if (b && box.contains(b)) return run(b, box);
    }
    return undefined;
  });
}

/** Visitar una pestaña marca sus novedades como vistas (los sellos «Nuevo» de esta visita se quedan). */
const markCurrentSeen = () => markSeen(isOutfit() ? `outfit:${view.hero}` : view.type);

/* ---------- panel ---------- */
export function renderAchievements() {
  const box = $('panelAch');
  if (!box) return;
  const changed = enterView(`${view.type}|${view.hero}`);
  const group = groupOf(view.type);
  const restore = changed ? null : snapScroll(box);
  box.innerHTML = `<div class="custom-header">
      <div class="ach-tabs ach-tabs-3" role="tablist" aria-label="Personalizar">${tabsHtml(group)}</div>
    </div>
    <div class="custom-subbar">
      <div class="ach-filters custom-chips" role="tablist" aria-label="${group.label}">${chipsHtml(group)}</div>
    </div>
    <section class="custom-catalog">
      ${barHtml()}
      <p class="look-note is-feedback" id="lookNote" role="status"${view.feedback ? '' : ' hidden'}>${view.feedback}</p>
      ${gridHtml()}
    </section>`;
  restore?.();
  bindPanel(box);
  if (markCurrentSeen()) renderAchievements();
}

/** Cierra cualquier visor abierto al salir de Personalizar. */
export function closeCustomView() {
  closePreview();
  closeShowcase();
}
