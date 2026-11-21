import { mulberry32, hash32 } from '../engine/rng.js';
import { curve, moveLimit, rateAt, startHintsFor, MAX_LEVEL } from '../engine/difficulty.js';
import { calcGain } from '../engine/scoring.js';
import { hintEvery, CITY_EVERY, bonusTurns } from './heroes.js';
import { MAX_REVIVES, REVIVE_SHARE, priceOf, extraTurns } from './shop.js';
import { fateDeck, fateById, fateCityRewards, fatePoints, fateRules, fateTotals, keepsStreak } from './fate.js';
import { levelPlan } from './mechanics.js';
import { rewindCount, DESTINY_SHARE, JUTH_MIN_REMAINING, destinyCount, powerReady, powerUses } from './powers.js';
import { SEAL_LEVELS, maxSealDetour, requestedSealTier, sealPoints } from './seals.js';
import { bonusPrize, isBonusLevel } from './minigames.js';

/**
 * Modelo de equilibrio: simula miles de partidas de jugadores de distinta habilidad para medir cómo se comportan la dificultad
 * de cada camino, los poderes de los héroes, los sellos, la tienda y el revivir (las cartas del destino no se simulan). NO es el juego real: es un
 * modelo simple y determinista con el que COMPARAR opciones entre sí. Lo que importa es la comparación, no los números absolutos.
 *
 * Modelo de un tablero con mínimo d: el jugador da d movimientos correctos; en cada uno se equivoca con probabilidad
 * err = (1 − habilidad) · MODEL.err · (1 + d/25). Un error son k movimientos erróneos (k ≥ 1, media 2); cada uno cuesta 2
 * movimientos (el movimiento y deshacerlo). Solo te das cuenta a tiempo con probabilidad MODEL.notice; si no, cuesta
 * MODEL.unnoticedCost. Una pista evita el error entero (y se gasta); se guardan para tableros duros (d ≥ MODEL.hintMinD).
 * Se pierde al agotar los turnos sin llegar a la salida. Poderes (una vez por tablero, como en el juego):
 *   Lía  – turnos de reserva (más límite);
 *   Jean – Rebobinar: devuelve ~33 % de los movimientos hechos, mínimo 3 (borra un error; dos en tableros largos);
 *   Juth – Trazar destino: ~25 % de los pasos que faltan (si quedan al menos 3): sin error en esos pasos.
 * Sellos (cada 3-4 niveles desde el 5): el jugador hábil rodea un poco para recogerlos y cobra puntos extra.
 * Minijuegos (niveles 15, 25…): pistas según habilidad, con el premio máximo proporcional al nivel.
 */
const MODEL = {
  err: 0.07,
  notice: 0.7, // probabilidad de darte cuenta de que un movimiento fue un error y deshacerlo enseguida
  hintAware: 0.65, // probabilidad de pedir la pista A TIEMPO (antes de equivocarte): una pista solo ayuda si la pides
  unnoticedCost: 3, // si no te das cuenta, recuperarte cuesta ~3 movimientos
  hintMinD: 10,
  startHints: 3,
  shopReserve: 3, // el jugador solo compra una pista si le quedan puntos para 3 más (no se arruina por ella)
  sealSkill: [0.4, 0.58, 0.72], // habilidad mínima para ir a por un sello de bronce / plata / oro
};

/** El sello de un nivel según el modelo: el tipo que pide el calendario (limitado por lo que cabe en el tablero) y su rodeo en movimientos. */
function sealPlan(level, d, seed = 0) {
  const maxD = maxSealDetour(d);
  let tier = requestedSealTier(level, seed);
  if (tier === 3 && maxD < 4) tier = 2;
  const extra =
    tier === 1
      ? 1
      : tier === 2
        ? Math.min(maxD, 2 + (hash32(seed, level, 9) % 2))
        : Math.min(maxD, 4 + (hash32(seed, level, 9) % 3));
  return { tier, extra };
}

/**
 * Nota del minijuego (0-5 estrellas) según la habilidad. Los juegos son accesibles: un jugador flojo ronda las 2-3 estrellas y uno
 * experto las 4-5; el 0 (sin premio) queda para un desastre poco habitual.
 */
const minigameGrade = (skill, u) => Math.max(0, Math.min(5, Math.round(2.8 + 1.4 * skill + (u - 0.5) * 3)));

/**
 * Jugador que usa la tienda (`shop = {score}`), con UNA compra por tablero: cerca del límite compra el paquete más barato que le permita seguir,
 * y si no le quedan pistas en un tablero duro compra una, pero solo si le sobran puntos (MODEL.shopReserve veces el precio).
 */
export function playBoard(
  rng,
  { hero, skill, d, start = 1, level = 1, hints, shop = null, seal = false, powers = {}, fate = null },
) {
  const destinyShare = DESTINY_SHARE;
  const ft = fate ? fateTotals(fate) : null;
  const noPower = !!ft?.noPower;
  const fateTurns = ft
    ? Math.max(-2, Math.min(3, ft.turns + (/[hi]/.test(levelPlan(level).letters) ? ft.heavyIce : 0)))
    : 0;
  let limit = Math.max(
    d + 1,
    moveLimit(d, start, level) +
      (powers.liaTurns && hero === 'lia'
        ? Math.max(1, Math.round(d * powers.liaTurns))
        : bonusTurns(hero, d, start, noPower)) +
      fateTurns,
  );
  let extra = 0;
  if (seal) {
    // rodeo para recoger el sello: más movimientos y, si hace falta, más límite
    extra = seal.extra;
    limit = Math.max(limit, d + extra + 1);
  }
  const need = d + extra; // pasos óptimos que va a dar
  let spent = 0;
  let boughtTurns = 0;
  let boughtHints = 0;
  const priceRun = fate || { mode: 'c', hero };
  if (ft?.noShop) shop = null;
  const afford = (id, reserve = 1) => shop && shop.score - spent >= priceOf(id, d, start, priceRun) * reserve;
  const pay = (id) => {
    spent += priceOf(id, d, start, priceRun);
  };
  const err = Math.min(0.85, (1 - skill) * MODEL.err * (1 + need / 25));
  let moves = 0;
  let h = hints;
  const ready = !noPower && powerReady(level, start, hero, ft?.powerShare || 0); // a veces el poder descansa
  const echo = ft && level % 10 === 0 ? ft.lastPower : 0; // Eco del poder: uso extra en el último tablero de la ciudad
  let rewind = hero === 'jean' && ready ? powerUses(hero, d, echo) : 0; // una vez por tablero, dos en los largos
  let destiny = hero === 'van' && ready;
  let safe = 0; // pasos protegidos por «Trazar destino»
  for (let step = 0; step < need; step++) {
    if (safe > 0) safe--;
    else if (rng() < err) {
      if (!boughtHints && !boughtTurns && h === 0 && need >= MODEL.hintMinD && afford('hint', MODEL.shopReserve)) {
        pay('hint');
        h++;
        boughtHints++;
      }
      if (h > 0 && need >= MODEL.hintMinD && rng() < MODEL.hintAware) {
        h--; // la pista evita el error
      } else if (
        destiny &&
        need - step > (powers.juthMin ?? JUTH_MIN_REMAINING) &&
        limit - moves >= destinyCount(need - step, destinyShare)
      ) {
        destiny = false; // Juth traza el destino: ~25 % de los pasos que faltan sin error (nunca el último)
        safe = destinyCount(need - step, destinyShare) - 1;
      } else {
        const k = 1 + Math.floor(Math.log(1 - rng()) / Math.log(0.5)); // 1 + geométrica (media 2)
        let waste = 0;
        for (let j = 0; j < k; j++) waste += rng() >= MODEL.notice ? MODEL.unnoticedCost : 2;
        if (rewind > 0) {
          rewind--;
          waste = Math.max(0, waste - 2 * rewindCount(moves));
        } // Jean rebobina ~33 % de los movimientos hechos (mín. 3)
        moves += waste;
      }
    }
    moves += 1;
    const minimumToContinue = moves + (step < need - 1 ? 1 : 0);
    if (minimumToContinue > limit && !boughtTurns && !boughtHints) {
      const id = ['moves3', 'moves'].find((x) => limit + extraTurns(x, limit) >= minimumToContinue && afford(x));
      if (id) {
        pay(id);
        limit += extraTurns(id, limit);
        boughtTurns++;
      }
    }
    if (minimumToContinue > limit) return { ok: false, moves, hints: h, spent, boughtTurns, boughtHints, extra };
  }
  return { ok: true, moves, hints: h, spent, boughtTurns, boughtHints, extra };
}

/**
 * Cómo elige carta el jugador simulado: la que más le ayuda a llegar lejos (turnos, revivir, poder, pistas) y, a igualdad,
 * la que da más puntos. Los Pactos que le quitan ayudas los evita salvo que no tenga otra opción.
 */
export function cardValue(card, hero, city = 1) {
  const fx = card.fx;
  const left = 9 - city; // ciudades que quedan para cobrar Brújula, Cosecha y Constelación
  let v = 4 * (fx.turns || 0) + 1.5 * (fx.heavyIce || 0);
  v += fx.revives ? 4 : 0;
  v += fx.reviveShare ? 1 : 0;
  v += fx.powerShare ? (hero === 'lia' ? 0 : 2.5) : 0;
  v += fx.lastPower ? (hero === 'jean' ? 1.5 : hero === 'van' ? 0.8 : 0) : 0;
  v += 0.8 * (fx.pickHints || 0) + 0.8 * (fx.cityHints || 0) * left;
  v -= (fx.shop || 0) * 6;
  v += 10 * (fx.points || 0) + (fx.pointsPerCard ? 0.2 * left : 0) + (fx.longBoard ? 0.5 : 0);
  v += fx.perfect || fx.streakCap || fx.streakEff ? 0.6 : 0;
  v += fx.seal ? 0.4 : 0;
  v += fx.cityBases ? 0.1 * left : 0;
  v += fx.pickBases ? 0.5 : 0;
  v -= fx.noPower ? (hero === 'lia' ? 9 : 6) : 0;
  v -= fx.noRevive ? 3 : 0;
  v -= fx.noShop ? 3 : 0;
  v -= fx.perfectStreak ? 1 : 0;
  v -= fx.noSeals ? 0.8 : 0;
  v -= fx.pickScore ? 1 : 0;
  return v;
}
export const pickForSurvival = (offer, hero, city) =>
  offer.reduce((best, card) => (cardValue(card, hero, city) > cardValue(best, hero, city) ? card : best));

/**
 * Simula UNA partida de 100 niveles.
 * @param {object} o
 * @param {string} o.hero        'none' | 'lia' | 'jean' | 'van'
 * @param {number} o.start       dificultad inicial del camino (1, 50, 75)
 * @param {number} o.skill       habilidad 0-1
 * @param {number} o.seed
 * @param {string} [o.revive]    'none' | 'city': comprar un revivir al empezar cada ciudad (desde la 3ª) mientras queden
 * @param {boolean} [o.shop]     el jugador usa la tienda
 * @returns {{cleared:number, score:number, completed:boolean, revivesBought:number}}
 */
export function simulateRun({
  hero,
  start,
  skill,
  seed,
  revive = 'none',
  shop = false,
  seals = true,
  powers = {},
  fate = false,
}) {
  const rng = mulberry32(seed);
  // Cartas del destino: `fate` = tamaño de la oferta (2 o 3) o false (sin cartas). El jugador elige con `pickForSurvival`.
  const fateRun = fate ? { mode: 'c', hero, start, seed, score: 0, hints: 0, fate: [], fatePicked: 0 } : null;
  const deck = fate ? fateDeck(seed) : null;
  let hints = startHintsFor(start);
  let score = 0;
  let streak = 0;
  let adj = 0;
  let charges = 0;
  let bought = 0;
  let spentTotal = 0;
  let turnsBought = 0;
  let hintsBought = 0;
  let sealPts = 0;
  for (let level = 1; level <= MAX_LEVEL; level++) {
    const ft = fateRun ? fateTotals(fateRun) : null;
    const maxBuy = MAX_REVIVES + (ft?.revives || 0);
    if (revive === 'city' && level % CITY_EVERY === 1 && level > 20 && bought < maxBuy && !ft?.noRevive && score > 0) {
      score -= Math.round(score * (ft?.reviveShare ? Math.min(REVIVE_SHARE, ft.reviveShare) : REVIVE_SHARE));
      charges++;
      bought++;
    }
    const rating = rateAt(start, level);
    const d = Math.max(1, curve(rating).target + adj);
    const seal = seals && SEAL_LEVELS.includes(level) ? sealPlan(level, d, seed) : null;
    const goForSeal =
      seal && (powers.sealOnly ? seal.tier === powers.sealOnly : skill >= MODEL.sealSkill[seal.tier - 1]);
    let res;
    for (;;) {
      res = playBoard(rng, {
        hero,
        skill,
        d,
        start,
        level,
        hints,
        shop: shop ? { score } : null,
        seal: goForSeal ? seal : null,
        powers,
        fate: fateRun,
      });
      hints = res.hints;
      score -= res.spent;
      spentTotal += res.spent;
      turnsBought += res.boughtTurns;
      hintsBought += res.boughtHints;
      if (res.ok) break;
      if (charges > 0) {
        charges--;
        continue;
      }
      return {
        cleared: level - 1,
        score,
        completed: false,
        revivesBought: bought,
        spent: spentTotal,
        turnsBought,
        hintsBought,
        sealPts,
      };
    }
    const gain = calcGain(res.moves, d, streak, fateRun ? fateRules(fateRun) : undefined);
    score += gain.total + (fateRun ? Math.round(gain.total * fatePoints(fateRun, { opt: d })) : 0);
    if (goForSeal && !ft?.noSeals) {
      // sello recogido: puntos extra (Sello dorado suma; Eclipse los anula)
      const pts = Math.round(sealPoints(d, d + res.extra, seal.tier) * (1 + (ft?.seal || 0)));
      score += pts;
      sealPts += pts;
    }
    streak = (fateRun ? keepsStreak(fateRun, gain.eff) : gain.eff >= 0.9) ? streak + 1 : 0;
    adj = Math.max(-2, Math.min(level < 10 ? 1 : 2, adj + (gain.eff >= 0.9 ? 1 : gain.eff < 0.4 ? -1 : 0)));
    const rate = powers.hintMult?.[hero] ?? 1; // ritmo de pistas propio de cada héroe (Juth las encuentra más a menudo)
    if (Math.floor((level * rate) / hintEvery(start)) > Math.floor(((level - 1) * rate) / hintEvery(start))) hints++;
    if (isBonusLevel(level)) hints += bonusPrize(minigameGrade(skill, rng()), level, start);
    if (fateRun && level % 10 === 0 && level < MAX_LEVEL) {
      const city = level / 10;
      Object.assign(fateRun, { score, hints });
      fateCityRewards(fateRun, city, d);
      const card = pickForSurvival(deck.slice((city - 1) * fate, city * fate).map(fateById), hero, city);
      fateRun.fate.push(card.id);
      fateRun.fatePicked = city;
      const fx = card.fx;
      if (fx.pickHints) fateRun.hints += fx.pickHints;
      if (fx.pickScore) fateRun.score = Math.max(0, fateRun.score + Math.round(fateRun.score * fx.pickScore));
      if (fx.pickBases) fateRun.score += fx.pickBases * (50 + 55 * d);
      ({ score, hints } = fateRun);
    }
  }
  return {
    cleared: MAX_LEVEL,
    score,
    completed: true,
    revivesBought: bought,
    spent: spentTotal,
    turnsBought,
    hintsBought,
    sealPts,
  };
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
  seals = true,
  powers = {},
  fate = false,
}) {
  let cleared = 0;
  let score = 0;
  let spent = 0;
  let turns = 0;
  let hintsB = 0;
  let sealPts = 0;
  let done = 0;
  for (let i = 0; i < runs; i++) {
    // misma semilla para todos los héroes en la misma habilidad/camino: comparación justa (mismos «dados»)
    const r = simulateRun({
      hero,
      start,
      skill,
      revive,
      shop,
      seals,
      powers,
      fate,
      seed: hash32(i, start, Math.round(skill * 100), salt),
    });
    cleared += r.cleared;
    score += r.score;
    spent += r.spent;
    turns += r.turnsBought;
    hintsB += r.hintsBought;
    sealPts += r.sealPts;
    if (r.completed) done++;
  }
  return {
    cleared: cleared / runs,
    score: score / runs,
    completion: done / runs,
    spent: spent / runs,
    turnsBought: turns / runs,
    hintsBought: hintsB / runs,
    sealPts: sealPts / runs,
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
