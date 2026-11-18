/**
 * Retos diarios: panel del menú (racha, cuenta atrás y los cinco retos) y pantalla de resultado (medalla, racha, compartir).
 * Las reglas están en src/game/daily.js; el tablero se juega con el mismo motor que la aventura (startDaily en session.js).
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { CHALLENGES, DAILY_TARGETS, STREAK_HINT_REWARDS, challengeById, currentStreak, dailyProgress, dayNumber, emptyDaily, isUnlocked, maxLevelReached, msToReset, resetText, streakEarned, streakHintBonus, todayResult } from '../game/daily.js';
import { leaveDaily, startDaily } from '../game/session.js';
import { store } from '../state.js';
import { resultRating } from '../engine/scoring.js';
import { numLocale, tr } from '../i18n.js';
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
  const bonus = streakHintBonus(streak);
  const rewards = STREAK_HINT_REWARDS.map(({ days, hints }) =>
    `<li class="${hints === bonus ? 'active' : ''}"><span>${days} días</span><b>+${hints} pistas</b>${hints === bonus ? '<small>Premio activo</small>' : ''}</li>`
  ).join('');
  const cards = CHALLENGES.map((c) => {
    const open = isUnlocked(c, maxLevel), res = todayResult(d, c.id, day);
    const progress = dailyProgress(store, c.id, day), done = progress?.boards?.filter(Boolean).length || 0;
    const side = !open ? `<span class="dc-side lock">${icon('lock')}<small>Nivel ${c.unlock}</small></span>`
      : res?.boards ? `<span class="dc-side done ${res.medal}">${icon(MEDAL_ICON[res.medal])}<small>${res.moves}/${res.opt}</small></span>`
        : `<span class="dc-side go"><b>${done || progress?.attempt ? 'Continuar' : 'Jugar'}</b><small>${done}/${DAILY_TARGETS.length}</small></span>`;
    return `<button type="button" class="daily-card${open ? '' : ' locked'}${res?.boards ? ' done' : ''}" data-id="${c.id}" ${open ? '' : 'aria-disabled="true"'}><i class="dc-ico" aria-hidden="true">${icon(c.icon)}</i><span class="dc-copy"><b>${c.name}</b><small>${c.desc}</small></span>${side}</button>`;
  }).join('');
  box.innerHTML = `<div class="daily-head"><div class="daily-streak${streak ? ' on' : ''}"><i aria-hidden="true">${icon('flame')}</i><b>${streak}</b><span>${streak === 1 ? 'día de racha' : 'días de racha'}</span></div><div class="daily-reset"><small>Nuevos retos en</small><b id="dailyReset">${resetText(msToReset())}</b></div></div>
    <p class="daily-note" id="dailyNote" role="status">${streakEarned(d, day) ? 'Racha asegurada por hoy. ¡Vuelve mañana!' : 'Completa cualquier reto para sumar un día de racha.'}</p>
    <div class="daily-rewards">
      <b>Pistas extra al iniciar Aventura</b>
      <ul>${rewards}</ul>
      <small>Si se rompe la racha, las próximas aventuras empiezan sin el premio.</small>
    </div>
    <div class="daily-list">${cards}</div>`;
  box.querySelectorAll('.daily-card').forEach((b) => {
    b.onclick = () => {
      if (day !== dayNumber()) { renderDaily(); return; }
    const c = challengeById(b.dataset.id);
      if (!isUnlocked(c, maxLevelReached(store.paths))) {
        $('dailyNote').textContent = `Llega al nivel ${c.unlock} en Aventura para abrir este reto.`;
        b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
        return;
      }
      const saved = dailyProgress(store, c.id, day);
      if (!saved?.attempt && todayResult(state(), c.id, day)?.boards) {
        showDailyResult({ id: c.id, day });
        return;
      }
      $('menu').classList.remove('show');
      Music.muffle(false);
      startDaily(c.id);
    };
  });
  $('tabDaily')?.classList.toggle('has-news', !streakEarned(d, day));
  clearInterval(ticker);
  ticker = setInterval(paintReset, 20000);
}

/** Muestra la mejor serie del día y permite repetir cualquier tablero mejorable. */
export function showDailyResult(daily, { streakUp = false } = {}) {
  const c = challengeById(daily.id), d = state(), best = todayResult(d, c.id, daily.day);
  if (!best?.boards) { leaveDaily(); openMenu('daily'); return; }
  const streak = currentStreak(d, dayNumber());
  const rating = resultRating(best.moves, best.opt);
  const points = best.boards.reduce((sum, board) => sum + board.points, 0);
  const modal = $('dailyEnd'), retry = $('dailyBoards');
  $('dailyEndTag').textContent = `Reto diario · ${c.name}`;
  $('dailyEndMedal').innerHTML = icon(MEDAL_ICON[best.medal]);
  $('dailyEndMedal').setAttribute('title', MEDAL_TITLE[best.medal]);
  modal.dataset.medal = best.medal;
  $('dailyEndTitle').textContent = rating.title;
  $('dailyEndDelta').textContent = rating.delta;
  $('dailyEndPoints').textContent = '+' + points.toLocaleString(numLocale());
  $('dailyEndStreak').textContent = String(streak);
  $('dailyEndStreakLabel').textContent = streakUp ? (streak === 1 ? '¡Empieza tu racha!' : '¡Un día más de racha!') : (streak === 1 ? 'día de racha' : 'días de racha');
  $('dailyEndStreakBox').classList.toggle('up', streakUp);
  const bonus = streakHintBonus(streak);
  $('dailyEndReward').hidden = !bonus;
  $('dailyEndReward').textContent = bonus ? `+${bonus} pistas al iniciar Aventura` : '';
  $('dailyEndReset').textContent = resetText(msToReset());
  const close = () => { modal.classList.remove('show'); Music.duck(1); };
  retry.replaceChildren(...best.boards.map((board, index) => {
    const row = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = `Tablero ${index + 1} · ${board.moves}/${board.opt}`;
    row.append(label);
    if (board.moves > board.opt && daily.day === dayNumber()) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Mejorar';
      button.onclick = () => {
        close();
        $('menu').classList.remove('show');
        startDaily(c.id, daily.day === dayNumber() ? index : undefined);
      };
      row.append(button);
    }
    return row;
  }));
  modal.classList.add('show');
  if (streakUp) {
    if (best.medal === 'gold') sfx.perfect(); else sfx.win();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = $('dailyEndMedal').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], 8);
    }
  }
  $('dailyBack').onclick = () => { close(); leaveDaily(); openMenu('daily'); };
  $('dailyShare').onclick = async () => {
    const text = `${tr('DAWNSLIDE')} · ${tr(c.name)} #${daily.day} · ${best.moves}/${best.opt} · ${tr(MEDAL_TITLE[best.medal])}${streak > 1 ? ` · ${streak} ${tr('días de racha')}` : ''}`;
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text, url: location.href });
      else { await navigator.clipboard.writeText(`${text} ${location.href}`); $('dailyShare').lastElementChild.textContent = '¡Copiado!'; }
    } catch { /* cancelado o sin permiso: no pasa nada */ }
  };
  $('dailyShare').lastElementChild.textContent = 'Compartir';
  $('dailyBack').focus();
  checkAchievements();
}
