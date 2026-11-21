import { sfx, tone } from '../audio/sound.js';
import { $ } from '../dom.js';
import { activateChallengeRelic, leaveSurvival, startSurvival } from '../game/session.js';
import {
  CHALLENGE_RELICS,
  CHALLENGE_ROUTES,
  canUseChallengeRelic,
  challengeRelicById,
  routeById,
  survivalBestFor,
  survivalBestLevel,
  survivalCompletedCount,
  survivalProgress,
  survivalWonFor,
} from '../game/survival.js';
import { numLocale } from '../i18n.js';
import { store } from '../state.js';
import { burst } from './fx.js';
import { icon } from './icons.js';
import { ask, openMenu } from './menu.js';

const format = (n) => n.toLocaleString(numLocale());
const relicIndex = (id) =>
  Math.max(
    0,
    CHALLENGE_RELICS.findIndex((relic) => relic.id === id),
  );
const clearedLabel = (progress) => {
  const route = routeById(progress.route);
  return `${progress.cleared} de ${route.levels} tableros superados`;
};
let turnFlashTimer;
let selectedRoute = '150';
let selectedRelic = 'hint';

export function paintSurvivalHome() {
  const progress = survivalProgress(store);
  const completed = survivalCompletedCount(store);
  const best = survivalBestLevel(store);
  $('homeSurvivalRecord').hidden = completed === 0 && best === 0;
  if (completed > 0) {
    $('homeSurvivalRecordLbl').textContent = 'Rutas superadas';
    $('homeSurvivalBest').textContent = `${completed}/${CHALLENGE_ROUTES.length}`;
  } else {
    $('homeSurvivalRecordLbl').textContent = 'Récord de nivel';
    $('homeSurvivalBest').textContent = best ? format(best) : '';
  }
  if (progress?.status === 'active') {
    const route = routeById(progress.route);
    $('homeSurvivalSub').textContent = `Partida guardada · ${route.name} · nivel ${progress.cleared + 1}`;
  } else {
    $('homeSurvivalSub').textContent = '3 rutas · 150, 200 y 250 turnos';
  }
}

export function renderSurvival() {
  const progress = survivalProgress(store);
  const active = progress?.status === 'active';
  if (progress && !CHALLENGE_ROUTES.some((r) => r.id === selectedRoute)) selectedRoute = progress.route;
  if (progress && !CHALLENGE_RELICS.some((r) => r.id === selectedRelic)) selectedRelic = progress.relic;
  if (progress && !document.querySelector('#survivalRoutes input:checked')) {
    selectedRoute = progress.route;
    selectedRelic = progress.relic;
  }

  $('survivalIntro').textContent =
    'Supera todos los tableros con una reserva exacta de turnos. Sin margen de error: cada movimiento cuenta.';

  $('survivalSaved').hidden = !active;
  if (active) {
    const savedRoute = routeById(progress.route);
    const savedRelic = challengeRelicById(progress.relic);
    $('survivalSavedArt').style.setProperty('--relic-x', `${relicIndex(savedRelic.id) * 50}%`);
    $('survivalSavedTitle').textContent = `${savedRoute.name} · ${format(savedRoute.turns)} turnos`;
    $('survivalStatus').textContent =
      `Nivel ${progress.cleared + 1} de ${savedRoute.levels} · ${format(progress.remaining)} turnos restantes · ${savedRelic.name}`;
    const bar = $('survivalSavedBar');
    if (bar) bar.style.width = `${Math.round((progress.cleared / savedRoute.levels) * 100)}%`;
  }

  const routesBox = $('survivalRoutes');
  routesBox.innerHTML = CHALLENGE_ROUTES.map((route) => {
    const won = survivalWonFor(store, route.id);
    const bestNum = survivalBestFor(store, route.id);
    const foot = won
      ? '<small class="route-completed">Completada ✓</small>'
      : bestNum > 0
        ? `<small class="route-best">Récord ${format(bestNum)}/${format(route.levels)}</small>`
        : `<small class="route-boards">${format(route.levels)} tableros</small>`;
    return `<label class="challenge-route-option"><input type="radio" name="challengeRoute" value="${route.id}" ${route.id === selectedRoute ? 'checked' : ''}><span class="challenge-route-card${won ? ' won' : ''}"><span class="route-tag">${route.tag}</span><span class="route-turns">${format(route.turns)}<em>turnos</em></span><b>${route.name}</b>${foot}</span></label>`;
  }).join('');

  routesBox.querySelectorAll('input').forEach((input) => {
    input.onchange = () => {
      selectedRoute = input.value;
    };
  });

  const relicsBox = $('survivalRelics');
  relicsBox.innerHTML = CHALLENGE_RELICS.map(
    (relic, i) =>
      `<label class="relic-option challenge-relic-option" style="--relic-x:${i * 50}%"><input type="radio" name="challengeRelic" value="${relic.id}" ${relic.id === selectedRelic ? 'checked' : ''}><span class="relic-card"><span class="relic-art challenge-relic-art" aria-hidden="true"></span><span><b>${relic.name}</b><small>${relic.label}</small></span></span></label>`,
  ).join('');

  relicsBox.querySelectorAll('input').forEach((input) => {
    input.onchange = () => {
      selectedRelic = input.value;
    };
  });

  const playBtn = $('survivalPlay');
  playBtn.textContent = active ? 'Empezar de nuevo' : 'Empezar desafío';
  playBtn.classList.toggle('primary', !active);
}

export function setSurvivalMode(on) {
  document.body.classList.toggle('survival-run', on);
  if (!on) hideTurnFlash();
}

export function updateSurvivalHud(progress, board) {
  const route = routeById(progress.route);
  const relic = challengeRelicById(progress.relic);
  const status = canUseChallengeRelic(progress);
  $('survivalRouteTag').textContent = `${route.name} · ${format(route.turns)}`;
  $('survivalTurns').textContent = format(progress.remaining);
  const reserve = $('survivalReserve');
  if (reserve) {
    reserve.classList.toggle('low', progress.remaining <= 15 && progress.remaining > 5);
    reserve.classList.toggle('critical', progress.remaining <= 5);
  }
  const pace = $('survivalBoardPace');
  if (pace && board) {
    pace.textContent = `Tablero: ${board.moves}/${board.opt} mov.`;
    pace.classList.toggle('over', board.moves > board.opt);
  }
  const btn = $('bChallengeRelic');
  btn.disabled = !status.ok;
  btn.classList.toggle('ready', status.ok);
  $('challengeRelicArt').style.setProperty('--relic-x', `${relicIndex(relic.id) * 50}%`);
  $('challengeRelicAction').textContent = relic.action;
  $('challengeRelicRule').textContent = status.ok ? relic.rule : status.reason;
  $('challengeRelicState').textContent = status.ok ? '1' : '0';
  btn.setAttribute('aria-label', `${relic.name}: ${relic.action}. ${status.reason}.`);
}

function hideTurnFlash() {
  clearTimeout(turnFlashTimer);
  $('survivalTurnFlash').hidden = true;
}

export function flashSurvivalTurns(remaining) {
  hideTurnFlash();
  const flash = $('survivalTurnFlash');
  flash.hidden = false;
  flash.textContent = `${format(remaining)} turnos restantes`;
  turnFlashTimer = setTimeout(hideTurnFlash, 750);
}

export function showSurvivalResult(progress) {
  hideTurnFlash();
  const route = routeById(progress.route);
  const relic = challengeRelicById(progress.relic);
  const won = progress.status === 'won';
  const nextRoute = won && CHALLENGE_ROUTES[CHALLENGE_ROUTES.findIndex((r) => r.id === route.id) + 1];
  const modal = $('survivalEnd');
  modal.dataset.status = progress.status;
  $('survivalEndTag').textContent = `${route.name} · ${format(route.turns)} turnos · ${relic.name}`;
  const ico = $('survivalEndIco');
  if (ico) ico.innerHTML = icon(won ? 'trophy' : 'hourglass');
  $('survivalEndTitle').textContent = won ? '¡Desafío completado!' : 'Se acabaron los turnos';
  $('survivalEndSummary').textContent = clearedLabel(progress);
  const retryBtn = $('survivalRetry');
  if (retryBtn) {
    retryBtn.textContent = nextRoute ? `Siguiente: ${nextRoute.name}` : 'Reintentar';
    retryBtn.onclick = () => {
      modal.classList.remove('show');
      leaveSurvival();
      startSurvival({ restart: true, route: nextRoute ? nextRoute.id : route.id, relic: relic.id });
    };
  }
  modal.classList.add('show');
  if (won) {
    sfx.perfect();
    if (ico && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const r = ico.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 36, ['#ffd24a', '#8fd8ff', '#fff6c9', '#ffffff'], 7);
    }
  } else {
    tone(220, 0.25, 'sine', 0.045);
  }
  (retryBtn || $('survivalBack')).focus();
}

$('survivalContinue').onclick = () => {
  $('menu').classList.remove('show');
  startSurvival();
};

$('survivalPlay').onclick = async () => {
  const progress = survivalProgress(store);
  if (progress?.status === 'active') {
    const confirmed = await ask({
      ico: 'hourglass',
      title: '¿Empezar un nuevo desafío?',
      text: 'Se reemplazará la partida guardada actual.',
      yes: 'Empezar de nuevo',
      danger: true,
    });
    if (!confirmed) return;
  }
  $('menu').classList.remove('show');
  startSurvival({ restart: true, route: selectedRoute, relic: selectedRelic });
};

$('survivalBack').onclick = () => {
  $('survivalEnd').classList.remove('show');
  leaveSurvival();
  openMenu('survival');
};

$('bChallengeRelic').onclick = () => activateChallengeRelic();
