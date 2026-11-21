/**
 * Añade candados y piezas pesadas a los tableros del banco y escribe sus familias en src/data/special.json:
 *   gates y heavy salen de src/data/levels.json; mixed sale de los tableros con muros (familia walls, que genera
 *   `npm run levels:walls`). Si una combinación no se puede decorar se deja vacía y el juego usa otro tablero.
 *
 *   npm run levels:decorate
 *   npm run levels:decorate -- --only 20-60
 */
import { isMainThread } from 'node:worker_threads';
import { runQueue, serveQueue } from './lib/work-queue.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { decodeBoard, encodeBoard } from '../src/engine/board.js';
import { decorateBoard, FAMILIES, familySpec } from '../src/engine/decorate.js';
import { minReach } from '../src/engine/difficulty.js';
import { hash32 } from '../src/engine/rng.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BANK = resolve(ROOT, 'src/data/levels.json');
const OUT = resolve(ROOT, 'src/data/special.json');

if (!isMainThread) {
  const pickWallFallback = (rating, slot, bases) => {
    for (let r = Math.min(rating - 1, bases.walls.length - 1); r >= 69; r--) {
      const pool = bases.walls[r];
      if (pool?.length) return pool[hash32(rating, slot, r) % pool.length];
    }
    return null;
  };
  serveQueue(({ rating, slot, family }, { ratings, bases }) => {
    const base = familySpec(family).base;
    const text = base
      ? bases[base]?.[rating - 1]?.[slot] || pickWallFallback(rating, slot, bases)
      : ratings[rating - 1][slot];
    if (!text) return { rating, slot, family, text: null };
    const board = decodeBoard(text);
    const minOpt = base && !bases[base]?.[rating - 1]?.[slot] ? minReach(rating) - 2 : 0;
    const d = decorateBoard(board, family, hash32(rating, slot, family.length, 0xdec0), { minOpt });
    return { rating, slot, family, text: d ? encodeBoard(d.pieces, d.pos, d.walls) : null };
  });
  await new Promise(() => {}); // este hilo solo atiende la cola: no sigue con el código del hilo principal
}

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const [from, to] = String(arg('only', '1-100')).split('-').map(Number);
const { ratings } = JSON.parse(readFileSync(BANK, 'utf8'));
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const allFamilies = Object.keys(FAMILIES);
const rawFam = arg('families', '');
const families = rawFam
  ? rawFam
      .split(',')
      .map((s) => s.trim())
      .filter((f) => familySpec(f))
  : arg('plan', '')
    ? []
    : allFamilies;
for (const f of [...allFamilies, 'walls', ...families]) out[f] = out[f] || Array.from({ length: 100 }, () => []);
const jobs = [];
const planFile = arg('plan', ''); // --plan archivo.json: {familia: [dificultades]}; solo se generan esas (el calibrador calcula lo que hace falta)
if (planFile) {
  const plan = JSON.parse(readFileSync(planFile, 'utf8'));
  for (const [family, rs] of Object.entries(plan)) {
    if (!familySpec(family)) continue;
    out[family] = out[family] || Array.from({ length: 100 }, () => []);
    for (const rating of rs) {
      if (out[family][rating - 1]?.length >= 4) continue; // ya generada
      out[family][rating - 1] = [];
      ratings[rating - 1].forEach((_, slot) => jobs.push({ rating, slot, family }));
    }
    if (!families.includes(family)) families.push(family);
  }
} else {
  for (let rating = from; rating <= (to || from); rating++) {
    for (const f of families) out[f][rating - 1] = [];
    ratings[rating - 1].forEach((_, slot) => {
      for (const family of families) jobs.push({ rating, slot, family });
    });
  }
}
jobs.sort((a, b) => b.rating - a.rating);
let done = 0;
let failed = 0;
await runQueue(new URL(import.meta.url), jobs, {
  data: { ratings, bases: { walls: out.walls } },
  every: 200,
  onResult: (m) => {
    if (m.text) out[m.family][m.rating - 1].push(m.text);
    else failed++;
    done++;
  },
});
for (const f of families) out[f].forEach((l) => l.sort()); // orden estable: el resultado no depende de los hilos
writeFileSync(OUT, JSON.stringify(out) + '\n');
console.log(`Listo: ${done - failed} tableros decorados, ${failed} sin decorar → ${OUT}`);
