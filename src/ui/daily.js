/**
 * Desafío diario único: 15 tableros (mínimos 3→17) con 152 turnos (150 son los mínimos: el sello «150 exactos»).
 * Desde el menú principal entra directo a jugar en 1 clic; aquí se pinta el avance en el botón del inicio
 * y la pantalla final con los premios por hitos (10 → +1 pista, 13 → +2 pistas, 15 → +4 pistas).
 */
import { reducedMotion } from './dom-utils.js';
import { Music } from '../audio/music.js';
import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import {
  DAILY_CHALLENGE,
  DAILY_HINT_MILESTONES,
  DAILY_TOTAL_BOARDS,
  DAILY_TURN_BUDGET,
  DAILY_WIN_BOARD,
  dailyHintReward,
  dailyProgress,
  dayNumber,
  emptyDaily,
  medalFor,
  shareText,
  todayResult,
} from '../game/daily.js';
import { leaveDaily, startDaily } from '../game/session.js';
import { store } from '../state.js';
import { tr } from '../i18n.js';
import { openModal } from './modal.js';
import { checkAchievements } from './achievements.js';
import { burst, countUp } from './fx.js';
import { icon } from './icons.js';
import { openMenu } from './menu.js';

const MEDAL_TITLE = { gold: 'Medalla de oro', silver: 'Medalla de plata', bronze: 'Medalla de bronce' };
const MEDAL_ICON = { gold: 'seal3', silver: 'seal2', bronze: 'seal1' };
const state = () => (store.daily ||= emptyDaily());

export function paintDailyHome(day = dayNumber()) {
  const progress = dailyProgress(store, DAILY_CHALLENGE.id, day);
  const best = todayResult(store.daily, DAILY_CHALLENGE.id, day);
  const done = (best?.cleared || 0) >= DAILY_WIN_BOARD;
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
  } else {
    $('homeDailySub').textContent = '15 tableros · 152 turnos';
  }
  $('tabDaily').classList.toggle('has-news', !done);
}

/** Pantalla de resultado del Desafío diario: tableros superados, turnos usados y premios por hitos (10 / 13 / 15). */
export function showDailyResult(daily, result = {}) {
  const d = state();
  const best = todayResult(d, DAILY_CHALLENGE.id, daily.day);
  const cleared = result.cleared ?? daily.boards?.filter(Boolean).length ?? best?.cleared ?? 0;
  const used = daily.used ?? best?.used ?? DAILY_TURN_BUDGET;
  const bestCleared = Math.max(cleared, best?.cleared || 0);
  const medal = medalFor(cleared);
  const hintsEarned = dailyHintReward(bestCleared);

  const boardsBox = $('dailyBoards');
  const modal = $('dailyEnd');
  const won = cleared >= DAILY_WIN_BOARD; // medalla
  const prized = dailyHintReward(cleared) > 0;
  $('dailyEndMedal').innerHTML = won ? icon(MEDAL_ICON[medal]) : '';
  $('dailyEndMedal').hidden = !won;
  $('dailyEndMedal').setAttribute('title', MEDAL_TITLE[medal]);
  modal.dataset.medal = won ? medal : 'none';
  $('dailyEndTitle').textContent =
    cleared >= DAILY_TOTAL_BOARDS
      ? '¡Desafío completado!'
      : prized
        ? '¡Premio conseguido!'
        : result.surrendered
          ? 'Te has rendido'
          : 'Sin turnos';
  $('dailyEndDelta').textContent = String(cleared);
  /* Una sola línea: el premio ganado o lo cerca que quedó el primero (motiva a repetir) */
  const toPrize = DAILY_HINT_MILESTONES[0].board - cleared;
  const line = $('dailyEndReward');
  line.textContent = hintsEarned
    ? hintsEarned === 1
      ? '+1 pista para el modo Aventura'
      : `+${hintsEarned} pistas para el modo Aventura`
    : toPrize === 1
      ? 'A 1 tablero del premio'
      : `A ${toPrize} tableros del premio`;
  line.classList.toggle('is-prize', !!hintsEarned);
  line.hidden = false;
  line.style.setProperty('--n', String(cleared));

  /* 15 marcas que se encienden una a una; las de premio (10, 13, 15) llevan sus pistas debajo */
  const prizes = new Map(DAILY_HINT_MILESTONES.map(({ board, hints }) => [board, hints]));
  boardsBox.replaceChildren(
    ...Array.from({ length: DAILY_TOTAL_BOARDS }, (_, i) => {
      const n = i + 1;
      const li = document.createElement('li');
      li.style.setProperty('--i', String(i));
      if (n <= cleared) li.classList.add('on');
      if (prizes.has(n)) {
        li.classList.add('prize');
        li.innerHTML = `<small>+${prizes.get(n)}${icon('hint')}</small>`;
      }
      return li;
    }),
  );

  const seal = $('dailyEndSeal');
  seal.hidden = !result.exact;
  const close = openModal(modal, { onEscape: false, onClose: () => Music.duck(1) });
  if (reducedMotion()) $('dailyEndDelta').textContent = String(cleared);
  else countUp($('dailyEndDelta'), 0, cleared, 400 + cleared * 70, (v) => String(Math.round(v)));
  if (won) {
    if (cleared >= DAILY_TOTAL_BOARDS) sfx.perfect();
    else sfx.win();
    if (!reducedMotion()) {
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
  $('dailyBack').textContent = surrendered ? 'Entendido' : 'Menú';
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
        $('dailyShare').title = '¡Copiado!';
        $('dailyShare').classList.add('copied');
      }
    } catch {
      /* cancelado o sin permiso */
    }
  };
  $('dailyShare').title = 'Compartir';
  $('dailyShare').classList.remove('copied');
  (surrendered ? $('dailyBack') : $('dailyRetry') || $('dailyBack')).focus();
  checkAchievements();
}
