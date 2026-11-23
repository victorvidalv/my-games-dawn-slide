/** Lore → Escenas: galería de paisajes de Thyes y su visor (también las bloqueadas, con lo que falta). */
import { sfx } from '../../audio/sound.js';
import { SCENES } from '../../data/lore-book.js';
import { loreOpen, loreProgress } from '../../game/lore.js';
import { store } from '../../state.js';
import { reqsHtml } from '../collection/requirements.js';
import { icon } from '../icons.js';
import { openOverlay, pager } from '../overlay.js';

const nextReq = (s) => loreProgress(s.req, store).reqs.find((r) => !r.done)?.text || '';

export function renderScenes(fresh) {
  const cards = SCENES.map((s) => {
    const open = loreOpen(s.req, store),
      isNew = fresh.has(`lore:scene:${s.id}`);
    return `<button type="button" class="lore-scene-card${open ? ' open' : ' locked'}${isNew ? ' fresh' : ''}" data-lore-scene="${s.id}" aria-label="${s.title}">
      <span class="lore-scene-img"><img src="/${s.src}" alt="" loading="lazy" decoding="async">${open ? '' : `<i aria-hidden="true">${icon('lock')}</i>`}${isNew ? `<em class="lore-new">Nuevo</em>` : ''}</span>
      <span class="lore-scene-meta"><small>${s.place}</small><b>${s.title}</b>${open ? '' : `<em class="lore-scene-req">${nextReq(s)}</em>`}</span>
    </button>`;
  }).join('');
  return `<div class="lore-scenes-grid">${cards}</div>`;
}

/** Abre el visor en la escena `id`; ← / → recorren todas las escenas. */
export function openScene(id) {
  const start = SCENES.findIndex((s) => s.id === id);
  if (start < 0) return;
  const scenes = pager({ count: () => SCENES.length, start, onChange: () => paint() });
  const { el } = openOverlay({
    className: 'book-ov scene-ov',
    closeSelector: '[data-scene-close]',
    html: `<div class="scene-sheet">
      <button type="button" class="book-x" data-scene-close aria-label="Cerrar">✕</button>
      <div class="scene-stage"><img class="scene-art" alt="" decoding="async"></div>
      <div class="scene-body"></div>
      <footer><button type="button" data-scene-prev aria-label="Anterior">←</button><span class="scene-counter"></span><button type="button" data-scene-next aria-label="Siguiente">→</button></footer>
    </div>`,
    onKey: scenes.onKey,
    onClick: (e) => {
      if (e.target.closest('[data-scene-prev]')) scenes.go(-1);
      else if (e.target.closest('[data-scene-next]')) scenes.go(1);
    },
    returnFocus: () => document.querySelector(`[data-lore-scene="${SCENES[scenes.state.index].id}"]`),
  });

  function paint() {
    const i = scenes.state.index,
      s = SCENES[i],
      open = loreOpen(s.req, store);
    el.querySelector('.scene-art').src = `/${s.src}`;
    el.classList.toggle('is-locked', !open);
    el.querySelector('.scene-body').innerHTML = open
      ? `<small>${s.place}</small><h3>${s.title}</h3><p class="book-text">${s.text}</p>`
      : `<small>${s.place}</small><h3>${s.title}</h3><div class="book-locked"><i aria-hidden="true">${icon('lock')}</i><p>Bloqueado</p>${reqsHtml(loreProgress(s.req, store))}</div>`;
    el.querySelector('.scene-counter').textContent = `${i + 1} / ${SCENES.length}`;
    el.querySelector('[data-scene-prev]').disabled = i === 0;
    el.querySelector('[data-scene-next]').disabled = i === SCENES.length - 1;
  }

  paint();
  sfx.ui();
  el.querySelector('[data-scene-close]').focus();
}
