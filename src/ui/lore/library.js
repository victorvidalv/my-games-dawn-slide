/** Lore → Biblioteca: estantes de tomos y el lector (tapa de colores, páginas breves con capitular y cita final). */
import { sfx } from '../../audio/sound.js';
import { BOOKS, BOOK_SCENES, BOOK_SERIES } from '../../data/lore-book.js';
import { loreOpen, loreProgress } from '../../game/lore.js';
import { persist, store } from '../../state.js';
import { reqsHtml } from '../collection/requirements.js';
import { paintAchBadge } from '../collection/news.js';
import { icon } from '../icons.js';
import { openOverlay, pager } from '../overlay.js';
import { ROMAN } from './entries.js';

const bookCover = (b, fresh) => {
  const open = loreOpen(b.req, store),
    p = loreProgress(b.req, store),
    isNew = fresh.has(`lore:book:${b.id}`);
  return `<button type="button" class="lore-book${open ? '' : ' locked'}${isNew ? ' fresh' : ''}" data-lore-book="${b.id}" style="--hue:${b.hue}" aria-label="${b.title}">
    <span class="lore-cover"><i class="lore-no">${ROMAN[b.no - 1]}</i><span class="lore-emblem">${icon(b.emblem)}</span><b>${b.title}</b>${open ? '' : `<i class="lore-lock" aria-hidden="true">${icon('lock')}</i>`}${isNew ? `<em class="lore-new">Nuevo</em>` : ''}</span>
    <small>${open ? 'Leer' : p.reqs.find((r) => !r.done)?.text || ''}</small></button>`;
};

/** Estantes por serie, con cuántos tomos de cada una están abiertos. */
export function renderLibrary(fresh) {
  return BOOK_SERIES.map((s) => {
    const list = BOOKS.filter((b) => b.series === s.id);
    const opened = list.filter((b) => loreOpen(b.req, store)).length;
    return `<section class="lore-shelf"><h3 class="lore-h">${s.label}<small>${opened}/${list.length}</small></h3><div class="lore-books">${list.map((b) => bookCover(b, fresh)).join('')}</div></section>`;
  }).join('');
}

/** Abrir un tomo lo marca como leído (deja de contar como novedad). */
function markRead(id) {
  const seen = (store.customSeen ||= {});
  if (seen[`lore:book:${id}`]) return;
  seen[`lore:book:${id}`] = 1;
  persist();
  paintAchBadge();
}

/**
 * Abre el lector de un tomo (bloqueado: enseña lo que falta).
 * @param {() => void} [onClose] repintar la biblioteca al cerrar
 */
export function openBook(id, { onClose } = {}) {
  const b = BOOKS.find((x) => x.id === id);
  if (!b) return;
  const open = loreOpen(b.req, store);
  const series = BOOK_SERIES.find((s) => s.id === b.series)?.label || '';
  const scene = BOOK_SCENES[b.id];
  const pages = pager({ count: () => b.pages.length, canMove: () => open, onChange: () => paint() });
  const { el } = openOverlay({
    className: 'book-ov',
    labelledBy: 'bookTitle',
    closeSelector: '[data-book-close]',
    html: `<div class="book-sheet">
      <button type="button" class="book-x" data-book-close aria-label="Cerrar libro">✕</button>
      <header class="${scene ? 'has-scene' : ''}">${scene ? `<img class="book-scene" src="/${scene}" alt="" decoding="async">` : ''}<small><span>Tomo ${b.no}</span> · <span>${series}</span></small><span class="lore-emblem">${icon(b.emblem)}</span><h3 id="bookTitle">${b.title}</h3></header>
      <div class="book-body"></div>
      <footer><button type="button" data-book-prev aria-label="Página anterior">←</button><span class="book-page"></span><button type="button" data-book-next aria-label="Página siguiente">→</button></footer>
    </div>`,
    onKey: pages.onKey,
    onClick: (e) => {
      if (e.target.closest('[data-book-prev]')) pages.go(-1);
      else if (e.target.closest('[data-book-next]')) pages.go(1);
    },
    onClose,
    returnFocus: () => document.querySelector(`[data-lore-book="${id}"]`),
  });
  el.style.setProperty('--hue', b.hue);

  function paint() {
    const page = pages.state.index,
      last = page === b.pages.length - 1;
    el.querySelector('.book-body').innerHTML = open
      ? `<p class="book-text">${b.pages[page]}</p>${last ? `<blockquote class="book-quote">${b.quote}</blockquote>` : ''}`
      : `<div class="book-locked"><i aria-hidden="true">${icon('lock')}</i><p>Bloqueado</p>${reqsHtml(loreProgress(b.req, store))}</div>`;
    el.querySelector('.book-page').textContent = open ? `Página ${page + 1} de ${b.pages.length}` : '';
    el.querySelector('[data-book-prev]').disabled = !open || page === 0;
    el.querySelector('[data-book-next]').disabled = !open || last;
  }

  if (open) markRead(id);
  paint();
  sfx.ui();
  el.querySelector('[data-book-close]').focus();
}
