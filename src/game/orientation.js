import { hash32 } from '../engine/rng.js';

/** Primer nivel con el tablero girado: hasta el 16 la salida siempre está a la derecha. */
export const FIRST_ROTATED_LEVEL = 17;

/**
 * Niveles con el tablero girado: el primero es el 17 y después uno cada 6 o 7 niveles (irregular, según la partida), para que sea una
 * sorpresa; el resto, la orientación de siempre (salida a la derecha). Los jefes y los tutoriales nunca giran.
 */
export function rotatedLevels(seed, max = 100) {
  const set = new Set();
  for (let l = FIRST_ROTATED_LEVEL, k = 0; l <= max; k++) {
    set.add(l);
    l += 6 + (hash32(seed ?? 0, k, 67) % 2);
  }
  return set;
}

/**
 * Giro visual del tablero: 0 (lo normal) o 90, 180, 270° en sentido horario (la salida queda abajo, a la izquierda o arriba).
 * El motor no cambia (la llave sigue saliendo «a la derecha» en sus coordenadas); solo se gira lo que se ve y se traduce el arrastre.
 * Es determinista por partida y nivel, así que al reanudar, reintentar o revivir el tablero se ve igual.
 */
export function boardRotation(seed, level, tutorial = false) {
  if (tutorial || level < FIRST_ROTATED_LEVEL || level % 10 === 0 || !rotatedLevels(seed, level).has(level)) return 0;
  return (1 + (hash32(seed ?? 0, level, 90) % 3)) * 90;
}

/** Pasa un desplazamiento de pantalla (dx, dy) al eje del tablero girado `deg` grados: devuelve el desplazamiento en el eje `o` ('h' o 'v'). */
export function localDelta(dx, dy, deg, o) {
  const r = (((deg % 360) + 360) % 360) / 90;
  const [c, s] = [[1, 0], [0, 1], [-1, 0], [0, -1]][r];
  return o === 'h' ? dx * c + dy * s : -dx * s + dy * c;
}
