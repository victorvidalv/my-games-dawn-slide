/* Hilo aparte que prepara el siguiente tablero. El solver tarda 70–350 ms en un móvil lento: hecho aquí, las animaciones
   de pasar de nivel (puntos que vuelan al marcador, salida del tablero) no se congelan. Mismos datos y misma semilla que en
   el hilo principal, así que el tablero es idéntico. */
import levels from '../data/levels.json';
import special from '../data/special.json';
import { buildDaily, challengeById } from './daily.js';
import { buildAdventureLevel } from './build-adventure.js';

self.onmessage = ({ data: { id, run, tips } }) => {
  try {
    const banks = { levels: levels.ratings, special, tips };
    const d = run.daily;
    const G = d ? buildDaily(challengeById(d.id), d.day, banks, d.index) : buildAdventureLevel(run, banks);
    self.postMessage({ id, G });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
