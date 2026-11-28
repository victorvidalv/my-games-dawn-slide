import { loadBanks } from '../data/banks.js';
import { buildDaily, challengeById } from './daily.js';
import { buildAdventureLevel } from './build-adventure.js';

/* Prepara el tablero de aventura en un Web Worker (level-worker.js) para no bloquear la animación en curso.
   Si el navegador no tiene workers o el hilo falla, se prepara aquí mismo, como antes. */
let worker = null,
  seq = 0,
  banksSent = null;
const waiting = new Map();
const failAll = () => {
  waiting.forEach((w) => w.reject(new Error('level worker')));
  waiting.clear();
};
function getWorker() {
  if (worker !== null) return worker;
  try {
    worker = new Worker(new URL('./level-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = ({ data }) => {
      const w = waiting.get(data.id);
      if (!w) return;
      waiting.delete(data.id);
      if (data.error) w.reject(new Error(data.error));
      else w.resolve(data.G);
    };
    worker.onerror = (e) => {
      e.preventDefault?.();
      worker.terminate();
      worker = false;
      banksSent = null;
      failAll();
    };
  } catch {
    worker = false;
  }
  return worker;
}
/** Arranca el hilo en un momento libre (mientras ves el menú) para que el primer tablero no espere a cargarlo. */
export const warmLevelWorker = () => {
  if (typeof Worker !== 'undefined') (self.requestIdleCallback || ((f) => setTimeout(f, 800)))(() => getWorker());
};

async function buildHere(run) {
  const { levelBank, specialBank } = await loadBanks();
  const banks = { levels: levelBank.ratings, special: specialBank };
  const d = run.daily;
  return d
    ? buildDaily(challengeById(d.id), d.seed ?? d.day, banks, d.index, d.remaining)
    : buildAdventureLevel(run, banks);
}
/** Manda los bancos al hilo una sola vez (los mensajes llegan en orden: los tableros pedidos después ya los tienen). */
const sendBanks = (w) =>
  (banksSent ||= loadBanks().then(({ levelBank, specialBank }) => {
    w.postMessage({ banks: { levels: levelBank.ratings, special: specialBank } });
  }));
/** Igual que buildAdventureLevel, pero sin bloquear el hilo principal. */
export async function buildLevelAsync(run) {
  const w = typeof Worker !== 'undefined' && getWorker();
  if (w) {
    try {
      await sendBanks(w);
      const id = ++seq,
        msg = { id, run: JSON.parse(JSON.stringify(run)) };
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          waiting.delete(id);
          reject(new Error('level worker timeout'));
        }, 8000);
        waiting.set(id, {
          resolve: (G) => {
            clearTimeout(timer);
            resolve(G);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        });
        w.postMessage(msg);
      });
    } catch {
      /* el hilo falló o tardó demasiado: se prepara aquí mismo */
    }
  }
  return buildHere(run);
}
