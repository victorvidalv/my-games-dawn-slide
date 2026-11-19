import { hintEvery } from './heroes.js';
import { startHintsFor } from '../engine/difficulty.js';

/** Niveles desde los que se puede empezar una aventura (opcionales): se desbloquean al alcanzarlos antes en ese mismo camino. */
export const START_LEVELS = [1, 21, 51, 71];

/** Opciones de inicio según el nivel más alto alcanzado en el camino: `[{level, unlocked}]`. El 1 siempre está disponible. */
export const startOptions = (reached = 0) =>
  START_LEVELS.map((level) => ({ level, unlocked: level === 1 || reached >= level }));

/** ¿Se puede empezar desde `level` habiendo llegado a `reached`? */
export const canStartAt = (reached, level) => startOptions(reached).some((o) => o.level === level && o.unlocked);

/** Pistas con las que se empieza desde `level`: las del camino más las que habría ganado al subir hasta allí (así no se sale con desventaja). */
export const startHintsAt = (start, level = 1) => startHintsFor(start) + Math.floor((level - 1) / hintEvery(start));
