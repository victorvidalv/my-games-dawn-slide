/**
 * Genera el banco de tableros (src/data/levels.json) para las 100 dificultades.
 * Es determinista y se reparte entre núcleos con una cola compartida (scripts/lib/work-queue.mjs).
 *
 *   npm run levels                 → regenera todo (varios minutos)
 *   npm run levels -- --per 12     → tableros por dificultad (por defecto 12)
 *   npm run levels -- --only 80-100
 */
import { isMainThread } from 'node:worker_threads';
import { runQueue, serveQueue } from './lib/work-queue.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { generateBoard } from '../src/engine/generator.js';
import { encodeBoard } from '../src/engine/board.js';
import { hash32 } from '../src/engine/rng.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/levels.json');

if (!isMainThread) {
  serveQueue(({ rating, slot }) => {
    let seed = hash32(rating, slot, 0x51de);
    let b;
    for (let attempt = 0; attempt < 40; attempt++) {
      b = generateBoard(rating, seed, { maxIters: 2500 });
      if (b.reached) break;
      seed = hash32(seed, attempt + 1);
    }
    return { rating, slot, ok: b.reached, maxd: b.maxd, text: encodeBoard(b.pieces, b.pos) };
  });
  await new Promise(() => {}); // este hilo solo atiende la cola: no sigue con el código del hilo principal
}

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const per = Number(arg('per', 12));
const [from, to] = String(arg('only', '1-100')).split('-').map(Number);
const jobs = [];
for (let slot = 0; slot < per; slot++)
  for (let rating = from; rating <= (to || from); rating++) jobs.push({ rating, slot });
jobs.sort((a, b) => b.rating - a.rating); // lo más pesado primero

const bank = Array.from({ length: 100 }, () => []);
let existing = null;
try {
  existing = JSON.parse((await import('node:fs')).readFileSync(OUT, 'utf8'));
  if (existing?.ratings) existing.ratings.forEach((l, i) => (bank[i] = l.slice()));
} catch {}
if (from !== 1 || (to || from) !== 100) {
  /* regeneración parcial: sólo sustituye esos rangos */
  for (let r = from; r <= (to || from); r++) bank[r - 1] = [];
} else for (let i = 0; i < 100; i++) bank[i] = [];

let done = 0;
let bad = 0;
await runQueue(new URL(import.meta.url), jobs, {
  onResult: (m) => {
    if (!m.ok) {
      bad++;
      console.warn(`⚠ dificultad ${m.rating}: no alcanzó el objetivo (maxd=${m.maxd})`);
    }
    bank[m.rating - 1][m.slot] = m.text;
    done++;
  },
});
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({ version: 1, ratings: bank }) + '\n');
console.log(`Listo: ${done} tableros, ${bad} sin objetivo → ${OUT}`);
