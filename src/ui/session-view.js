/* ============================ Vista de la partida ============================
 * Todo lo que el flujo de partida (`game/session.js`) muestra en pantalla: HUD del nivel, mensajes, bloqueo del
 * tablero, celebración y derrota (la elección de cartas al cerrar cada ciudad está en `ui/fate.js`). Aquí no se decide nada del juego.
 */
import { HERO_TALK } from '../data/story.js';
import { ZONES, zoneIdx } from '../data/zones.js';
import { $ } from '../dom.js';
import { DAILY_TARGETS, challengeById } from '../game/daily.js';
import { baseScore } from '../engine/scoring.js';
import { numLocale } from '../i18n.js';
import { celebrate } from './achievements.js';
import { boardEl, place, recLine } from './board.js';

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const TIPS = [
  'Piensa antes de mover: cada movimiento de más resta puntos.',
  'Los bloques largos bloquean más: libéralos primero.',
  'Un solo arrastre largo cuenta como 1 movimiento.',
  'Cada héroe abre el camino a su manera.',
  'La pista no cuesta movimientos, pero es limitada.',
];

/** Consejo que se muestra al empezar un tablero. */
export function tipFor(G, heroId) {
  if (heroId === 'jean') return 'Rebobinar devuelve varios movimientos. Un uso por tablero.';
  return TIPS[(G.n * 7) % TIPS.length];
}

export const setDailyMode = (on) => document.body.classList.toggle('daily-run', on);
export const setMessage = (text) => {
  $('msg').textContent = text;
};
export const lockBoard = () => boardEl.classList.add('board-lock');
export const unlockBoard = () => boardEl.classList.remove('board-lock');

/** Puntaje de la partida en el HUD ('—' en práctica). */
export function showScore(run) {
  $('score').textContent = run.mode === 'p' ? '—' : run.score.toLocaleString(numLocale());
  recLine();
}

/** HUD inicial de un tablero: nivel, mínimo, puntos base, puntaje, límite, deshacer y consejo. */
export function renderLevelHud(run, G, heroId) {
  const prac = run.mode === 'p';
  $('lvl').textContent = run.daily
    ? `${challengeById(run.daily.id).name} · ${run.daily.index + 1}/${DAILY_TARGETS.length}`
    : G.tutorial
      ? `${G.n} · TUTORIAL`
      : G.n;
  $('mn').textContent = G.opt;
  $('base').textContent = prac ? '—' : baseScore(G.opt);
  showScore(run);
  $('lim').textContent = prac ? '∞' : G.limit;
  $('bUndo').disabled = !G.hist.length;
  setMessage(
    run.daily
      ? 'Reto diario: saca la llave roja con los menos movimientos posibles.'
      : G.n === 1
        ? 'Desliza los bloques y saca la llave roja ➜ Cada movimiento cuenta.'
        : tipFor(G, heroId),
  );
}

/** Título y subtítulo del cartel con que entra un tablero. */
export function levelBannerText(run, G) {
  if (run.daily) return ['Reto diario', challengeById(run.daily.id).name];
  const title = G.tutorial ? 'Tutorial' : `Nivel ${G.n}`;
  return [title, ZONES[zoneIdx(G.n)].n];
}

/** La llave sale del tablero; con `party` las piezas celebran con una ola de saltos. */
export function playKeyExit(G, { party = true } = {}) {
  G.els[0].classList.add('exit');
  place(0, 7);
  if (party) {
    boardEl.classList.add('board-win');
    celebrate(G.els[0]);
  }
}

export const winMessage = (G, gain, heroId) =>
  `${G.moves <= G.opt ? 'Perfecto · ' : ''}+${gain.total} puntos · ${HERO_TALK[heroId].win[G.n % 3]}`;

/** Las piezas se apagan al perder la partida. */
export const dimBoard = (G) =>
  G.els.forEach((el) => {
    el.style.opacity = '.5';
  });

/** HUD tras renacer pagando: el tablero vuelve a empezar. */
export function showRevivedHud(run, G) {
  showScore(run);
  $('lim').textContent = G.limit;
  $('bUndo').disabled = true;
}
export const revivedMessage = (cost) =>
  `Renaciste (−${cost.toLocaleString(numLocale())} pts). ¡Este tablero empieza de nuevo!`;
