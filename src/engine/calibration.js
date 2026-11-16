import data from '../data/calibration.js';

/**
 * Calendario calibrado de los 100 niveles (generado por `npm run calibrate` a partir de las preferencias del calibrador).
 * Por nivel: letras de las mecánicas (w roca, h pesada, g candado, i hielo, d portón), maleficio, tipo de sello, tutorial del sello y
 * turnos mínimos de cada camino (Normal, Difícil, Experto).
 */
export const TUTORIAL_LEVELS = data.tutorials;
const PATH_COL = { 1: 4, 50: 5, 75: 6 };

const row = (level) => data.levels[Math.max(1, Math.min(100, level)) - 1];
/** Letras de las mecánicas de un nivel ('' = tablero normal). */
export const lettersAt = (level) => row(level)[0];
export const hasCurse = (level) => row(level)[1] === 1;
/** Sello del nivel: {tier, tutorial} o null. */
export const sealAt = (level) => { const r = row(level); return r[2] ? { tier: r[2], tutorial: r[3] === 1 } : null; };
/** Turnos mínimos calibrados del nivel en el camino `path` (1, 50 o 75). */
export const minFor = (path, level) => row(level)[PATH_COL[path] ?? 4];
