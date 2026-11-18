import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $, cssUrl } from '../dom.js';
import { bossFor, bossPortraitPath } from '../game/bosses.js';
import { bossRetriesLeft } from '../game/shop.js';
import { S } from '../state.js';
import { bossArrive, loadBossArt } from './boss-phase.js';

/** Presentación de un jefe sobre el paisaje de su ciudad, con las condiciones del reto. */
export function showBossIntro(level) {
  const boss = bossFor(level);
  const modal = $('bossIntro');
  if (!boss || !modal) return Promise.resolve();

  modal.style.setProperty('--boss-c', boss.color[0]);
  modal.style.setProperty('--boss-c2', boss.color[1]);
  modal.style.setProperty('--boss-scene', cssUrl(`backgrounds/zone-${boss.city + 1}.webp`));
  modal.classList.add('portrait-intro');
  const art = $('bossArt');
  art.onerror = () => {
    modal.classList.remove('portrait-intro');
    art.onerror = null;
    loadBossArt(boss).then((src) => { art.src = src; });
  };
  art.src = bossPortraitPath(boss);
  $('bossName').textContent = boss.name;
  $('bossLore').textContent = boss.lore;
  const goals = [`Desafío: máximo ${S.G?.limit ?? '?'} turnos`];
  const secs = S.G?.timeLimit || 0;
  if (secs) goals.push(`Antes de ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
  $('bossGoals').replaceChildren(...goals.map((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    return item;
  }));

  $('bossAttempts').textContent = `Intentos: ${1 + bossRetriesLeft(S.run, level)}`;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fight = $('bossFight');
  fight.disabled = false;
  modal.classList.add('show');
  fight.focus();
  Music.duck(.56);
  sfx.bossEntrance(boss.city);
  const rise = setTimeout(() => Music.duck(.78), 850);

  return new Promise((resolve) => {
    const finish = () => {
      modal.classList.remove('show', 'leaving');
      Music.duck(1);
      bossArrive(boss);
      resolve();
    };
    const close = () => {
      if (fight.disabled) return;
      fight.disabled = true;
      fight.onclick = null;
      modal.removeEventListener('keydown', onKey);
      clearTimeout(rise);
      sfx.bossStart();
      if (reduced) finish();
      else {
        modal.classList.add('leaving');
        setTimeout(finish, 430);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        close();
      }
    };
    fight.onclick = close;
    modal.addEventListener('keydown', onKey);
  });
}
