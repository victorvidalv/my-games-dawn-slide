/**
 * Calcula el puntaje máximo de cada dificultad (camino Normal, Difícil y Experto): la mejor combinación de héroe,
 * reliquia y 6 cartas del destino con los 21 tableros perfectos. Búsqueda local con reinicios (determinista) sobre las
 * reglas reales del juego, y escribe src/game/rank-max.js.   npm run rank-max [reinicios]
 */
import { writeFileSync } from 'node:fs';
import { mulberry32 } from '../src/engine/rng.js';
import { FATE_CARDS, FATE_PICKS } from '../src/game/fate.js';
import { HEROES } from '../src/game/heroes.js';
import { RELICS } from '../src/game/relics.js';
import { perfectRunScore } from '../src/game/rank.js';

const restarts = Number(process.argv[2] || 60);
const ids = FATE_CARDS.map((c) => c.id);
const PATHS = [1, 50, 75];

function climb(hero, start, relic, rng) {
  const score = (cards) => perfectRunScore({ hero, start, relic, cards });
  const pool = [...ids].sort(() => rng() - 0.5);
  let cards = pool.slice(0, FATE_PICKS);
  let best = score(cards);
  for (let improved = true; improved;) {
    improved = false;
    const tries = [];
    for (let i = 0; i < FATE_PICKS; i++) {
      for (const id of ids) if (!cards.includes(id)) tries.push(cards.map((c, k) => (k === i ? id : c))); // cambiar una carta
      for (let j = i + 1; j < FATE_PICKS; j++)
        tries.push(cards.map((c, k) => (k === i ? cards[j] : k === j ? cards[i] : c))); // cambiar el orden
    }
    for (const t of tries) {
      const s = score(t);
      if (s > best) [best, cards, improved] = [s, t, true];
    }
  }
  return { score: best, cards };
}

const out = {};
for (const start of PATHS) {
  let top = { score: 0 };
  const byHero = {};
  for (const { id: hero } of HEROES) {
    if (hero === 'none') continue;
    let best = { score: 0 };
    for (const { id: relic } of RELICS) {
      const rng = mulberry32(start * 1009 + hero.length * 31 + relic.length);
      let local = { score: 0 };
      for (let r = 0; r < restarts; r++) {
        const res = climb(hero, start, relic, rng);
        if (res.score > local.score) local = res;
      }
      console.log(`camino ${start} · ${hero} · ${relic}: ${local.score.toLocaleString('es')}`);
      if (local.score > top.score) top = { ...local, hero, relic };
      if (local.score > best.score) best = { ...local, relic };
    }
    byHero[hero] = { score: best.score, relic: best.relic, cards: best.cards };
  }
  out[start] = { score: top.score, hero: top.hero, relic: top.relic, cards: top.cards, byHero };
  console.log(
    `→ MÁXIMO camino ${start}: ${top.score.toLocaleString('es')} (${top.hero}, ${top.relic}, ${top.cards.join(', ')})\n`,
  );
}
writeFileSync(
  new URL('../src/game/rank-max.js', import.meta.url),
  `/* Máximo de puntos por dificultad: mejor héroe, reliquia y 6 cartas con los 21 tableros perfectos.\n * Generado por \`npm run rank-max\` (scripts/rank-max.mjs); no se edita a mano.\n * \`byHero\` = el máximo de cada héroe (con su mejor reliquia y cartas): el rango se mide contra el de tu héroe. */\nexport const MAX_SCORE = ${JSON.stringify(out, null, 2)};\n`,
);
