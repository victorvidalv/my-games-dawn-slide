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
    'Elige una ruta y una reliquia. Cada movimiento gasta 1 turno de tu reserva hasta superar todos los tableros.';

  $('survivalSaved').hidden = !active;
  if (active) {
    const savedRoute = routeById(progress.route);
    const savedRelic = challengeRelicById(progress.relic);
    $('survivalSavedArt').style.setProperty('--relic-x', `${relicIndex(savedRelic.id) * 50}%`);
    $('survivalSavedTitle').textContent = `${savedRoute.name} · ${format(savedRoute.turns)} turnos`;
    $('survivalStatus').textContent =
      `Nivel ${progress.cleared + 1} de ${savedRoute.levels} · ${format(progress.remaining)} turnos restantes · ${savedRelic.name}`;
  }

  const routesBox = $('survivalRoutes');
  routesBox.innerHTML = CHALLENGE_ROUTES.map((route) => {
    const won = survivalWonFor(store, route.id);
    const best = `Nivel máx. ${format(survivalBestFor(store, route.id))}/${format(route.levels)}`;
    return `<label class="challenge-route-option"><input type="radio" name="challengeRoute" value="${route.id}" ${route.id === selectedRoute ? 'checked' : ''}><span class="challenge-route-card${won ? ' won' : ''}"><span class="route-turns">${format(route.turns)}<em>turnos</em></span><b>${route.name}</b><small class="route-best">${best}</small>${won ? '<small class="route-completed">Completada ✓</small>' : ''}</span></label>`;
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

  $('survivalPlay').textContent = active ? 'Empezar de nuevo' : 'Empezar desafío';
}

export function setSurvivalMode(on) {
  document.body.classList.toggle('survival-run', on);
  if (!on) hideTurnFlash();
}

export function updateSurvivalHud(progress) {
  const route = routeById(progress.route);
  const relic = challengeRelicById(progress.relic);
  const status = canUseChallengeRelic(progress);
  $('survivalRouteTag').textContent = `${route.name} · ${format(route.turns)}`;
  $('survivalTurns').textContent = format(progress.remaining);
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
  $('survivalEndTag').textContent = `${route.name} · ${format(route.turns)} turnos · ${relic.name}`;
  $('survivalEndTitle').textContent = progress.status === 'won' ? '¡Desafío completado!' : 'Se acabaron los turnos';
  $('survivalEndSummary').textContent = clearedLabel(progress);
  $('survivalEnd').classList.add('show');
  $('survivalBack').focus();
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
      yes: 'Empezar nuevo',
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
