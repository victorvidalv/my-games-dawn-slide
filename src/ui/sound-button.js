/**
 * Botón de sonido siempre visible (en el HUD y bajo el menú). Tiene tres estados:
 *   on       – suena (pulsarlo silencia)
 *   off      – silenciado (pulsarlo lo activa)
 *   blocked  – el navegador no deja sonar todavía (autoplay, iOS «interrumpido», pestaña dormida): pulsarlo lo desbloquea
 * Así, si el sonido falla en la web o en el móvil, hay un botón claro para arreglarlo sin entrar en la pausa.
 */
import { Music } from '../audio/music.js';
import { audioRunning, muted, sfx, toggleSound, unlockAudio } from '../audio/sound.js';

const ICON = '<svg class="snd-ico" viewBox="0 0 30 28" aria-hidden="true"><path d="M4 11h5l7-6v18l-7-6H4Z"/><path class="snd-waves" d="M21 10q6 4 0 8m3-11q9 7 0 14"/><path class="snd-x" d="m21 11 5 6m0-6-5 6"/></svg><span class="snd-cap"></span>';
const LABEL = { on: 'Sonido activado', off: 'Sonido desactivado', blocked: 'Toca para activar el sonido' };
const buttons = [...document.querySelectorAll('.snd-btn')];
buttons.forEach((b) => { b.innerHTML = ICON; });

const stateNow = () => (muted ? 'off' : audioRunning() ? 'on' : 'blocked');
function paint() {
  const s = stateNow();
  for (const b of buttons) {
    b.dataset.state = s;
    b.setAttribute('aria-label', LABEL[s]);
    b.setAttribute('aria-pressed', String(s === 'on'));
    b.title = LABEL[s];
    b.querySelector('.snd-cap').textContent = LABEL[s];
  }
}

async function press() {
  if (stateNow() === 'blocked') {
    // El audio no suena aunque no esté silenciado: se desbloquea dentro de este toque y se confirma con un sonido
    const ok = await unlockAudio();
    Music.recover();
    if (ok) sfx.start();
  } else toggleSound();
  paint();
  setTimeout(paint, 400);
}
buttons.forEach((b) => b.addEventListener('click', press));
document.addEventListener('soundstate', paint);
document.addEventListener('visibilitychange', () => setTimeout(paint, 300));
setInterval(paint, 1500);   // el navegador puede suspender el audio sin avisar (iOS, ahorro de energía)
paint();
