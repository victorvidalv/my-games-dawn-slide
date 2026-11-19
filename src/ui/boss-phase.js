import { sfx } from '../audio/sound.js';
import { $ } from '../dom.js';
import { bossFor, bossPortraitPath } from '../game/bosses.js';
import { S } from '../state.js';
import { burst } from './fx.js';

/**
 * Fase de jefe: mientras dura un nivel de jefe, la pantalla cambia de ambiente.
 *   · paisaje de la ciudad con el color ambiental de su jefe
 *   · estilo oscuro (clase `boss-fight` en <body>) con el color del jefe: aura, viñeta y resplandor del tablero que «respiran»
 *   · chispas de poder que salen del tablero y, de vez en cuando, una oleada de intensidad
 *   · la intensidad sube con la tensión (pocos turnos o poco tiempo): `data-tension` 0 · 1 · 2
 *   · contrarreloj (si el jefe la tiene): barra de tiempo en el marcador, que solo corre cuando puedes mover
 */
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const body = document.body;
let active = null;
let ambient = 0;
let tick = 0;
let timeUpHandler = null;

const artUrl = (art) => `jefes/${art}.jpg`;
/** Precarga la ilustración del jefe (se pide un poco antes de llegar para que no haya parpadeo). */
export function preloadBossArt(level) {
  const boss = bossFor(level);
  if (!boss) return;
  const img = new Image();
  img.decoding = 'async';
  img.src = bossPortraitPath(boss);
}
/** ¿Existe la imagen? Si falta (por ejemplo, el jefe aún no tiene su ilustración), se usa la del Vigía. */
export function loadBossArt(boss) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(artUrl(boss.art));
    img.onerror = () => resolve(artUrl('sentinel'));
    img.src = artUrl(boss.art);
  });
}

/** Tensión del duelo: 0 tranquilo · 1 quedan pocos turnos o poco tiempo · 2 crítico. */
export function bossTension() {
  const G = S.G;
  if (!G || G.done) return 0;
  const left = G.limit - G.moves;
  let t = left <= Math.max(2, Math.ceil(G.limit * 0.2)) ? 1 : 0;
  if (left <= 2) t = 2;
  if (G.timeLimit > 0) {
    const r = G.timeLeft / G.timeLimit;
    if (r < 0.25) t = Math.max(t, 1);
    if (r < 0.1 || G.timeLeft < 10) t = 2;
  }
  return t;
}

const modalOpen = () => !!document.querySelector('.modal.show, #journey.show, #result.show');

function ambientStep() {
  if (!active) return;
  const t = bossTension();
  body.dataset.tension = String(t);
  tick++;
  if (reduced() || document.hidden || modalOpen()) return;
  const board = $('board')?.getBoundingClientRect();
  if (!board || !board.width) return;
  if (tick % 3 === 0) {
    // chispas de poder desde un borde del tablero
    const side = Math.floor(Math.random() * 4);
    const x = board.left + (side === 1 ? board.width : side === 3 ? 0 : Math.random() * board.width);
    const y = board.top + (side === 0 ? 0 : side === 2 ? board.height : Math.random() * board.height);
    burst(x, y, 5 + t * 4, [active.color[0], active.color[1], '#fff'], 3 + t);
  }
  if (tick % 14 === 0) {
    // oleada de intensidad: el color se enciende un instante
    body.classList.add('boss-surge');
    setTimeout(() => body.classList.remove('boss-surge'), 1100);
  }
}

/** Entra o sale de la fase de jefe según el nivel actual (se llama al empezar cada nivel). */
export function syncBossPhase() {
  const boss = S.G && !S.G.tutorial && S.G.plan?.boss ? bossFor(S.G.n) : null;
  if (boss === active && (boss || !body.classList.contains('boss-fight'))) return;
  active = boss;
  clearInterval(ambient);
  ambient = 0;
  if (!boss) {
    body.classList.remove('boss-fight', 'boss-surge');
    body.removeAttribute('data-tension');
    body.style.removeProperty('--boss-c');
    body.style.removeProperty('--boss-c2');
    return;
  }
  body.style.setProperty('--boss-c', boss.color[0]);
  body.style.setProperty('--boss-c2', boss.color[1]);
  body.dataset.tension = '0';
  body.classList.add('boss-fight');
  ambient = setInterval(ambientStep, 700);
}

/** El tablero del jefe «aterriza» tras la presentación: onda de choque con su color y destello de intensidad. */
export function bossArrive(boss) {
  if (reduced()) return;
  body.classList.add('boss-arrive', 'boss-surge');
  const board = $('board')?.getBoundingClientRect();
  if (board?.width) {
    const ring = document.createElement('div');
    ring.className = 'boss-shock';
    ring.style.cssText = `left:${board.left + board.width / 2}px;top:${board.top + board.height / 2}px;--sz:${Math.max(board.width, board.height)}px`;
    document.body.appendChild(ring);
    setTimeout(() => ring.remove(), 1100);
    burst(board.left + board.width / 2, board.top + board.height / 2, 16, [boss.color[0], boss.color[1], '#fff'], 10);
  }
  setTimeout(() => body.classList.remove('boss-arrive', 'boss-surge'), 1500);
}

/** Sale de la fase de jefe (al volver al menú sin partida en curso). */
export function leaveBossPhase() {
  active = null;
  clearInterval(ambient);
  ambient = 0;
  body.classList.remove('boss-fight', 'boss-surge');
  body.removeAttribute('data-tension');
}

/* ---------- Contrarreloj ---------- */
let timerId = 0;
let last = 0;
let lastSecond = -1;
export const onBossTimeUp = (fn) => {
  timeUpHandler = fn;
};
const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

function renderTimer() {
  const G = S.G;
  const el = $('bossTimer');
  if (!el || !G) return;
  const s = Math.max(0, G.timeLeft);
  $('btText').textContent = clock(Math.ceil(s));
  $('btFill').style.transform = `scaleX(${G.timeLimit ? s / G.timeLimit : 0})`;
  el.classList.toggle('low', s / G.timeLimit < 0.25);
  el.classList.toggle('crit', s < 10);
}

function timerStep() {
  const G = S.G;
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (!G || G.done || !(G.timeLimit > 0)) {
    syncBossTimer();
    return;
  }
  // el tiempo solo corre cuando se puede jugar: sin pausa, tienda, poderes, animaciones ni ventanas
  if (S.busy || document.hidden || modalOpen() || $('board')?.classList.contains('board-lock')) return;
  G.timeLeft = Math.max(0, G.timeLeft - Math.min(dt, 0.5));
  renderTimer();
  const sec = Math.ceil(G.timeLeft);
  if (G.timeLeft < 10 && sec !== lastSecond && G.timeLeft > 0) {
    lastSecond = sec;
    sfx.warn();
  }
  if (G.timeLeft <= 0) {
    timeUpHandler?.();
    syncBossTimer();
  }
}

/** Muestra u oculta la barra de tiempo y arranca o detiene el reloj según el nivel actual. */
export function syncBossTimer() {
  const G = S.G;
  const on = !!G && !G.done && G.timeLimit > 0 && S.run?.mode !== 'p';
  const el = $('bossTimer');
  if (el) el.hidden = !on;
  if (on) {
    renderTimer();
    if (!timerId) {
      last = performance.now();
      timerId = setInterval(timerStep, 200);
    }
  } else if (timerId) {
    clearInterval(timerId);
    timerId = 0;
  }
}
