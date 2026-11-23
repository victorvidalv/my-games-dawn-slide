/** Lore → Personajes. */
import { CHARACTERS } from '../../data/lore-book.js';
import { HEROES } from '../../game/heroes.js';
import { loreOpen } from '../../game/lore.js';
import { store } from '../../state.js';
import { fmt } from '../collection/common.js';
import { unseenKeys } from '../collection/news.js';
import { ROMAN, figureOf, loreEntryHtml, portraitOf } from './entries.js';

/** Personajes: selector con avatar, ficha del personaje elegido y sus capítulos. */
export function renderPeople(fresh, charId) {
  const c = CHARACTERS.find((x) => x.id === charId) || CHARACTERS[0];
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
