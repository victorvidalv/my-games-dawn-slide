import { Music } from '../src/audio/music.js';
import { unlockAudio } from '../src/audio/sound.js';
import { cityThemeFor } from '../src/audio/themes.js';

const player = document.getElementById('guide-audio');
const buttons = [...player.querySelectorAll('[data-track]')];
const status = player.querySelector('[role="status"]');
let playing = null;
let request = 0;

function showPlaying(active) {
  playing = active;
  for (const button of buttons) {
    const selected = button === active;
    button.setAttribute('aria-pressed', String(selected));
    button.querySelector('.listen-action').textContent = selected ? player.dataset.stop : player.dataset.listen;
  }
}

for (const button of buttons) {
  button.addEventListener('click', async () => {
    const current = ++request;
    status.hidden = true;
    if (button === playing) {
      Music.stop(.18);
      showPlaying(null);
      return;
    }
    const allowed = await unlockAudio();
    if (current !== request) return;
    if (!allowed) {
      status.hidden = false;
      return;
    }
    Music.playTheme(cityThemeFor(0, button.dataset.track), 8);
    showPlaying(button);
  });
}

addEventListener('pagehide', () => {
  request++;
  Music.stop(.18);
  showPlaying(null);
});
