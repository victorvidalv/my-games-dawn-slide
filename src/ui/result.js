import { sfx, vib } from '../audio/sound.js';
import { $ } from '../dom.js';
import { burst, countUp } from './fx.js';

const CONFETTI = ['#f2c45c', '#ee6a46', '#58b3b8', '#a07bc6', '#f6e6bd', '#9dbb5f'];
/** Frase corta según la eficiencia (la racha, si la hay, manda). */
const chipText = (gain) => (gain.mult > 1 ? `Racha ×${gain.mult.toFixed(1).replace('.', ',')}` : gain.eff >= 0.9 ? 'Muy bien' : gain.eff >= 0.6 ? 'Bien hecho' : 'Nivel superado');

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n) => n.toLocaleString('de-DE');

/** Aviso minimalista de «PERFECTO»: sonido de éxito y un sutil destello dorado dorado en el marco. */
function perfectFx() {
  document.body.classList.add('perfect');
  sfx.perfect();
  vib([20, 30, 20]);
  setTimeout(() => document.body.classList.remove('perfect'), 1300);
}

/**
 * Aviso minimalista al terminar un nivel: solo muestra los puntos (y «PERFECTO» si fue mínimo).
 * Se cierra solo (≈0.9 s; ≈1.3 s si fue perfecto) o al tocar.
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
    const ms = reduced() ? 450 : perfect ? 1300 : 900;
    el.classList.toggle('perfect', perfect);
    let chip = el.querySelector('.res-chip');
    if (!chip) { chip = document.createElement('small'); chip.className = 'res-chip'; el.querySelector('.res-card').appendChild(chip); }
    chip.textContent = chipText(gain);
    $('resTitle').textContent = perfect ? 'PERFECTO' : '';
    $('resLevel').textContent = '';
    $('resLine').textContent = '';
    $('resTotal').textContent = '';
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    countUp($('resPts'), 0, gain.total, Math.min(420, ms - 200), (v) => '+' + fmt(Math.round(v)));
    countUp($('score'), previous, total, 340);
    if (perfect) perfectFx();
    if (!reduced() && r && r.width > 0) {                       // confeti de los colores del juego desde el centro del tablero
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      burst(cx, cy, perfect ? 70 : 22, CONFETTI, perfect ? 10 : 6);
      if (perfect) setTimeout(() => burst(cx, cy - 40, 40, CONFETTI, 8), 260);
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      el.removeEventListener('pointerdown', finish);
      el.classList.remove('show');
      resolve();
    };
    const timer = setTimeout(finish, ms);
    el.addEventListener('pointerdown', finish);
  });
}
