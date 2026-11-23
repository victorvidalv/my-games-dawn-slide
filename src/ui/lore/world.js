/** Lore → Mundo. */
import { PEOPLES_LORE, PLACES } from '../../data/lore-book.js';
import { INSCRIPTIONS } from '../../data/lore.js';
import { loreOpen, loreProgress, sealLinesRevealed } from '../../game/lore.js';
import { store } from '../../state.js';
import { reqsHtml } from '../collection/requirements.js';
import { icon } from '../icons.js';
import { loreEntryHtml } from './entries.js';

/** Mundo: la Frase de los Sellos, las ciudades y los pueblos antiguos. */
export function renderWorld(fresh) {
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
