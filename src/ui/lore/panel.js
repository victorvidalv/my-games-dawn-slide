/** Lore: la historia de Thyes (personajes, mundo, biblioteca y escenas), que se abre jugando. */
import { sfx } from '../../audio/sound.js';
import { $ } from '../../dom.js';
import { BOOKS, CHARACTERS, PEOPLES_LORE, PLACES, SCENES } from '../../data/lore-book.js';
import { loreOpen, loreTotal, loreUnlockedKeys } from '../../game/lore.js';
import { store } from '../../state.js';
import { enterView, freshKeys, markSeen, unseenKeys } from '../collection/news.js';
import { icon } from '../icons.js';
import { snapScroll } from '../keep-scroll.js';
import { openBook, renderLibrary } from './library.js';
import { renderPeople } from './people.js';
import { openScene, renderScenes } from './scenes.js';
import { renderWorld } from './world.js';

const opened = (req) => (loreOpen(req, store) ? 1 : 0);
const sum = (list, fn) => list.reduce((n, x) => n + fn(x), 0);

/** Cada pestaña: nombre, icono, prefijos de sus novedades, avance [abiertas, total] y contenido. */
const TABS = [
  {
    id: 'people',
    label: 'Personajes',
    icon: 'heart',
    news: ['lore:char'],
    progress: () => [
      sum(CHARACTERS, (c) => sum(c.entries, (e) => opened(e.req))),
      sum(CHARACTERS, (c) => c.entries.length),
    ],
    render: (fresh) => renderPeople(fresh, state.char),
  },
  {
    id: 'world',
    label: 'Mundo',
    icon: 'flag',
    news: ['lore:place', 'lore:people'],
    progress: () => [
      sum(PLACES, (p) => opened(p.main.req) + (p.memory ? opened(p.memory.req) : 0) + opened(p.secret.req)) +
        sum(PEOPLES_LORE, (p) => opened(p.req) + (p.legacy ? opened(p.legacy.req) : 0)),
      sum(PLACES, (p) => 2 + (p.memory ? 1 : 0)) + sum(PEOPLES_LORE, (p) => 1 + (p.legacy ? 1 : 0)),
    ],
    render: renderWorld,
  },
  {
    id: 'library',
    label: 'Biblioteca',
    icon: 'book',
    news: ['lore:book'],
    progress: () => [sum(BOOKS, (b) => opened(b.req)), BOOKS.length],
    render: renderLibrary,
  },
  {
    id: 'scenes',
    label: 'Escenas',
    icon: 'stars',
    news: ['lore:scene'],
    progress: () => [sum(SCENES, (s) => opened(s.req)), SCENES.length],
    render: renderScenes,
  },
];
const state = { tab: 'people', char: 'lia' };
const activeTab = () => TABS.find((t) => t.id === state.tab) || TABS[0];

function tabsHtml() {
  return TABS.map((t) => {
    const news = unseenKeys().filter((k) => t.news.some((p) => k.startsWith(p))).length;
    const [got, total] = t.progress();
    const on = t.id === state.tab;
    return `<button type="button" class="ach-filter${on ? ' on' : ''}" role="tab" aria-selected="${on}" data-lore-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span><small>${got}/${total}</small>${news ? `<em class="ach-tab-badge">${news}</em>` : ''}</button>`;
  }).join('');
}

function bannerHtml() {
  const got = loreUnlockedKeys(store).length,
    total = loreTotal();
  return `<header class="lore-banner">
      <img class="lore-banner-bg" src="/backgrounds/umbral-del-alba.webp" alt="" decoding="async">
      <div class="lore-banner-copy">
        <small>THYES · AÑO 4133</small>
        <h2>Crónica de Thyes</h2>
        <div class="ach-total lore-banner-prog">
          <p><b>${got}</b> / ${total} <span>entradas</span></p>
          <u role="img" aria-label="${got}/${total}"><i style="width:${(got / total) * 100}%"></i></u>
        </div>
      </div>
    </header>`;
}

const ACTIONS = [
  [
    '[data-lore-tab]',
    (b) => {
      state.tab = b.dataset.loreTab;
      sfx.ui();
      renderLorePanel();
    },
  ],
  [
    '[data-lore-char]',
    (b) => {
      state.char = b.dataset.loreChar;
      sfx.ui();
      renderLorePanel();
    },
  ],
  ['[data-lore-book]', (b) => openBook(b.dataset.loreBook, { onClose: renderLorePanel })],
  ['[data-lore-scene]', (b) => openScene(b.dataset.loreScene)],
];

function bindPanel(box) {
  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  box.addEventListener('click', (e) => {
    for (const [selector, run] of ACTIONS) {
      const b = e.target.closest(selector);
      if (b && box.contains(b)) return run(b);
    }
    return undefined;
  });
}

export function renderLorePanel() {
  const box = $('panelLore');
  if (!box) return;
  enterView(`lore|${state.tab}|${state.char}`);
  const tab = activeTab();
  const restore = snapScroll(box);
  box.innerHTML = `${bannerHtml()}
    <div class="ach-filters lore-tabs" role="tablist" aria-label="Lore">${tabsHtml()}</div>
    <div class="lore-body" data-lore="${tab.id}">${tab.render(freshKeys())}</div>`;
  restore();
  bindPanel(box);
  // Visitar una pestaña marca sus novedades como vistas; si había alguna, se repinta sin los avisos
  if (tab.news.map(markSeen).some(Boolean)) renderLorePanel();
}
