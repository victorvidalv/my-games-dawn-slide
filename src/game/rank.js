/* ============================ Rangos de Aventura ============================
 * El rango mide qué parte del MÁXIMO de su dificultad (camino Normal, Difícil o Experto) lograste. Ese máximo es lo que
 * suma la mejor combinación de héroe, reliquia y cartas del destino resolviendo los 21 tableros en su mínimo (Perfecto),
 * con la racha completa y sin ayudas. Se calcula con `npm run rank-max` y se guarda en `rank-max.js`.
 * Todo son funciones puras (sin DOM).
 */
import { MAX_LEVEL, pathKey, startHintsFor } from '../engine/difficulty.js';
import { minFor } from '../engine/calibration.js';
import { baseScore } from '../engine/scoring.js';
import { FATE_CARDS, FATE_EVERY, fateCityRewards, fatePerfectHints, pickFate } from './fate.js';
import { runGain } from './run-points.js';
import { newAdventureRun } from './run-logic.js';
import { MAX_SCORE } from './rank-max.js';

/**
 * Tramos del rango: porcentaje mínimo del máximo de cada dificultad para cada letra. Calibrados con
 * `node scripts/rank-balance.mjs` (miles de partidas simuladas de jugadores casuales, medios, buenos y expertos con
 * héroes, reliquias y cartas distintos). Un mismo porcentaje cuesta más en Experto, así que sus tramos son algo más bajos.
 * En una población mixta: B lo alcanza ≈40 % de las partidas, A ≈8 % (posible pero difícil: ≈1 de cada 3 expertos),
 * S ≈0,3 % (casi solo expertos con muy buenas cartas) y S+ es prácticamente la combinación perfecta.
 */
export const RANK_MINS = {
  1: { 'S+': 90, S: 82, A: 68, B: 50 },
  50: { 'S+': 90, S: 80, A: 64, B: 46 },
  75: { 'S+': 90, S: 77, A: 61, B: 42 },
};
const GRADES = [
  { grade: 'S+', cls: 'splus' },
  { grade: 'S', cls: 's' },
  { grade: 'A', cls: 'a' },
  { grade: 'B', cls: 'b' },
  { grade: 'C', cls: 'c' },
];
/** Tramos de un camino, de mayor a menor, cada uno con su porcentaje mínimo (`C` empieza en 0). */
export const ranksFor = (start = 1) => GRADES.map((g) => ({ ...g, min: RANK_MINS[pathKey(start)][g.grade] ?? 0 }));

/** Letra de un porcentaje (0-100) en la dificultad `start`. */
export function rankFor(pct, start = 1) {
  const p = Number.isFinite(pct) ? pct : 0;
  const rank = ranksFor(start).find((r) => p >= r.min);
  return { grade: rank.grade, cls: rank.cls };
}

/** Posición de una letra (0 = C … 4 = S+), para comparar rangos de distintos caminos. */
export const gradeIndex = (grade) => GRADES.length - 1 - GRADES.findIndex((g) => g.grade === grade);

/** Siguiente letra por encima de `pct`, con su mínimo, o null si ya es la más alta. */
export function nextRank(pct, start = 1) {
  const p = Number.isFinite(pct) ? pct : 0;
  const up = [...ranksFor(start)].reverse().find((r) => r.min > p);
  return up ? { grade: up.grade, cls: up.cls, min: up.min } : null;
}

/**
 * Escala del rango para mostrarla: cada letra con el porcentaje y los puntos mínimos que pide en la dificultad `start`
 * (de menor a mayor), y el tramo [desde, hasta) de puntos que cubre.
 */
export function rankScale(start = 1) {
  const max = maxScoreFor(start);
  const asc = [...ranksFor(start)].reverse();
  return asc.map((r, i) => ({
    grade: r.grade,
    cls: r.cls,
    min: r.min,
    from: Math.ceil((max * r.min) / 100),
    to: i + 1 < asc.length ? Math.ceil((max * asc[i + 1].min) / 100) : max,
  }));
}

/** Máximo de puntos del camino `start` (1, 50 o 75). */
export const maxScoreFor = (start = 1) => MAX_SCORE[pathKey(start)].score;

/** Porcentaje del máximo del camino (0-100, en pasos de 0,5 hacia abajo). */
export function percentOf(score, start = 1) {
  const max = maxScoreFor(start);
  return Math.floor(Math.min(100, Math.max(0, (score || 0) / max) * 100) * 2) / 2;
}

/** Rango de una partida: `{ pct, grade, cls }`. */
export function runRank(run) {
  const pct = percentOf(run?.score, run?.start);
  return { pct, ...rankFor(pct, run?.start) };
}

/**
 * Puntaje de una aventura perfecta (los 21 tableros en su mínimo calibrado, racha completa, sin ayudas) con ese héroe,
 * reliquia y 6 cartas en orden (una por tramo). Usa las reglas reales de puntos, cartas y reliquias.
 */
export function perfectRunScore({ hero, start = 1, relic, cards = [] }) {
  const key = pathKey(start);
  const run = newAdventureRun({ seed: 1, start: key, hero, hints: startHintsFor(key), relic });
  // mazo a medida: la carta de cada tramo va la primera de su oferta de 3, el resto se rellena con las demás
  const rest = FATE_CARDS.map((c) => c.id).filter((id) => !cards.includes(id));
  const deck = [];
  for (let city = 0; city < 6; city++) deck.push(cards[city] ?? rest.shift(), rest.shift(), rest.shift());
  run.fateDeck = [...deck, ...rest];
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const opt = minFor(key, n);
    const G = { n, opt, limit: Infinity, bought: 0, pieces: [] };
    run.score += runGain(run, opt, opt, n - 1, G).total;
    run.hints += fatePerfectHints(run, opt, opt);
    if (n % FATE_EVERY) continue;
    const city = n / FATE_EVERY;
    fateCityRewards(run, city, opt);
    if (n < MAX_LEVEL && cards[city - 1]) pickFate(run, cards[city - 1], city, baseScore(opt));
  }
  return run.score;
}
