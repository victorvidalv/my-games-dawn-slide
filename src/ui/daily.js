/**
 * Desafío diario único: 15 tableros (mínimos 3→17) con 150 turnos exactos.
 * Desde el menú principal entra directo a jugar en 1 clic; aquí se pinta el avance en el botón del inicio
 * y la pantalla final con los premios por hitos (13 → +1 pista, 14 → +3 pistas, 15 → +5 pistas).
 */
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import {
  DAILY_CHALLENGE,
  DAILY_HINT_MILESTONES,
  DAILY_TOTAL_BOARDS,
  DAILY_TURN_BUDGET,
  dailyHintReward,
  dailyProgress,
  dayNumber,
  emptyDaily,
  medalFor,
  msToReset,
  resetText,
  shareText,
  todayResult,
} from '../game/daily.js';
import { leaveDaily, startDaily } from '../game/session.js';
import { store } from '../state.js';
import { tr } from '../i18n.js';
import { checkAchievements } from './achievements.js';
import { burst } from './fx.js';
import { icon } from './icons.js';
import { openMenu } from './menu.js';

const MEDAL_TITLE = { gold: 'Medalla de oro', silver: 'Medalla de plata', bronze: 'Medalla de bronce' };
const MEDAL_ICON = { gold: 'seal3', silver: 'seal2', bronze: 'seal1' };
const state = () => (store.daily ||= emptyDaily());

export function paintDailyHome(day = dayNumber()) {
  const progress = dailyProgress(store, DAILY_CHALLENGE.id, day);
  const best = todayResult(store.daily, DAILY_CHALLENGE.id, day);
  const done = (best?.cleared || 0) >= 13;
  const active = progress && !progress.finished && (progress.used > 0 || progress.attempt?.moves > 0);
  const currentBoard = active
    ? Math.min(DAILY_TOTAL_BOARDS, (progress.attempt?.index ?? progress.boards?.filter(Boolean).length ?? 0) + 1)
    : 0;
  const activeUsed = active ? (progress.used || 0) + (progress.attempt?.moves || 0) : 0;

  const activeCleared = active ? progress.boards?.filter(Boolean).length || 0 : 0;
  const bestRecord = Math.max(
    Number(store.daily?.bestCleared) || 0,
    activeCleared,
    ...Object.values(store.daily?.days || {}).flatMap((d) =>
      Object.values(d || {}).map((r) => Number(r?.cleared) || 0),
    ),
  );
  const recEl = $('homeDailyRecord');
  if (recEl) {
    recEl.hidden = bestRecord <= 0;
    if (bestRecord > 0) $('homeDailyBest').textContent = `${bestRecord}/${DAILY_TOTAL_BOARDS}`;
  }

  if (active) {
    $('homeDailySub').textContent =
      `Tablero ${currentBoard}/${DAILY_TOTAL_BOARDS} · ${activeUsed}/${DAILY_TURN_BUDGET} turnos`;
  } else if (best?.cleared >= DAILY_TOTAL_BOARDS) {
    $('homeDailySub').textContent = `Completado hoy · ${best.cleared}/${DAILY_TOTAL_BOARDS}`;
  } else if (best?.cleared > 0) {
    $('homeDailySub').textContent =
      `Hoy: ${best.cleared}/${DAILY_TOTAL_BOARDS} · ${best.used}/${DAILY_TURN_BUDGET} turnos`;
  } else {
    $('homeDailySub').textContent = '15 tableros · 150 turnos';
  }
  $('tabDaily').classList.toggle('has-news', !done);
}

/** Pantalla de resultado del Desafío diario: tableros superados, turnos usados y premios por hitos (13 / 14 / 15). */
export function showDailyResult(daily, result = {}) {
  const d = state();
  const best = todayResult(d, DAILY_CHALLENGE.id, daily.day);
  const cleared = result.cleared ?? daily.boards?.filter(Boolean).length ?? best?.cleared ?? 0;
  const used = daily.used ?? best?.used ?? DAILY_TURN_BUDGET;
  const bestCleared = Math.max(cleared, best?.cleared || 0);
  const medal = medalFor(cleared);
  const hintsEarned = dailyHintReward(bestCleared);

  const modal = $('dailyEnd');
  const boardsBox = $('dailyBoards');
  $('dailyEndTag').textContent = 'Desafío · 150 turnos';
  $('dailyEndMedal').innerHTML = icon(MEDAL_ICON[medal]);
  $('dailyEndMedal').setAttribute('title', MEDAL_TITLE[medal]);
  modal.dataset.medal = medal;
  $('dailyEndTitle').textContent =
    cleared >= DAILY_TOTAL_BOARDS
      ? '¡Desafío completado!'
      : cleared >= 13
        ? '¡Premio conseguido!'
        : result.surrendered
          ? 'Te has rendido'
          : 'Sin turnos';
  $('dailyEndDelta').textContent = `${cleared}/${DAILY_TOTAL_BOARDS}`;
  $('dailyEndPoints').textContent = `${used}/${DAILY_TURN_BUDGET}`;
  $('dailyEndReward').hidden = !hintsEarned;
  $('dailyEndReward').textContent = hintsEarned
    ? hintsEarned === 1
      ? '+1 pista al iniciar Aventura'
      : `+${hintsEarned} pistas al iniciar Aventura`
    : '';
  $('dailyEndReset').textContent = resetText(msToReset());

  boardsBox.replaceChildren(
    ...DAILY_HINT_MILESTONES.map(({ board, hints }) => {
      const hit = bestCleared >= board;
      const row = document.createElement('div');
      row.className = `daily-board-row ${hit ? 'gold' : 'bronze'}`;
      const hintLabel = hints === 1 ? '+1 pista' : `+${hints} pistas`;
      row.innerHTML = `<span class="daily-board-label"><i class="daily-board-ico" aria-hidden="true">${icon(hit ? 'unlock' : 'lock')}</i><span>Tablero ${board}</span></span><b>${hintLabel}</b>`;
      return row;
    }),
  );

  const close = () => {
    modal.classList.remove('show');
    Music.duck(1);
  };
  modal.classList.add('show');
  if (cleared >= 13) {
    if (cleared >= DAILY_TOTAL_BOARDS) sfx.perfect();
    else sfx.win();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = $('dailyEndMedal').getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 40, ['#ffd24a', '#fff6c9', '#e0b04f', '#ffffff'], 8);
    }
  }
  const surrendered = !!result.surrendered;
  if ($('dailyRetry')) {
    $('dailyRetry').hidden = surrendered;
    $('dailyRetry').onclick = () => {
      close();
      $('menu').classList.remove('show');
      startDaily({ restart: true });
    };
  }
  if ($('dailyShare')) $('dailyShare').hidden = surrendered;
  $('dailyBack').textContent = surrendered ? 'Entendido' : 'Volver al menú';
  $('dailyBack').classList.toggle('primary', surrendered);
  $('dailyBack').onclick = () => {
    close();
    leaveDaily();
    openMenu();
  };
  $('dailyShare').onclick = async () => {
    const text = shareText(DAILY_CHALLENGE, daily.day, { cleared, used }, 0, {
      name: tr(DAILY_CHALLENGE.name),
    });
    try {
      if (typeof navigator.share === 'function') await navigator.share({ text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        $('dailyShare').lastElementChild.textContent = '¡Copiado!';
      }
    } catch {
      /* cancelado o sin permiso */
    }
  };
  $('dailyShare').lastElementChild.textContent = 'Compartir';
  (surrendered ? $('dailyBack') : $('dailyRetry') || $('dailyBack')).focus();
  checkAchievements();
}
