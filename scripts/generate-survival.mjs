import { readFileSync, writeFileSync } from 'node:fs';
import { decodeBoard, encodeBoard } from '../src/engine/board.js';
import { buildLevel } from '../src/engine/levels.js';
import { targetFor } from '../src/engine/targets.js';
import { hash32, mulberry32 } from '../src/engine/rng.js';

const readData = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const { ratings } = readData('levels');
const banks = { plain: ratings, ...readData('special') };
const used = new Set();
const families = [
  'plain',
  'plain',
  'walls',
  'walls',
  'heavy',
  'combo_wh',
  'gates',
  'combo_hg',
  'ice',
  'combo_whg',
  'combo_hgi',
  'combo_whgi',
  'combo_whgi',
  'combo_whgi',
  'combo_whgi',
];

const levels = families.map((family, index) => {
  const opt = 3 + index;
  const seed = hash32(4756, index, opt);
  const candidates = Object.entries(banks[family])
    .filter(([, boards]) => boards?.length)
    .sort(([a], [b]) => Math.abs(targetFor(+a + 1) - opt) - Math.abs(targetFor(+b + 1) - opt));
  for (const [ratingIndex, boards] of candidates) {
    for (let i = 0; i < boards.length; i++) {
      const source = boards[(seed + i) % boards.length];
      const built = buildLevel(decodeBoard(source), { rating: +ratingIndex + 1, target: opt, rng: mulberry32(seed) });
      if (built.opt !== opt) continue;
      const board = encodeBoard(built.pieces, built.pos, built.walls);
      const key = board.split(' ').sort().join(' ');
      if (used.has(key)) continue;
      used.add(key);
      return { opt, board };
    }
  }
  throw new Error(`Nivel ${index + 1}: falta un tablero de ${opt} movimientos en ${family}`);
});

writeFileSync(
  new URL('../src/data/survival.json', import.meta.url),
  `[\n${levels.map((level) => '  ' + JSON.stringify(level)).join(',\n')}\n]\n`,
);
