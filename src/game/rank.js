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
import { perfectAdj, runGain } from './run-points.js';
import { newAdventureRun } from './run-logic.js';
import { MAX_SCORE } from './rank-max.js';
import { RELICS } from './relics.js';

/**
 * Tramos del rango: porcentaje mínimo del máximo de cada dificultad para cada letra. Calibrados con
 * `node scripts/rank-balance.mjs` (miles de partidas simuladas de jugadores casuales, medios, buenos y expertos con
 * héroes, reliquias y cartas distintos). Un mismo porcentaje cuesta más en Experto, así que sus tramos son algo más bajos.
 * El máximo (100 %) es una partida perfecta con la mejor combinación y la dificultad adaptativa de quien no falla, con la reliquia
 * del jugador (ver `maxScoreFor`). En una población mixta (con un 12 % de jugadores perfectos): B ≈32 % de las partidas, A ≈6 %,
 * S ≈2 % y S+ ≈1 %. Un jugador perfecto que elige cartas pensando en el puntaje llega a S+ en ≈10 % de sus partidas con
 * Jean o Juth y ≈20 % con Lía (con cualquier reliquia): hace falta no fallar y que las cartas acompañen.
 */
export const RANK_MINS = {
  1: { 'S+': 77, S: 72, A: 68, B: 53 },
  50: { 'S+': 77, S: 72, A: 66, B: 50 },
  75: { 'S+': 76, S: 71, A: 64, B: 45 },
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
export function rankScale(start = 1, relic, hero) {
  const max = maxScoreFor(start, relic, hero);
  const asc = [...ranksFor(start)].reverse();
  return asc.map((r, i) => ({
    grade: r.grade,
    cls: r.cls,
    min: r.min,
    from: Math.ceil((max * r.min) / 100),
    to: i + 1 < asc.length ? Math.ceil((max * asc[i + 1].min) / 100) : max,
  }));
}

/** Bono de puntos de la mejor reliquia (el Medallón solar): con él se calcula el máximo de cada camino. */
const relicPerfectPoints = (r) => (r?.points || 0) + (r?.cleanPoints || 0); // un jugador perfecto no pide pistas
const TOP_RELIC_POINTS = Math.max(...RELICS.map(relicPerfectPoints));

/**
 * Máximo de puntos del camino `start` (1, 50 o 75) con una partida perfecta. Es el de la mejor combinación (hoy Lía + Medallón
 * solar); con otra reliquia se rebaja lo que ella no suma (el +15 % del Medallón), para que un jugador perfecto pueda llegar a
 * S+ con cualquier reliquia y no solo con la que da más puntos. Con `hero` se usa el máximo de ese héroe (`byHero`: Lía, con su Brasa,
 * llega más alto que Jean y Juth, y no por eso son peores). Sin `relic` ni `hero` es el máximo del camino.
 */
export const maxScoreFor = (start = 1, relic, hero) => {
  const entry = MAX_SCORE[pathKey(start)];
  const score = entry.byHero?.[hero]?.score ?? entry.score;
  if (relic === undefined) return score;
  const own = relicPerfectPoints(RELICS.find((r) => r.id === relic));
  return Math.round((score * (1 + own)) / (1 + TOP_RELIC_POINTS));
};

/** Porcentaje del máximo del camino (0-100, en pasos de 0,5 hacia abajo). */
export function percentOf(score, start = 1, relic, hero) {
  const max = maxScoreFor(start, relic, hero);
  return Math.floor(Math.min(100, Math.max(0, (score || 0) / max) * 100) * 2) / 2;
}

/** Rango de una partida: `{ pct, grade, cls }`. */
export function runRank(run) {
  const pct = percentOf(run?.score, run?.start, run?.relic ?? null, run?.hero);
  return { pct, ...rankFor(pct, run?.start) };
}

/**
 * Puntaje de una aventura perfecta (los 21 tableros en su mínimo calibrado, racha completa, sin ayudas) con ese héroe,
 * reliquia y 6 cartas en orden (una por tramo). Usa las reglas reales de puntos, cartas y reliquias y, con `adaptive`,
 * la dificultad adaptativa (+1 en los niveles 2-10 y +2 del 11 al 21), que es lo que de verdad juega quien no falla.
 */
export function perfectRunScore({ hero, start = 1, relic, cards = [], adaptive = true }) {
  const key = pathKey(start);
  const run = newAdventureRun({ seed: 1, start: key, hero, hints: startHintsFor(key), relic });
  // mazo a medida: la carta de cada tramo va la primera de su oferta de 3, el resto se rellena con las demás
  const rest = FATE_CARDS.map((c) => c.id).filter((id) => !cards.includes(id));
  const deck = [];
  for (let city = 0; city < 6; city++) deck.push(cards[city] ?? rest.shift(), rest.shift(), rest.shift());
  run.fateDeck = [...deck, ...rest];
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const opt = minFor(key, n) + (adaptive ? perfectAdj(n) : 0); // un jugador perfecto sube la dificultad adaptativa hasta el tope
    const G = { n, opt, limit: Infinity, bought: 0, pieces: [] };
    run.score += runGain(run, opt, opt, n - 1, G).total;
    run.hints += fatePerfectHints(run, opt, opt, n);
    if (n % FATE_EVERY) continue;
    const city = n / FATE_EVERY;
    fateCityRewards(run, city, opt);
    if (n < MAX_LEVEL && cards[city - 1]) pickFate(run, cards[city - 1], city, baseScore(opt));
  }
  return run.score;
}
