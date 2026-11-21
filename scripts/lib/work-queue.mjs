/**
 * Cola de trabajo compartida entre hilos para los scripts de generación (bancos de tableros, muros, decoración).
 *
 * Antes cada hilo recibía de entrada una parte fija de los trabajos (`i % hilos`): si le tocaban tableros caros, los
 * demás terminaban y se quedaban parados. Aquí cada hilo pide un trabajo nuevo en cuanto acaba el anterior, así todos
 * los núcleos trabajan hasta el final. El resultado no cambia: cada trabajo lleva su propia semilla y quien escribe el
 * JSON ordena o indexa por (dificultad, hueco), nunca por orden de llegada.
 *
 *   // en el script (hilo principal):
 *   await runQueue(new URL(import.meta.url), jobs, { data, onResult: (r) => … });
 *   // en el mismo script (hilo de trabajo):
 *   if (!isMainThread) serveQueue((job, data) => resultado);
 *
 * THREADS = núcleos − 1 (mínimo 1); se puede fijar con GEN_THREADS.
 */
import { Worker, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';

export const THREADS = Math.max(1, Number(process.env.GEN_THREADS) || cpus().length - 1);

/** Hilo de trabajo: atiende trabajos de uno en uno con `handler(job, data)` y devuelve lo que este retorne. */
export function serveQueue(handler) {
  parentPort.on('message', (job) => {
    try {
      parentPort.postMessage({ ok: true, result: handler(job, workerData) });
    } catch (e) {
      parentPort.postMessage({ ok: false, error: String(e?.stack || e) });
    }
  });
}

/**
 * Reparte `jobs` entre `threads` hilos que ejecutan `workerUrl` (con `serveQueue`). Llama a `onResult(result, job)`
 * en cuanto llega cada uno y muestra el avance cada `every` trabajos. Resuelve cuando terminan todos.
 */
export function runQueue(
  workerUrl,
  jobs,
  { data = {}, onResult = () => {}, threads = THREADS, every = 50, label = '' } = {},
) {
  if (!jobs.length) return Promise.resolve();
  let next = 0;
  let done = 0;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const workers = [];
    const finish = (err) => {
      workers.forEach((w) => w.terminate());
      if (err) reject(err);
      else resolve();
    };
    const feed = (w) => {
      if (next >= jobs.length) {
        if (done === jobs.length) finish();
        return;
      }
      const i = next++;
      w.current = i;
      w.postMessage(jobs[i]);
    };
    for (let t = 0; t < Math.min(threads, jobs.length); t++) {
      const w = new Worker(workerUrl, { workerData: data });
      workers.push(w);
      w.on('message', (m) => {
        if (!m.ok) return finish(new Error(m.error));
        onResult(m.result, jobs[w.current]);
        done++;
        if (done % every === 0 || done === jobs.length) {
          const s = ((Date.now() - started) / 1000).toFixed(0);
          console.log(`${label}${done}/${jobs.length} · ${s} s`);
        }
        feed(w);
      });
      w.on('error', finish);
      feed(w);
    }
  });
}
