/**
 * Progreso: anota las acciones del juego (contadores, marcas, colecciones), desbloquea lo cumplido y lo avisa con un
 * aviso flotante de uno en uno.
 */
import { sfx } from '../../audio/sound.js';
import {
  bumpStat,
  claimAchievements,
  markStat as addToCollection,
  raiseStat as raiseStore,
  revalidateUnlocks,
  unlockRewards,
} from '../../game/achievements.js';
import { persist, store } from '../../state.js';
import { icon } from '../icons.js';
import { applyLook } from './look.js';
import { paintAchBadge } from './news.js';

/* ---------- aviso «objeto desbloqueado» (de uno en uno) ---------- */
const queue = [];
let activeToast = null;
let toastsPaused = false;
function nextToast() {
  if (toastsPaused || activeToast || !queue.length) return;
  const { type, item } = queue.shift();
  const t = document.createElement('div');
  t.className = `ach-toast tier-${item.rarity === 'legendary' ? 'gold' : item.rarity === 'common' ? 'bronze' : 'silver'}`;
  t.setAttribute('role', 'status');
  t.innerHTML = `<i aria-hidden="true">${icon('unlock')}</i><div><small>Desbloqueado</small><b></b><span></span></div>`;
  t.querySelector('b').textContent = item.name;
  t.querySelector('span').textContent = 'Personalizar';
  document.body.appendChild(t);
  sfx.unlock();
  const timer = setTimeout(() => {
    t.remove();
    activeToast = null;
    nextToast();
  }, 3200);
  activeToast = { entry: { type, item }, element: t, timer };
}

/** Guarda los avisos mientras el jugador elige el camino y viaja a la próxima ciudad. */
export function pauseAchievementToasts(paused) {
  toastsPaused = paused;
  if (paused && activeToast) {
    clearTimeout(activeToast.timer);
    activeToast.element.remove();
    queue.unshift(activeToast.entry);
    activeToast = null;
  }
  if (!paused) nextToast();
}

/** Anota las acciones cumplidas (registro interno) y desbloquea los objetos que correspondan. */
export function checkAchievements({ silent = false } = {}) {
  const logged = claimAchievements(store);
  const fresh = unlockRewards(store);
  paintAchBadge();
  if (!fresh.length && !logged.length) return fresh;
  persist();
  if (!silent) {
    queue.push(...fresh.slice(0, 3));
    nextToast();
  }
  return fresh;
}

/** Suma 1 a uno o varios contadores y comprueba si se desbloqueó algo. */
export function countStat(...names) {
  if (!names.length) return;
  for (const name of names) bumpStat(store, name);
  persist();
  checkAchievements();
}

/** Sube una marca máxima (p. ej. la mejor racha de una partida) y comprueba si se desbloqueó algo. */
export function raiseStat(name, value) {
  if (!raiseStore(store, name, value)) return;
  persist();
  checkAchievements();
}

/** Aplica `fn(store)` (que devuelve true si cambió alguna estadística) y comprueba los desbloqueos. */
export function updateStats(fn) {
  if (!fn(store)) return;
  persist();
  checkAchievements();
}

/** Anota `key` en una colección y comprueba si se desbloqueó algo. */
export function markStat(name, key) {
  if (!addToCollection(store, name, key)) return;
  persist();
  checkAchievements();
}

/** Al arrancar: desbloquea en silencio lo ya cumplido (también en guardados antiguos) y aplica el aspecto. */
export function initCollection() {
  if (revalidateUnlocks(store)) persist(); // cierra lo abierto con reglas anteriores
  checkAchievements({ silent: true });
  applyLook();
}
