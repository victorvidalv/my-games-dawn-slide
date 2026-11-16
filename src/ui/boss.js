import { Music } from '../audio/music.js';
import { sfx, vib } from '../audio/sound.js';
import { ZONES } from '../data/zones.js';
import { $, cssUrl } from '../dom.js';
import { bossFor, bossRuleLabel } from '../game/bosses.js';
import { S } from '../state.js';
import { burst } from './fx.js';
import { bossArrive, loadBossArt } from './boss-phase.js';

/**
 * Pantalla de presentación del jefe de ciudad (niveles 10, 20, ..., 100).
 * Ilustración propia del jefe a pantalla completa, con su color de fase, título, lore, la regla del duelo
 * (turnos ajustados y/o contrarreloj) y destellos de poder. La música de jefe ya suena desde aquí.
 */
export function showBossIntro(level) {
  const boss = bossFor(level);
  const modal = $('bossIntro');
  if (!boss || !modal) return Promise.resolve();
  return new Promise((resolve) => {
    const zone = ZONES[boss.city]?.n || '';
    modal.style.setProperty('--boss-c', boss.color[0]);
    modal.style.setProperty('--boss-c2', boss.color[1]);
    loadBossArt(boss).then((src) => { $('bossArt').src = src; modal.style.setProperty('--boss-art', cssUrl(src)); });
    $('bossArt').alt = '';   // decorativa: el nombre y el título ya están en el texto de la pantalla
    $('bossTag').textContent = `JEFE DE ${zone} · NIVEL ${level}`;
    $('bossName').textContent = boss.name;
    $('bossTitle').textContent = boss.title;
    $('bossLore').textContent = boss.lore;
    $('bossMech').textContent = `${boss.mechTag} · ${bossRuleLabel(level, S.G?.timeLimit || 0)} · +30 % pts`;
    Music.duck(0.8);   // la música de jefe ya suena (fuerte) durante la presentación
    sfx.bossIntro();
    vib([20, 40, 65]);
    // destellos de poder desde el centro, con el color del jefe
    const pulse = (n) => burst(innerWidth / 2, innerHeight * 0.42, n, [boss.color[0], boss.color[1], '#fff'], 9);
    pulse(34);
    const timers = [setTimeout(() => pulse(22), 520), setTimeout(() => pulse(18), 1100)];
    let done = false;
    const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const close = () => {
      if (done) return;
      done = true;
      timers.forEach(clearTimeout);
      modal.removeEventListener('keydown', onKey);
      const finish = () => {
        modal.classList.remove('show', 'leaving');
        Music.duck(1);
        bossArrive(boss);
        resolve();
      };
      if (instant) { finish(); return; }
      // transición al tablero: la imagen se abalanza, destello del color del jefe, el iris se cierra y el tablero «aterriza» con una onda
      modal.classList.add('leaving');
      sfx.bossGo();
      vib([30, 20, 50]);
      burst(innerWidth / 2, innerHeight * 0.5, 46, [boss.color[0], boss.color[1], '#fff'], 12);
      setTimeout(finish, 720);
    };
    const onKey = (e) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        close();
      }
    };
    $('bossFight').onclick = close;
    modal.addEventListener('keydown', onKey);
    modal.classList.add('show');
    $('bossFight').focus();
  });
}
