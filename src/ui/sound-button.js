/**
 * Botón de sonido: un solo icono, siempre a la vista (HUD y menú), con dos estados que reflejan lo que de verdad se oye:
 *   con ondas  – suena (pulsarlo silencia)
 *   tachado    – no suena, ya sea porque está silenciado o porque el navegador lo ha bloqueado (pulsarlo lo activa)
 * Al activarlo se desbloquea el audio dentro del propio toque y se confirma con un sonido, así que un solo toque basta.
 */
import { Music } from '../audio/music.js';
import { audioRunning, muted, sfx, toggleSound, unlockAudio } from '../audio/sound.js';

const ICON =
  '<svg class="snd-ico" viewBox="0 0 30 28" aria-hidden="true"><path d="M4 11h5l7-6v18l-7-6H4Z"/><path class="snd-waves" d="M21 10q6 4 0 8m3-11q9 7 0 14"/><path class="snd-x" d="m21 11 5 6m0-6-5 6"/></svg>';
const LABEL = { on: 'Sonido activado', off: 'Sonido desactivado' };
const buttons = [...document.querySelectorAll('.snd-btn')];
buttons.forEach((b) => {
  b.innerHTML = ICON;
});

const stateNow = () => (!muted && audioRunning() ? 'on' : 'off');
function paint() {
  const s = stateNow();
  for (const b of buttons) {
    b.dataset.state = s;
    b.setAttribute('aria-label', LABEL[s]);
    b.setAttribute('aria-pressed', String(s === 'on'));
    b.title = LABEL[s];
  }
}

async function press() {
  if (stateNow() === 'on')
    toggleSound(); // suena → silenciar
  else {
    if (muted) toggleSound(); // silenciado → quitar el silencio (y desbloquear)
    const ok = await unlockAudio(); // bloqueado por el navegador → desbloquear en este mismo toque
    Music.recover();
    if (ok) sfx.start();
  }
  paint();
  setTimeout(paint, 400);
}
buttons.forEach((b) => b.addEventListener('click', press));
document.addEventListener('soundstate', paint);
document.addEventListener('visibilitychange', () => setTimeout(paint, 300));
setInterval(paint, 1500); // el navegador puede suspender el audio sin avisar (iOS, ahorro de energía)
paint();
