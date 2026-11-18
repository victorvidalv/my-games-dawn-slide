/* Hilo aparte que prepara el siguiente tablero. El solver tarda 70–350 ms en un móvil lento: hecho aquí, las animaciones
   de pasar de nivel (puntos que vuelan al marcador, salida del tablero) no se congelan. Mismos datos y misma semilla que en
   el hilo principal, así que el tablero es idéntico. */
import levels from '../data/levels.json';
import special from '../data/special.json';
import { buildAdventureLevel } from './build-adventure.js';

self.onmessage = ({ data: { id, run, tips } }) => {
  try { self.postMessage({ id, G: buildAdventureLevel(run, { levels: levels.ratings, special, tips }) }); }
  catch (error) { self.postMessage({ id, error: String(error?.message || error) }); }
};
