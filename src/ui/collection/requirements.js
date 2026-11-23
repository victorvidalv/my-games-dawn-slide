/** Requisitos de lo bloqueado: una línea por condición con su avance y una barra con el avance total. */
import { unlockProgress } from '../../game/achievements.js';
import { store } from '../../state.js';
import { icon } from '../icons.js';
import { fmt } from './common.js';

/** Condiciones de un objeto bloqueado: una línea por condición (con su avance) y una barra con el avance total. */
export function unlockHtml(type, id) {
  return reqsHtml(unlockProgress(type, id, store));
}
/** Lo mismo para cualquier avance { reqs, … }: lista de condiciones con su contador y la barra de avance. */
export function reqsHtml(p) {
  const lines = p.reqs
    .map(
      (r) =>
        `<li class="${r.done ? 'ok' : ''}"><i aria-hidden="true">${icon(r.done ? 'unlock' : 'lock')}</i><span>${r.text}</span><b>${fmt(r.value)}/${fmt(r.goal)}</b></li>`,
    )
    .join('');
  const pct = p.pct ?? (p.goal ? Math.min(100, (p.value / p.goal) * 100) : 0);
  return `<ul class="unlock-reqs${p.reqs.length > 1 ? ' multi' : ''}">${lines}</ul><u class="shop-save" role="img" aria-label="${Math.round(pct)} %"><i style="width:${pct}%"></i></u>`;
}
