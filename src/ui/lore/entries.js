/** Lore: piezas comunes (numeración romana, una entrada abierta o cerrada, retratos con el atuendo puesto). */
import { outfitArt, outfitOf } from '../../game/achievements.js';
import { loreProgress } from '../../game/lore.js';
import { store } from '../../state.js';
import { reqsHtml } from '../collection/requirements.js';
import { icon } from '../icons.js';

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV'];
/** Un texto del lore: abierto (con el texto y, si es nuevo, su sello) o cerrado (con lo que falta). */
export function loreEntryHtml({ key, title, text, req, secret = false, badge = '' }, fresh) {
  const p = loreProgress(req, store);
  if (!p.done)
    return `<article class="lore-entry locked${secret ? ' secret' : ''}"><h4><i aria-hidden="true">${icon('lock')}</i><span>${title}</span></h4><div class="unlock-foot">${reqsHtml(p)}</div></article>`;
  return `<article class="lore-entry open${secret ? ' secret' : ''}${fresh.has(key) ? ' fresh' : ''}"><h4><span>${badge ? `<small>${badge}</small>` : secret ? `<small>Nota secreta</small>` : ''}${title}</span>${fresh.has(key) ? `<em class="lore-new">Nueva entrada</em>` : ''}</h4><p class="lore-text">${text}</p></article>`;
}
export const portraitOf = (c) => (c.hero ? outfitArt(c.hero, outfitOf(store, c.hero), 'sel') : `${c.art}`);
export const figureOf = (c) => (c.hero ? outfitArt(c.hero, outfitOf(store, c.hero), 'adv') : `${c.art}`);
