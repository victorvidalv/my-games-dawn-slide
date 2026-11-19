import { hash32 } from '../engine/rng.js';
import { TUTORIALS } from './mechanics.js';

import { hasCurse } from '../engine/calibration.js';

/**
 * Maleficio: los niveles con el tablero girado los decide el calibrador (irregulares, nunca en jefes ni en tutoriales de piezas);
 * el primero lleva su tutorial. El resto de niveles mantienen la salida a la derecha, así que el giro es una sorpresa.
 */
export const FIRST_ROTATED_LEVEL = TUTORIALS.curse.level;
/** Conjunto de niveles girados (no depende de la partida; solo el sentido del giro cambia). */
export function rotatedLevels(_seed, max = 100) {
  const set = new Set();
  for (let l = 1; l <= max; l++) if (hasCurse(l)) set.add(l);
  return set;
}

/**
 * Giro visual del tablero: 0 (lo normal) o 90, 180, 270° en sentido horario (la salida queda abajo, a la izquierda o arriba).
 * El motor no cambia (la llave sigue saliendo «a la derecha» en sus coordenadas); solo se gira lo que se ve y se traduce el arrastre.
 * Es determinista por partida y nivel, así que al reanudar, reintentar o revivir el tablero se ve igual.
 */
export function boardRotation(seed, level, tutorial = false) {
  if (tutorial) return TUTORIALS[tutorial]?.rot ?? 0; // solo el tutorial del maleficio gira
  if (!hasCurse(level)) return 0;
  return (1 + (hash32(seed ?? 0, level, 90) % 3)) * 90;
}

/** Pasa un desplazamiento de pantalla (dx, dy) al eje del tablero girado `deg` grados: devuelve el desplazamiento en el eje `o` ('h' o 'v'). */
export function localDelta(dx, dy, deg, o) {
  const r = (((deg % 360) + 360) % 360) / 90;
  const [c, s] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ][r];
  return o === 'h' ? dx * c + dy * s : -dx * s + dy * c;
}
