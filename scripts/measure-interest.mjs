/**
 * Mide cuánto hay que pensar en los niveles tal como los arma el juego (camino × nivel × varias semillas):
 * % de niveles triviales («despeja y sal» / todo hacia el mismo lado) e interés medio por tramos de 10 niveles.
 *   node scripts/measure-interest.mjs            → los tres caminos, 6 semillas
 *   node scripts/measure-interest.mjs --seeds 12 --paths 1
 */
import { readFileSync } from 'node:fs';
import { interestOf } from '../src/engine/interest.js';
import { encode } from '../src/engine/board.js';
import { buildAdventureLevel } from '../src/game/build-adventure.js';

const arg = (name, def) => {
  const i = process.argv.indexOf('--' + name);
  return i > 0 ? process.argv[i + 1] : def;
};
const seeds = Number(arg('seeds', 6));
const paths = String(arg('paths', '1,50,75')).split(',').map(Number);
const upTo = Number(arg('levels', 100));
const levels = JSON.parse(readFileSync(new URL('../src/data/levels.json', import.meta.url), 'utf8')).ratings;
const special = JSON.parse(readFileSync(new URL('../src/data/special.json', import.meta.url), 'utf8'));

for (const start of paths) {
  console.log(
    `\nCamino ${start}:  tramo · mínimo medio · interés · triviales · dependencias · variedad de sentidos · trampas`,
  );
  for (let b = 0; b < upTo; b += 10) {
    const acc = { n: 0, score: 0, trivial: 0, locked: 0, dirs: 0, choice: 0, opt: 0 };
    for (let level = b + 1; level <= Math.min(upTo, b + 10); level++) {
      for (let s = 1; s <= seeds; s++) {
        const run = { level, start, seed: s * 7919 + 13, adj: 0, route: 'safe', hero: 'lia', mode: 'p' };
        const G = buildAdventureLevel(run, { levels, special, withProof: true });
        const f = interestOf(G.pieces, encode(G.pos), G.analysis, G.walls);
        acc.n++;
        acc.score += f.score;
        acc.trivial += f.trivial ? 1 : 0;
        acc.locked += f.locked;
        acc.dirs += f.dirs;
        acc.choice += f.choice;
        acc.opt += G.opt;
      }
    }
    const p = (x) => (x / acc.n).toFixed(2);
    console.log(
      `  ${String(b + 1).padStart(3)}-${String(Math.min(upTo, b + 10)).padEnd(3)}  mín ${p(acc.opt).padStart(5)}  interés ${p(acc.score)}  triviales ${String(Math.round((100 * acc.trivial) / acc.n)).padStart(3)}%  dep ${p(acc.locked)}  sentidos ${p(acc.dirs)}  trampas ${p(acc.choice)}`,
    );
  }
}
