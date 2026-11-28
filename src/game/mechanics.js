import { zoneIdx, zoneStep } from '../data/zones.js';
import { TUTORIAL_LEVELS, lettersAt } from '../engine/calibration.js';
import { comboKey } from '../engine/decorate.js';

/** Piezas especiales (con su texto de ayuda) y el calendario de mecánicas de los 100 niveles. */
export const MECHANICS = {
  wall: {
    id: 'wall',
    icon: 'rock',
    name: 'Roca fija',
    chip: 'Roca fija',
    brief: 'Las rocas no dejan pasar.',
    tip: 'Las rocas no se mueven ni se pueden empujar. Rodéalas para abrirle camino a la llave roja.',
  },
  gate: {
    id: 'gate',
    icon: 'lock',
    name: 'Candado',
    chip: 'Candado: cubre 🔒',
    brief: 'El candado se abre al tapar la placa 🔒.',
    tip: 'Esta pieza está atrapada. Se libera mientras OTRA pieza cubra la placa 🔒 del suelo. En cuanto la tapes, el candado se abre.',
  },
  heavy: {
    id: 'heavy',
    icon: 'weight',
    name: 'Pieza pesada',
    chip: 'Pesada: 1 paso',
    brief: 'La pesada avanza solo 1 casilla.',
    tip: 'Esta pieza pesa tanto que solo avanza UNA casilla por movimiento. Planifica cada paso.',
  },
  ice: {
    id: 'ice',
    icon: 'ice',
    name: 'Pieza de hielo',
    chip: 'Hielo: hasta el tope',
    brief: 'El hielo se desliza hasta chocar.',
    tip: 'Resbala sin freno: en cuanto la empujas, patina hasta chocar con otra pieza, una roca o el borde. No puede parar a medias.',
  },
  curse: {
    id: 'curse',
    icon: 'flame',
    name: 'Maleficio',
    chip: 'Maleficio: salida movida',
    tip: 'Un maleficio gira el tablero: la salida ➜ cambia de lado (abajo, a la izquierda o arriba). Las piezas se oscurecen y la llave roja brilla en violeta. Todo funciona igual: solo busca hacia dónde sale la llave.',
  },
};

/**
 * CALENDARIO DE MECÁNICAS (1..100): lo decide el calibrador (`tools/calibrator`) y lo optimiza `npm run calibrate`
 * (src/data/calibration.json). Cada mecánica llega en un nivel propio, nunca dos novedades a la vez, y después vuelve
 * cada pocos niveles sin repetir la misma mezcla; las mezclas crecen con el nivel hasta usar todas juntas al final.
 */
const LETTER_MECH = { w: 'wall', h: 'heavy', g: 'gate', i: 'ice' };
const LETTER_FAMILY = { w: 'walls', h: 'heavy', g: 'gates', i: 'ice' };
/** Nombre de la familia de tableros para unas letras de mecánicas ('' = plain; una sola = su familia clásica; varias = `combo_<letras>`). */
export const familyOfLetters = (letters) =>
  !letters ? 'plain' : letters.length === 1 ? LETTER_FAMILY[letters] : comboKey(letters);
/** Letras (w h g i) de una familia; null si no es una combinación conocida. */
export const lettersOfFamily = (family) => {
  if (family === 'plain') return '';
  const single = Object.entries(LETTER_FAMILY).find(([, f]) => f === family);
  if (single) return single[0];
  return /^combo_([whgi]+)$/.exec(family)?.[1] ?? null;
};

/** Niveles donde llega una mecánica nueva : no se les suma otra novedad. */
export const INTRO_LEVEL_LIST = Object.values(TUTORIAL_LEVELS).sort((a, b) => a - b);
const INTRO_LEVELS = new Set(INTRO_LEVEL_LIST);

/** Qué mecánicas contiene una familia (en el orden roca, pesada, candado, hielo). */
export const mechanicsOfFamily = (family) => [...(lettersOfFamily(family) ?? '')].map((c) => LETTER_MECH[c]);

/** Plan de un nivel (1..21): {family, city, step, intro, mechanics}. */
export function levelPlan(level) {
  const city = zoneIdx(level);
  const step = zoneStep(level);
  const letters = [...'whgi'].filter((c) => lettersAt(level).includes(c)).join('');
  const family = familyOfLetters(letters);
  return {
    family,
    letters,
    city,
    step,
    intro: INTRO_LEVELS.has(level),
    mechanics: mechanicsOfFamily(family),
  };
}
