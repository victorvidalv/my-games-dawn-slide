import { Worker } from 'node:worker_threads';
import { cpus } from 'node:os';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';

const WORKER = new URL('./worker.js', import.meta.url);

/** Hilos que usa el pool: todos los núcleos menos uno (mínimo 2). Se puede fijar con TEST_THREADS. */
export const THREADS = Math.max(2, Number(process.env.TEST_THREADS) || cpus().length - 1);

/** true con FULL=1: comprueba TODOS los niveles/dificultades en vez de una muestra determinista. */
export const FULL = process.env.FULL === '1';

/**
 * Reparte `items` entre varios hilos (cola compartida: el que termina pide más) y ejecuta `task` en cada uno.
 * Devuelve los resultados en el mismo orden que `items`.
 */
export function runPool(task, items, { threads = THREADS, batch = 4 } = {}) {
  if (!items.length) return Promise.resolve([]);
  const out = new Array(items.length);
  let next = 0;
  let pending = 0;
  const workers = [];
  return new Promise((resolve, reject) => {
    const fail = (err) => {
      workers.forEach((w) => w.terminate());
      reject(err);
    };
    const feed = (w) => {
      if (next >= items.length) {
        if (pending === 0) {
          workers.forEach((x) => x.terminate());
          resolve(out);
        }
        return;
      }
      const from = next;
      next = Math.min(items.length, next + batch);
      pending++;
      w.postMessage({ task, from, items: items.slice(from, next) });
    };
    for (let t = 0; t < Math.min(threads, Math.ceil(items.length / batch)); t++) {
      const w = new Worker(WORKER);
      workers.push(w);
      w.on('message', ({ from, results, error }) => {
        if (error) return fail(new Error(error));
        results.forEach((r, i) => {
          out[from + i] = r;
        });
        pending--;
        feed(w);
      });
      w.on('error', fail);
      feed(w);
    }
  });
}

/* ───────────── Caché de resultados por contenido ─────────────
 * Las tareas del pool son funciones puras de: el código del motor y del juego, los bancos de tableros y el propio
 * worker. Si nada de eso cambió desde la última vez, el resultado es idéntico, así que se guarda en
 * node_modules/.cache y se reutiliza (el banco completo pasa de ~9 minutos de CPU a leer un JSON).
 * Cualquier cambio en esos archivos (o en los parámetros de la tarea) invalida la caché y todo se vuelve a revisar.
 * No se usa con FULL=1, en CI ni con TEST_CACHE=0.
 */
const ROOT = new URL('../../', import.meta.url);
const CACHE_DIR = new URL('node_modules/.cache/dawnslide-tests/', ROOT);
const DEPS = ['src/engine', 'src/game', 'src/data', 'tests/parallel/worker.js', 'tests/parallel/pool.js'];
export const CACHE = !FULL && !process.env.CI && process.env.TEST_CACHE !== '0';

function filesUnder(rel) {
  const url = new URL(rel, ROOT);
  const st = statSync(url);
  if (!st.isDirectory()) return [rel];
  return readdirSync(url)
    .sort()
    .flatMap((name) => filesUnder(`${rel}/${name}`));
}
let depsHash = null;
/** Huella de todo el código y los datos de los que dependen las tareas. */
function depsDigest() {
  if (depsHash) return depsHash;
  const h = createHash('sha256');
  for (const rel of DEPS.flatMap(filesUnder)) {
    h.update(rel);
    h.update(readFileSync(new URL(rel, ROOT)));
  }
  return (depsHash = h.digest('hex'));
}

/** Igual que `runPool`, pero reutiliza el resultado si ni el código, ni los datos, ni los parámetros cambiaron. */
export async function runPoolCached(task, items, opts = {}) {
  if (!CACHE) return runPool(task, items, opts);
  const job = createHash('sha256').update(task).update(JSON.stringify(items)).digest('hex').slice(0, 12);
  const prefix = `${task}-${job}-`; // una entrada por llamada (tarea + parámetros); la huella del código va detrás
  const file = new URL(`${prefix}${depsDigest().slice(0, 16)}.json`, CACHE_DIR);
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      /* caché corrupta: se recalcula */
    }
  }
  const out = await runPool(task, items, opts);
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    for (const old of readdirSync(CACHE_DIR)) if (old.startsWith(prefix)) rmSync(new URL(old, CACHE_DIR));
    writeFileSync(file, JSON.stringify(out));
  } catch {
    /* sin permiso de escritura: solo se pierde la caché */
  }
  return out;
}
