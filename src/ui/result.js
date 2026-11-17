import { sfx, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { countUp, motes } from './fx.js';
import { numLocale } from '../i18n.js';

const GOLD = ['#ffd76a', '#fff3cf', '#f1ce82', '#fff'];
/** Frase corta según la eficiencia (la racha, si la hay, manda). */
const chipText = (gain) => (gain.mult > 1 ? `Racha ×${gain.mult.toLocaleString(numLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : gain.eff >= 0.9 ? 'Muy bien' : gain.eff >= 0.6 ? 'Bien hecho' : 'Nivel superado');

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString(numLocale());

/** Los puntos «vuelan» de la placa al marcador: una estela de motas doradas y el marcador da un salto al recibirlos. */
function flyToScore(from) {
  const score = $('score');
  const to = score?.getBoundingClientRect?.();
  if (!to || !to.width) return;
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2, x1 = to.left + to.width / 2, y1 = to.top + to.height / 2;
  const steps = 9;
  for (let i = 0; i <= steps; i++) {
    setTimeout(() => {
      const k = i / steps, e = k * k * (3 - 2 * k);
      motes(x0 + (x1 - x0) * e, y0 + (y1 - y0) * e - Math.sin(k * Math.PI) * 46, 4, GOLD, 1.3);   // trayectoria en arco
      if (i === steps) { score.classList.remove('score-bump'); void score.offsetWidth; score.classList.add('score-bump'); motes(x1, y1, 14, GOLD, 3); }
    }, i * 26);
  }
}

/** Aviso minimalista de «PERFECTO»: sonido de éxito y un sutil destello dorado dorado en el marco. */
function perfectFx() {
  document.body.classList.add('perfect');
  sfx.perfect();
  vib([20, 30, 20]);
  setTimeout(() => document.body.classList.remove('perfect'), 1300);
}

/**
 * Aviso minimalista al terminar un nivel: solo muestra los puntos (y «PERFECTO» si fue mínimo).
 * Se cierra solo (≈1,1 s; ≈1,65 s si fue perfecto) o al tocar. Los puntos vuelan al marcador.
 */
export function showResult({ gain, moves, opt, previous, total }) {
  return new Promise((resolve) => {
    const el = $('result');
    const board = $('board');
    const r = board?.getBoundingClientRect?.();
    if (r && r.width > 0 && r.height > 0) {
      el.style.setProperty('--rx', `${r.left + r.width / 2}px`);
      el.style.setProperty('--ry', `${r.top + r.height / 2}px`);
    } else {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    }
    const perfect = moves <= opt;
    const ms = reduced() ? 450 : perfect ? 1650 : 1100;
    el.classList.toggle('perfect', perfect);
    let chip = el.querySelector('.res-chip');
    if (!chip) { chip = document.createElement('small'); chip.className = 'res-chip'; el.querySelector('.res-card').appendChild(chip); }
    chip.textContent = chipText(gain);
    let ring = el.querySelector('.res-ring');                    // aro de luz que se abre detrás de la placa
    if (!ring) { ring = document.createElement('i'); ring.className = 'res-ring'; ring.setAttribute('aria-hidden', 'true'); el.insertBefore(ring, el.firstChild); }
    $('resPts').classList.toggle('long', fmt(gain.total).length >= 6);   // cifras largas: letra algo menor, siempre cabe
    $('resTitle').textContent = perfect ? 'PERFECTO' : '';
    $('resLevel').textContent = '';
    $('resLine').textContent = '';
    $('resTotal').textContent = '';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    const countMs = Math.min(460, ms - 200);
    countUp($('resPts'), 0, gain.total, countMs, (v) => '+' + fmt(Math.round(v)));
    const timers = [];
    if (perfect) perfectFx();
    if (!reduced() && r && r.width > 0) {
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      for (let i = 0; i < 6; i++) timers.push(setTimeout(() => sfx.tick(i), 40 + (i * countMs) / 6));      // la cuenta «tintinea» subiendo
      motes(cx, cy, perfect ? 60 : 26, GOLD, perfect ? 12 : 7);                                          // estallido de luz (sin papelitos)
      if (perfect) timers.push(setTimeout(() => motes(cx, cy, 44, GOLD, 16), 300), setTimeout(() => motes(0, 0, 40, GOLD, 3, r), 520));
      const card = el.querySelector('.res-card');
      timers.push(setTimeout(() => { flyToScore(card.getBoundingClientRect()); countUp($('score'), previous, total, 420); }, countMs + 80));
    } else countUp($('score'), previous, total, 340);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      timers.forEach(clearTimeout);
      $('score').textContent = fmt(total);                       // si se cierra antes, el marcador queda ya en su valor final
      el.removeEventListener('pointerdown', finish);
      el.classList.remove('show');
      resolve();
    };
    const timer = setTimeout(finish, ms);
    el.addEventListener('pointerdown', finish);
  });
}
