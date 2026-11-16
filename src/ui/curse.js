import { sfx, vib } from '../audio/sound.js';

/**
 * Maleficio: cuando un tablero llega girado (la salida cambia de lado), una introducción de ~2 s lo anuncia con un título hechizado
 * sobre una niebla oscura; el marco del tablero queda con un borde maldito mientras dure el nivel. Un toque la salta.
 */
const TEXT = { 90: 'La salida ahora está abajo', 180: 'La salida ahora está a la izquierda', 270: 'La salida ahora está arriba' };
let el = null;
let timer = 0;

function build() {
  el = document.createElement('div');
  el.id = 'curseIntro';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<div class="curse-fog"></div><div class="curse-rune r1">ᛉ</div><div class="curse-rune r2">ᚦ</div><div class="curse-rune r3">ᛞ</div>'
    + '<div class="curse-card"><small>MALEFICIO</small><b class="curse-title" data-t="¡Cuidado!">¡Cuidado!</b><span class="curse-arrow">➜</span><em></em></div>';
  document.body.appendChild(el);
  el.addEventListener('pointerdown', hideCurse);
  return el;
}

export function hideCurse() {
  clearTimeout(timer);
  el?.classList.remove('show');
}

/** Muestra la introducción del maleficio para un giro de 90, 180 o 270° (no hace nada si el giro es 0). */
export function showCurse(rot) {
  if (!rot) return;
  const box = el || build();
  box.querySelector('em').textContent = TEXT[rot] || TEXT[90];
  box.style.setProperty('--exit-rot', rot + 'deg');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  box.classList.remove('show');
  void box.offsetWidth;
  box.classList.add('show');
  sfx.warn();
  vib([30, 40, 30]);
  clearTimeout(timer);
  timer = setTimeout(hideCurse, reduced ? 1100 : 2100);
}
