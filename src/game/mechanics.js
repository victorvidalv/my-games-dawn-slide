import { zoneIdx } from '../data/zones.js';

/**
 * Piezas especiales y calendario de niveles. Cada ciudad tiene su mecánica; los primeros niveles de cada ciudad
 * son normales y la mecánica aparece en los tramos 3, 5, 6, 8, 9 y 10.
 * (El Valle empieza más tarde, en el 6, para que los primeros niveles enseñen lo básico.)
 */
export const MECHANICS = {
  wall: {
    id: 'wall', icon: 'rock', name: 'Roca fija', chip: 'Roca fija',
    tip: 'Las rocas no se mueven ni se pueden empujar. Rodéalas para abrirle camino a la llave roja.',
  },
  gate: {
    id: 'gate', icon: 'lock', name: 'Candado', chip: 'Candado: cubre ▣',
    tip: 'Esta pieza está atrapada. Se libera mientras OTRA pieza cubra la placa ▣ del suelo. En cuanto la tapes, el candado se abre.',
  },
  heavy: {
    id: 'heavy', icon: 'weight', name: 'Pieza pesada', chip: 'Pesada: 1 paso',
    tip: 'Esta pieza pesa tanto que solo avanza UNA casilla por movimiento. Planifica cada paso.',
  },
  ice: {
    id: 'ice', icon: 'ice', name: 'Pieza de hielo', chip: 'Hielo: hasta el tope',
    tip: 'Resbala sin freno: en cuanto la empujas, patina hasta chocar con otra pieza, una roca o el borde. No puede parar a medias.',
  },
  door: {
    id: 'door', icon: 'door', name: 'Portón de color', chip: 'Portón: su tinte',
    tip: 'Solo deja pasar piezas con la gema de su mismo color y símbolo (◆ ● ▲). Para las demás funciona como una pared.',
  },
};

/** Familia dominante por ciudad (referencia de progresión; ver LEVEL_FAMILIES para cada nivel 1..100). */
export const CITY_FAMILY = ['walls', 'heavy', 'gates', 'ice', 'doors', 'doorduo', 'duo', 'doorduo', 'mixed', 'mixed'];

/** Nivel jefe al cierre de cada una de las 10 ciudades (10, 20, ..., 100). */
export const isBossLevel = (level) => level >= 10 && level % 10 === 0;

/**
 * Calendario de los 100 niveles:
 *   1–7   solo tableros normales (`plain`)
 *   8+    rocas (`walls`, tutorial en el 8; primer jefe en el 10 con rocas)
 *   18+   pesadas (`heavy`, tutorial en el 18; jefe 20)
 *   28+   candados (`gates`, tutorial en el 28; jefe 30)
 *   38+   hielo (`ice`, tutorial en el 38; jefe 40)
 *   48+   portones de color (`doors`, tutorial en el 48; jefe 50)
 *   51+   combinaciones de piezas (`duo`, `doorduo`, `mixed`) con todos los jefes cargando piezas especiales
 */
const LEVEL_FAMILIES = [
  // 1..10 (tutorial roca 8, jefe 10)
  'plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'plain', 'walls', 'plain', 'walls',
  // 11..20 (tutorial pesada 18, jefe 20)
  'plain', 'plain', 'walls', 'plain', 'plain', 'walls', 'plain', 'heavy', 'plain', 'heavy',
  // 21..30 (tutorial candado 28, jefe 30)
  'plain', 'walls', 'plain', 'plain', 'heavy', 'plain', 'walls', 'gates', 'heavy', 'gates',
  // 31..40 (tutorial hielo 38, jefe 40)
  'plain', 'heavy', 'plain', 'walls', 'plain', 'gates', 'plain', 'ice', 'gates', 'ice',
  // 41..50 (tutorial portón 48, jefe 50)
  'plain', 'walls', 'plain', 'ice', 'gates', 'plain', 'heavy', 'doors', 'ice', 'doors',
  // 51..60 (combinaciones + jefe 60)
  'duo', 'plain', 'doors', 'plain', 'duo', 'heavy', 'plain', 'doorduo', 'plain', 'doorduo',
  // 61..70 (jefe 70)
  'gates', 'plain', 'duo', 'doors', 'mixed', 'plain', 'ice', 'doorduo', 'plain', 'duo',
  // 71..80 (jefe 80)
  'duo', 'plain', 'mixed', 'doors', 'plain', 'doorduo', 'plain', 'mixed', 'ice', 'doorduo',
  // 81..90 (jefe 90)
  'mixed', 'plain', 'doorduo', 'doors', 'mixed', 'heavy', 'plain', 'mixed', 'duo', 'mixed',
  // 91..100 (jefe 100)
  'mixed', 'doorduo', 'plain', 'mixed', 'doors', 'plain', 'mixed', 'doorduo', 'mixed', 'mixed',
];

const INTRO_LEVELS = new Set([8, 18, 28, 38, 48, 51]);

/** Qué mecánicas contiene una familia de tableros. */
export const mechanicsOfFamily = (family) => ({
  plain: [],
  walls: ['wall'],
  gates: ['gate'],
  heavy: ['heavy'],
  ice: ['ice'],
  doors: ['door'],
  doorduo: ['door', 'gate', 'heavy', 'ice'],
  duo: ['gate', 'heavy', 'ice'],
  mixed: ['wall', 'gate', 'heavy', 'ice'],
}[family] ?? []);

/** Plan de un nivel (1..100): {family, city, step, intro, boss, mechanics}. */
export function levelPlan(level) {
  const city = zoneIdx(level);
  const step = ((level - 1) % 10) + 1;
  const family = LEVEL_FAMILIES[level - 1] ?? 'mixed';
  return { family, city, step, intro: INTRO_LEVELS.has(level), boss: isBossLevel(level), mechanics: mechanicsOfFamily(family) };
}

/**
 * Tableros de aprendizaje hechos a mano: la PRIMERA vez que aparece cada pieza, el nivel tiene un tablero minúsculo
 * (3 movimientos) pensado para entender cómo funciona, con la guía señalando cada movimiento.
 * Formato de los tableros: ver encodeBoard (src/engine/board.js).
 */
export const TUTORIALS = {
  wall: {
    level: 8,
    board: 'h2.2.0 v2.3.2 h2.4.3 #1.3',          // la roca (1,3) impide subir el bloque vertical: hay que bajarlo
    steps: [
      'Esta roca no se mueve. Rodéala: mueve el bloque que brilla.',
      'Bien. Ahora el bloque vertical puede bajar.',
      '¡Hay camino! Saca la llave roja.',
    ],
  },
  heavy: {
    level: 18,
    board: 'h2.2.0 v2.3.2p #4.3',                // pesada: sube de a una casilla; la roca (4,3) impide bajarla
    steps: [
      'Esta pieza es pesada: solo avanza UNA casilla por movimiento. Muévela hacia arriba.',
      'Una casilla más…',
      '¡Listo! Saca la llave roja.',
    ],
  },
  gate: {
    level: 28,
    board: 'h2.2.0 v2.3.1g5.0 h2.5.3',            // candado vertical con la placa en (5,0); solo el bloque de abajo llega a ella
    steps: [
      'Este bloque tiene candado y está atrapado. Cubre la placa ▣ con el bloque que brilla.',
      '¡La placa brilla! El candado se abrió: ahora sí puedes moverlo.',
      'Camino libre. Saca la llave roja.',
    ],
  },
  ice: {
    level: 38,
    board: 'h2.2.0 v3.3.0i h2.3.2',             // hielo: primero aparta el tope de abajo y luego patina de golpe hasta el fondo
    steps: [
      'Esta pieza es de hielo y patina sin parar hasta un tope. Primero aparta el bloque que brilla.',
      '¡Camino despejado! Empuja la pieza de hielo hacia abajo: patinará hasta el borde.',
      '¡Patina en un solo movimiento! Ahora saca la llave roja.',
    ],
  },
  door: {
    level: 48,
    board: 'h2.2.0 v2.2.2t0 h2.0.1 d1.2.0 d4.2.1', // portón ◆ en (1,2): deja pasar al bloque ◆; el portón ● en (4,2) lo frena abajo
    steps: [
      'Los portones solo dejan pasar gemas de su mismo color. Primero aparta el bloque de arriba.',
      '¡Libre! Sube el bloque azul ◆ atravesando el portón ◆.',
      '¡Cruzó el portón! Saca la llave roja.',
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
