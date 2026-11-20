import { $ } from '../dom.js';
import { leaveSurvival, startSurvival } from '../game/session.js';
import { SURVIVAL_LEVELS, SURVIVAL_TURNS, survivalBestLevel, survivalProgress } from '../game/survival.js';
import { numLocale } from '../i18n.js';
import { store } from '../state.js';
import { ask, openMenu } from './menu.js';

const format = (n) => n.toLocaleString(numLocale());
const clearedLabel = ({ cleared }) => `${cleared} de ${SURVIVAL_LEVELS} tableros superados`;
let turnFlashTimer;

export function paintSurvivalHome() {
  const progress = survivalProgress(store);
  const best = survivalBestLevel(store);
  $('homeSurvivalRecord').hidden = best === 0;
  $('homeSurvivalBest').textContent = best ? format(best) : '';
  $('homeSurvivalSub').textContent =
    progress?.status === 'active'
      ? `Partida guardada · nivel ${progress.cleared + 1}`
      : `${SURVIVAL_LEVELS} tableros · ${SURVIVAL_TURNS} turnos`;
}

export function renderSurvival() {
  const progress = survivalProgress(store);
  const active = progress?.status === 'active';
  $('survivalIntro').textContent =
    `Tienes ${format(SURVIVAL_TURNS)} turnos para resolver los ${SURVIVAL_LEVELS} tableros. Cada movimiento gasta un turno. Para llegar al final, todos deben salir perfectos.`;
  $('survivalStatus').hidden = !progress;
  if (progress) {
    $('survivalStatus').textContent = active
      ? `Nivel ${progress.cleared + 1} · ${format(progress.remaining)} turnos restantes`
      : clearedLabel(progress);
  }
  $('survivalPlay').textContent = active ? 'Continuar' : progress ? 'Jugar de nuevo' : 'Empezar';
  $('survivalRestart').hidden = !active;
}

export function setSurvivalMode(on) {
  document.body.classList.toggle('survival-run', on);
  if (!on) hideTurnFlash();
}

export function updateSurvivalHud(progress) {
  $('survivalTurns').textContent = format(progress.remaining);
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
  $('survivalEndTitle').textContent =
    progress.status === 'won' ? '¡Supervivencia completada!' : 'Se acabaron los turnos';
  $('survivalEndSummary').textContent = clearedLabel(progress);
  $('survivalEnd').classList.add('show');
  $('survivalBack').focus();
}

$('survivalPlay').onclick = () => {
  $('menu').classList.remove('show');
  startSurvival();
};
$('survivalRestart').onclick = async () => {
  const confirmed = await ask({
    ico: 'hourglass',
    title: '¿Reiniciar Supervivencia?',
    text: 'Se reemplazará la partida guardada. Volverás al nivel 1 con la reserva completa.',
    yes: 'Reiniciar partida',
    danger: true,
  });
  if (!confirmed) return;
  $('menu').classList.remove('show');
  startSurvival({ restart: true });
};
$('survivalBack').onclick = () => {
  $('survivalEnd').classList.remove('show');
  leaveSurvival();
  openMenu('survival');
};
