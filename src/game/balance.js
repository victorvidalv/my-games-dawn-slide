import { mulberry32, hash32 } from '../engine/rng.js';
import { curve, moveLimit, rateAt, startHintsFor, MAX_LEVEL } from '../engine/difficulty.js';
import { baseScore, calcGain } from '../engine/scoring.js';
import { hintEvery, CITY_EVERY, bonusTurns, LIA_INTACT_POINTS } from './heroes.js';
import { MAX_REVIVES, REVIVE_SHARE } from './shop.js';
import {
  FATE_EVERY,
  FATE_PICKS,
  fateDeck,
  fateById,
  fateCityRewards,
  fatePoints,
  fateRules,
  fateTotals,
  fateTurns,
  fatePerfectHints,
  fatePowerUses,
  nextStreak,
  pickFate,
} from './fate.js';
import { RELICS } from './relics.js';
import { levelPlan } from './mechanics.js';

/** Tablero mínimo para las reglas de las cartas: nivel, mínimo y si tiene pieza pesada o de hielo (según el plan del nivel). */
const simBoard = (level, d) => ({
  n: level,
  opt: d,
  pieces: /[hi]/.test(levelPlan(level).letters) ? [{ kind: 'heavy' }] : [],
});
import { rewindCount, DESTINY_SHARE, JUTH_MIN_REMAINING, destinyCount, powerReady, powerUses } from './powers.js';

/**
 * Modelo de equilibrio: simula miles de partidas de jugadores de distinta habilidad para medir cómo se comportan la dificultad
 * de cada camino, los poderes de los héroes, las cartas del destino y la tienda.
 */
const MODEL = {
  err: 0.07,
  notice: 0.7, // probabilidad de darte cuenta de que un movimiento fue un error y deshacerlo enseguida
  hintAware: 0.65, // probabilidad de pedir la pista A TIEMPO (antes de equivocarte): una pista solo ayuda si la pides
  unnoticedCost: 3, // si no te das cuenta, recuperarte cuesta ~3 movimientos
  hintMinD: 10,
  startHints: 3,
  shopReserve: 3, // el jugador solo compra una pista si le quedan puntos para 3 más (no se arruina por ella)
};

/**
 * Jugador que usa la tienda (`shop = {score}`), con UNA compra por tablero: cerca del límite compra el paquete más barato que le permita seguir,
 * y si no le quedan pistas en un tablero duro compra una, pero solo si le sobran puntos (MODEL.shopReserve veces el precio).
 */
function playBoard(rng, { hero, skill, d, start = 1, level = 1, hints, powers = {}, fate = null, extraTurns = 0 }) {
  const destinyShare = DESTINY_SHARE;
  const ft = fate ? fateTotals(fate) : null;
  const noPower = !!ft?.noPower;
  const noHints = !!ft?.noHints;
  const fateExtra = fate ? fateTurns(fate, simBoard(level, d)) : 0;
  const reserve =
    powers.liaTurns && hero === 'lia'
      ? Math.max(1, Math.round(d * powers.liaTurns))
      : bonusTurns(hero, d, start, noPower);
  let limit = Math.max(d + 1, moveLimit(d, start, level) + reserve + fateExtra + extraTurns);
  let powerUsed = false;
  const need = d;
  const err = Math.min(0.85, (1 - skill) * MODEL.err * (1 + need / 25));
  let moves = 0;
  let h = hints;
  const ready = !noPower && powerReady(level, start, hero, ft?.powerShare || 0); // a veces el poder descansa
  const echo = ft ? fatePowerUses(fate, level) : 0; // Eco del poder: un uso extra en cada tablero (la misma regla que el juego)
  let rewind = hero === 'jean' && ready ? powerUses(hero, d, echo) : 0; // una vez por tablero, dos en los largos
  let destiny = hero === 'van' && ready ? powerUses(hero, d, echo) : 0; // Eco del poder suma un uso
  let safe = 0; // pasos protegidos por «Trazar destino»
  for (let step = 0; step < need; step++) {
    if (safe > 0) safe--;
    else if (rng() < err) {
      if (!noHints && h > 0 && need >= MODEL.hintMinD && rng() < MODEL.hintAware) {
        h--; // la pista evita el error
      } else if (
        destiny > 0 &&
        need - step > (powers.juthMin ?? JUTH_MIN_REMAINING) &&
        limit - moves >= destinyCount(need - step, destinyShare)
      ) {
        destiny--;
        powerUsed = true; // Juth traza el destino: ~25 % de los pasos que faltan sin error (nunca el último)
        safe = destinyCount(need - step, destinyShare) - 1;
      } else {
        const k = 1 + Math.floor(Math.log(1 - rng()) / Math.log(0.5)); // 1 + geométrica (media 2)
        let waste = 0;
        for (let j = 0; j < k; j++) waste += rng() >= MODEL.notice ? MODEL.unnoticedCost : 2;
        if (rewind > 0) {
          rewind--;
          powerUsed = true;
          waste = Math.max(0, waste - 2 * rewindCount(moves));
        } // Jean rebobina ~33 % de los movimientos hechos (mín. 3)
        moves += waste;
      }
    }
    moves += 1;
    const minimumToContinue = moves + (step < need - 1 ? 1 : 0);
    if (minimumToContinue > limit)
      return { ok: false, moves, hints: h, spent: 0, boughtTurns: 0, boughtHints: 0, extra: 0 };
  }
  const intact = hero === 'lia' && reserve > 0 && moves <= limit - reserve;
  return { ok: true, moves, hints: h, spent: 0, boughtTurns: 0, boughtHints: 0, extra: 0, powerUsed, intact };
}

/**
 * Cómo elige carta el jugador simulado: la que más le ayuda a llegar lejos (turnos, revivir, poder, pistas) y, a igualdad,
 * la que da más puntos. Los Pactos que le quitan ayudas los evita salvo que no tenga otra opción.
 */
function cardValue(card, hero, city = 1) {
  const fx = card.fx;
  const left = FATE_PICKS - city; // tramos que quedan para cobrar Brújula, Cosecha y Constelación
  let v = 4 * (fx.turns || 0) + 1.5 * (fx.heavyIce || 0) + 0.8 * (fx.curseTurns || 0) + 2.5 * (fx.streakTurns || 0);
  v += fx.perfectHints ? 0.4 * left : 0;
  v += fx.purePoints ? 0.5 : 0;
  v += fx.revives ? 4 : 0;
  v += fx.powerShare ? (hero === 'lia' ? 0 : 2.5 + 4 * (fx.powerTurns || 0)) : 0;
  v += fx.lastPower ? (hero === 'jean' ? 1.5 : hero === 'van' ? 0.8 : 0) : 0;
  v += 0.8 * (fx.pickHints || 0) + 0.8 * (fx.cityHints || 0) * left;
  v += fx.liaTurns && hero === 'lia' ? 4 * fx.liaTurns : 0;
  v -= (fx.shop || 0) * 6;
  v += 10 * (fx.points || 0) + (fx.pointsPerCard ? 0.2 * left : 0) + (fx.longBoard ? 0.5 : 0);
  v += fx.cursePoints ? 0.6 : 0;
  v += fx.perfect || fx.streakCap || fx.streakEff ? 0.6 : 0;
  v += fx.cityBases ? 0.1 * left : 0;
  v += fx.pickBases ? 0.5 : 0;
  v -= fx.noPower ? (hero === 'lia' ? 9 : 6) : 0;
  v -= fx.noHints ? 3 : 0;
  v -= fx.noShop ? 3 : 0;
  v -= fx.perfectStreak ? 1 : 0;
  v -= fx.pickScore ? 1 : 0;
  return v;
}
const pickForSurvival = (offer, hero, city) =>
  offer.reduce((best, card) => (cardValue(card, hero, city) > cardValue(best, hero, city) ? card : best));

/** Estrategias de elección de carta del jugador simulado. */
const PICKERS = {
  survival: (offer, hero, city) => pickForSurvival(offer, hero, city),
  score: (offer, hero, city) =>
    offer.reduce((best, c) => (scoreValue(c, hero, city) > scoreValue(best, hero, city) ? c : best)),
  random: (offer, hero, city, rng) => offer[Math.floor(rng() * offer.length)],
};
/** Valor «de puntaje» de una carta (para el jugador que busca récord): puntos primero, pero sin suicidarse. */
function scoreValue(card, hero, city) {
  const fx = card.fx;
  const left = FATE_PICKS - city;
  let v = 25 * (fx.points || 0) + 18 * (fx.longBoard || 0) + 8 * (fx.cursePoints || 0) + 12 * (fx.noHintPoints || 0);
  v += fx.pointsPerCard ? 3 * (city + 1) * fx.pointsPerCard * 10 : 0;
  v += fx.pactPoints ? 8 : 0;
  v += 12 * (fx.purePoints || 0) + (fx.perfectHints ? 2 : 0);
  v += fx.hintPoints ? 4 : 0;
  v += fx.finalPoints ? 6 : 0;
  v += fx.perfect || fx.streakCap || fx.streakEff ? 3 : 0;
  v += fx.cityBases ? 1.2 * left : 0;
  v += fx.streakBases ? 3 : 0;
  v += 0.6 * cardValue(card, hero, city);
  return v;
}

/** Estado inicial de una partida simulada. */
function newSim({ hero, start, seed, fate, relic }) {
  const rel = RELICS.find((r) => r.id === relic) || null;
  return {
    rng: mulberry32(seed),
    pickRng: mulberry32(hash32(seed, 0x5eed)),
    rel,
    fateRun: fate ? { mode: 'c', hero, start, seed, score: 0, hints: 0, fate: [], fatePicked: 0 } : null,
    deck: fate ? fateDeck(seed) : null,
    hints: startHintsFor(start) + (rel?.hints || 0),
    score: 0,
    streak: 0,
    bestStreak: 0,
    perfects: 0,
    adj: 0,
    charges: 0,
    bought: 0,
    spentTotal: 0,
    turnsBought: 0,
    hintsBought: 0,
  };
}

const simResult = (sim, cleared, completed) => ({
  cleared,
  score: sim.score,
  completed,
  revivesBought: sim.bought,
  spent: sim.spentTotal,
  turnsBought: sim.turnsBought,
  hintsBought: sim.hintsBought,
  perfects: sim.perfects,
  bestStreak: sim.bestStreak,
  cards: sim.fateRun ? sim.fateRun.fate.slice() : [],
});

/** Cartas regaladas al llegar a `grant.at` (para medir una carta concreta sin depender de la oferta). */
function applyGrant(sim, grant, level) {
  if (!grant || !sim.fateRun || level !== grant.at) return;
  for (const id of grant.ids) {
    const fx = fateById(id).fx;
    sim.fateRun.fate.push(id);
    if (fx.pickHints && !fateTotals(sim.fateRun).noHints) sim.hints += fx.pickHints;
    if (fx.pickScore) sim.score = Math.max(0, sim.score + Math.round(sim.score * fx.pickScore));
  }
}

/** Revivires que permite la partida (los de serie más los de Fénix). */
const maxBuys = (sim) => MAX_REVIVES + (sim.fateRun ? fateTotals(sim.fateRun).revives || 0 : 0);

/** Estrategia «city»: compra un revivir por adelantado al empezar cada ciudad (a partir de la segunda). */
function cityRevive(sim, revive, level) {
  if (revive !== 'city' || level % CITY_EVERY !== 1 || level <= 6 || sim.bought >= maxBuys(sim) || sim.score <= 0)
    return;
  sim.score -= Math.round(sim.score * REVIVE_SHARE);
  sim.charges++;
  sim.bought++;
}

/** Tras perder un tablero: usa un revivir guardado o compra uno con puntos. Devuelve true si se puede repetir. */
function retryAfterFail(sim, revive) {
  sim.streak = 0;
  if (sim.charges > 0) {
    sim.charges--;
    return true;
  }
  if (!sim.fateRun || revive !== 'none' || sim.bought >= maxBuys(sim) || sim.score <= 0) return false;
  const cost = Math.round(sim.score * REVIVE_SHARE);
  sim.score -= cost;
  sim.spentTotal += cost;
  sim.bought++;
  return true;
}

/** Juega el tablero hasta superarlo (reviviendo si se puede). Devuelve el resultado, o null si la partida termina. */
function playUntilCleared(sim, opts, level, d) {
  const { hero, skill, start, powers, revive } = opts;
  for (;;) {
    if (sim.fateRun) sim.fateRun.streak = sim.streak;
    const res = playBoard(sim.rng, {
      hero,
      skill,
      d,
      start,
      level,
      hints: sim.hints,
      powers,
      fate: sim.fateRun,
      extraTurns: sim.rel?.turns || 0,
    });
    sim.hints = res.hints;
    if (res.ok) return res;
    if (!retryAfterFail(sim, revive)) return null;
  }
}

/** Puntos del tablero superado, racha, Perfectos, dificultad adaptativa y pistas que se ganan. */
function scoreBoard(sim, { hero, start, powers }, level, d, res, usedHint) {
  const { fateRun } = sim;
  if (fateRun) fateRun.helpAt = usedHint ? level : 0;
  const noPow = !!fateRun && fateTotals(fateRun).noPower;
  const pure = !usedHint && (noPow || (hero === 'lia' ? res.intact : !res.powerUsed));
  const G = { ...simBoard(level, d), pure };
  const gain = calcGain(res.moves, d, sim.streak, fateRun ? fateRules(fateRun) : undefined);
  const ember = res.intact && !noPow && !powers.noEmber ? LIA_INTACT_POINTS : 0;
  let total =
    gain.total + Math.round(gain.total * ((fateRun ? fatePoints({ ...fateRun, hints: sim.hints }, G) : 0) + ember));
  total += Math.round(total * (sim.rel?.points || 0));
  sim.score += total;
  if (res.moves <= d) sim.perfects++;
  if (fateRun) sim.hints += fatePerfectHints(fateRun, res.moves, d);
  sim.streak = fateRun
    ? nextStreak({ ...fateRun, streak: sim.streak }, gain.eff)
    : gain.eff >= 0.9
      ? sim.streak + 1
      : 0;
  sim.bestStreak = Math.max(sim.bestStreak, sim.streak);
  sim.adj = Math.max(-2, Math.min(level < 10 ? 1 : 2, sim.adj + (gain.eff >= 0.9 ? 1 : gain.eff < 0.4 ? -1 : 0)));
  const rate = powers.hintMult?.[hero] ?? 1;
  if (Math.floor((level * rate) / hintEvery(start)) > Math.floor(((level - 1) * rate) / hintEvery(start))) sim.hints++;
}

/** Cierre de ciudad: premios de la ciudad y, salvo en la última, elegir una carta de la oferta. */
function closeCity(sim, { hero, fate, pick, force, grant }, level, d) {
  const { fateRun } = sim;
  if (!fateRun || level % FATE_EVERY !== 0) return;
  const city = level / FATE_EVERY;
  Object.assign(fateRun, { score: sim.score, hints: sim.hints, streak: sim.streak });
  fateCityRewards(fateRun, city, d);
  if (level < MAX_LEVEL && !grant) {
    const offer = sim.deck.slice((city - 1) * fate, city * fate).map(fateById);
    const card = offer.find((c) => force.includes(c.id)) || PICKERS[pick](offer, hero, city, sim.pickRng);
    fateRun.fatePicked = city - 1;
    fateRun.fateDeck = sim.deck;
    pickFate(fateRun, card.id, city, baseScore(d));
  }
  sim.score = fateRun.score;
  sim.hints = fateRun.hints;
}

/**
 * Simula UNA partida de 21 niveles.
 * `fate`: tamaño de la oferta (3) o false. `pick`: 'survival' | 'score' | 'random'. `force`: ids de carta que toma si se ofrecen.
 * `relic`: id de reliquia (sun, purse, lantern). Con cartas, al caer usa los revivir de Fénix (cuesta 33 % de los puntos).
 * `shop` se conserva por compatibilidad con los análisis antiguos (ya no hay tienda).
 */
export function simulateRun({
  hero,
  start,
  skill,
  seed,
  revive = 'none',
  shop = false,
  powers = {},
  fate = false,
  pick = 'survival',
  force = [],
  relic = null,
  grant = null,
}) {
  const opts = { hero, start, skill, revive, powers, fate, pick, force, grant };
  const sim = newSim({ hero, start, seed, fate, relic });
  for (let level = 1; level <= MAX_LEVEL; level++) {
    applyGrant(sim, grant, level);
    cityRevive(sim, revive, level);
    const d = Math.max(1, curve(rateAt(start, level)).target + sim.adj);
    const hintsBefore = sim.hints;
    const res = playUntilCleared(sim, opts, level, d);
    if (!res) return simResult(sim, level - 1, false);
    scoreBoard(sim, opts, level, d, res, sim.hints < hintsBefore);
    closeCity(sim, opts, level, d);
  }
  return simResult(sim, MAX_LEVEL, true);
}

/** Media de `runs` partidas (semillas deterministas) para una combinación héroe/camino/habilidad. */
export function averageRuns({
  hero,
  start,
  skill,
  runs = 300,
  revive = 'none',
  salt = 0,
  shop = false,
  powers = {},
  fate = false,
  pick,
  force,
  relic,
  grant,
}) {
  let cleared = 0;
  let perfects = 0;
  let bestStreak = 0;
  let score = 0;
  let spent = 0;
  let turns = 0;
  let hintsB = 0;
  let done = 0;
  for (let i = 0; i < runs; i++) {
    // misma semilla para todos los héroes en la misma habilidad/camino: comparación justa (mismos «dados»)
    const r = simulateRun({
      hero,
      start,
      skill,
      revive,
      shop,
      powers,
      fate,
      pick,
      force,
      relic,
      grant,
      seed: hash32(i, start, Math.round(skill * 100), salt),
    });
    perfects += r.perfects;
    bestStreak += r.bestStreak;
    cleared += r.cleared;
    score += r.score;
    spent += r.spent;
    turns += r.turnsBought;
    hintsB += r.hintsBought;
    if (r.completed) done++;
  }
  return {
    cleared: cleared / runs,
    score: score / runs,
    completion: done / runs,
    spent: spent / runs,
    turnsBought: turns / runs,
    hintsBought: hintsB / runs,
    perfects: perfects / runs,
    bestStreak: bestStreak / runs,
  };
}

export const SKILLS = [0.4, 0.6, 0.8, 0.92];
export const PATHS = [1, 50, 75];

/** Tabla de ayuda: cuántos niveles extra aporta cada héroe frente a no tener poder, por camino y habilidad. */
export function balanceReport({ runs = 300, powers = {} } = {}) {
  const rows = [];
  for (const start of PATHS) {
    for (const skill of SKILLS) {
      const base = averageRuns({ hero: 'none', start, skill, runs, powers });
      const row = { start, skill, base: base.cleared };
      for (const hero of ['lia', 'jean', 'van']) {
        const r = averageRuns({ hero, start, skill, runs, powers });
        row[hero] = r.cleared - base.cleared;
        row[hero + 'Score'] = r.score - base.score;
      }
      rows.push(row);
    }
  }
  return rows;
}
