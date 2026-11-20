import { readFileSync, writeFileSync } from 'node:fs';
import { decodeBoard, encodeBoard } from '../src/engine/board.js';
import { buildLevel } from '../src/engine/levels.js';
import { targetFor } from '../src/engine/targets.js';
import { hash32, mulberry32 } from '../src/engine/rng.js';

const readData = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url), 'utf8'));
const { ratings } = readData('levels');
const banks = { plain: ratings, ...readData('special') };
const used = new Set();

const ROUTES = {
  150: {
    startOpt: 3,
    seedBase: 4756,
    families: [
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
    ],
  },
  200: {
    startOpt: 5,
    seedBase: 8123,
    families: [
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
      'combo_whgi',
      'combo_whgi',
    ],
  },
  250: {
    startOpt: 3,
    seedBase: 12941,
    families: [
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
      'combo_whgi',
      'combo_whgi',
      'combo_whgi',
      'combo_whgi',
      'combo_whgi',
    ],
  },
};

function generateRoute(id, { startOpt, seedBase, families }) {
  const levels = families.map((family, index) => {
    const opt = startOpt + index;
    const seed = hash32(seedBase, index, opt);
    const candidates = Object.entries(banks[family])
      .filter(([, boards]) => boards?.length)
      .sort(([a], [b]) => Math.abs(targetFor(+a + 1) - opt) - Math.abs(targetFor(+b + 1) - opt));
    for (const [ratingIndex, boards] of candidates) {
      for (let i = 0; i < boards.length; i++) {
        const source = boards[(seed + i) % boards.length];
        const built = buildLevel(decodeBoard(source), {
          rating: +ratingIndex + 1,
          target: opt,
          rng: mulberry32(seed + i),
        });
        if (built.opt !== opt) continue;
        const board = encodeBoard(built.pieces, built.pos, built.walls);
        const key = board.split(' ').sort().join(' ');
        if (used.has(key)) continue;
        used.add(key);
        return { opt, board };
      }
    }
    throw new Error(`Ruta ${id} · nivel ${index + 1}: falta un tablero de ${opt} movimientos en ${family}`);
  });
  const total = levels.reduce((sum, level) => sum + level.opt, 0);
  if (total !== Number(id)) throw new Error(`Ruta ${id}: suma ${total} != ${id}`);
  return levels;
}

const output = Object.fromEntries(Object.entries(ROUTES).map(([id, spec]) => [id, generateRoute(id, spec)]));

const json =
  '{\n' +
  Object.entries(output)
    .map(([id, levels]) => `  "${id}": [\n${levels.map((level) => '    ' + JSON.stringify(level)).join(',\n')}\n  ]`)
    .join(',\n') +
  '\n}\n';

writeFileSync(new URL('../src/data/survival.json', import.meta.url), json);
console.log(
  'Generated challenge routes:',
  Object.entries(output)
    .map(([id, levels]) => `${id}: ${levels.length} boards (${levels.reduce((s, l) => s + l.opt, 0)} turns)`)
    .join(' · '),
);
