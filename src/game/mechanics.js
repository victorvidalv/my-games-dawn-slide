import { zoneIdx } from '../data/zones.js';
import { TUTORIAL_LEVELS, lettersAt } from '../engine/calibration.js';
import { comboKey } from '../engine/decorate.js';

/** Piezas especiales (con su texto de ayuda) y el calendario de mecánicas de los 100 niveles. */
export const MECHANICS = {
  wall: {
    id: 'wall',
    icon: 'rock',
    name: 'Roca fija',
    chip: 'Roca fija',
    tip: 'Las rocas no se mueven ni se pueden empujar. Rodéalas para abrirle camino a la llave roja.',
  },
  gate: {
    id: 'gate',
    icon: 'lock',
    name: 'Candado',
    chip: 'Candado: cubre 🔒',
    tip: 'Esta pieza está atrapada. Se libera mientras OTRA pieza cubra la placa 🔒 del suelo. En cuanto la tapes, el candado se abre.',
  },
  heavy: {
    id: 'heavy',
    icon: 'weight',
    name: 'Pieza pesada',
    chip: 'Pesada: 1 paso',
    tip: 'Esta pieza pesa tanto que solo avanza UNA casilla por movimiento. Planifica cada paso.',
  },
  ice: {
    id: 'ice',
    icon: 'ice',
    name: 'Pieza de hielo',
    chip: 'Hielo: hasta el tope',
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
 * (src/data/calibration.json). Cada mecánica llega con su tutorial en un nivel propio, nunca dos novedades a la vez, y después vuelve
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

/** Niveles donde llega una mecánica nueva (con tutorial aparte): no se les suma otra novedad. */
export const INTRO_LEVEL_LIST = Object.values(TUTORIAL_LEVELS).sort((a, b) => a - b);
const INTRO_LEVELS = new Set(INTRO_LEVEL_LIST);

/** Qué mecánicas contiene una familia (en el orden roca, pesada, candado, hielo). */
export const mechanicsOfFamily = (family) => [...(lettersOfFamily(family) ?? '')].map((c) => LETTER_MECH[c]);

/** Plan de un nivel (1..100): {family, city, step, intro, mechanics}. */
export function levelPlan(level) {
  const city = zoneIdx(level);
  const step = ((level - 1) % 10) + 1;
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

/**
 * Tableros de aprendizaje hechos a mano: la PRIMERA vez que aparece cada pieza, el nivel tiene un tablero minúsculo
 * (3 movimientos) pensado para entender cómo funciona, con la guía señalando cada movimiento.
 * Formato de los tableros: ver encodeBoard (src/engine/board.js).
 */
export const TUTORIALS = {
  wall: {
    level: TUTORIAL_LEVELS.wall,
    board: 'h2.2.0 v2.3.2 h2.4.3 #1.3', // la roca (1,3) impide subir el bloque vertical: hay que bajarlo
    steps: [
      'Esta roca no se mueve. Rodéala: mueve el bloque que brilla.',
      'Bien. Ahora el bloque vertical puede bajar.',
      '¡Hay camino! Saca la llave roja.',
    ],
  },
  heavy: {
    level: TUTORIAL_LEVELS.heavy,
    board: 'h2.2.0 v2.3.2p #4.3', // pesada: sube de a una casilla; la roca (4,3) impide bajarla
    steps: [
      'Esta pieza es pesada: solo avanza UNA casilla por movimiento. Muévela hacia arriba.',
      'Una casilla más…',
      '¡Listo! Saca la llave roja.',
    ],
  },
  gate: {
    level: TUTORIAL_LEVELS.gate,
    board: 'h2.2.0 v2.3.1g5.0 h2.5.3', // candado vertical con la placa en (5,0); solo el bloque de abajo llega a ella
    steps: [
      'Este bloque tiene candado y está atrapado. Cubre la placa 🔒 con el bloque que brilla.',
      '¡La placa brilla! El candado se abrió: ahora sí puedes moverlo.',
      'Camino libre. Saca la llave roja.',
    ],
  },
  ice: {
    level: TUTORIAL_LEVELS.ice,
    board: 'h2.2.0 v3.3.0i h2.3.2', // hielo: primero aparta el tope de abajo y luego patina de golpe hasta el fondo
    steps: [
      'Esta pieza es de hielo y patina sin parar hasta un tope. Primero aparta el bloque que brilla.',
      '¡Camino despejado! Empuja la pieza de hielo hacia abajo: patinará hasta el borde.',
      '¡Patina en un solo movimiento! Ahora saca la llave roja.',
    ],
  },
  curse: {
    level: TUTORIAL_LEVELS.curse,
    rot: 180, // el tablero se ve girado: la salida queda a la izquierda
    board: 'h2.2.0 v3.3.0 h2.4.3 h2.1.0', // 3 movimientos: aparta la barra de abajo, baja la vertical y saca la llave
    steps: [
      '¡Maleficio! El tablero giró: la salida ➜ está ahora a la IZQUIERDA. Mueve el bloque que brilla.',
      'Bien. Piensa en la llave roja: ella siempre sale hacia la flecha dorada.',
      '¡Camino libre! Saca la llave roja por la izquierda.',
    ],
  },
};

/** ¿Hay un nivel extra de tutorial antes de este nivel (si no se completó ya)? Va ANTES del nivel real: no da puntos ni cuenta como nivel. */
export function tutorialFor(level, seenTips = {}) {
  for (const [mech, t] of Object.entries(TUTORIALS)) {
    if (t.level === level && !seenTips['tut_' + mech]) return { mech, ...t };
  }
  return null;
}
