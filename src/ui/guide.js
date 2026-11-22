/* ============================ Guía integrada a pantalla completa ============================ */
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { CHALLENGES } from '../game/daily.js';
import { FATE_CARDS } from '../game/fate.js';
import { HEROES, hintEvery } from '../game/heroes.js';
import { loreTotal } from '../game/lore.js';
import { RELICS } from '../game/relics.js';
import { CHALLENGE_RELICS } from '../game/survival.js';
import { lang, tr } from '../i18n.js';
import { GUIDE_TEXT } from '../i18n/guide-text.js';
import { fateCardHtml } from './fate.js';
import { icon } from './icons.js';
import { outfitImg } from './story.js';

const GUIDE_TABS = [
  ['start', 'flag'],
  ['heroes', 'heart'],
  ['modes', 'hourglass'],
  ['fate', 'stars'],
  ['custom', 'book'],
  ['tips', 'key'],
];
const HERO_SCENE = { lia: 'backgrounds/zone-1.webp', jean: 'backgrounds/zone-5.webp', van: 'backgrounds/zone-3.webp' };
const MECH_CLASS = ['is-wall', 'is-heavy', 'is-ice', 'is-lock', 'is-curse'];

let guideTab = 'start';
const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const T = () => GUIDE_TEXT[lang] || GUIDE_TEXT.es;

/** Captura del juego: se descarga bajo demanda (no va en el precaché) y desaparece si no hay conexión. */
function shot(name, caption, { panel = false } = {}) {
  return `<figure class="guide-shot${panel ? ' is-panel' : ''}">
      <img src="/guia/capturas/${name}.webp" alt="${caption}" loading="lazy" decoding="async" data-zoom onerror="this.closest('figure').remove()">
      <figcaption>${caption}</figcaption>
    </figure>`;
}
const gShot = (key, caption, opts) => shot(`${lang}-g-${key}`, caption, opts);

function renderStart(t) {
  const steps = t.steps
    .map(
      ([title, text], i) => `<article class="guide-step"><span class="guide-step-n">${i + 1}</span>
        <div><h3>${title}</h3><p>${text}</p></div></article>`,
    )
    .join('');
  const stepShots = t.steps
    .filter((s) => s[2])
    .map((s) => gShot(s[2], s[3]))
    .join('');
  const mech = t.mech
    .map(
      ([badge, title, text], i) => `<article class="guide-mech">
        <span class="guide-mech-badge ${MECH_CLASS[i]}">${badge}</span><h4>${title}</h4><p>${text}</p></article>`,
    )
    .join('');
  return `<h3 class="guide-h">${t.stepsTitle}</h3>
    <section class="guide-steps">${steps}</section>
    <section class="guide-shots">${stepShots}</section>
    <section class="guide-grid-2">
      <article class="guide-card guide-card-accent">
        <div class="guide-card-head"><span class="guide-ico">${icon('trophy')}</span><h3>${t.goalTitle}</h3></div>
        <p>${t.goal}</p><p>${t.goal2}</p>
      </article>
      <article class="guide-card">
        <div class="guide-card-head"><span class="guide-ico">${icon('hint')}</span><h3>${t.hintTitle}</h3></div>
        <p>${fill(t.hint, { n: hintEvery(1), d: hintEvery(50), e: hintEvery(75) })}</p>
      </article>
    </section>
    <h3 class="guide-h">${t.mechTitle}</h3>
    <p class="guide-lead">${t.mechIntro}</p>
    <section class="guide-grid-4">${mech}</section>
    <section class="guide-shots">
      ${shot(`${lang}-28`, t.shotRocks)}${shot(`${lang}-65`, t.shotIce)}${shot(`${lang}-curse`, t.shotCurse)}
    </section>`;
}

function renderHeroes(t) {
  const heroes = HEROES.map(
    (h) => `<article class="guide-hero" style="--accent:${h.color}">
      <img class="guide-hero-bg" src="/${HERO_SCENE[h.id]}" alt="" loading="lazy" decoding="async">
      <div class="guide-hero-art"><img src="/${outfitImg(h.id, 'adv')}" alt="${h.name}" loading="lazy" decoding="async"></div>
      <div class="guide-hero-copy">
        <small>${h.role}</small>
        <h3>${h.name}</h3>
        <span class="guide-power-pill">${h.power}</span>
        <p>${h.detail}</p>
        <p class="guide-tip">${t.heroTips[h.id]}</p>
      </div>
    </article>`,
  ).join('');
  const relics = (list, cls) =>
    list
      .map(
        (r, i) => `<article class="guide-relic">
      <span class="guide-relic-art ${cls}" style="--rx:${i * 50}%" aria-hidden="true"></span>
      <div><b>${r.name}</b><small>${r.label}</small></div>
    </article>`,
      )
      .join('');
  return `<p class="guide-lead">${t.heroesIntro}</p>
    <section class="guide-heroes">${heroes}</section>
    <section class="guide-shots">${gShot('heroes', t.steps[0][3])}</section>
    <h3 class="guide-h">${t.relicsTitle}</h3>
    <p class="guide-lead">${t.relicsNote}</p>
    <section class="guide-relics">${relics(RELICS, 'is-adv')}</section>
    <h3 class="guide-h">${t.chalTitle}</h3>
    <p class="guide-lead">${t.chalNote}</p>
    <section class="guide-relics">${relics(CHALLENGE_RELICS, 'is-chal')}</section>`;
}

function renderModes(t) {
  const gated = CHALLENGES.filter((c) => c.unlock > 0);
  const vars = {
    list: gated.map((c) => tr(c.name)).join(lang === 'zh' ? '、' : ', '),
    levels: gated.map((c) => c.unlock).join(', '),
  };
  const cards = t.modes
    .map(
      (m) => `<article class="guide-mode">
        <div class="guide-mode-img"><img src="/guia/capturas/${lang}-g-${m.img}.webp" alt="${m.title}" loading="lazy" decoding="async" data-zoom onerror="this.closest('.guide-mode-img').remove()"></div>
        <div class="guide-mode-body">
          <small>${m.tag}</small><h3>${m.title}</h3>
          <p>${m.text}</p><p>${fill(m.lock, vars)}</p>
        </div>
      </article>`,
    )
    .join('');
  return `<section class="guide-modes">${cards}</section>
    <article class="guide-card guide-card-accent">
      <div class="guide-card-head"><span class="guide-ico">${icon('heart')}</span><h3>${t.reviveTitle}</h3></div>
      <p>${t.revive}</p>
    </article>`;
}

function renderFate(t) {
  const blessing = FATE_CARDS.find((c) => c.kind === 'blessing') || FATE_CARDS[0];
  const pact = FATE_CARDS.find((c) => c.kind === 'pact') || FATE_CARDS[1];
  return `<section class="guide-fate-wrap">
      <div class="guide-fate-sample">
        ${fateCardHtml(blessing, { tag: 'span', index: 0 })}
        ${fateCardHtml(pact, { tag: 'span', index: 1 })}
      </div>
      <div class="guide-fate-copy">
        <article class="guide-card">
          <h3>${t.fateTitle}</h3>
          <p>${fill(t.fate, { n: FATE_CARDS.length })}</p>
          <p>${t.fate2}</p>
          <p>${t.fate3}</p>
        </article>
      </div>
    </section>`;
}

function renderCustom(t) {
  const list = (items) =>
    `<ul class="guide-list">${items.map(([a, b]) => `<li><b>${a}</b><span>${b}</span></li>`).join('')}</ul>`;
  const shots = (items) =>
    `<section class="guide-shots is-panels">${items.map(([key, cap]) => gShot(key, cap, { panel: true })).join('')}</section>`;
  return `<article class="guide-card guide-card-accent">
      <div class="guide-card-head"><span class="guide-ico">${icon('trophy')}</span><h3>${t.customTitle}</h3></div>
      <p>${t.customText}</p>${list(t.customList)}
    </article>
    ${shots(t.customShots)}
    <article class="guide-card">
      <div class="guide-card-head"><span class="guide-ico">${icon('book')}</span><h3>${t.loreTitle}</h3></div>
      <p>${fill(t.loreText, { n: loreTotal() })}</p>${list(t.loreList)}
    </article>
    ${shots(t.loreShots)}
    <article class="guide-card">
      <div class="guide-card-head"><span class="guide-ico">${icon('stars')}</span><h3>${t.newsTitle}</h3></div>
      <p>${t.news}</p>
    </article>
    <section class="guide-shots">${gShot('home-others', t.newsShot)}</section>`;
}

function renderTips(t) {
  const faq = t.faq.map(([q, a]) => `<details class="guide-faq"><summary>${q}</summary><p>${a}</p></details>`).join('');
  return `<section class="guide-grid-2">
      <article class="guide-card">
        <div class="guide-card-head"><span class="guide-ico">${icon('clock')}</span><h3>${t.tipsTitle}</h3></div>
        <ul class="guide-bullets">${t.tips.map((x) => `<li>${x}</li>`).join('')}</ul>
      </article>
      <div class="guide-stack">
        <article class="guide-card">
          <div class="guide-card-head"><span class="guide-ico">${icon('key')}</span><h3>${t.controlsTitle}</h3></div>
          <p>${t.controls}</p>
        </article>
        <article class="guide-card">
          <div class="guide-card-head"><span class="guide-ico">${icon('gear')}</span><h3>${t.saveTitle}</h3></div>
          <p>${t.save}</p>
        </article>
      </div>
    </section>
    <section class="guide-shots">${gShot('more', t.moreShot, { panel: true })}</section>
    <h3 class="guide-h">${t.faqTitle}</h3>
    <section class="guide-faqs">${faq}</section>`;
}

const RENDER = {
  start: renderStart,
  heroes: renderHeroes,
  modes: renderModes,
  fate: renderFate,
  custom: renderCustom,
  tips: renderTips,
};

/** Ampliar una captura al tocarla (se cierra con un toque o con Escape). */
function zoom(src, alt) {
  const ov = document.createElement('div');
  ov.className = 'guide-zoom';
  ov.innerHTML = `<img src="${src}" alt="${alt}">`;
  const close = () => {
    ov.remove();
    document.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    close();
  };
  ov.onclick = close;
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(ov);
}

export function renderGuidePanel() {
  const box = $('panelGuide');
  if (!box) return;
  const t = T();
  if (!RENDER[guideTab]) guideTab = 'start';
  const tabs = GUIDE_TABS.map(
    ([id, ic]) =>
      `<button type="button" class="ach-filter${guideTab === id ? ' on' : ''}" role="tab" aria-selected="${guideTab === id}" data-guide-tab="${id}">${icon(ic)}<span>${t.tabs[id]}</span></button>`,
  ).join('');

  box.innerHTML = `<header class="lore-banner guide-banner">
      <img class="lore-banner-bg" src="/backgrounds/cover-dawn.webp" alt="" decoding="async">
      <div class="lore-banner-copy">
        <small>${t.banner.kicker}</small>
        <h2>${t.banner.title}</h2>
        <p class="guide-banner-sub">${t.banner.sub}</p>
      </div>
    </header>
    <div class="ach-filters guide-tabs" role="tablist" aria-label="${t.banner.title}">${tabs}</div>
    <p class="guide-zoom-hint">${t.zoom}</p>
    <div class="guide-body">${RENDER[guideTab](t)}</div>`;

  box.querySelectorAll('[data-guide-tab]').forEach((b) => {
    b.onclick = () => {
      guideTab = b.dataset.guideTab;
      sfx.ui();
      renderGuidePanel();
      box.scrollTop = 0;
      $('menuCard').scrollTop = 0;
    };
  });
  box.querySelectorAll('img[data-zoom]').forEach((img) => {
    img.onclick = () => zoom(img.currentSrc || img.src, img.alt);
  });
}

document.addEventListener('langchange', () => {
  if ($('panelGuide') && !$('panelGuide').hidden) renderGuidePanel();
});
