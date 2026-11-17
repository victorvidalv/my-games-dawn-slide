/**
 * Retos diarios: panel del menú (racha, cuenta atrás y los cinco retos) y pantalla de resultado (medalla, racha, compartir).
 * Las reglas están en src/game/daily.js; el tablero se juega con el mismo motor que la aventura (startDaily en session.js).
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { CHALLENGES, challengeById, currentStreak, dayNumber, emptyDaily, isUnlocked, maxLevelReached, msToReset, recordDaily, resetText, todayResult } from '../game/daily.js';
import { leaveDaily, startDaily } from '../game/session.js';
import { persist, store } from '../state.js';
import { tr } from '../i18n.js';
import { checkAchievements } from './achievements.js';
import { burst } from './fx.js';
import { icon } from './icons.js';
import { openMenu } from './menu.js';

const MEDAL_TITLE = { gold: 'Medalla de oro', silver: 'Medalla de plata', bronze: 'Medalla de bronce' };
const MEDAL_ICON = { gold: 'seal3', silver: 'seal2', bronze: 'seal1' };
const state = () => (store.daily ||= emptyDaily());
let ticker = 0, shownDay = -1;

function paintReset() {
  const el = $('dailyReset');
  if (el) el.textContent = resetText(msToReset());
  const end = $('dailyEndReset');
  if (end) end.textContent = resetText(msToReset());
  if (dayNumber() !== shownDay && $('menu').classList.contains('show')) renderDaily();      // pasó la medianoche con el menú abierto
}
export function renderDaily() {
  const box = $('panelDaily');
  if (!box) return;
  const day = shownDay = dayNumber(), d = state(), maxLevel = maxLevelReached(store.paths), streak = currentStreak(d, day);
  const cards = CHALLENGES.map((c) => {
    const open = isUnlocked(c, maxLevel), res = todayResult(d, c.id, day);
    const side = !open ? `<span class="dc-side lock">${icon('lock')}<small>Nivel ${c.unlock}</small></span>`
      : res ? `<span class="dc-side done ${res.medal}">${icon(MEDAL_ICON[res.medal])}<small>${res.moves}/${res.opt}</small></span>`
        : '<span class="dc-side go"><b>Jugar</b></span>';
    return `<button type="button" class="daily-card${open ? '' : ' locked'}${res ? ' done' : ''}" data-id="${c.id}" ${open ? '' : 'aria-disabled="true"'}><i class="dc-ico" aria-hidden="true">${icon(c.icon)}</i><span class="dc-copy"><b>${c.name}</b><small>${c.desc}</small></span>${side}</button>`;
  }).join('');
  box.innerHTML = `<div class="daily-head"><div class="daily-streak${streak ? ' on' : ''}"><i aria-hidden="true">${icon('flame')}</i><b>${streak}</b><span>${streak === 1 ? 'día de racha' : 'días de racha'}</span></div><div class="daily-reset"><small>Nuevos retos en</small><b id="dailyReset">${resetText(msToReset())}</b></div></div>
    <p class="daily-note" id="dailyNote" role="status">${todayResult(d, 'classic', day) ? 'Racha asegurada por hoy. ¡Vuelve mañana!' : 'Resuelve el Clásico de hoy para sumar un día de racha.'}</p>
    <div class="daily-list">${cards}</div>`;
  box.querySelectorAll('.daily-card').forEach((b) => {
    b.onclick = () => {
      const c = challengeById(b.dataset.id);
      if (!isUnlocked(c, maxLevelReached(store.paths))) {
        $('dailyNote').textContent = `Llega al nivel ${c.unlock} en Aventura para abrir este reto.`;
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return;
      }
      $('menu').classList.remove('show');
      Music.muffle(false);
      startDaily(c.id);
    };
  });
  $('tabDaily')?.classList.toggle('has-news', !todayResult(d, 'classic', day));
  clearInterval(ticker);
  ticker = setInterval(paintReset, 20000);
}

/** Reto resuelto: anota medalla y racha, comprueba logros y enseña el resultado. */
export function finishDaily(daily, moves, opt) {
  const c = challengeById(daily.id), d = state(), out = recordDaily(d, c.id, daily.day, moves, opt), best = todayResult(d, c.id, daily.day);
  persist();
  const modal = $('dailyEnd');
  $('dailyEndTag').textContent = `Reto diario · ${c.name}`;
  $('dailyEndMedal').innerHTML = icon(MEDAL_ICON[out.medal]);
  modal.dataset.medal = out.medal;
  $('dailyEndTitle').textContent = MEDAL_TITLE[out.medal];
  $('dailyEndMoves').textContent = `${moves} / ${opt}`;
  $('dailyEndBest').textContent = out.first || out.improved ? (moves <= opt ? '¡En el mínimo exacto!' : 'Tu mejor marca de hoy') : `Tu mejor marca de hoy: ${best.moves}/${best.opt}`;
  $('dailyEndStreak').textContent = String(out.streak);
  $('dailyEndStreakLabel').textContent = out.streakUp ? (out.streak === 1 ? '¡Empieza tu racha!' : '¡Un día más de racha!') : (out.streak === 1 ? 'día de racha' : 'días de racha');
  $('dailyEndStreakBox').classList.toggle('up', out.streakUp);
  $('dailyEndReset').textContent = resetText(msToReset());
  $('dailyRetry').hidden = out.medal === 'gold';
  modal.classList.add('show');
  if (out.medal === 'gold') sfx.perfect(); else sfx.win();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) { const r = $('dailyEndMedal').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, out.medal === 'gold' ? 60 : 30, ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], 8); }
  const close = () => { modal.classList.remove('show'); Music.duck(1); };
  $('dailyRetry').onclick = () => { close(); startDaily(c.id); };
  $('dailyBack').onclick = () => { close(); leaveDaily(); openMenu('daily'); };
  $('dailyShare').onclick = async () => {
    const text = `${tr('DAWNSLIDE')} · ${tr(c.name)} #${daily.day} · ${best.moves}/${best.opt} · ${tr(MEDAL_TITLE[best.medal])}${out.streak > 1 ? ` · ${out.streak} ${tr('días de racha')}` : ''}`;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); $('dailyShare').lastElementChild.textContent = '¡Copiado!'; }
    } catch { /* cancelado o sin permiso: no pasa nada */ }
  };
  $('dailyShare').lastElementChild.textContent = 'Compartir';
  $('dailyBack').focus();
  checkAchievements();
}
