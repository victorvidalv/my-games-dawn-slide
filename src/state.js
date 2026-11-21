import { heroById } from './game/heroes.js';
import { runGain } from './game/run-points.js';
import { mergeSaves } from './game/save-merge.js';
import { migrateAchievements } from './game/achievements.js';
/* ============================ Estado y guardado ============================ */
/* Los puntajes viven SIEMPRE en localStorage (clave estable entre versiones, con copia de respaldo) */
const SAVE = 'desbloquea.rogue.v2',
  BAK = SAVE + '.bak';
function readStore() {
  // lee el guardado; si está dañado, usa la copia de respaldo
  for (const k of [SAVE, BAK]) {
    try {
      const v = JSON.parse(localStorage.getItem(k) || 'null');
      if (v && typeof v === 'object') return v;
    } catch (e) {}
  }
  return {};
}
export const store = Object.assign({ best: { score: 0, level: 0 }, run: null, paths: {}, mode: 'c' }, readStore());
store.mode = 'c';
if (store.run) {
  store.run.mode = 'c';
  if (!Number.isFinite(store.run.hints)) store.run.hints = 3;
}
if (!store.paths) store.paths = {};
/* La marcha de los jefes (que ya no existen) pasó a ser la «Marcha del destino»: quien la tenía la conserva. */
for (const box of [store.shopOwned, store.shopPaid])
  if (box && Object.hasOwn(box, 'music:boss')) {
    box['music:fate'] = box['music:boss'];
    delete box['music:boss'];
  }
if (store.look?.music === 'boss') store.look.music = 'fate';
migrateAchievements(store); // logros de jefes → cartas, y los retirados pasan a puntos heredados
if (store.best && store.best.score > 0 && !store.paths.c1)
  store.paths.c1 = { score: store.best.score, level: store.best.level, runs: 0 }; // migra récords antiguos
/* Tres caminos de 100 niveles. 's' = dificultad inicial (1-100); sube de forma lineal hasta 100 en el nivel 100 */
export const PATHS = [
  { s: 1, n: 'Normal', e: 'Ⅰ', c: '#43e0c1', d: 'Para empezar y aprender' },
  { s: 50, n: 'Difícil', e: 'Ⅱ', c: '#ffc65a', d: 'Más difícil, más puntos' },
  { s: 75, n: 'Experto', e: 'Ⅲ', c: '#ff5f8f', d: 'Solo para expertos' },
];
export const pathOf = (s) => PATHS.find((p) => p.s === s) || PATHS[0];
export const rkey = () => S.run.mode + S.run.start;

/* Estado mutable compartido entre módulos: la aventura en curso, el tablero activo y si la UI está ocupada. */
export const S = { run: null, G: null, busy: false, lastCfg: { start: 1, mode: 'c' } };
/* Toda escritura de S.run, S.G, S.busy y S.lastCfg pasa por estas funciones: así se puede rastrear quién cambia qué. */
export const setRun = (run) => {
  S.run = run;
};
export const setBoard = (G) => {
  S.G = G;
};
export const setBusy = (busy) => {
  S.busy = busy;
};
export const rememberConfig = (run) => {
  S.lastCfg = { start: run.start, mode: run.mode };
};
/** Detiene el tablero activo (no acepta más movimientos) y bloquea la UI. */
export function haltBoard() {
  S.G.done = true;
  S.busy = true;
}
/** Cierra el tablero activo y suelta la partida en memoria; el guardado no cambia. */
export function closeRun() {
  if (S.G) S.G.done = true;
  S.run = null;
  S.busy = false;
}
/** Olvida la partida: la borra del guardado y de la memoria. */
export function discardRun() {
  store.run = null;
  persist();
  S.run = null;
}
/** Marca la UI como ocupada y devuelve la función que restaura el valor anterior. */
export function holdBusy() {
  const was = S.busy;
  S.busy = true;
  return () => {
    S.busy = was;
  };
}
export const heroOf = (id = S.run?.hero) => heroById(id);
/** Puntos que dan `moves` movimientos en el tablero actual (incluye racha, cartas del destino y reliquia). */
export const gainNow = (moves = S.G.moves) => runGain(S.run, moves, S.G.opt, S.run.streak || 0, S.G);
export function persist(next = store) {
  try {
    const merged = mergeSaves(next, readStore()); // recoge avances de otras pestañas
    const text = JSON.stringify(merged);
    localStorage.setItem(SAVE, text);
    Object.assign(store, merged);
    try {
      localStorage.setItem(BAK, text);
    } catch {
      /* se guardó la copia principal */
    }
    return true;
  } catch {
    return false;
  }
}

/** Combina el progreso y solo sustituye la aventura local cuando el jugador lo confirma. */
export function importProgress(incoming, { replaceRun = false } = {}) {
  const disk = readStore();
  const localRun = disk.run || store.run;
  if (incoming.run && localRun && !replaceRun) return 'confirm';
  const updated = mergeSaves(mergeSaves(store, disk), incoming);
  updated.run = incoming.run || localRun || null;
  updated.look = incoming.look;
  updated.tips = { ...disk.tips, ...store.tips, ...incoming.tips };
  migrateAchievements(updated);
  return persist(updated) ? 'done' : 'error';
}
