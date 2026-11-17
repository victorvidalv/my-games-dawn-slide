import { sfx } from '../audio/sound.js';

/* ============================ Transiciones entre escenas ============================
   Un telón de tinta cruza la pantalla en diagonal (con filo dorado), se cambia la escena por detrás y el telón sale
   por el otro lado: así nada «salta». Variantes: 'ink' (entre niveles), 'gold' (paradas / elegir camino) y 'boss'
   (alarma roja con rótulo antes del jefe). Todo dura décimas de segundo y se omite con «reducir movimiento». */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let veil = null;
function node() {
  if (!veil) {
    veil = document.createElement('div');
    veil.id = 'sceneWipe';
    veil.setAttribute('aria-hidden', 'true');
    veil.innerHTML = '<i></i><b></b>';
    document.body.appendChild(veil);
  }
  return veil;
}

/** Cubre la pantalla. Se resuelve cuando ya está tapada (momento de cambiar la escena). */
export async function wipeIn(kind = 'ink', label = '') {
  if (reduced()) return;
  const el = node();
  el.dataset.kind = kind;
  el.querySelector('b').textContent = label;
  el.classList.remove('out', 'in');
  void el.offsetWidth;
  el.classList.add('in');
  if (kind === 'boss') sfx.bossAlarm(); else sfx.whoosh(true);
  await wait(kind === 'boss' ? 760 : 240);
}

/** Descubre la pantalla (no hace falta esperarla). */
export async function wipeOut() {
  if (!veil || !veil.classList.contains('in')) return;
  veil.classList.remove('in');
  veil.classList.add('out');
  await wait(300);
  veil.classList.remove('out');
}

/**
 * Cambio de tablero entre niveles normales, sin tapar la pantalla: las piezas actuales se encogen y se apagan en su sitio
 * (160 ms) y las del nuevo nivel entran escalonadas. La clase se quita al construir el tablero nuevo (`boardSwapDone`).
 */
export async function boardSwapOut() {
  const board = document.getElementById('board');
  if (reduced() || !board?.querySelector('.piece')) return;
  board.classList.add('board-out');
  await wait(170);
}
export const boardSwapDone = () => document.getElementById('board')?.classList.remove('board-out');

/** Rótulo breve al empezar un tablero: «NIVEL 12 · Valle Esmeralda». No bloquea el juego. */
let banner = null;
let bannerTimer = 0;
export function levelBanner(title, sub = '', boss = false) {
  if (reduced()) return;
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'levelBanner';
    banner.setAttribute('aria-hidden', 'true');
    banner.innerHTML = '<b></b><span></span>';
    document.body.appendChild(banner);
  }
  banner.querySelector('b').textContent = title;
  banner.querySelector('span').textContent = sub;
  banner.classList.toggle('boss', boss);
  banner.classList.remove('go');
  void banner.offsetWidth;
  banner.classList.add('go');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove('go'), 1500);
}

/* Toque suave en cualquier botón: toda la interfaz responde igual. */
document.addEventListener('click', (e) => {
  const b = e.target.closest?.('button');
  if (b && !b.disabled && !b.closest('#board')) sfx.ui();
}, { capture: true, passive: true });
