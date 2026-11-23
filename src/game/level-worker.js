/* Hilo aparte que prepara el siguiente tablero. El solver tarda 70–350 ms en un móvil lento: hecho aquí, las animaciones
   de pasar de nivel (puntos que vuelan al marcador, salida del tablero) no se congelan. Mismos datos y misma semilla que en
   el hilo principal, así que el tablero es idéntico.
   Los bancos de tableros NO van dentro de este hilo (serían ~780 KB repetidos en la descarga y la precaché): el hilo
   principal, que ya los cargó, se los manda una vez con el primer mensaje ({ banks }). */
import { buildDaily, challengeById } from './daily.js';
import { buildAdventureLevel } from './build-adventure.js';

let bankData = null;

self.onmessage = ({ data }) => {
  if (data.banks) {
    bankData = data.banks;
    return;
  }
  const { id, run, tips } = data;
  try {
    if (!bankData) throw new Error('level worker: banks not loaded');
    const banks = { levels: bankData.levels, special: bankData.special, tips };
    const d = run.daily;
    const G = d ? buildDaily(challengeById(d.id), d.day, banks, d.index, d.remaining) : buildAdventureLevel(run, banks);
    self.postMessage({ id, G });
  } catch (error) {
    self.postMessage({ id, error: String(error?.message || error) });
  }
};
