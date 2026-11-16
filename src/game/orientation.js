import { hash32 } from '../engine/rng.js';

/** Primer nivel con el tablero girado: los diez primeros (tutoriales) siempre llevan la salida a la derecha. */
export const FIRST_ROTATED_LEVEL = 11;

/**
 * Giro visual del tablero (0, 90, 180 o 270° en sentido horario): la salida queda a la derecha, abajo, a la izquierda o arriba.
 * El motor no cambia (la llave sigue saliendo «a la derecha» en sus coordenadas); solo se gira lo que se ve y se traduce el arrastre.
 * Es determinista por partida y nivel, así que al reanudar, reintentar o revivir el tablero se ve igual.
 */
export function boardRotation(seed, level, tutorial = false) {
  if (tutorial || level < FIRST_ROTATED_LEVEL) return 0;
  return (hash32(seed ?? 0, level, 90) % 4) * 90;
}

/** Pasa un desplazamiento de pantalla (dx, dy) al eje del tablero girado `deg` grados: devuelve el desplazamiento en el eje `o` ('h' o 'v'). */
export function localDelta(dx, dy, deg, o) {
  const r = (((deg % 360) + 360) % 360) / 90;
  const [c, s] = [[1, 0], [0, 1], [-1, 0], [0, -1]][r];
  return o === 'h' ? dx * c + dy * s : -dx * s + dy * c;
}
