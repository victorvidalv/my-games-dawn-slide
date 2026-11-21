/**
 * Retos diarios: panel del menú (racha, cuenta atrás y los cinco retos) y pantalla de resultado (medalla, racha, compartir).
 * Las reglas están en src/game/daily.js; el tablero se juega con el mismo motor que la aventura (startDaily en session.js).
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import {
  CHALLENGES,
  STREAK_HINT_REWARDS,
  challengeById,
  challengeTargets,
  currentStreak,
  dailyProgress,
  dayNumber,
  emptyDaily,
  isUnlocked,
  maxLevelReached,
  medalFor,
  msToReset,
  resetText,
  shareText,
  streakEarned,
  streakHintBonus,
  todayFamily,
  todayResult,
} from '../game/daily.js';
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
let ticker = 0,
  shownDay = -1;

export function paintDailyHome(day = dayNumber()) {
  const done = streakEarned(store.daily, day);
  const streak = currentStreak(store.daily, day);
  $('homeDailyStreak').textContent = `${streak.toLocaleString(numLocale())} ${streak === 1 ? 'día' : 'días'}`;
  $('homeDailySub').textContent = done ? 'Hecho hoy' : 'Reto de hoy pendiente';
  $('tabDaily').classList.toggle('has-news', !done);
}

function paintReset() {
  const el = $('dailyReset');
  if (el) el.textContent = resetText(msToReset());
  const end = $('dailyEndReset');
  if (end) end.textContent = resetText(msToReset());
  if (dayNumber() !== shownDay && $('menu').classList.contains('show')) renderDaily(); // pasó la medianoche con el menú abierto
}
export function renderDaily() {
  const box = $('panelDaily');
  if (!box) return;
  const day = (shownDay = dayNumber()),
    d = state(),
    maxLevel = maxLevelReached(store.paths),
    streak = currentStreak(d, day);
  const bonus = streakHintBonus(streak);
  const rewards = STREAK_HINT_REWARDS.map(({ days, hints }) => {
    const label = hints === 1 ? '+1 pista' : `+${hints} pistas`;
    return `<li class="${hints === bonus ? 'active' : ''}"><span>${days} días</span><b>${label}</b>${hints === bonus ? '<small>Premio activo</small>' : ''}</li>`;
  }).join('');
  const solvedToday = CHALLENGES.filter((c) => todayResult(d, c.id, day)?.boards).length;
  const cards = CHALLENGES.map((c) => {
    const open = isUnlocked(c, maxLevel),
      res = todayResult(d, c.id, day),
      targets = challengeTargets(c);
    const progress = dailyProgress(store, c.id, day),
      done = progress?.boards?.filter(Boolean).length || 0;
    const todayTag = c.families.length > 1 ? (todayFamily(c, day) === 'ice' ? 'Hoy: Hielo' : 'Hoy: Rocas') : '';
    const meta = `${targets.join(' · ')} mov.${todayTag ? ` · ${todayTag}` : ''}`;
    const side = !open
      ? `<span class="dc-side lock">${icon('lock')}<small>Nivel ${c.unlock}</small></span>`
      : res?.boards
        ? `<span class="dc-side done ${res.medal}">${icon(MEDAL_ICON[res.medal])}<small>${res.moves}/${res.opt}</small></span>`
        : `<span class="dc-side go"><b>${done || progress?.attempt ? 'Continuar' : 'Jugar'}</b><small>${done}/${targets.length}</small></span>`;
    const noticeId = `dailyUnlock-${c.id}`;
    return `<div class="daily-entry">
      <button type="button" class="daily-card${open ? '' : ' locked'}${res?.boards ? ' done' : ''}" data-id="${c.id}" ${open ? '' : `aria-disabled="true" aria-describedby="${noticeId}"`}><i class="dc-ico" aria-hidden="true">${icon(c.icon)}</i><span class="dc-copy"><b>${c.name}</b><small>${c.desc}</small><span class="dc-meta">${meta}</span></span>${side}</button>
      ${open ? '' : `<p class="daily-unlock" id="${noticeId}" role="status" hidden>Llega al nivel ${c.unlock} en Aventura para abrir este reto.</p>`}
    </div>`;
  }).join('');
  box.innerHTML = `<div class="daily-head"><div class="daily-streak${streak ? ' on' : ''}"><i aria-hidden="true">${icon('flame')}</i><b>${streak}</b><span>${streak === 1 ? 'día de racha' : 'días de racha'}</span></div><div class="daily-reset"><small>Nuevos retos en</small><b id="dailyReset">${resetText(msToReset())}</b></div></div>
    <p class="daily-note" id="dailyNote" role="status">${streakEarned(d, day) ? `Racha asegurada por hoy · ${solvedToday}/${CHALLENGES.length} completados` : 'Completa cualquier reto para sumar un día de racha.'}</p>
    <div class="daily-rewards">
      <b>Pistas extra al iniciar Aventura</b>
      <ul>${rewards}</ul>
      <small>Si se rompe la racha, las próximas aventuras empiezan sin el premio.</small>
    </div>
    <div class="daily-list">${cards}</div>`;
  let shownNotice;
  box.querySelectorAll('.daily-card').forEach((b) => {
    b.onclick = () => {
      if (day !== dayNumber()) {
        renderDaily();
        return;
      }
      const c = challengeById(b.dataset.id);
      if (!isUnlocked(c, maxLevelReached(store.paths))) {
        if (shownNotice) shownNotice.hidden = true;
        shownNotice = $(`dailyUnlock-${c.id}`);
        shownNotice.hidden = false;
        shownNotice.scrollIntoView({ block: 'nearest' });
        b.classList.remove('shake');
        void b.offsetWidth;
        b.classList.add('shake');
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
  paintDailyHome(day);
  clearInterval(ticker);
  ticker = setInterval(paintReset, 20000);
}

/** Muestra la mejor serie del día y permite repetir cualquier tablero mejorable. */
export function showDailyResult(daily, { streakUp = false } = {}) {
  const c = challengeById(daily.id),
    d = state(),
    best = todayResult(d, c.id, daily.day);
  if (!best?.boards) {
    leaveDaily();
    openMenu('daily');
    return;
  }
  const streak = currentStreak(d, dayNumber());
  const rating = resultRating(best.moves, best.opt);
  const points = best.boards.reduce((sum, board) => sum + board.points, 0);
  const modal = $('dailyEnd'),
    retry = $('dailyBoards');
  $('dailyEndTag').textContent = `Reto diario · ${c.name}`;
  $('dailyEndMedal').innerHTML = icon(MEDAL_ICON[best.medal]);
  $('dailyEndMedal').setAttribute('title', MEDAL_TITLE[best.medal]);
  modal.dataset.medal = best.medal;
  $('dailyEndTitle').textContent = rating.title;
  $('dailyEndDelta').textContent = rating.delta;
  $('dailyEndPoints').textContent = '+' + points.toLocaleString(numLocale());
  $('dailyEndStreak').textContent = String(streak);
  $('dailyEndStreakLabel').textContent = streakUp
    ? streak === 1
      ? '¡Empieza tu racha!'
      : '¡Un día más de racha!'
    : streak === 1
      ? 'día de racha'
      : 'días de racha';
  $('dailyEndStreakBox').classList.toggle('up', streakUp);
  const bonus = streakHintBonus(streak);
  $('dailyEndReward').hidden = !bonus;
  $('dailyEndReward').textContent = bonus
    ? bonus === 1
      ? '+1 pista al iniciar Aventura'
      : `+${bonus} pistas al iniciar Aventura`
    : '';
  $('dailyEndReset').textContent = resetText(msToReset());
  const close = () => {
    modal.classList.remove('show');
    Music.duck(1);
  };
  retry.replaceChildren(
    ...best.boards.map((board, index) => {
      const boardMedal = medalFor(board.moves, board.opt);
      const row = document.createElement('div');
      row.className = `daily-board-row ${boardMedal}`;
      const label = document.createElement('span');
      label.className = 'daily-board-label';
      label.innerHTML = `<i class="daily-board-ico" aria-hidden="true">${icon(MEDAL_ICON[boardMedal])}</i><span>Tablero ${index + 1} · ${board.moves}/${board.opt}</span>`;
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
    }),
  );
  modal.classList.add('show');
  if (streakUp) {
    if (best.medal === 'gold') sfx.perfect();
    else sfx.win();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = $('dailyEndMedal').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], 8);
    }
  }
  $('dailyBack').onclick = () => {
    close();
    leaveDaily();
    openMenu('daily');
  };
  $('dailyShare').onclick = async () => {
    const text = shareText(c, daily.day, best, streak, {
      name: tr(c.name),
      streakUnit: tr('días de racha'),
    });
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        $('dailyShare').lastElementChild.textContent = '¡Copiado!';
      }
    } catch {
      /* cancelado o sin permiso: no pasa nada */
    }
  };
  $('dailyShare').lastElementChild.textContent = 'Compartir';
  $('dailyBack').focus();
  checkAchievements();
}
